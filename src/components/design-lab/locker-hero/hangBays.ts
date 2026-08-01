/**
 * Hook anchors on locker-plate-v25-slate-hangers (3840×2160).
 * Geometry inherited from v20; re-tune if v25 bay centers drift.
 *
 * Production path (photoreal live pick):
 * - Empty plate background (v25 hangers)
 * - Per-bay cutouts from club fills on that plate → kit/hang-bay/t{N}/{bayId}.webp
 * - See kit/HANG_ASSET_BRIEF.md + scripts/extract-bay-columns.py
 *
 * Legacy fallback: kit/hang sprites positioned with these % boxes + CSS yaw.
 *
 * No bay-photo windows. No cutout stickers of foreign lockers.
 */

export type HangBay = {
  id: string;
  /** Hook center X (% of room width) */
  left: number;
  /** Hook tip Y — collar hangs from here (% of room height) */
  top: number;
  /** Sprite width (% of room width). Keep under bay opening so garment has air. */
  width: number;
  /** Wall yaw degrees. Positive = left side facing inward. */
  yaw: number;
};

/**
 * 11 starter hooks (L→R before door) + 3 bench (after door).
 * Widths sized so hem clears the seat and sides don’t kiss the chrome rails.
 */
export const HANG_BAYS: HangBay[] = [
  { id: "h1", left: 5.42, top: 27.85, width: 4.55, yaw: 32 },
  { id: "h2", left: 11.99, top: 27.55, width: 4.65, yaw: 26 },
  { id: "h3", left: 18.6, top: 27.35, width: 4.5, yaw: 20 },
  { id: "h4", left: 24.75, top: 27.2, width: 4.4, yaw: 14 },
  { id: "h5", left: 30.76, top: 27.1, width: 4.3, yaw: 9 },
  { id: "h6", left: 36.81, top: 27.05, width: 4.3, yaw: 5 },
  { id: "h7", left: 42.73, top: 27.0, width: 4.25, yaw: 1 },
  { id: "h8", left: 48.52, top: 27.05, width: 4.3, yaw: -4 },
  { id: "h9", left: 54.5, top: 27.15, width: 4.4, yaw: -9 },
  { id: "h10", left: 60.68, top: 27.35, width: 4.5, yaw: -15 },
  { id: "h11", left: 67.22, top: 27.65, width: 4.7, yaw: -21 },
  { id: "hb1", left: 84.59, top: 28.25, width: 4.55, yaw: -32 },
  { id: "hb2", left: 90.66, top: 28.75, width: 4.7, yaw: -38 },
  { id: "hb3", left: 96.11, top: 29.45, width: 4.25, yaw: -44 },
];

/** Production kit room — v25 hangers. */
export const HANG_KIT_PLATES = new Set(["v25"]);
