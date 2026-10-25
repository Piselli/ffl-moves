/**
 * Squad formation schemes — both allowed on-chain and in pick UI.
 * Slot order is always GK → DEF… → MID… → FWD… (11 starters).
 */

export type FormationId = "4-3-3" | "3-4-3" | "5-3-2" | "3-5-2";
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
  "5-3-2": { id: "5-3-2", label: "5-3-2", GK: 1, DEF: 5, MID: 3, FWD: 2 },
  "3-5-2": { id: "3-5-2", label: "3-5-2", GK: 1, DEF: 3, MID: 5, FWD: 2 },
};

export const FORMATION_OPTIONS: readonly FormationId[] = [
  "4-3-3",
  "3-4-3",
  "5-3-2",
  "3-5-2",
];

export function isFormationId(value: string): value is FormationId {
  return Object.prototype.hasOwnProperty.call(FORMATIONS, value);
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
 * Same rule as `validate_team` in the Solana program: 1 GK and one of
 * 4-3-3 / 3-4-3 / 5-3-2 / 3-5-2 in the first eleven slots.
 */
export function isValidStarterFormation(positions: readonly number[]): boolean {
  if (positions.length < 11) return false;
  const { gk, def, mid, fwd } = countStarterPositions(positions);
  if (gk !== 1) return false;
  return FORMATION_OPTIONS.some((id) => {
    const f = FORMATIONS[id];
    return f.DEF === def && f.MID === mid && f.FWD === fwd;
  });
}

export function inferFormationFromPositions(
  positions: readonly number[],
): FormationId {
  const { gk, def, mid, fwd } = countStarterPositions(positions);
  if (gk !== 1) return DEFAULT_FORMATION;
  for (const id of FORMATION_OPTIONS) {
    const f = FORMATIONS[id];
    if (f.DEF === def && f.MID === mid && f.FWD === fwd) return id;
  }
  return DEFAULT_FORMATION;
}

/** Pitch chip anchors (percent of the 68×105 box). Attack at the top. */
export const PITCH_SLOT_LAYOUTS: Record<
  FormationId,
  readonly { formationIndex: number; leftPct: number; topPct: number }[]
> = {
  // Y lanes are % of the playable green ABOVE the fringe bar. Same numbers
  // on the full pitch (incl. fringe) sit too high vs chalk — GK especially
  // must sit deeper so the nameplate lands inside the penalty box.
  "4-3-3": [
    { formationIndex: 8, leftPct: 22, topPct: 16 },
    { formationIndex: 9, leftPct: 50, topPct: 16 },
    { formationIndex: 10, leftPct: 78, topPct: 16 },
    { formationIndex: 5, leftPct: 26, topPct: 40 },
    { formationIndex: 6, leftPct: 50, topPct: 40 },
    { formationIndex: 7, leftPct: 74, topPct: 40 },
    { formationIndex: 1, leftPct: 12, topPct: 66 },
    { formationIndex: 2, leftPct: 37, topPct: 66 },
    { formationIndex: 3, leftPct: 63, topPct: 66 },
    { formationIndex: 4, leftPct: 88, topPct: 66 },
    { formationIndex: 0, leftPct: 50, topPct: 88 },
  ],
  "3-4-3": [
    { formationIndex: 8, leftPct: 22, topPct: 16 },
    { formationIndex: 9, leftPct: 50, topPct: 16 },
    { formationIndex: 10, leftPct: 78, topPct: 16 },
    { formationIndex: 4, leftPct: 14, topPct: 40 },
    { formationIndex: 5, leftPct: 38, topPct: 40 },
    { formationIndex: 6, leftPct: 62, topPct: 40 },
    { formationIndex: 7, leftPct: 86, topPct: 40 },
    { formationIndex: 1, leftPct: 22, topPct: 66 },
    { formationIndex: 2, leftPct: 50, topPct: 66 },
    { formationIndex: 3, leftPct: 78, topPct: 66 },
    { formationIndex: 0, leftPct: 50, topPct: 88 },
  ],
  // 5-wide lines stay flat (same topPct). Do not stagger wings.
  "5-3-2": [
    { formationIndex: 9, leftPct: 35, topPct: 16 },
    { formationIndex: 10, leftPct: 65, topPct: 16 },
    { formationIndex: 6, leftPct: 26, topPct: 40 },
    { formationIndex: 7, leftPct: 50, topPct: 40 },
    { formationIndex: 8, leftPct: 74, topPct: 40 },
    { formationIndex: 1, leftPct: 9, topPct: 66 },
    { formationIndex: 2, leftPct: 29.5, topPct: 66 },
    { formationIndex: 3, leftPct: 50, topPct: 66 },
    { formationIndex: 4, leftPct: 70.5, topPct: 66 },
    { formationIndex: 5, leftPct: 91, topPct: 66 },
    { formationIndex: 0, leftPct: 50, topPct: 88 },
  ],
  "3-5-2": [
    { formationIndex: 9, leftPct: 35, topPct: 16 },
    { formationIndex: 10, leftPct: 65, topPct: 16 },
    { formationIndex: 4, leftPct: 9, topPct: 40 },
    { formationIndex: 5, leftPct: 29.5, topPct: 40 },
    { formationIndex: 6, leftPct: 50, topPct: 40 },
    { formationIndex: 7, leftPct: 70.5, topPct: 40 },
    { formationIndex: 8, leftPct: 91, topPct: 40 },
    { formationIndex: 1, leftPct: 22, topPct: 66 },
    { formationIndex: 2, leftPct: 50, topPct: 66 },
    { formationIndex: 3, leftPct: 78, topPct: 66 },
    { formationIndex: 0, leftPct: 50, topPct: 88 },
  ],
};

export type PitchSlotAnchor = {
  formationIndex: number;
  leftPct: number;
  topPct: number;
};

/** Rotate portrait anchors into landscape: GK left, attack right. */
export function portraitToHorizontalPitchSlots(
  portrait: readonly PitchSlotAnchor[],
): readonly PitchSlotAnchor[] {
  return portrait.map(({ formationIndex, leftPct, topPct }) => ({
    formationIndex,
    leftPct: 100 - topPct,
    topPct: leftPct,
  }));
}

/** Landscape pitch chip anchors (105×68 box). Attack on the right. */
export const HORIZONTAL_PITCH_SLOT_LAYOUTS: Record<
  FormationId,
  readonly PitchSlotAnchor[]
> = {
  "4-3-3": portraitToHorizontalPitchSlots(PITCH_SLOT_LAYOUTS["4-3-3"]),
  "3-4-3": portraitToHorizontalPitchSlots(PITCH_SLOT_LAYOUTS["3-4-3"]),
  "5-3-2": portraitToHorizontalPitchSlots(PITCH_SLOT_LAYOUTS["5-3-2"]),
  "3-5-2": portraitToHorizontalPitchSlots(PITCH_SLOT_LAYOUTS["3-5-2"]),
};

type RemapPlayer = { position: PositionKey; id?: number };

/**
 * Remap filled starters into a new formation, keeping as many as fit by position.
 * Overflow that no longer fits the XI is returned separately (park on bench in UI).
 */
export function remapStartersToFormation<T extends RemapPlayer>(
  starters: (T | null)[],
  nextFormation: FormationId,
): { starters: (T | null)[]; overflow: T[] } {
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
  const overflow = [...pools.GK, ...pools.DEF, ...pools.MID, ...pools.FWD];
  return { starters: next, overflow };
}

/** Remap XI and park overflow into empty bench slots (drops only if bench is full). */
export function remapSquadToFormation<T extends RemapPlayer>(
  starters: (T | null)[],
  bench: (T | null)[],
  nextFormation: FormationId,
): { starters: (T | null)[]; bench: (T | null)[] } {
  const { starters: nextStarters, overflow } = remapStartersToFormation(
    starters,
    nextFormation,
  );
  const nextBench = [...bench];
  const onBench = new Set(
    nextBench.filter(Boolean).map((p) => p!.id).filter((id) => id != null),
  );
  for (const player of overflow) {
    if (player.id != null && onBench.has(player.id)) continue;
    const empty = nextBench.findIndex((slot) => slot == null);
    if (empty === -1) break;
    nextBench[empty] = player;
    if (player.id != null) onBench.add(player.id);
  }
  return { starters: nextStarters, bench: nextBench };
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
