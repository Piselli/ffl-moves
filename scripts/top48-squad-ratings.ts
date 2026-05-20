/**
 * Top-48 squads for a GW + how many of 14 roster slots have on-chain match rating (rating != 0).
 *
 *   pnpm exec tsx scripts/top48-squad-ratings.ts [gameweekId]
 *
 * If gameweekId omitted, uses config.current_gameweek from chain.
 */
import {
  getConfig,
  getGameweek,
  getGameweekStats,
  getGameweekTeams,
  getTeamResult,
  getUserTeam,
} from "../src/lib/movement";
import { previewTourPointsFromRegisteredTeam } from "../src/lib/chainAlignedScoring";

function chainStatsRecord(statsMap: Record<number, Record<string, unknown>>) {
  const chainRecord: Record<string, Record<string, unknown>> = {};
  for (const [id, s] of Object.entries(statsMap)) {
    chainRecord[id] = s;
  }
  return chainRecord;
}

function countRated(
  playerIds: number[],
  statsMap: Record<number, { rating?: number } | undefined>,
): number {
  let n = 0;
  for (const pid of playerIds) {
    const st = statsMap[pid];
    if (!st) continue;
    const r = Number(st.rating);
    if (Number.isFinite(r) && r !== 0) n++;
  }
  return n;
}

async function main() {
  const fromArg = Number(process.argv[2] ?? "");
  const cfg = await getConfig();
  const gwId =
    Number.isFinite(fromArg) && fromArg > 0 ? fromArg : Number(cfg?.currentGameweek ?? 0);
  if (!Number.isFinite(gwId) || gwId < 1) {
    console.error("Usage: pnpm exec tsx scripts/top48-squad-ratings.ts [gameweekId]");
    process.exit(1);
  }

  const [gw, addresses] = await Promise.all([getGameweek(gwId), getGameweekTeams(gwId)]);
  const teams = await Promise.all(
    addresses.map(async (addr) => {
      const [team, tr] = await Promise.all([getUserTeam(addr, gwId), getTeamResult(addr, gwId)]);
      return { addr, team, tr };
    }),
  );

  const allPlayerIds = Array.from(
    new Set(teams.flatMap((t) => (t.team?.playerIds ?? []).filter((id) => id > 0))),
  );
  const statsMap = await getGameweekStats(gwId, allPlayerIds);
  const chainRecord = chainStatsRecord(statsMap as Record<number, Record<string, unknown>>);

  const rows = teams
    .filter((t) => t.team && t.team.playerIds.length > 0)
    .map((t) => {
      const team = t.team!;
      const previewPts = previewTourPointsFromRegisteredTeam(team, chainRecord);
      const finalPts = t.tr?.finalPoints ?? 0;
      const rank = t.tr?.rank ?? 0;
      const hasPublished = Boolean(t.tr && rank >= 1);
      const sortScore = hasPublished ? finalPts : previewPts;
      return {
        addr: t.addr,
        rank,
        finalPts,
        previewPts,
        sortScore,
        hasPublished,
        roster: team.playerIds.length,
        rated: countRated(team.playerIds, statsMap),
      };
    });

  const useFinal = gw?.status === "resolved" && rows.some((r) => r.hasPublished);
  rows.sort((a, b) => {
    if (useFinal) {
      if (b.finalPts !== a.finalPts) return b.finalPts - a.finalPts;
      const ar = a.rank > 0 ? a.rank : 9999;
      const br = b.rank > 0 ? b.rank : 9999;
      return ar - br;
    }
    return b.previewPts - a.previewPts;
  });

  const top = rows.slice(0, 48);

  console.log(
    JSON.stringify(
      {
        gameweekId: gwId,
        chainStatus: gw?.status ?? null,
        sortMode: useFinal ? "finalPoints+rank (resolved)" : "previewPreMultiplier (open/closed)",
        totalSquads: rows.length,
        top48: top.map((r, i) => ({
          pos: i + 1,
          address: r.addr,
          rank: r.rank || null,
          points: useFinal ? r.finalPts : r.previewPts,
          ratedPlayers: r.rated,
          rosterSize: r.roster,
          ratedLabel: `${r.rated}/${r.roster}`,
        })),
      },
      null,
      2,
    ),
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
