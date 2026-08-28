/** Obsidian tablet panel — matches locker `--lt-panel` / ring. */
export const SHARE_TABLET_PANEL = {
  background: "#000000",
  boxShadow:
    "inset 0 1px 0 rgba(255,255,255,0.55), 0 0 0 1px rgba(255,255,255,0.55), 0 12px 32px rgba(0,0,0,0.55)",
} as const;

/** Soft list panels — lighter share cards. */
export const SHARE_SOFT_PANEL = {
  background: "rgba(255,255,255,0.04)",
  boxShadow: "inset 0 0 0 1px rgba(255,255,255,0.12)",
} as const;

/** Soft pitch frame — matches list panels on classic cards. */
export const SHARE_SOFT_PITCH_FRAME = {
  ...SHARE_SOFT_PANEL,
  padding: 10,
  radius: 16,
  innerRadius: 12,
} as const;

/** Pitch tablet bezel underlay — reference locker share. */
export const SHARE_PITCH_BEZEL = {
  background: "#23262b",
  padding: 14,
  radius: 22,
  innerRadius: 14,
  shadow: [
    "inset 0 1px 0 rgba(255,255,255,0.16)",
    "inset 0 0 0 1px rgba(255,255,255,0.08)",
    "0 24px 52px rgba(0,0,0,0.62)",
    "0 0 0 1px rgba(0,0,0,0.35)",
  ].join(", "),
} as const;

/** Login / GlassPanel chip — black/40 + white/20 ring. */
export const SHARE_SITE_GLASS_CHIP = {
  background: "rgba(0, 0, 0, 0.4)",
  boxShadow:
    "0 0 0 1px rgba(255, 255, 255, 0.2), 0 4px 12px rgba(0, 0, 0, 0.35)",
  backdropFilter: "blur(10px)",
  WebkitBackdropFilter: "blur(10px)",
} as const;

/** Muted pitch chip — darker opaque surname plate. */
export const SHARE_MUTED_CHIP_PLATE = {
  background: "rgba(10, 10, 12, 0.84)",
  boxShadow:
    "0 0 0 1px rgba(255, 255, 255, 0.09), 0 4px 10px rgba(0, 0, 0, 0.4)",
  backdropFilter: "blur(8px)",
  WebkitBackdropFilter: "blur(8px)",
} as const;

/** Muted pitch chip — white surname plate (dark type). */
export const SHARE_MUTED_CHIP_PLATE_WHITE = {
  background: "rgba(255, 255, 255, 0.94)",
  boxShadow:
    "0 0 0 1px rgba(255, 255, 255, 0.55), 0 4px 10px rgba(0, 0, 0, 0.28)",
} as const;
