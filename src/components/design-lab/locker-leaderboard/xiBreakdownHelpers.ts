import {
  computeFantasyPointsBreakdown,
  type PointsBreakdownLineKind,
  type ScoringPlayer,
} from "@/lib/scoring";
import { getFormation, type FormationId } from "@/lib/formation";
import type { LabSquadPlayer } from "./mockData";

const BENCH_SIZE = 3;

export type SquadFormationGroups = {
  formationId: FormationId;
  gk: LabSquadPlayer | null;
  def: LabSquadPlayer[];
  mid: LabSquadPlayer[];
  fwd: LabSquadPlayer[];
  bench: LabSquadPlayer[];
};

/** 14 slots: GK + DEF/MID/FWD (11) + 3 subs — chain order GK→FWD. */
export function groupSquadFormation(
  starters: readonly LabSquadPlayer[],
  bench: readonly LabSquadPlayer[],
  formationId: FormationId,
): SquadFormationGroups {
  const f = getFormation(formationId);
  const defEnd = 1 + f.DEF;
  const midEnd = defEnd + f.MID;
  return {
    formationId,
    gk: starters[0] ?? null,
    def: starters.slice(1, defEnd),
    mid: starters.slice(defEnd, midEnd),
    fwd: starters.slice(midEnd, 11),
    bench: bench.slice(0, BENCH_SIZE),
  };
}

export type SquadFifaRows = {
  top: LabSquadPlayer[];
  bottom: LabSquadPlayer[];
};

/** 2×7: DEF+MID top · GK+FWD+3 subs bottom. */
export function groupSquadFifaRows(groups: SquadFormationGroups): SquadFifaRows {
  return {
    top: [...groups.def, ...groups.mid],
    bottom: [
      ...(groups.gk ? [groups.gk] : []),
      ...groups.fwd,
      ...groups.bench,
    ],
  };
}

const POS_LABEL: Record<number, string> = {
  0: "GK",
  1: "DEF",
  2: "MID",
  3: "FWD",
};

export function playerPositionLabel(player: LabSquadPlayer): string {
  if (player.position) return player.position;
  if (player.positionId != null) return POS_LABEL[player.positionId] ?? "—";
  return "—";
}

export function scoringPlayerFromLab(p: LabSquadPlayer): ScoringPlayer {
  return { positionId: p.positionId ?? 2 };
}

function lineShortLabel(
  kind: PointsBreakdownLineKind,
  count: number | undefined,
  gains: Record<string, string>,
): string {
  const base = gains[kind] ?? kind;
  if (count != null && count > 1) return `${count}× ${base}`;
  return base;
}

function breakdownEntries(
  player: LabSquadPlayer,
  gains: Record<string, string>,
  max = 3,
): { label: string; points: number }[] {
  if (player.subNote) return [{ label: player.subNote, points: 0 }];
  if (!player.stats) return [];
  const lines = computeFantasyPointsBreakdown(
    scoringPlayerFromLab(player),
    player.stats,
  );
  // Keep scoring order; include deductions (YC etc.) so dense GW lines fit.
  const meaningful = lines.filter((l) => l.points !== 0);
  const picked = (meaningful.length ? meaningful : lines).slice(0, max);
  return picked.map((l) => ({
    label: lineShortLabel(l.kind, l.count, gains),
    points: l.points,
  }));
}

function positiveBreakdownEntries(
  player: LabSquadPlayer,
  gains: Record<string, string>,
  max = 3,
): { label: string; points: number }[] {
  return breakdownEntries(player, gains, max).filter((e) => e.points >= 0);
}

function positiveBreakdownLines(
  player: LabSquadPlayer,
  gains: Record<string, string>,
  max = 3,
) {
  return positiveBreakdownEntries(player, gains, max).map((e) => e.label);
}

/** One-line “why” for table rows — max 3 events. */
export function compactBreakdownWhy(
  player: LabSquadPlayer,
  gains: Record<string, string>,
): string {
  const parts = positiveBreakdownLines(player, gains, 3);
  return parts.length ? parts.join(" · ") : "—";
}

/** Scoring rows for card footers — label + pts (up to 5 events). */
export function cardBreakdownEntries(
  player: LabSquadPlayer,
  gains: Record<string, string>,
  max = 5,
): { label: string; points: number }[] {
  return breakdownEntries(player, gains, max);
}

/** Short scoring labels for card footers (max 2 lines). */
export function cardBreakdownLines(
  player: LabSquadPlayer,
  gains: Record<string, string>,
): string[] {
  return positiveBreakdownLines(player, gains, 2);
}

/** Flat scoring feed entries for the whole squad. */
export function squadScoringFeed(
  players: readonly LabSquadPlayer[],
  gains: Record<string, string>,
): { player: LabSquadPlayer; label: string; points: number }[] {
  const out: { player: LabSquadPlayer; label: string; points: number }[] = [];
  for (const player of players) {
    if (!player.stats) continue;
    const lines = computeFantasyPointsBreakdown(scoringPlayerFromLab(player), player.stats);
    for (const line of lines) {
      if (line.points === 0) continue;
      out.push({
        player,
        label: lineShortLabel(line.kind, line.count, gains),
        points: line.points,
      });
    }
  }
  return out.sort((a, b) => b.points - a.points);
}

export function mockStatsForPts(pts: number, positionId: number): Record<string, unknown> {
  if (pts <= 0) {
    return { minutes_played: 0 };
  }
  if (positionId === 0) {
    return {
      minutes_played: 90,
      clean_sheet: pts >= 4,
      saves: pts >= 6 ? 6 : 0,
      goals_conceded: pts < 4 ? 2 : 0,
    };
  }
  const goals = pts >= 10 ? 2 : pts >= 6 ? 1 : 0;
  const assists = pts >= 5 && goals === 0 ? 1 : pts >= 8 && goals === 1 ? 1 : 0;
  return {
    minutes_played: 90,
    goals,
    assists,
    clean_sheet: positionId <= 1 && pts >= 4 && goals === 0,
    bonus: pts >= 8 ? 2 : pts >= 5 ? 1 : 0,
  };
}
