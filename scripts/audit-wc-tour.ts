/**
 * Audit a WC tour: scores, prize tiers, on-chain vs expected payouts.
 * Usage: npx tsx scripts/audit-wc-tour.ts [tourId]
 * Default tourId: latest CLOSED or RESOLVED WC tour from chain scan.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_PRIZE_TIERS,
  getPrizeRecalcArgs,
  getPrizeTiers,
} from "../src/lib/prize-distribution";
import { WC_TOUR_IDS } from "../src/lib/worldcup";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    process.env[k] = v;
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

function fmt(raw: bigint | number): string {
  return (Number(raw) / 1_000_000).toFixed(2);
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

async function main() {
  const tourArg = process.argv[2];
  const {
    getGameweek,
    getGameweekTeams,
    getTeamResult,
    getUserTeam,
    getGameweekStats,
  } = await import("../src/lib/movement");
  const { previewTourPointsFromRegisteredTeam } = await import("../src/lib/chainAlignedScoring");
  const { calculateFantasyPoints, ratingTierAdjustment } = await import("../src/lib/scoring");

  let tourId = tourArg ? Number(tourArg) : NaN;
  if (!Number.isFinite(tourId)) {
    for (const id of [...WC_TOUR_IDS].reverse()) {
      const gw = await getGameweek(id);
      if (gw && (gw.status === "closed" || gw.status === "resolved")) {
        tourId = id;
        break;
      }
    }
  }
  if (!Number.isFinite(tourId)) throw new Error("No WC tour id — pass one explicitly.");

  const gw = await getGameweek(tourId);
  if (!gw) throw new Error(`Tour ${tourId} not found`);

  const addresses = await getGameweekTeams(tourId);
  const teams = await Promise.all(
    addresses.map(async (addr) => ({ addr, team: await getUserTeam(addr, tourId) })),
  );
  const allPlayerIds = Array.from(new Set(teams.flatMap((t) => t.team?.playerIds ?? [])));
  const statsMap = await getGameweekStats(tourId, allPlayerIds);
  const chainRecord: Record<string, Record<string, unknown>> = {};
  for (const [id, s] of Object.entries(statsMap)) {
    chainRecord[id] = s as Record<string, unknown>;
  }

  const scored = teams
    .map(({ addr, team }) => {
      if (!team) return { addr, pts: 0 };
      const pts = previewTourPointsFromRegisteredTeam(team, chainRecord);
      return { addr, pts };
    })
    .sort((a, b) => b.pts - a.pts);

  const tiers = getPrizeTiers(tourId);
  const defaultTiers = DEFAULT_PRIZE_TIERS;
  const prizePool = BigInt(gw.prizePool);
  const expected = assignPrizes(scored, prizePool, tiers);
  const defaultOnly = assignPrizes(scored, prizePool, defaultTiers);
  const recalcArgs = getPrizeRecalcArgs(tourId);

  const onchain = (
    await Promise.all(addresses.map((addr) => getTeamResult(addr, tourId)))
  ).filter((r): r is NonNullable<typeof r> => r !== null);
  onchain.sort((a, b) => a.rank - b.rank || b.finalPoints - a.finalPoints);

  console.log(`Tour ${tourId}: status=${gw.status}, entries=${gw.totalEntries}, pool=${fmt(prizePool)} USDCx`);
  console.log(
    "Tiers:",
    tiers.map((t) => `#${t.rank} ${t.pct}%`).join(", "),
  );
  console.log("Recalc args:", recalcArgs);

  if (gw.status !== "resolved") {
    console.log("\nPreview (not yet on-chain):");
    console.log("Rank | Wallet        | Pts | Expected | Default top-10 |");
    console.log("-----|---------------|-----|----------|----------------|");
    let expSum = 0n;
    let defSum = 0n;
    for (let i = 0; i < scored.length; i++) {
      const s = scored[i];
      const exp = expected.get(s.addr) ?? 0n;
      const def = defaultOnly.get(s.addr) ?? 0n;
      expSum += exp;
      defSum += def;
      console.log(
        `#${String(i + 1).padStart(2)} | ${shortAddr(s.addr).padEnd(13)} | ${String(s.pts).padStart(3)} | ${fmt(exp).padStart(8)} | ${fmt(def).padStart(14)} |`,
      );
    }
    console.log(`\nExpected sum: ${fmt(expSum)} / ${fmt(prizePool)} (${Number((expSum * 100n) / prizePool)}%)`);
    console.log(`Default top-10 sum: ${fmt(defSum)} / ${fmt(prizePool)} (${Number((defSum * 100n) / prizePool)}%)`);
    if (defSum < prizePool) {
      console.log(`\n⚠ Default top-10 leaves ${fmt(prizePool - defSum)} USDCx unallocated with ${gw.totalEntries} entries.`);
    }
    console.log("\nAdmin: Calculate & Publish →", tourId);
    return;
  }

  console.log("\nRank | Wallet        | Pts | On-chain | Expected | Match   | Claimed");
  console.log("-----|---------------|-----|----------|----------|---------|--------");
  let onSum = 0n;
  let expSum = 0n;
  for (const r of onchain) {
    const exp = expected.get(r.owner) ?? 0n;
    onSum += BigInt(r.prizeAmount);
    expSum += exp;
    const ptsOk = scored.find((s) => s.addr.toLowerCase() === r.owner.toLowerCase())?.pts === r.finalPoints;
    const prizeOk = BigInt(r.prizeAmount) === exp;
    const match = ptsOk && prizeOk ? "OK" : ptsOk ? "PRIZE" : "PTS";
    console.log(
      `#${String(r.rank).padStart(2)} | ${shortAddr(r.owner).padEnd(13)} | ${String(r.finalPoints).padStart(3)} | ${fmt(r.prizeAmount).padStart(8)} | ${fmt(exp).padStart(8)} | ${match.padEnd(7)} | ${r.claimed}`,
    );
  }
  console.log(`\nOn-chain sum: ${fmt(onSum)} / ${fmt(prizePool)} (${Number((onSum * 100n) / prizePool)}%)`);
  if (onSum !== expSum) {
    console.log(`Expected sum: ${fmt(expSum)} — MISMATCH, reopen + recalc needed.`);
  } else if (onSum === prizePool) {
    console.log("✓ Prize pool fully distributed among participants.");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
