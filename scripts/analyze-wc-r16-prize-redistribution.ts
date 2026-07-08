/**
 * Compare R16 (10005) prize payouts: current top-10 grid vs top-5 grid for 5 entries.
 * Usage: npx tsx scripts/analyze-wc-r16-prize-redistribution.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PRIZE_TIERS,
  WC_R16_PRIZE_TIERS,
  getPrizeRecalcArgs,
} from "../src/lib/prize-distribution";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const TOUR_ID = 10005;

function loadDotEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadDotEnvLocal();

function prizePctForRank(tiers: readonly { rank: number; pct: number }[], rank: number): number {
  return tiers.find((t) => t.rank === rank)?.pct ?? 0;
}

function assignPrizes(
  rows: { addr: string; pts: number }[],
  prizePool: bigint,
  tiers: readonly { rank: number; pct: number }[],
): Map<string, bigint> {
  const sorted = [...rows].sort((a, b) => b.pts - a.pts);
  const out = new Map<string, bigint>();
  let i = 0;
  while (i < sorted.length) {
    const pts = sorted[i].pts;
    let j = i + 1;
    while (j < sorted.length && sorted[j].pts === pts) j++;
    const tieCount = j - i;
    const compRank = i + 1;
    let sumPct = 0;
    for (let slot = compRank; slot <= compRank + tieCount - 1; slot++) {
      sumPct += prizePctForRank(tiers, slot);
    }
    const groupTotal = (prizePool * BigInt(sumPct)) / 100n;
    const shareBase = groupTotal / BigInt(tieCount);
    const shareRem = Number(groupTotal % BigInt(tieCount));
    for (let t = 0; t < tieCount; t++) {
      const extra = t < shareRem ? 1n : 0n;
      out.set(sorted[i + t].addr, shareBase + extra);
    }
    i = j;
  }
  return out;
}

function fmt(raw: bigint): string {
  return (Number(raw) / 1_000_000).toFixed(2);
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

async function main() {
  const { getGameweek, getGameweekTeams, getTeamResult } = await import("../src/lib/movement");

  const gw = await getGameweek(TOUR_ID);
  if (!gw) throw new Error(`Tour ${TOUR_ID} not found`);

  const addresses = await getGameweekTeams(TOUR_ID);
  const results = (
    await Promise.all(addresses.map((addr) => getTeamResult(addr, TOUR_ID)))
  ).filter((r): r is NonNullable<typeof r> => r !== null);
  results.sort((a, b) => a.rank - b.rank || b.finalPoints - a.finalPoints);

  const scores = results.map((r) => ({ addr: r.owner, pts: r.finalPoints }));
  const prizePool = BigInt(gw.prizePool);
  const oldPrizes = assignPrizes(scores, prizePool, DEFAULT_PRIZE_TIERS);
  const newPrizes = assignPrizes(scores, prizePool, WC_R16_PRIZE_TIERS);
  const recalcArgs = getPrizeRecalcArgs(TOUR_ID);

  console.log(`Tour ${TOUR_ID}: status=${gw.status}, entries=${gw.totalEntries}, pool=${fmt(prizePool)} USDCx`);
  console.log("New tiers:", WC_R16_PRIZE_TIERS.map((t) => `#${t.rank} ${t.pct}%`).join(", "));
  console.log("Recalc args:", recalcArgs);
  console.log("\nRank | Wallet        | Pts | Old prize | New prize | Delta   | Claimed");
  console.log("-----|---------------|-----|-----------|-----------|---------|--------");

  let oldTotal = 0n;
  let newTotal = 0n;
  for (const r of results) {
    const oldAmt = oldPrizes.get(r.owner) ?? 0n;
    const newAmt = newPrizes.get(r.owner) ?? 0n;
    oldTotal += oldAmt;
    newTotal += newAmt;
    const delta = newAmt - oldAmt;
    console.log(
      `#${String(r.rank).padStart(2)} | ${shortAddr(r.owner).padEnd(13)} | ${String(r.finalPoints).padStart(3)} | ${fmt(oldAmt).padStart(9)} | ${fmt(newAmt).padStart(9)} | ${(delta >= 0n ? "+" : "") + fmt(delta).padStart(6)} | ${r.claimed}`,
    );
  }

  console.log(`\nOld payout sum: ${fmt(oldTotal)} / ${fmt(prizePool)} USDCx (${Number((oldTotal * 100n) / prizePool)}%)`);
  console.log(`New payout sum: ${fmt(newTotal)} / ${fmt(prizePool)} USDCx (${Number((newTotal * 100n) / prizePool)}%)`);
  console.log("\nAdmin steps: reopen_gameweek(10005) → Calculate & Publish (uses new tiers) → mark claimed for wallets that already claimed.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
