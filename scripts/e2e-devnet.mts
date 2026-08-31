/**
 * Full devnet tour: create → register → close → commit stats → publish results
 * → claim → release surplus.
 *
 * Every instruction comes from `src/lib/chainClient.ts`, every payout from
 * `src/lib/prize-distribution.ts` and every proof from `src/lib/resultsTree.ts`,
 * so a green run means the browser path itself works, not a parallel copy of it.
 *
 * Needs `npm run dev` up: the oracle publishes into public/data and reads the
 * files back through the same origin the app serves them from.
 *
 *   npx tsx scripts/e2e-devnet.mts
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

import {
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const ORIGIN = process.env.E2E_ORIGIN ?? "http://localhost:3000";

// `chainClient` asks the app for published results with a relative URL, which
// only resolves inside a browser. Give Node the missing origin so the script
// exercises that path instead of routing around it.
const upstreamFetch = globalThis.fetch;
globalThis.fetch = ((input: RequestInfo | URL, init?: RequestInit) =>
  typeof input === "string" && input.startsWith("/")
    ? upstreamFetch(`${ORIGIN}${input}`, init)
    : upstreamFetch(input as RequestInfo, init)) as typeof fetch;

import {
  buildClaimPrize,
  buildCloseGameweek,
  buildCommitStats,
  buildCreateGameweek,
  buildPublishResults,
  buildRegisterTeam,
  buildReleaseUnallocated,
  getConfig,
  getConnection,
  getGameweek,
  getGameweekEntrants,
  getGameweekStats,
  getStatsCommit,
  getTeamResult,
  getUsdcBalance,
  getUserTeam,
  treasuryPda,
} from "@/lib/chainClient";
import { allocatePrizes, sumPrizeAwards } from "@/lib/prize-distribution";
import { previewTourPointsFromRegisteredTeam } from "@/lib/chainAlignedScoring";
import { calculateFantasyPoints, ratingTierAdjustment } from "@/lib/scoring";
import { SOLANA_USDC_MINT } from "@/lib/constants";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keyDir = resolve(root, "solana/movematch/.keys");
const connection = getConnection();
const usdcMint = new PublicKey(SOLANA_USDC_MINT);

let failures = 0;
const step = (title: string) => console.log(`\n▸ ${title}`);
function check(label: string, ok: boolean, detail = "") {
  console.log(`  ${ok ? "PASS" : "FAIL"}  ${label}${detail ? ` — ${detail}` : ""}`);
  if (!ok) failures += 1;
}

async function loadKey(name: string): Promise<Keypair> {
  const secret = JSON.parse(await readFile(resolve(keyDir, name), "utf8")) as number[];
  return Keypair.fromSecretKey(Uint8Array.from(secret));
}

async function loadOrCreateKey(name: string): Promise<Keypair> {
  try {
    return await loadKey(name);
  } catch {
    const keypair = Keypair.generate();
    await writeFile(resolve(keyDir, name), JSON.stringify(Array.from(keypair.secretKey)));
    return keypair;
  }
}

async function send(
  instructions: TransactionInstruction[],
  signers: Keypair[],
  label: string,
): Promise<string> {
  const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(...instructions),
    signers,
    { commitment: "confirmed" },
  );
  console.log(`  ${label}: ${signature}`);
  return signature;
}

async function expectFailure(
  instructions: TransactionInstruction[],
  signers: Keypair[],
  label: string,
): Promise<void> {
  try {
    await sendAndConfirmTransaction(connection, new Transaction().add(...instructions), signers, {
      commitment: "confirmed",
    });
    check(label, false, "transaction unexpectedly succeeded");
  } catch (error) {
    check(label, true, String((error as Error).message).split("\n")[0].slice(0, 70));
  }
}

async function treasuryBalance(): Promise<bigint> {
  const ata = getAssociatedTokenAddressSync(usdcMint, treasuryPda(), true);
  const balance = await connection.getTokenAccountBalance(ata).catch(() => null);
  return balance ? BigInt(balance.value.amount) : BigInt(0);
}

type PoolPlayer = { id: number; positionId: number; teamId: number };

/** Squads differ per team but stay inside formation 1-4-3-3 and the 3-per-club cap. */
function pickSquad(pool: PoolPlayer[], offset: number) {
  const byPosition = new Map<number, PoolPlayer[]>();
  for (const player of pool) {
    byPosition.set(player.positionId, [...(byPosition.get(player.positionId) ?? []), player]);
  }
  const used = new Set<number>();
  const perClub = new Map<number, number>();
  const chosen: PoolPlayer[] = [];

  const take = (positionId: number, count: number) => {
    const bucket = byPosition.get(positionId) ?? [];
    let taken = 0;
    for (let i = 0; i < bucket.length && taken < count; i += 1) {
      const player = bucket[(i + offset * 9) % bucket.length];
      if (used.has(player.id) || (perClub.get(player.teamId) ?? 0) >= 3) continue;
      used.add(player.id);
      perClub.set(player.teamId, (perClub.get(player.teamId) ?? 0) + 1);
      chosen.push(player);
      taken += 1;
    }
    if (taken < count) throw new Error(`Could not fill ${count} players at position ${positionId}`);
  };

  // Starters (slots 0-10) must be 1-4-3-3; bench (11-13) is GK, DEF, MID.
  take(0, 1);
  take(1, 4);
  take(2, 3);
  take(3, 3);
  take(0, 1);
  take(1, 1);
  take(2, 1);

  return {
    playerIds: chosen.map((player) => player.id),
    positions: chosen.map((player) => player.positionId),
    clubs: chosen.map((player) => player.teamId),
    captainIndex: 8,
  };
}

