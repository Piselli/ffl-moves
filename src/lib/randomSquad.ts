import { FORMATION, MAX_PER_CLUB } from "@/lib/constants";
import {
  DEFAULT_FORMATION,
  starterSlots,
  type FormationId,
  type PositionKey,
} from "@/lib/formation";
import type { Player } from "@/lib/types";

export type RandomSquadMode = "popular" | "uniform";

const TOP_K_BY_POSITION: Record<PositionKey, number> = {
  GK: 8,
  DEF: 18,
  MID: 22,
  FWD: 15,
};

function isPickable(p: Player): boolean {
  if (p.status == null) return true;
  return p.status === "a" || p.status === "d";
}

function popularityScore(p: Player): number {
  const ownership = p.selectedByPercent ?? 0;
  const form = p.form ?? 0;
  return ownership * 100 + form;
}

function pickPlayer(
  candidates: Player[],
  used: Set<number>,
  clubCounts: Record<number, number>,
  mode: RandomSquadMode,
  topK: number,
): Player | null {
  const eligible = candidates.filter(
    (p) =>
      !used.has(p.id) &&
      (clubCounts[p.teamId] ?? 0) < MAX_PER_CLUB &&
      isPickable(p),
  );

  if (eligible.length === 0) return null;

  if (mode === "uniform") {
    return eligible[Math.floor(Math.random() * eligible.length)];
  }

  const ranked = [...eligible].sort((a, b) => popularityScore(b) - popularityScore(a));
  const slice = ranked.slice(0, Math.min(topK, ranked.length));
  const weights = slice.map((p) => Math.max(0.5, p.selectedByPercent ?? 0.5));
  const total = weights.reduce((sum, w) => sum + w, 0);
  let roll = Math.random() * total;

  for (let i = 0; i < slice.length; i++) {
    roll -= weights[i];
    if (roll <= 0) return slice[i];
  }

  return slice[slice.length - 1] ?? null;
}

function tryBuildRandomSquad(
  players: Player[],
  mode: RandomSquadMode,
  formationId: FormationId,
): { starters: (Player | null)[]; bench: (Player | null)[] } | null {
  const byPosition: Record<PositionKey, Player[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };

  for (const p of players) {
    if (!isPickable(p)) continue;
    byPosition[p.position]?.push(p);
  }

  const used = new Set<number>();
  const clubCounts: Record<number, number> = {};
  const starters: (Player | null)[] = Array(11).fill(null);
  const bench: (Player | null)[] = Array(FORMATION.BENCH).fill(null);

  for (const { position, index } of starterSlots(formationId)) {
    const pick = pickPlayer(
      byPosition[position],
      used,
      clubCounts,
      mode,
      TOP_K_BY_POSITION[position],
    );
    if (!pick) return null;
    starters[index] = pick;
    used.add(pick.id);
    clubCounts[pick.teamId] = (clubCounts[pick.teamId] ?? 0) + 1;
  }

  for (let i = 0; i < FORMATION.BENCH; i++) {
    const pick = pickPlayer(players, used, clubCounts, mode, 28);
    if (!pick) return null;
    bench[i] = pick;
    used.add(pick.id);
    clubCounts[pick.teamId] = (clubCounts[pick.teamId] ?? 0) + 1;
  }

  return { starters, bench };
}

/** XI + bench for the chosen formation; respects max 3 per club/nation. */
export function buildRandomSquad(
  players: Player[],
  options?: {
    mode?: RandomSquadMode;
    maxAttempts?: number;
    formationId?: FormationId;
  },
): { starters: (Player | null)[]; bench: (Player | null)[] } | null {
  if (players.length === 0) return null;

  const mode = options?.mode ?? "uniform";
  const formationId = options?.formationId ?? DEFAULT_FORMATION;
  const maxAttempts = options?.maxAttempts ?? (mode === "uniform" ? 48 : 12);

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const squad = tryBuildRandomSquad(players, mode, formationId);
    if (squad) return squad;
  }

  return null;
}

/** EPL: weighted toward high FPL ownership. */
export function buildRandomPopularSquad(
  players: Player[],
  maxAttempts = 12,
  formationId: FormationId = DEFAULT_FORMATION,
): { starters: (Player | null)[]; bench: (Player | null)[] } | null {
  return buildRandomSquad(players, { mode: "popular", maxAttempts, formationId });
}
