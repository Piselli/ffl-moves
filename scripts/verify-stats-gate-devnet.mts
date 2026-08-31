/**
 * Devnet smoke test: publish_results must fail until commit_stats ran.
 *
 *   npx tsx scripts/verify-stats-gate-devnet.mts
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import { Keypair, Transaction, sendAndConfirmTransaction } from "@solana/web3.js";

import {
  buildCloseGameweek,
  buildCommitStats,
  buildCreateGameweek,
  buildPublishResults,
  buildRegisterTeam,
  getConfig,
  getConnection,
  getGameweek,
  getStatsCommit,
} from "@/lib/chainClient";
import { allocatePrizes, sumPrizeAwards } from "@/lib/prize-distribution";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keyDir = resolve(root, "solana/movematch/.keys");
const connection = getConnection();

let failures = 0;
const check = (label: string, ok: boolean, detail = "") => {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
};

async function loadKey(name: string): Promise<Keypair> {
  const secret = JSON.parse(await readFile(resolve(keyDir, name), "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function send(ixs: Awaited<ReturnType<typeof buildCreateGameweek>>, signers: Keypair[], label: string) {
  const sig = await sendAndConfirmTransaction(connection, new Transaction().add(...ixs), signers, {
    commitment: "confirmed",
  });
  console.log(`  ${label}: ${sig}`);
}

async function expectReject(
  ixs: Awaited<ReturnType<typeof buildCreateGameweek>>,
  signers: Keypair[],
  label: string,
) {
  try {
    await sendAndConfirmTransaction(connection, new Transaction().add(...ixs), signers, {
      commitment: "confirmed",
    });
    check(label, false, "transaction succeeded unexpectedly");
  } catch (error) {
    const msg = String((error as Error).message ?? error);
    check(label, true, msg.split("\n")[0]!.slice(0, 90));
  }
}

const validTeam = () => ({
  playerIds: Array.from({ length: 14 }, (_, i) => i + 1),
  positions: [0, 1, 1, 1, 1, 2, 2, 2, 3, 3, 3, 0, 1, 2],
  clubs: [10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 17, 18],
  captainIndex: 8,
});

async function main() {
  console.log("\n▸ Stats gate on devnet");
  const admin = await loadKey("deployer.json");
  const player = await loadKey("e2e-player.json");
  const config = await getConfig();
  if (!config) throw new Error("Config missing — run migrations/initialize-devnet.mjs");

  let gameweekId = Math.max(config.currentGameweek + 1, 880);
  while (await getGameweek(gameweekId)) gameweekId += 1;
  console.log(`  gameweek ${gameweekId}`);

  await send(await buildCreateGameweek(admin.publicKey.toBase58(), gameweekId), [admin], "create_gameweek");
  await send(
    await buildRegisterTeam(player.publicKey.toBase58(), gameweekId, {
      ...validTeam(),
      playerPositions: validTeam().positions,
    }),
    [player],
    "register_team",
  );
  await send(await buildCloseGameweek(admin.publicKey.toBase58(), gameweekId), [admin], "close_gameweek");
  check("no stats commit yet", (await getStatsCommit(gameweekId)) === null);

  const awards = allocatePrizes(
    (await getGameweek(gameweekId))!.prizePool,
    [{ owner: player.publicKey.toBase58(), finalPoints: 42 }],
    gameweekId,
  );
  const published = await buildPublishResults(
    admin.publicKey.toBase58(),
    gameweekId,
    awards.map((a) => ({
      owner: a.owner,
      rank: a.rank,
      finalPoints: a.finalPoints,
      amount: a.amount,
    })),
    1,
  );

  await expectReject(published.instructions, [admin], "publish_results without commit_stats");

  const statsJson = JSON.stringify({ gameweekId, players: { "1": { minutes_played: 90, goals: 1 } } });
  await send(
    await buildCommitStats(admin.publicKey.toBase58(), gameweekId, statsJson, `gate://${gameweekId}`),
    [admin],
    "commit_stats",
  );
  check("stats commit exists", (await getStatsCommit(gameweekId))?.hash != null);

  await send(published.instructions, [admin], "publish_results after commit_stats");
  check("gameweek resolved", (await getGameweek(gameweekId))?.status === "resolved");
  check(
    "allocation on chain",
    (await getGameweek(gameweekId))?.prizeAllocated === sumPrizeAwards(awards),
  );

  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`}`);
  process.exit(failures === 0 ? 0 : 1);
}

await main();
