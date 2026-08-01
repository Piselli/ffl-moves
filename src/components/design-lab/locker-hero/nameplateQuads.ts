/**
 * Nameplate door quads on locker-plate-v25 (3840×2160, 16:9).
 * Corners are % of the plate (TL → TR → BR → BL).
 * Filled by the calibrator at /design-lab/locker-hero/nameplates.
 */

import type { Pt, Quad } from "./perspectiveWarp";
import { getHomography } from "./perspectiveWarp";
import { HANG_BAYS } from "./hangBays";
import { NAMEPLATE_QUADS_V25 as BAKED_QUADS } from "./nameplateQuads.generated";

export type { Pt };

export const NAMEPLATE_PLATE_ID = "v25" as const;
export const NAMEPLATE_PLATE_SRC =
  "/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.png";
export const NAMEPLATE_PLATE_PX = { w: 3840, h: 2160 } as const;

export const NAMEPLATE_CORNER_ORDER = ["TL", "TR", "BR", "BL"] as const;
export type NameplateCornerId = (typeof NAMEPLATE_CORNER_ORDER)[number];

export type NameplateQuadPct = [Pt, Pt, Pt, Pt];

export type NameplateCalibration = {
  plateId: typeof NAMEPLATE_PLATE_ID;
  platePx: typeof NAMEPLATE_PLATE_PX;
  /** bayId → TL,TR,BR,BL in % of plate */
  quads: Record<string, NameplateQuadPct>;
  updatedAt: string;
};

export const NAMEPLATE_BAY_IDS = HANG_BAYS.map((b) => b.id);

export const NAMEPLATE_STORAGE_KEY = "ffl:locker-hero:nameplate-quads:v25";

export function emptyCalibration(): NameplateCalibration {
  return {
    plateId: NAMEPLATE_PLATE_ID,
    platePx: { ...NAMEPLATE_PLATE_PX },
    quads: {},
    updatedAt: new Date().toISOString(),
  };
}

export function loadCalibration(): NameplateCalibration {
  if (typeof window === "undefined") return emptyCalibration();
  try {
    const raw = window.localStorage.getItem(NAMEPLATE_STORAGE_KEY);
    if (!raw) return emptyCalibration();
    const parsed = JSON.parse(raw) as NameplateCalibration;
    if (parsed?.plateId !== NAMEPLATE_PLATE_ID || !parsed.quads) {
      return emptyCalibration();
    }
    return parsed;
  } catch {
    return emptyCalibration();
  }
}