/** Deterministic but uneven stats, including DNPs so auto-substitution runs. */
function statsFor(playerId: number, positionId: number): Record<string, number | boolean> {
  const seed = (playerId * 7919) % 97;
  const minutes = seed % 11 === 0 ? 0 : 45 + (seed % 46);
  return {
    position: positionId,
    minutes_played: minutes,
    goals: minutes >= 60 && positionId >= 2 ? seed % 3 : 0,
    assists: minutes >= 45 ? seed % 2 : 0,
    clean_sheet: minutes >= 60 && positionId <= 1 && seed % 3 === 0,
    saves: positionId === 0 ? seed % 7 : 0,
    penalties_saved: positionId === 0 && seed % 29 === 0 ? 1 : 0,
    penalties_missed: 0,
    own_goals: 0,
    yellow_cards: seed % 7 === 0 ? 1 : 0,
    red_cards: 0,
    rating: minutes === 0 ? 0 : 55 + (seed % 41),
    tackles: seed % 5,
    interceptions: seed % 4,
    successful_dribbles: seed % 6,
    free_kick_goals: 0,
    goals_conceded: positionId <= 1 ? seed % 3 : 0,
    bonus: seed % 4 === 0 ? seed % 4 : 0,
    fpl_clean_sheets: 0,
  };
}

