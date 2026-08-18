/**
 * Squad formation schemes — both allowed on-chain and in pick UI.
 * Slot order is always GK → DEF… → MID… → FWD… (11 starters).
 */

export type FormationId = "4-3-3" | "3-4-3";
export type PositionKey = "GK" | "DEF" | "MID" | "FWD";

export type FormationShape = {
  id: FormationId;
  label: string;
  GK: 1;
  DEF: number;
  MID: number;
  FWD: number;
};

export const DEFAULT_FORMATION: FormationId = "4-3-3";

export const FORMATIONS: Record<FormationId, FormationShape> = {
  "4-3-3": { id: "4-3-3", label: "4-3-3", GK: 1, DEF: 4, MID: 3, FWD: 3 },
  "3-4-3": { id: "3-4-3", label: "3-4-3", GK: 1, DEF: 3, MID: 4, FWD: 3 },
};

export const FORMATION_OPTIONS: readonly FormationId[] = ["4-3-3", "3-4-3"];

export function isFormationId(value: string): value is FormationId {
  return value === "4-3-3" || value === "3-4-3";
}

export function getFormation(id?: FormationId | null): FormationShape {
  return FORMATIONS[id && isFormationId(id) ? id : DEFAULT_FORMATION];
}

/** Position for starter index 0–10 in the given formation. */
export function slotPosition(
  index: number,
  formationId: FormationId = DEFAULT_FORMATION,
): PositionKey {
  const f = getFormation(formationId);
  if (index <= 0) return "GK";
  if (index <= f.DEF) return "DEF";
  if (index <= f.DEF + f.MID) return "MID";
  return "FWD";
}

export type StarterSlot = { position: PositionKey; index: number };

export function starterSlots(
  formationId: FormationId = DEFAULT_FORMATION,
): StarterSlot[] {
  const f = getFormation(formationId);
  const out: StarterSlot[] = [{ position: "GK", index: 0 }];
  for (let i = 0; i < f.DEF; i++) out.push({ position: "DEF", index: 1 + i });
  for (let i = 0; i < f.MID; i++) {
    out.push({ position: "MID", index: 1 + f.DEF + i });
  }
  for (let i = 0; i < f.FWD; i++) {
    out.push({ position: "FWD", index: 1 + f.DEF + f.MID + i });
  }
  return out;
}

/** Pitch lanes FWD → GK (display top → bottom), as index slices into starters[0..10]. */
export function formationLanes(
  formationId: FormationId = DEFAULT_FORMATION,
): { key: string; slice: [number, number] }[] {
  const f = getFormation(formationId);
  const defEnd = 1 + f.DEF;
  const midEnd = defEnd + f.MID;
  return [
    { key: "fwd", slice: [midEnd, midEnd + f.FWD] },
    { key: "mid", slice: [defEnd, midEnd] },
    { key: "def", slice: [1, defEnd] },
    { key: "gk", slice: [0, 1] },
  ];
}

/** Starter indices per pitch row (FWD → GK). */
export function formationRows(
  formationId: FormationId = DEFAULT_FORMATION,
): number[][] {
  return formationLanes(formationId).map(({ slice: [a, b] }) =>
    Array.from({ length: b - a }, (_, i) => a + i),
  );
}

/**
 * Infer formation from on-chain / catalog position ids (0 GK, 1 DEF, 2 MID, 3 FWD).
 * Uses the first 11 starter slots. Falls back to default when ambiguous.
 */
function countStarterPositions(positions: readonly number[]) {
  let def = 0;
  let mid = 0;
  let fwd = 0;
  let gk = 0;
  for (const raw of positions.slice(0, 11)) {
    if (raw === 0) gk += 1;
    else if (raw === 1) def += 1;
    else if (raw === 2) mid += 1;
    else if (raw === 3) fwd += 1;
  }
  return { gk, def, mid, fwd };
}

/**
 * Same rule as `validate_team` in the Solana program: 1 GK, 3 FWD, and either
 * 4-3-3 or 3-4-3 in the first eleven slots.
 */
export function isValidStarterFormation(positions: readonly number[]): boolean {
  if (positions.length < 11) return false;
  const { gk, def, mid, fwd } = countStarterPositions(positions);
  return gk === 1 && fwd === 3 && ((def === 4 && mid === 3) || (def === 3 && mid === 4));
}

export function inferFormationFromPositions(
  positions: readonly number[],
): FormationId {
  const { gk, def, mid, fwd } = countStarterPositions(positions);
  if (gk === 1 && fwd === 3 && def === 3 && mid === 4) return "3-4-3";
  if (gk === 1 && fwd === 3 && def === 4 && mid === 3) return "4-3-3";
  return DEFAULT_FORMATION;
}

/** Pitch chip anchors (percent of the 68×105 box). Attack at the top. */
export const PITCH_SLOT_LAYOUTS: Record<
  FormationId,
  readonly { formationIndex: number; leftPct: number; topPct: number }[]
> = {
  "4-3-3": [
    { formationIndex: 8, leftPct: 22, topPct: 18 },
    { formationIndex: 9, leftPct: 50, topPct: 18 },
    { formationIndex: 10, leftPct: 78, topPct: 18 },
    { formationIndex: 5, leftPct: 26, topPct: 43 },
    { formationIndex: 6, leftPct: 50, topPct: 43 },
    { formationIndex: 7, leftPct: 74, topPct: 43 },
    { formationIndex: 1, leftPct: 12, topPct: 67 },
    { formationIndex: 2, leftPct: 37, topPct: 67 },
    { formationIndex: 3, leftPct: 63, topPct: 67 },
    { formationIndex: 4, leftPct: 88, topPct: 67 },
    { formationIndex: 0, leftPct: 50, topPct: 90 },
  ],
  "3-4-3": [
    { formationIndex: 8, leftPct: 22, topPct: 18 },
    { formationIndex: 9, leftPct: 50, topPct: 18 },
    { formationIndex: 10, leftPct: 78, topPct: 18 },
    { formationIndex: 4, leftPct: 14, topPct: 43 },
    { formationIndex: 5, leftPct: 38, topPct: 43 },
    { formationIndex: 6, leftPct: 62, topPct: 43 },
    { formationIndex: 7, leftPct: 86, topPct: 43 },
    { formationIndex: 1, leftPct: 22, topPct: 67 },
    { formationIndex: 2, leftPct: 50, topPct: 67 },
    { formationIndex: 3, leftPct: 78, topPct: 67 },
    { formationIndex: 0, leftPct: 50, topPct: 90 },
  ],
};

/** Remap filled starters into a new formation, keeping as many as fit by position. */
export function remapStartersToFormation<T extends { position: PositionKey }>(
  starters: (T | null)[],
  nextFormation: FormationId,
): (T | null)[] {
  const pools: Record<PositionKey, T[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };
  for (const p of starters) {
    if (p) pools[p.position].push(p);
  }
  const next: (T | null)[] = Array(11).fill(null);
  for (const { position, index } of starterSlots(nextFormation)) {
    next[index] = pools[position].shift() ?? null;
  }
  return next;
}

export const FORMATION_STORAGE_KEY = "ffl:squad:formation";

export function loadFormationId(): FormationId {
  if (typeof window === "undefined") return DEFAULT_FORMATION;
  try {
    const saved = window.localStorage.getItem(FORMATION_STORAGE_KEY);
    if (saved && isFormationId(saved)) return saved;
  } catch {
    /* ignore */
  }
  return DEFAULT_FORMATION;
}

export function saveFormationId(id: FormationId) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(FORMATION_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}
