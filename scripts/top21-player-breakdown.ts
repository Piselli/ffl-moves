/**
 * Top 21 squads for a GW with per-slot MOVEMATCH points (base + rating tier per effective XI player;
 * net team rating bonus applied once — see preMultiplier breakdown).
 *
 *   pnpm exec tsx scripts/top21-player-breakdown.ts [gameweekId]
 */
import type { Player } from "../src/lib/types";
import {
  getConfig,
  getGameweek,
  getGameweekStats,
  getGameweekTeams,
  getTeamResult,
  getUserTeam,
} from "../src/lib/movement";
import { previewTourPointsFromRegisteredTeam, computeChainAlignedXiBreakdown } from "../src/lib/chainAlignedScoring";
import { squadPlayersFromChain } from "../src/lib/fplSquadResolve";
import { calculateFantasyPoints, ratingTierAdjustment } from "../src/lib/scoring";

const FPL_BASE = "https://fantasy.premierleague.com/api";
const HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

function chainStatsRecord(statsMap: Record<number, Record<string, unknown>>) {
  const chainRecord: Record<string, Record<string, unknown>> = {};
  for (const [id, s] of Object.entries(statsMap)) {
    chainRecord[id] = s;
  }
  return chainRecord;
}

async function loadFplCatalog(): Promise<Map<number, Player>> {
  const res = await fetch(`${FPL_BASE}/bootstrap-static/`, { headers: HEADERS, cache: "no-store" });
  if (!res.ok) throw new Error(`FPL bootstrap ${res.status}`);
  const data = (await res.json()) as {
    elements?: {
      id: number;
      element_type: number;
      team: number;
      web_name?: string;
      first_name?: string;
      second_name?: string;
    }[];
    teams?: { id: number; name: string; short_name?: string }[];
  };
  const teamById = new Map<number, string>();
  for (const t of data.teams ?? []) {
    teamById.set(t.id, t.short_name ?? t.name);
  }
  const map = new Map<number, Player>();
  const POS = ["GK", "DEF", "MID", "FWD"] as const;
  for (const el of data.elements ?? []) {
    const posId = Math.max(0, Math.min(3, (el.element_type ?? 3) - 1));
    map.set(el.id, {
      id: el.id,
      fplId: el.id,
      name: [el.first_name, el.second_name].filter(Boolean).join(" ") || el.web_name || `Player ${el.id}`,
      webName: el.web_name ?? `Player ${el.id}`,
      team: teamById.get(el.team) ?? "?",
      teamId: el.team,
      position: POS[posId],
      positionId: posId,
    });
  }
  return map;
}

function pickStats(
  gameweekStats: Record<string, Record<string, unknown>>,
  playerId: number,
): Record<string, unknown> | null {
  const raw = gameweekStats[playerId] ?? gameweekStats[String(playerId)];
  return raw && typeof raw === "object" ? (raw as Record<string, unknown>) : null;
}

async function main() {
  const fromArg = Number(process.argv[2] ?? "");
  const cfg = await getConfig();
  const gwId =
    Number.isFinite(fromArg) && fromArg > 0 ? fromArg : Number(cfg?.currentGameweek ?? 0);
  if (!Number.isFinite(gwId) || gwId < 1) {
    console.error("Usage: pnpm exec tsx scripts/top21-player-breakdown.ts [gameweekId]");
    process.exit(1);
  }

  const [gw, catalog] = await Promise.all([getGameweek(gwId), loadFplCatalog()]);
  const addresses = await getGameweekTeams(gwId);
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
      return { addr: t.addr, team, tr: t.tr, rank, finalPts, previewPts, sortScore, hasPublished };
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

  const top = rows.slice(0, 21);

  const out = top.map((r, listPos) => {
    const squad = squadPlayersFromChain(
      { playerIds: r.team.playerIds, playerPositions: r.team.playerPositions },
      catalog,
    );
    const starters = squad.slice(0, 11);
    const bench = squad.slice(11, 14);
    const xi = computeChainAlignedXiBreakdown(starters, bench, chainRecord);

    let ratingNet = 0;
    if (xi.totalRatingAdd >= xi.totalRatingSub) {
      ratingNet = xi.totalRatingAdd - xi.totalRatingSub;
    } else {
      ratingNet = -(xi.totalRatingSub - xi.totalRatingAdd);
    }

    const xiRows = xi.slots.map((s) => ({
      slot: s.slotIndex + 1,
      registered: `${s.registeredStarter.webName} (${s.registeredStarter.team})`,
      countsAs: s.substituted
        ? `${s.effectivePlayer.webName} (${s.effectivePlayer.team}) [автозаміна]`
        : `${s.effectivePlayer.webName} (${s.effectivePlayer.team})`,
      basePts: s.basePoints,
      ratingAdd: s.ratingAdd,
      ratingSub: s.ratingSub,
      /** Contribution to totalBase only (rating applied once per squad). */
      slotBaseTotal: s.basePoints,
    }));

    const benchRows = bench.map((p, i) => {
      const st = pickStats(chainRecord, p.id);
      const base = st ? calculateFantasyPoints({ positionId: p.positionId }, st) : 0;
      const rt = st ? ratingTierAdjustment(st) : { add: 0, sub: 0 };
      return {
        benchSlot: i + 1,
        player: `${p.webName} (${p.team})`,
        rawPtsIfPlayed: base,
        ratingAdd: rt.add,
        ratingSub: rt.sub,
        note: "з лави в зарахунок потрапляє лише при автозаміні",
      };
    });

    const tr = r.tr;
    return {
      listPos: listPos + 1,
      address: r.addr,
      chainRank: r.rank || null,
      /** Очки для сортування в цьому звіті (lanцюг final після множників, інакше preview). */
      leaderboardSortPoints: useFinal ? r.finalPts : r.previewPts,
      /** До множників титулу/гільдії — збігається з розрахунком по слотах (xi). */
      preMultiplierFromXi: xi.preMultiplier,
      chainResult: tr
        ? {
            basePoints: tr.basePoints,
            ratingBonusNet: tr.ratingBonus,
            finalPoints: tr.finalPoints,
          }
        : null,
      sortLabel: useFinal ? "final (lanцюг)" : "preview (до титулу/гільдії)",
      xiMath: {
        totalBase: xi.totalBase,
        totalRatingAdd: xi.totalRatingAdd,
        totalRatingSub: xi.totalRatingSub,
        ratingNetAppliedOnce: ratingNet,
        preMultiplier: xi.preMultiplier,
      },
      xi: xiRows,
      bench: benchRows,
    };
  });

  console.log(JSON.stringify({ gameweekId: gwId, chainStatus: gw?.status ?? null, sortMode: useFinal ? "final" : "preview", top21: out }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
