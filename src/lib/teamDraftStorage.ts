import type { Dispatch, SetStateAction } from "react";
import type { Player } from "@/lib/types";
import { MAX_PER_CLUB, FORMATION } from "@/lib/constants";

export type TeamDraftPayload = {
  starterIds: (number | null)[];
  benchIds: (number | null)[];
  gwId?: number | null;
};

export function fflTeamDraftKey(gwId: number, addr: string) {
  return `ffl_team_draft_v1_gw${gwId}_${addr}`;
}

export function wcTeamDraftKey(tourId: number, addr: string) {
  return `wc_team_draft_v1_t${tourId}_${addr}`;
}

/** Homepage locker picker — guest draft, no wallet required. */
export function homeTeamDraftKey() {
  return "ffl_home_draft_v1";
}

export function lineupIdsDraftPayload(
  starters: (Player | null)[],
  bench: (Player | null)[],
): TeamDraftPayload {
  return {
    starterIds: starters.map((p) => (p ? p.id : null)),
    benchIds: bench.map((p) => (p ? p.id : null)),
  };
}

export function lineupIsEmpty(starters: (Player | null)[], bench: (Player | null)[]): boolean {
  const draft = lineupIdsDraftPayload(starters, bench);
  return (
    draft.starterIds.every((id) => id == null) && draft.benchIds.every((id) => id == null)
  );
}

function lineupIdsFromDraft(
  draft: TeamDraftPayload,
  catalog: Map<number, Player>,
): { starters: (Player | null)[]; bench: (Player | null)[] } | null {
  if (!Array.isArray(draft.starterIds) || draft.starterIds.length !== 11) return null;
  if (!Array.isArray(draft.benchIds) || draft.benchIds.length !== FORMATION.BENCH) return null;
  const starters = draft.starterIds.map((id) =>
    typeof id !== "number" ? null : (catalog.get(id) ?? null),
  );
  const bench = draft.benchIds.map((id) =>
    typeof id !== "number" ? null : (catalog.get(id) ?? null),
  );
  return { starters, bench };
}

function validateRestoredLineup(
  restored: { starters: (Player | null)[]; bench: (Player | null)[] },
  catalog: Map<number, Player>,
): boolean {
  const hasAnyone = [...restored.starters, ...restored.bench].some(Boolean);
  if (!hasAnyone) return false;

  const unique = new Set<number>();
  let dupOrBad = false;
  const registerId = (p: Player | null) => {
    if (!p) return;
    if (unique.has(p.id)) dupOrBad = true;
    unique.add(p.id);
  };
  restored.starters.forEach(registerId);
  restored.bench.forEach(registerId);

  let clubViolation = false;
  const counts: Record<number, number> = {};
  Array.from(unique).forEach((id) => {
    const p = catalog.get(id);
    if (!p) {
      dupOrBad = true;
      return;
    }
    const n = (counts[p.teamId] = (counts[p.teamId] || 0) + 1);
    if (n > MAX_PER_CLUB) clubViolation = true;
  });
  return !dupOrBad && !clubViolation;
}

/** Restore an open-tour draft from localStorage. Returns the lineup or null. */
export function readRestoredTeamDraft(
  storageKey: string,
  playersCatalog: Player[],
  expectedGwId?: number | null,
): { starters: (Player | null)[]; bench: (Player | null)[] } | null {
  if (typeof window === "undefined" || playersCatalog.length === 0) return null;

  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as TeamDraftPayload;
    if (
      expectedGwId != null &&
      parsed.gwId != null &&
      parsed.gwId !== expectedGwId
    ) {
      return null;
    }
    const catalog = new Map(playersCatalog.map((p) => [p.id, p]));
    const restored = lineupIdsFromDraft(parsed, catalog);
    if (!restored || !validateRestoredLineup(restored, catalog)) return null;
    return restored;
  } catch {
    return null;
  }
}

/** Restore an open-tour draft from localStorage. Returns true when at least one slot was filled. */
export function tryHydrateTeamDraftFromStorage(
  storageKey: string,
  playersCatalog: Player[],
  setStarters: Dispatch<SetStateAction<(Player | null)[]>>,
  setBench: Dispatch<SetStateAction<(Player | null)[]>>,
  expectedGwId?: number | null,
): boolean {
  const restored = readRestoredTeamDraft(storageKey, playersCatalog, expectedGwId);
  if (!restored) return false;
  setStarters(restored.starters);
  setBench(restored.bench);
  return true;
}

/** Write draft immediately (navigation-safe). */
export function persistTeamDraftFromLineup(
  storageKey: string,
  starters: (Player | null)[],
  bench: (Player | null)[],
  options?: { removeIfEmptyAndTouched?: boolean; gwId?: number | null },
): void {
  if (typeof window === "undefined") return;

  const draft: TeamDraftPayload = {
    ...lineupIdsDraftPayload(starters, bench),
    ...(options?.gwId != null ? { gwId: options.gwId } : {}),
  };
  const isEmpty = lineupIsEmpty(starters, bench);

  try {
    if (isEmpty) {
      if (options?.removeIfEmptyAndTouched) {
        window.localStorage.removeItem(storageKey);
      }
    } else {
      window.localStorage.setItem(storageKey, JSON.stringify(draft));
    }
  } catch {
    /* ignore quota / privacy mode */
  }
}

export function readTeamDraftHasPlayers(storageKey: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    const raw = window.localStorage.getItem(storageKey);
    if (!raw) return false;
    const parsed = JSON.parse(raw) as TeamDraftPayload;
    return (
      parsed.starterIds?.some((id) => id != null) === true ||
      parsed.benchIds?.some((id) => id != null) === true
    );
  } catch {
    return false;
  }
}