export function saveCalibration(data: NameplateCalibration): void {
  if (typeof window === "undefined") return;
  const next = { ...data, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(NAMEPLATE_STORAGE_KEY, JSON.stringify(next));
}

/** Merge one bay into live calibration (manual tweak). Seeds from baked + live. */
export function upsertBayQuad(
  bayId: string,
  quad: NameplateQuadPct,
  opts?: { normalize?: boolean },
): NameplateCalibration {
  const live = normalizeCalibration(loadCalibration()).quads;
  const saved =
    opts?.normalize === false ? quad : normalizeNameplateQuad(quad);
  const next: NameplateCalibration = {
    plateId: NAMEPLATE_PLATE_ID,
    platePx: { ...NAMEPLATE_PLATE_PX },
    quads: {
      ...BAKED_QUADS,
      ...live,
      [bayId]: saved,
    },
    updatedAt: new Date().toISOString(),
  };
  saveCalibration(next);
  return next;
}

export function calibrationToTsModule(data: NameplateCalibration): string {
  const lines: string[] = [
    "/** Auto-calibrated nameplate door quads for locker-plate-v25.",
    " *  Corners: TL, TR, BR, BL as % of the 16:9 plate.",
    " *  Do not hand-edit — re-run /design-lab/locker-hero/nameplates.",
    " */",
    "",
    'import type { Pt } from "./perspectiveWarp";',
    "",
    "export type NameplateQuadPct = [Pt, Pt, Pt, Pt];",
    "",
    "export const NAMEPLATE_QUADS_V25: Record<string, NameplateQuadPct> = {",
  ];

  for (const id of NAMEPLATE_BAY_IDS) {
    const q = data.quads[id];
    if (!q) continue;
    const fmt = (p: Pt) =>
      `{ x: ${p.x.toFixed(3)}, y: ${p.y.toFixed(3)} }`;
    lines.push(
      `  ${JSON.stringify(id)}: [${fmt(q[0]!)}, ${fmt(q[1]!)}, ${fmt(q[2]!)}, ${fmt(q[3]!)}],`,
    );
  }

  lines.push("};", "");
  return lines.join("\n");
}

export function pctQuadToPx(q: NameplateQuadPct, w: number, h: number): Quad {
  return q.map((p) => ({ x: (p.x / 100) * w, y: (p.y / 100) * h })) as Quad;
}

export type CoverRect = { x: number; y: number; w: number; h: number };

/**
 * CSS object-cover geometry: where a mediaW×mediaH plate lands inside a
 * container after cover+center. Nameplate % quads are plate-relative, so the
 * transform stage must match this rect — not the raw viewport.
 */
export function objectCoverRect(
  containerW: number,
  containerH: number,
  mediaW: number = NAMEPLATE_PLATE_PX.w,
  mediaH: number = NAMEPLATE_PLATE_PX.h,
): CoverRect {
  if (containerW <= 0 || containerH <= 0 || mediaW <= 0 || mediaH <= 0) {
    return { x: 0, y: 0, w: 0, h: 0 };
  }
  const scale = Math.max(containerW / mediaW, containerH / mediaH);
  const w = mediaW * scale;
  const h = mediaH * scale;
  return {
    x: (containerW - w) / 2,
    y: (containerH - h) / 2,
    w,
    h,
  };
}

export function isCompleteQuad(
  corners: Pt[] | undefined,
): corners is NameplateQuadPct {
  return Boolean(corners && corners.length === 4);
}

/**
 * Reorder 4 clicked points into TL, TR, BR, BL by screen position.
 * Tolerates any click order (common when calibrating side bays).
 */
export function normalizeNameplateQuad(pts: Pt[]): NameplateQuadPct {
  if (pts.length !== 4) {
    throw new Error(`normalizeNameplateQuad expects 4 points, got ${pts.length}`);
  }
  const sorted = [...pts].sort((a, b) => a.y - b.y || a.x - b.x);
  const top = sorted.slice(0, 2).sort((a, b) => a.x - b.x);
  const bot = sorted.slice(2, 4).sort((a, b) => a.x - b.x);
  return [top[0]!, top[1]!, bot[1]!, bot[0]!];
}

export function normalizeCalibration(
  data: NameplateCalibration,
): NameplateCalibration {
  const quads: Record<string, NameplateQuadPct> = {};
  for (const [id, q] of Object.entries(data.quads)) {
    if (!isCompleteQuad(q)) continue;
    quads[id] = normalizeNameplateQuad(q);
  }
  return { ...data, quads };
}

/** Homography → CSS matrix3d mapping a srcW×srcH face onto a % quad. */
export function cssMatrix3dFromQuadPct(
  q: NameplateQuadPct,
  stageW: number,
  stageH: number,
  srcW: number,
  srcH: number,
): string | null {
  const src: NameplateQuadPct = [
    { x: 0, y: 0 },
    { x: srcW, y: 0 },
    { x: srcW, y: srcH },
    { x: 0, y: srcH },
  ];
  const dst: NameplateQuadPct = [
    { x: (q[0].x / 100) * stageW, y: (q[0].y / 100) * stageH },
    { x: (q[1].x / 100) * stageW, y: (q[1].y / 100) * stageH },
    { x: (q[2].x / 100) * stageW, y: (q[2].y / 100) * stageH },
    { x: (q[3].x / 100) * stageW, y: (q[3].y / 100) * stageH },
  ];
  const H = getHomography(src, dst);
  if (!H) return null;
  const a = H[0]![0]!;
  const b = H[0]![1]!;
  const c = H[0]![2]!;
  const d = H[1]![0]!;
  const e = H[1]![1]!;
  const f = H[1]![2]!;
  const g = H[2]![0]!;
  const h = H[2]![1]!;
  const i = H[2]![2]!;
  return `matrix3d(${a},${d},0,${g},${b},${e},0,${h},0,0,1,0,${c},${f},0,${i})`;
}

/**
 * Live quads: baked file, with optional calibrator localStorage overrides merged in.
 * Client-only (HangIdentity / style preview).
 */
export function resolveNameplateQuads(opts?: {
  /** Production homepage — ignore localStorage tweaks */
  preferBaked?: boolean;
}): Record<string, NameplateQuadPct> {
  if (opts?.preferBaked || typeof window === "undefined") {
    return BAKED_QUADS;
  }
  const live = normalizeCalibration(loadCalibration()).quads;
  const n = Object.keys(live).filter((id) => isCompleteQuad(live[id])).length;
  if (n === 0) return BAKED_QUADS;
  return { ...BAKED_QUADS, ...live };
}
