/**
 * Score Movement bracket entries (tour 10999) against published official results.
 * Output: public/data/wc-bracket-leaderboard.json (off-chain payout reference).
 *
 *   npx tsx scripts/build-wc-bracket-leaderboard.mts
 */
import { readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  decodeGroupRanks,
  decodeThirdPlaceOrder,
  decodeKnockoutWinners,
  scoreBracketPrediction,
  WC_BRACKET_PERFECT_BONUS_USDC,
  WC_BRACKET_PERFECT_SCORE,
  WC_BRACKET_PRIZES_USDC,
  countDecidedPlaces,
  isOfficialBracketComplete,
  type BracketPrediction,
} from "@/lib/wcBracketPrediction";
import { parseBracketStatePayload, type WcBracketState } from "@/lib/wcBracketState";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const archivePath = resolve(root, "archive/movement-snapshot/2026-07-31/bracket.json");
const officialPath = resolve(root, "public/data/wc-bracket-state.json");
const outPath = resolve(root, "public/data/wc-bracket-leaderboard.json");

type ArchivePrediction = {
  owner: string;
  groupRanks: string;
  thirdPlaceOrder: string;
  knockoutWinners: string;
  submittedAt: string;
};

function hexBytes(hex: string): number[] {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return Array.from(Buffer.from(h, "hex"));
}

function decodeArchivePrediction(row: ArchivePrediction): BracketPrediction {
  return {
    groupRanks: decodeGroupRanks(hexBytes(row.groupRanks)),
    thirdPlaceOrder: decodeThirdPlaceOrder(hexBytes(row.thirdPlaceOrder)),
    knockoutWinners: decodeKnockoutWinners(hexBytes(row.knockoutWinners)),
  };
}

function officialAsPrediction(state: WcBracketState): BracketPrediction {
  return {
    groupRanks: state.groupRanks,
    thirdPlaceOrder: state.thirdPlaceOrder,
    knockoutWinners: state.knockoutWinners,
  };
}

function shortAddr(addr: string) {
  if (addr.length <= 14) return addr;
  return `${addr.slice(0, 8)}…${addr.slice(-6)}`;
}

async function main() {
  const archive = JSON.parse(await readFile(archivePath, "utf8")) as {
    totalEntries: number;
    predictions: ArchivePrediction[];
  };
  const officialRaw = JSON.parse(await readFile(officialPath, "utf8"));
  const official = parseBracketStatePayload(officialRaw);
  if (!official) throw new Error("Invalid wc-bracket-state.json");

  const actual = officialAsPrediction(official);
  const decided = countDecidedPlaces(actual);
  const complete = isOfficialBracketComplete(actual);

  const scored = archive.predictions.map((row) => {
    const predicted = decodeArchivePrediction(row);
    const breakdown = scoreBracketPrediction(predicted, actual);
    return {
      owner: row.owner,
      ownerShort: shortAddr(row.owner),
      submittedAt: Number(row.submittedAt),
      ...breakdown,
    };
  });

  scored.sort((a, b) => b.total - a.total || a.submittedAt - b.submittedAt);

  let rank = 0;
  let lastScore = -1;
  const entries = scored.map((row, index) => {
    if (row.total !== lastScore) {
      rank = index + 1;
      lastScore = row.total;
    }
    const topFivePrize =
      rank <= WC_BRACKET_PRIZES_USDC.length ? WC_BRACKET_PRIZES_USDC[rank - 1]! : 0;
    const perfectBonus = row.total === WC_BRACKET_PERFECT_SCORE ? WC_BRACKET_PERFECT_BONUS_USDC : 0;
    return {
      rank,
      owner: row.owner,
      ownerShort: row.ownerShort,
      submittedAt: row.submittedAt,
      total: row.total,
      groupPoints: row.groupPoints,
      thirdPlacePoints: row.thirdPlacePoints,
      knockoutPoints: row.knockoutPoints,
      maxPossible: row.maxPossible,
      prizeTopFiveUsdc: topFivePrize,
      prizePerfectBonusUsdc: perfectBonus,
      prizeTotalUsdc: topFivePrize + perfectBonus,
    };
  });

  const payload = {
    generatedAt: new Date().toISOString(),
    eventId: 10999,
    archiveSource: "archive/movement-snapshot/2026-07-31/bracket.json",
    officialSource: "public/data/wc-bracket-state.json",
    totalEntries: archive.totalEntries,
    decidedPlaces: decided.total,
    tournamentComplete: complete,
    perfectScore: WC_BRACKET_PERFECT_SCORE,
    entries,
  };

  await writeFile(outPath, `${JSON.stringify(payload, null, 2)}\n`);
  console.log(`Wrote ${entries.length} rows → ${outPath}`);
  console.log(`Top score: ${entries[0]?.total ?? 0} (${entries[0]?.ownerShort ?? "—"})`);
}

await main();