async function main() {
  step("Actors and balances");
  const admin = await loadKey("deployer.json"); // admin + oracle + house wallet
  const players = [
    await loadKey("e2e-player.json"),
    await loadOrCreateKey("e2e-player-b.json"),
    await loadOrCreateKey("e2e-player-c.json"),
  ];

  const config = await getConfig();
  if (!config) throw new Error("Config PDA missing — run migrations/initialize-devnet.mjs first.");
  check("config admin is the deployer", config.admins.includes(admin.publicKey.toBase58()));
  check("config oracle is the deployer", config.oracle === admin.publicKey.toBase58());
  check("program is not paused", !config.paused);
  const entryFee = config.entryFee;
  console.log(`  entry fee ${entryFee} | prize pool ${config.prizePoolBps} bps`);

  for (const [index, player] of players.entries()) {
    if ((await connection.getBalance(player.publicKey)) < 20_000_000) {
      await send(
        [
          SystemProgram.transfer({
            fromPubkey: admin.publicKey,
            toPubkey: player.publicKey,
            lamports: 30_000_000,
          }),
        ],
        [admin],
        `fund player ${index + 1} with SOL`,
      );
    }
    if ((await getUsdcBalance(player.publicKey.toBase58())) < entryFee) {
      const source = getAssociatedTokenAddressSync(usdcMint, admin.publicKey);
      const destination = getAssociatedTokenAddressSync(usdcMint, player.publicKey);
      await send(
        [
          createAssociatedTokenAccountIdempotentInstruction(
            admin.publicKey,
            destination,
            player.publicKey,
            usdcMint,
          ),
          createTransferInstruction(source, destination, admin.publicKey, entryFee),
        ],
        [admin],
        `fund player ${index + 1} with USDC`,
      );
    }
  }
  for (const [index, player] of players.entries()) {
    const usdc = await getUsdcBalance(player.publicKey.toBase58());
    check(`player ${index + 1} can pay the entry fee`, usdc >= entryFee, `${usdc} units`);
  }
  if (failures > 0) throw new Error("Pre-flight failed; not spending devnet funds.");

  step("Create gameweek");
  let gameweekId = Math.max(config.currentGameweek + 1, 900);
  while (await getGameweek(gameweekId)) gameweekId += 1;
  console.log(`  gameweek ${gameweekId}`);
  await send(await buildCreateGameweek(admin.publicKey.toBase58(), gameweekId), [admin], "create_gameweek");
  check("gameweek is open", (await getGameweek(gameweekId))?.status === "open");

  step("Register squads");
  const rawPool = JSON.parse(await readFile(resolve(root, "src/data/players.json"), "utf8")) as PoolPlayer[];
  const pool = rawPool.filter((player) => player.id > 0 && player.positionId >= 0 && player.teamId > 0);
  const treasuryBefore = await treasuryBalance();

  for (const [index, player] of players.entries()) {
    const address = player.publicKey.toBase58();
    const squad = pickSquad(pool, index);
    const before = await getUsdcBalance(address);
    await send(
      await buildRegisterTeam(address, gameweekId, { ...squad, playerPositions: squad.positions }),
      [player],
      `register_team player ${index + 1}`,
    );
    const after = await getUsdcBalance(address);
    check(`player ${index + 1} paid exactly the entry fee`, before - after === entryFee, `${before - after}`);
  }

  const registered = await getGameweek(gameweekId);
  const expectedPool =
    ((entryFee * BigInt(config.prizePoolBps)) / BigInt(10_000)) * BigInt(players.length);
  check("entries counted", registered?.totalEntries === players.length);
  check(
    "prize pool is the prize leg of every entry",
    registered?.prizePool === expectedPool,
    `${registered?.prizePool} vs ${expectedPool}`,
  );
  const entrants = await getGameweekEntrants(gameweekId);
  check(
    "getProgramAccounts finds every entrant",
    players.every((player) => entrants.includes(player.publicKey.toBase58())),
    `${entrants.length} found`,
  );

  step("Close gameweek");
  await send(await buildCloseGameweek(admin.publicKey.toBase58(), gameweekId), [admin], "close_gameweek");
  check("gameweek is closed", (await getGameweek(gameweekId))?.status === "closed");

  step("Stats gate — reject publish before commit_stats");
  const gateAwards = allocatePrizes(
    (await getGameweek(gameweekId))!.prizePool,
    [{ owner: players[0].publicKey.toBase58(), finalPoints: 1 }],
    gameweekId,
  );
  const gatePublished = await buildPublishResults(
    admin.publicKey.toBase58(),
    gameweekId,
    gateAwards.map((award) => ({
      owner: award.owner,
      rank: award.rank,
      finalPoints: award.finalPoints,
      amount: award.amount,
    })),
    1,
  );
  await expectFailure(gatePublished.instructions, [admin], "publish without stats commit");

  step("Commit stats and publish the file");
  const teams = await Promise.all(
    entrants.map(async (address) => ({ address, team: await getUserTeam(address, gameweekId) })),
  );
  const usedPlayerIds = Array.from(new Set(teams.flatMap((entry) => entry.team?.playerIds ?? []))).sort(
    (a, b) => a - b,
  );
  const positionById = new Map(pool.map((player) => [player.id, player.positionId]));
  const statsPayload: Record<string, Record<string, number | boolean>> = {};
  for (const id of usedPlayerIds) statsPayload[String(id)] = statsFor(id, positionById.get(id) ?? 2);

  const canonicalJson = JSON.stringify({ gameweekId, players: statsPayload });
  const statsUri = `${ORIGIN}/data/stats/${gameweekId}.json`;
  await mkdir(resolve(root, "public/data/stats"), { recursive: true });
  await writeFile(resolve(root, `public/data/stats/${gameweekId}.json`), canonicalJson);
  await send(
    await buildCommitStats(admin.publicKey.toBase58(), gameweekId, canonicalJson, statsUri),
    [admin],
    "commit_stats",
  );

  const commit = await getStatsCommit(gameweekId);
  check("stats commit stores the self-hosted URI", commit?.uri === statsUri, commit?.uri);
  const statsFromChain = await getGameweekStats(gameweekId, usedPlayerIds);
  check(
    "published stats pass the on-chain hash check",
    Object.keys(statsFromChain).length === usedPlayerIds.length,
    `${Object.keys(statsFromChain).length}/${usedPlayerIds.length} players`,
  );

  step("Score, allocate and publish results");
  const chainRecord: Record<string, Record<string, unknown>> = {};
  for (const [id, stats] of Object.entries(statsFromChain)) {
    chainRecord[id] = stats as unknown as Record<string, unknown>;
  }

  const scored = teams.map(({ address, team }) => {
    if (!team) return { address, basePoints: 0, finalPoints: 0 };
    let basePoints = 0;
    for (let slot = 0; slot < 11; slot += 1) {
      const stats = statsFromChain[team.playerIds[slot]] as unknown as Record<string, unknown> | undefined;
      if (!stats) continue;
      const base = calculateFantasyPoints({ positionId: team.playerPositions?.[slot] ?? 2 }, stats);
      const { add, sub } = ratingTierAdjustment(stats);
      basePoints += Math.max(0, base + add - sub);
    }
    return {
      address,
      basePoints,
      finalPoints: previewTourPointsFromRegisteredTeam(
        { playerIds: team.playerIds, playerPositions: team.playerPositions ?? team.positions },
        chainRecord,
      ),
    };
  });
  scored.sort((a, b) => b.finalPoints - a.finalPoints);
  for (const row of scored) {
    console.log(`  ${row.address.slice(0, 8)}… final ${row.finalPoints} (base ${row.basePoints})`);
  }

  const settlementView = await getGameweek(gameweekId);
  if (!settlementView) throw new Error("Gameweek vanished before settlement.");
  const awards = allocatePrizes(
    settlementView.prizePool,
    scored.map((row) => ({ owner: row.address, finalPoints: row.finalPoints })),
    gameweekId,
  );
  const allocated = sumPrizeAwards(awards);
  check(
    "allocation never exceeds the pool",
    allocated <= settlementView.prizePool,
    `${allocated} of ${settlementView.prizePool}`,
  );

  const rows = awards.map((award) => ({
    owner: award.owner,
    rank: award.rank,
    finalPoints: award.finalPoints,
    amount: award.amount,
  }));
  const published = await buildPublishResults(admin.publicKey.toBase58(), gameweekId, rows, scored.length);
  check("tree total equals the allocation", published.total === allocated, `${published.total}`);
  await send(published.instructions, [admin], "publish_results");

  const basePointsByOwner = new Map(scored.map((row) => [row.address, row.basePoints]));
  await mkdir(resolve(root, "public/data/results"), { recursive: true });
  await writeFile(
    resolve(root, `public/data/results/${gameweekId}.json`),
    JSON.stringify({
      gameweek: gameweekId,
      root: published.root,
      prizeAllocated: published.total.toString(),
      results: rows.map((row, index) => ({
        owner: row.owner,
        rank: row.rank,
        finalPoints: row.finalPoints,
        basePoints: basePointsByOwner.get(row.owner) ?? 0,
        prizeAmount: row.amount.toString(),
        proof: published.proofs[index].map((node) => ({
          hash: node.hash.toString("hex"),
          sum: node.sum.toString(),
        })),
      })),
    }),
  );

  const settled = await getGameweek(gameweekId);
  check("gameweek is resolved", settled?.status === "resolved");
  check("on-chain root matches the published tree", settled?.resultsRoot === published.root);

  step("Claim prizes");
  for (const [index, player] of players.entries()) {
    const address = player.publicKey.toBase58();
    const award = awards.find((row) => row.owner === address);
    const result = await getTeamResult(address, gameweekId);
    if (!award || award.amount === BigInt(0)) {
      check(`player ${index + 1} has nothing to claim`, !result || result.prizeAmount === BigInt(0));
      continue;
    }
    check(`player ${index + 1} result survives proof verification`, result !== null);
    check(
      `player ${index + 1} amount matches the settlement rule`,
      result?.prizeAmount === award.amount,
      `${result?.prizeAmount} vs ${award.amount}`,
    );
    const before = await getUsdcBalance(address);
    await send(await buildClaimPrize(address, gameweekId), [player], `claim_prize player ${index + 1}`);
    const after = await getUsdcBalance(address);
    check(`player ${index + 1} received the prize`, after - before === award.amount, `${after - before}`);
  }

  step("Claim twice");
  const winner = players.find((player) =>
    awards.some((award) => award.owner === player.publicKey.toBase58() && award.amount > BigInt(0)),
  );
  if (winner) {
    await expectFailure(
      await buildClaimPrize(winner.publicKey.toBase58(), gameweekId),
      [winner],
      "second claim is rejected",
    );
  }

  step("Release the unallocated slice");
  const beforeRelease = await getGameweek(gameweekId);
  if (beforeRelease && beforeRelease.prizeAllocated < beforeRelease.prizePool) {
    const surplus = beforeRelease.prizePool - beforeRelease.prizeAllocated;
    const obligationBefore = (await getConfig())?.totalPrizeObligation ?? BigInt(0);
    await send(
      await buildReleaseUnallocated(admin.publicKey.toBase58(), gameweekId),
      [admin],
      "release_unallocated",
    );
    const obligationAfter = (await getConfig())?.totalPrizeObligation ?? BigInt(0);
    check(
      "obligation drops by exactly the unallocated slice",
      obligationBefore - obligationAfter === surplus,
      `${obligationBefore - obligationAfter} vs ${surplus}`,
    );
  } else {
    console.log("  nothing unallocated");
  }

  console.log(`\n  treasury delta: ${(await treasuryBalance()) - treasuryBefore} units`);
  console.log(`\n${failures === 0 ? "ALL CHECKS PASSED" : `${failures} CHECK(S) FAILED`} — gameweek ${gameweekId}`);
  process.exit(failures === 0 ? 0 : 1);
}

await main();
