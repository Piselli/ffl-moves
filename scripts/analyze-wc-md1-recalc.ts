/**
 * Compare MD1 (tour 10001) scores: current on-chain vs fixed auto-sub
 * (missing starter stats treated as 0 minutes).
 *
 * Usage: npx tsx scripts/analyze-wc-md1-recalc.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const TOUR_ID = 10001;

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

type ScoredRow = {
  addr: string;
  oldPts: number;
  newPts: number;
  delta: number;
  oldRank: number;
  newRank: number;
  rankDelta: number;
  oldPrize: bigint;
  newPrize: bigint;
  prizeDelta: bigint;
  claimed: boolean;
  subDetails: string[];
};

const PRIZE_RANKS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
const PRIZE_PCTS = [30, 20, 15, 8, 7, 6, 5, 4, 3, 2];

function prizePctForRank(rank: number): number {
  for (let i = 0; i < PRIZE_RANKS.length; i++) {
    if (rank === PRIZE_RANKS[i]) return PRIZE_PCTS[i];
  }
  return 0;
}

function assignPrizes(
  rows: { addr: string; pts: number }[],
  prizePool: bigint,
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
      sumPct += prizePctForRank(slot);
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

function rankMap(rows: { addr: string; pts: number }[]): Map<string, number> {
  const sorted = [...rows].sort((a, b) => b.pts - a.pts);
  const out = new Map<string, number>();
  let i = 0;
  while (i < sorted.length) {
    const pts = sorted[i].pts;
    let j = i + 1;
    while (j < sorted.length && sorted[j].pts === pts) j++;
    const compRank = i + 1;
    for (let t = i; t < j; t++) out.set(sorted[t].addr, compRank);
    i = j;
  }
  return out;
}

function shortAddr(a: string): string {
  return `${a.slice(0, 6)}…${a.slice(-4)}`;
}

async function main() {
  const {
    getGameweek,
    getGameweekTeams,
    getUserTeam,
    getGameweekStats,
    getTeamResult,
  } = await import("../src/lib/movement");
  const { previewTourPointsFromRegisteredTeam, computeChainAlignedXiBreakdown } = await import(
    "../src/lib/chainAlignedScoring",
  );
  const { placeholderPlayerFromChain } = await import("../src/lib/fplSquadResolve");

  const gw = await getGameweek(TOUR_ID);
  if (!gw) throw new Error(`Tour ${TOUR_ID} not found`);
  console.log(`Tour ${TOUR_ID}: status=${gw.status}, entries=${gw.totalEntries}, prizePool=${gw.prizePool}`);

  const addresses = await getGameweekTeams(TOUR_ID);
  console.log(`Registered teams: ${addresses.length}`);

  const teams = await Promise.all(
    addresses.map(async (addr) => {
      const team = await getUserTeam(addr, TOUR_ID);
      const result = await getTeamResult(addr, TOUR_ID);
      return { addr, team, result };
    }),
  );

  const allPlayerIds = Array.from(new Set(teams.flatMap((t) => t.team?.playerIds ?? [])));
  const statsMap = await getGameweekStats(TOUR_ID, allPlayerIds);

  const chainRecord: Record<string, Record<string, unknown>> = {};
  for (const [id, s] of Object.entries(statsMap)) {
    chainRecord[String(id)] = s as Record<string, unknown>;
  }

  // Fixed record: inject 0-minute entries for XI starters missing stats
  const fixedRecord: Record<string, Record<string, unknown>> = { ...chainRecord };
  for (const { team } of teams) {
    if (!team) continue;
    for (let i = 0; i < 11; i++) {
      const pid = team.playerIds[i];
      const key = String(pid);
      if (!fixedRecord[key]) {
        fixedRecord[key] = {
          minutes_played: 0,
          goals: 0,
          assists: 0,
          clean_sheet: false,
          saves: 0,
          penalties_saved: 0,
          penalties_missed: 0,
          own_goals: 0,
          yellow_cards: 0,
          red_cards: 0,
          rating: 0,
          goals_conceded: 0,
          bonus: 0,
          fpl_clean_sheets: 0,
        };
      }
    }
  }

  let teamsWithSubChange = 0;
  let totalDeltaPts = 0;
  const changedTeams: ScoredRow[] = [];
  const oldScores: { addr: string; pts: number }[] = [];
  const newScores: { addr: string; pts: number }[] = [];

  for (const { addr, team, result } of teams) {
    if (!team?.playerIds?.length) continue;
    const oldPts = previewTourPointsFromRegisteredTeam(team, chainRecord);
    const newPts = previewTourPointsFromRegisteredTeam(team, fixedRecord);
    oldScores.push({ addr, pts: oldPts });
    newScores.push({ addr, pts: newPts });

    if (oldPts !== newPts) {
      teamsWithSubChange++;
      totalDeltaPts += newPts - oldPts;

      const starters = team.playerIds.slice(0, 11).map((id, i) => {
        const pos = team.playerPositions[i] ?? 2;
        return placeholderPlayerFromChain(id, pos);
      });
      const bench = team.playerIds.slice(11).map((id, i) => {
        const pos = team.playerPositions[11 + i] ?? 2;
        return placeholderPlayerFromChain(id, pos);
      });
      const oldBd = computeChainAlignedXiBreakdown(starters, bench, chainRecord);
      const newBd = computeChainAlignedXiBreakdown(starters, bench, fixedRecord);
      const subDetails: string[] = [];
      for (const slot of newBd.slots) {
        const oldSlot = oldBd.slots.find((s) => s.slotIndex === slot.slotIndex);
        const oldSlotPts = oldSlot ? oldSlot.basePoints + oldSlot.ratingAdd - oldSlot.ratingSub : 0;
        const newSlotPts = slot.basePoints + slot.ratingAdd - slot.ratingSub;
        if (oldSlotPts !== newSlotPts) {
          subDetails.push(
            `slot${slot.slotIndex} id${slot.registeredStarter.id} ${oldSlotPts}→${newSlotPts}` +
              (slot.substituted ? ` via ${slot.effectivePlayer.id}` : ""),
          );
        }
      }

      changedTeams.push({
        addr,
        oldPts,
        newPts,
        delta: newPts - oldPts,
        oldRank: 0,
        newRank: 0,
        rankDelta: 0,
        oldPrize: 0n,
        newPrize: 0n,
        prizeDelta: 0n,
        claimed: result?.claimed ?? false,
        subDetails,
      });
    }
  }

  const prizePool = BigInt(gw.prizePool);
  const oldPrizes = assignPrizes(oldScores, prizePool);
  const newPrizes = assignPrizes(newScores, prizePool);
  const oldRanks = rankMap(oldScores);
  const newRanks = rankMap(newScores);

  for (const row of changedTeams) {
    row.oldRank = oldRanks.get(row.addr) ?? 0;
    row.newRank = newRanks.get(row.addr) ?? 0;
    row.rankDelta = row.oldRank - row.newRank;
    row.oldPrize = oldPrizes.get(row.addr) ?? 0n;
    row.newPrize = newPrizes.get(row.addr) ?? 0n;
    row.prizeDelta = row.newPrize - row.oldPrize;
  }

  changedTeams.sort((a, b) => b.delta - a.delta || a.oldRank - b.oldRank);

  console.log("\n=== SUB IMPACT SUMMARY ===");
  console.log(`Teams affected: ${teamsWithSubChange} / ${teams.length}`);
  console.log(`Total points gained across all teams: +${totalDeltaPts}`);

  const claimedWinners = teams.filter((t) => t.result?.claimed).length;
  const anyClaimed = teams.some((t) => t.result?.claimed);
  console.log(`Prize claims already made: ${claimedWinners} team(s)`);
  console.log(`Any claimed: ${anyClaimed}`);

  console.log("\n=== TOP RANK CHANGES (any team) ===");
  const allRankChanges: { addr: string; oldRank: number; newRank: number; oldPts: number; newPts: number }[] = [];
  for (const { addr, team } of teams) {
    if (!team) continue;
    const oldPts = previewTourPointsFromRegisteredTeam(team, chainRecord);
    const newPts = previewTourPointsFromRegisteredTeam(team, fixedRecord);
    const or = oldRanks.get(addr) ?? 0;
    const nr = newRanks.get(addr) ?? 0;
    if (or !== nr || oldPts !== newPts) {
      allRankChanges.push({ addr, oldRank: or, newRank: nr, oldPts, newPts });
    }
  }
  allRankChanges.sort((a, b) => a.newRank - b.newRank);
  for (const r of allRankChanges.slice(0, 25)) {
    console.log(
      `#${r.oldRank}→#${r.newRank} ${shortAddr(r.addr)} pts ${r.oldPts}→${r.newPts} (${r.newPts - r.oldPts >= 0 ? "+" : ""}${r.newPts - r.oldPts})`,
    );
  }
  if (allRankChanges.length > 25) console.log(`… and ${allRankChanges.length - 25} more`);

  console.log("\n=== PRIZE POOL REDISTRIBUTION (top 10 ranks) ===");
  for (let rank = 1; rank <= 10; rank++) {
    const oldAt = oldScores.filter((s) => oldRanks.get(s.addr) === rank);
    const newAt = newScores.filter((s) => newRanks.get(s.addr) === rank);
    const oldAddrs = oldAt.map((s) => shortAddr(s.addr)).join(", ") || "—";
    const newAddrs = newAt.map((s) => shortAddr(s.addr)).join(", ") || "—";
    if (oldAddrs !== newAddrs) {
      console.log(`Rank ${rank}: ${oldAddrs} → ${newAddrs}`);
    }
  }

  console.log("\n=== TEAMS WITH SCORE CHANGES (detail) ===");
  for (const row of changedTeams) {
    console.log(
      `${shortAddr(row.addr)}: ${row.oldPts}→${row.newPts} (+${row.delta}) rank #${row.oldRank}→#${row.newRank} prize ${row.oldPrize}→${row.newPrize}${row.claimed ? " [CLAIMED]" : ""}`,
    );
    for (const d of row.subDetails) console.log(`  ${d}`);
  }

  console.log("\n=== PODIUM ===");
  const printPodium = (label: string, scores: { addr: string; pts: number }[], ranks: Map<string, number>) => {
    console.log(label);
    for (let r = 1; r <= 3; r++) {
      const at = scores.filter((s) => ranks.get(s.addr) === r);
      for (const s of at) {
        console.log(`  #${r} ${shortAddr(s.addr)} ${s.pts} pts prize=${oldPrizes.get(s.addr) ?? newPrizes.get(s.addr)}`);
      }
    }
  };
  printPodium("BEFORE:", oldScores, oldRanks);
  printPodium("AFTER:", newScores, newRanks);

  const prizeShifts = teams
    .filter((t) => t.team)
    .map(({ addr }) => ({
      addr,
      delta: (newPrizes.get(addr) ?? 0n) - (oldPrizes.get(addr) ?? 0n),
      claimed: teams.find((x) => x.addr === addr)?.result?.claimed ?? false,
    }))
    .filter((x) => x.delta !== 0n)
    .sort((a, b) => (a.delta > b.delta ? -1 : a.delta < b.delta ? 1 : 0));

  console.log("\n=== PRIZE DELTAS (non-zero) ===");
  for (const p of prizeShifts) {
    console.log(`${shortAddr(p.addr)}: ${p.delta >= 0n ? "+" : ""}${p.delta}${p.claimed ? " [CLAIMED]" : ""}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
