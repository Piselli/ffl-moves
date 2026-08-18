/**
 * Color directions for the locker tablet UI.
 * Shipping lock: `obsidian-glass`. Lab may pass other ids.
 */

export type LockerPaletteId =
  | "obsidian-glass"
  | "tripled-white"
  | "tripled-frost"
  | "tripled-quiet"
  | "plates-plus"
  | "active-theory"
  | "linear-dense"
  | "signal-green"
  | "slate-plate";

export type LockerPalette = {
  id: LockerPaletteId;
  name: string;
  tagline: string;
  /** light = porcelain chrome; dark = night chrome */
  mode: "light" | "dark";
  /** frosted glass panels vs solid fills */
  material?: "solid" | "glass";
  ink: string;
  accent: string;
  accentSoft: string;
  accentOn: string;
  accentShadow: string;
  canvas: string;
  panel: string;
  panelRing: string;
  panelShadow: string;
  pitch: string;
  pitchRing: string;
  pitchSlot: string;
  inputBg: string;
  chipTrack: string;
  chipActive: string;
  chipActiveText: string;
  hairline: string;
  muted: string;
  soft: string;
  faint: string;
  resetBg: string;
  resetBorder: string;
  resetText: string;
  /** GlassPanel chrome (optional — falls back in component) */
  glassBg?: string;
  glassBlur?: string;
  glassRing?: string;
  glassShadow?: string;
  glassSheen?: string;
};

export const LOCKER_PALETTE: LockerPalette = {
  id: "obsidian-glass",
  name: "Obsidian Glass",
  tagline: "Pure black · white · green CTA",
  mode: "dark",
  material: "glass",
  ink: "#FFFFFF",
  accent: "#00F948",
  accentSoft: "rgba(255,255,255,0.12)",
  accentOn: "#000000",
  accentShadow: "rgba(0,249,72,0.35)",
  canvas: "#000000",
  panel: "#000000",
  panelRing: "rgba(255,255,255,0.65)",
  panelShadow:
    "inset 0 1px 0 rgba(255,255,255,0.7), 0 12px 32px rgba(0,0,0,0.55)",
  pitch: "#0F3D22",
  pitchRing: "rgba(0,0,0,0.55)",
  pitchSlot: "rgba(0,0,0,0.40)",
  inputBg: "#000000",
  chipTrack: "#000000",
  chipActive: "#1A1A1A",
  chipActiveText: "#FFFFFF",
  hairline: "rgba(255,255,255,0.60)",
  muted: "rgba(255,255,255,0.86)",
  soft: "rgba(255,255,255,0.94)",
  faint: "rgba(255,255,255,0.80)",
  resetBg: "#000000",
  resetBorder: "rgba(255,255,255,0.80)",
  resetText: "#FFFFFF",
  glassBg: "rgba(0,0,0,0.75)",
  glassBlur: "24px",
  glassRing: "rgba(255,255,255,0.20)",
  glassShadow:
    "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -12px 28px rgba(0,0,0,0.55), 0 10px 28px rgba(0,0,0,0.45)",
  glassSheen:
    "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 28%)",
};

/** TripleD-inspired: white signal, softer rings, pill tabs. */
export const TRIPLED_WHITE_PALETTE: LockerPalette = {
  id: "tripled-white",
  name: "TripleD White",
  tagline: "Black void · white glow CTA · soft glass",
  mode: "dark",
  material: "glass",
  ink: "#FFFFFF",
  accent: "#FFFFFF",
  accentSoft: "rgba(255,255,255,0.10)",
  accentOn: "#000000",
  accentShadow: "rgba(255,255,255,0.35)",
  canvas: "#000000",
  panel: "rgba(0,0,0,0.55)",
  panelRing: "rgba(255,255,255,0.18)",
  panelShadow:
    "inset 0 1px 0 rgba(255,255,255,0.28), 0 12px 40px rgba(0,0,0,0.50)",
  pitch: "#0F3D22",
  pitchRing: "rgba(0,0,0,0.55)",
  pitchSlot: "rgba(0,0,0,0.40)",
  inputBg: "rgba(255,255,255,0.04)",
  chipTrack: "rgba(255,255,255,0.06)",
  chipActive: "#FFFFFF",
  chipActiveText: "#000000",
  hairline: "rgba(255,255,255,0.16)",
  muted: "rgba(255,255,255,0.55)",
  soft: "rgba(255,255,255,0.78)",
  faint: "rgba(255,255,255,0.42)",
  resetBg: "rgba(0,0,0,0.55)",
  resetBorder: "rgba(255,255,255,0.22)",
  resetText: "#FFFFFF",
  glassBg: "rgba(12,12,14,0.62)",
  glassBlur: "28px",
  glassRing: "rgba(255,255,255,0.14)",
  glassShadow:
    "inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -10px 24px rgba(0,0,0,0.45), 0 12px 36px rgba(0,0,0,0.40)",
  glassSheen:
    "linear-gradient(180deg, rgba(255,255,255,0.10) 0%, transparent 32%)",
};

/** Authkit-like frost: cooler inset edge, more blur. */
export const TRIPLED_FROST_PALETTE: LockerPalette = {
  id: "tripled-frost",
  name: "TripleD Frost",
  tagline: "Frosted plates · cool inset hairline",
  mode: "dark",
  material: "glass",
  ink: "#F4F7FB",
  accent: "#FFFFFF",
  accentSoft: "rgba(186,215,247,0.12)",
  accentOn: "#05060f",
  accentShadow: "rgba(209,228,250,0.28)",
  canvas: "#05060f",
  panel: "rgba(8,10,18,0.55)",
  panelRing: "rgba(186,215,247,0.14)",
  panelShadow:
    "inset 0 1px 0 rgba(216,236,248,0.22), 0 16px 48px rgba(0,0,0,0.55)",
  pitch: "#0C3320",
  pitchRing: "rgba(0,0,0,0.55)",
  pitchSlot: "rgba(0,0,0,0.40)",
  inputBg: "rgba(186,215,247,0.06)",
  chipTrack: "rgba(186,215,247,0.08)",
  chipActive: "rgba(255,255,255,0.92)",
  chipActiveText: "#05060f",
  hairline: "rgba(186,215,247,0.14)",
  muted: "rgba(199,211,234,0.72)",
  soft: "rgba(209,228,250,0.88)",
  faint: "rgba(157,167,186,0.70)",
  resetBg: "rgba(8,10,18,0.65)",
  resetBorder: "rgba(186,215,247,0.18)",
  resetText: "#F4F7FB",
  glassBg: "rgba(8,10,18,0.55)",
  glassBlur: "36px",
  glassRing: "rgba(186,215,247,0.14)",
  glassShadow:
    "inset 0 1px 0 rgba(216,236,248,0.22), inset 0 0 24px rgba(124,145,182,0.08), 0 16px 48px rgba(0,0,0,0.55)",
  glassSheen:
    "linear-gradient(180deg, rgba(216,236,248,0.12) 0%, transparent 36%)",
};

/** Linear-ish density without acid lime — quiet product chrome. */
export const TRIPLED_QUIET_PALETTE: LockerPalette = {
  id: "tripled-quiet",
  name: "Quiet Dense",
  tagline: "Hairline geometry · no chromatic brand",
  mode: "dark",
  material: "glass",
  ink: "#FFFFFF",
  accent: "#E5E5E6",
  accentSoft: "rgba(255,255,255,0.08)",
  accentOn: "#08090a",
  accentShadow: "rgba(0,0,0,0.45)",
  canvas: "#08090a",
  panel: "#0f1011",
  panelRing: "rgba(35,37,42,1)",
  panelShadow: "inset 0 1px 0 rgba(255,255,255,0.06), 0 2px 4px rgba(0,0,0,0.4)",
  pitch: "#0F3D22",
  pitchRing: "rgba(0,0,0,0.55)",
  pitchSlot: "rgba(0,0,0,0.40)",
  inputBg: "#0f1011",
  chipTrack: "#161718",
  chipActive: "#23252a",
  chipActiveText: "#FFFFFF",
  hairline: "rgba(56,59,63,1)",
  muted: "rgba(138,143,152,1)",
  soft: "rgba(208,214,224,1)",
  faint: "rgba(98,102,109,1)",
  resetBg: "#0f1011",
  resetBorder: "#23252a",
  resetText: "#FFFFFF",
  glassBg: "rgba(15,16,17,0.88)",
  glassBlur: "12px",
  glassRing: "rgba(35,37,42,1)",
  glassShadow:
    "inset 0 1px 0 rgba(255,255,255,0.05), 0 2px 4px rgba(0,0,0,0.4)",
  glassSheen: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 24%)",
};

/**
 * Same dark sports read as current, but plates feel one tier up:
 * clearer sheen, deeper inset, softer outer lift (Authkit / Dimension polish).
 */
export const PLATES_PLUS_PALETTE: LockerPalette = {
  id: "plates-plus",
  name: "Plates+",
  tagline: "Elevated glass plates · current brand",
  mode: "dark",
  material: "glass",
  ink: "#FFFFFF",
  accent: "#00F948",
  accentSoft: "rgba(255,255,255,0.12)",
  accentOn: "#000000",
  accentShadow: "rgba(0,249,72,0.35)",
  canvas: "#000000",
  panel: "rgba(0,0,0,0.52)",
  panelRing: "rgba(255,255,255,0.28)",
  panelShadow:
    "inset 0 1px 0 rgba(255,255,255,0.42), inset 0 -18px 36px rgba(0,0,0,0.55), 0 14px 40px rgba(0,0,0,0.55)",
  pitch: "#0F3D22",
  pitchRing: "rgba(0,0,0,0.55)",
  pitchSlot: "rgba(0,0,0,0.40)",
  inputBg: "rgba(255,255,255,0.04)",
  chipTrack: "rgba(255,255,255,0.07)",
  chipActive: "#1A1A1A",
  chipActiveText: "#FFFFFF",
  hairline: "rgba(255,255,255,0.28)",
  muted: "rgba(255,255,255,0.78)",
  soft: "rgba(255,255,255,0.90)",
  faint: "rgba(255,255,255,0.60)",
  resetBg: "rgba(0,0,0,0.55)",
  resetBorder: "rgba(255,255,255,0.28)",
  resetText: "#FFFFFF",
  glassBg: "rgba(0,0,0,0.52)",
  glassBlur: "32px",
  glassRing: "rgba(255,255,255,0.22)",
  glassShadow:
    "inset 0 1px 0 rgba(255,255,255,0.38), inset 0 -16px 34px rgba(0,0,0,0.58), 0 14px 42px rgba(0,0,0,0.52)",
  glassSheen:
    "linear-gradient(165deg, rgba(255,255,255,0.16) 0%, rgba(255,255,255,0.04) 22%, transparent 48%)",
};

/** Active Theory — void canvas, whisper chrome, almost no fill. */
export const ACTIVE_THEORY_PALETTE: LockerPalette = {
  id: "active-theory",
  name: "Active Theory",
  tagline: "Ghost containers · hairline void",
  mode: "dark",
  material: "glass",
  ink: "#FFFFFF",
  accent: "#FFFFFF",
  accentSoft: "rgba(255,255,255,0.08)",
  accentOn: "#000000",
  accentShadow: "rgba(255,255,255,0.20)",
  canvas: "#000000",
  panel: "rgba(0,0,0,0.35)",
  panelRing: "rgba(77,77,77,0.90)",
  panelShadow:
    "inset 0 1px 0 rgba(255,255,255,0.10), 0 8px 24px rgba(0,0,0,0.35)",
  pitch: "#0F3D22",
  pitchRing: "rgba(0,0,0,0.55)",
  pitchSlot: "rgba(0,0,0,0.40)",
  inputBg: "rgba(255,255,255,0.03)",
  chipTrack: "rgba(255,255,255,0.04)",
  chipActive: "rgba(255,255,255,0.12)",
  chipActiveText: "#FFFFFF",
  hairline: "rgba(77,77,77,0.95)",
  muted: "rgba(198,198,198,0.85)",
  soft: "rgba(255,255,255,0.78)",
  faint: "rgba(128,128,128,0.90)",
  resetBg: "rgba(0,0,0,0.40)",
  resetBorder: "rgba(77,77,77,0.95)",
  resetText: "#FFFFFF",
  glassBg: "rgba(0,0,0,0.35)",
  glassBlur: "16px",
  glassRing: "rgba(77,77,77,0.90)",
  glassShadow:
    "inset 0 1px 0 rgba(255,255,255,0.08), 0 8px 24px rgba(0,0,0,0.35)",
  glassSheen:
    "linear-gradient(180deg, rgba(255,255,255,0.05) 0%, transparent 30%)",
};

/** Linear — midnight command center, geometry over glow. */
export const LINEAR_DENSE_PALETTE: LockerPalette = {
  id: "linear-dense",
  name: "Linear Dense",
  tagline: "Hairline product · lime flashlight",
  mode: "dark",
  material: "glass",
  ink: "#FFFFFF",
  accent: "#E4F222",
  accentSoft: "rgba(228,242,34,0.12)",
  accentOn: "#08090a",
  accentShadow: "rgba(228,242,34,0.28)",
  canvas: "#08090a",
  panel: "#0f1011",
  panelRing: "#23252a",
  panelShadow: "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 4px rgba(0,0,0,0.4)",
  pitch: "#0F3D22",
  pitchRing: "rgba(0,0,0,0.55)",
  pitchSlot: "rgba(0,0,0,0.40)",
  inputBg: "#0f1011",
  chipTrack: "#161718",
  chipActive: "#23252a",
  chipActiveText: "#FFFFFF",
  hairline: "#383b3f",
  muted: "#8a8f98",
  soft: "#d0d6e0",
  faint: "#62666d",
  resetBg: "#0f1011",
  resetBorder: "#23252a",
  resetText: "#FFFFFF",
  glassBg: "rgba(15,16,17,0.92)",
  glassBlur: "10px",
  glassRing: "#23252a",
  glassShadow:
    "inset 0 1px 0 rgba(255,255,255,0.04), 0 2px 4px rgba(0,0,0,0.4)",
  glassSheen: "linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 20%)",
};

/**
 * Sandclock / Phantom — mono UI; #00F948 only for live signal roles.
 * Accent tokens stay green for CTA / selected / live; chrome stays ash.
 */
export const SIGNAL_GREEN_PALETTE: LockerPalette = {
  id: "signal-green",
  name: "Signal Green",
  tagline: "Green as live signal only",
  mode: "dark",
  material: "glass",
  ink: "#FFFFFF",
  accent: "#00F948",
  accentSoft: "rgba(0,249,72,0.12)",
  accentOn: "#000000",
  accentShadow: "rgba(0,249,72,0.30)",
  canvas: "#000000",
  panel: "rgba(0,0,0,0.70)",
  panelRing: "rgba(255,255,255,0.14)",
  panelShadow:
    "inset 0 1px 0 rgba(255,255,255,0.16), 0 10px 28px rgba(0,0,0,0.45)",
  pitch: "#0F3D22",
  pitchRing: "rgba(0,0,0,0.55)",
  pitchSlot: "rgba(0,0,0,0.40)",
  inputBg: "rgba(255,255,255,0.03)",
  chipTrack: "rgba(255,255,255,0.05)",
  chipActive: "rgba(0,249,72,0.16)",
  chipActiveText: "#00F948",
  hairline: "rgba(255,255,255,0.14)",
  muted: "rgba(255,255,255,0.55)",
  soft: "rgba(255,255,255,0.78)",
  faint: "rgba(255,255,255,0.40)",
  resetBg: "rgba(0,0,0,0.55)",
  resetBorder: "rgba(255,255,255,0.18)",
  resetText: "#FFFFFF",
  glassBg: "rgba(0,0,0,0.65)",
  glassBlur: "20px",
  glassRing: "rgba(255,255,255,0.14)",
  glassShadow:
    "inset 0 1px 0 rgba(255,255,255,0.14), 0 10px 28px rgba(0,0,0,0.45)",
  glassSheen:
    "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 28%)",
};

/**
 * Exact recipe from tmp/naming-table.html / naming-shortlist-en.png:
 * #0a0a0a fill, ring rgba(255,255,255,0.19), soft top inset + whisper sheen.
 */
export const SLATE_PLATE_PALETTE: LockerPalette = {
  id: "slate-plate",
  name: "Slate Plate",
  tagline: "#0a0a0a plate · naming sheet",
  mode: "dark",
  material: "solid",
  ink: "#FFFFFF",
  accent: "#00F948",
  accentSoft: "rgba(255,255,255,0.06)",
  accentOn: "#000000",
  accentShadow: "rgba(0,249,72,0.28)",
  canvas: "#000000",
  panel: "#0a0a0a",
  panelRing: "rgba(255,255,255,0.19)",
  panelShadow:
    "inset 0 1px 0 rgba(255,255,255,0.11), 0 14px 40px rgba(0,0,0,0.55)",
  pitch: "#0F3D22",
  pitchRing: "rgba(0,0,0,0.55)",
  pitchSlot: "rgba(0,0,0,0.40)",
  inputBg: "#0a0a0a",
  chipTrack: "#111111",
  chipActive: "#1a1a1a",
  chipActiveText: "#FFFFFF",
  hairline: "rgba(255,255,255,0.12)",
  muted: "rgba(255,255,255,0.40)",
  soft: "rgba(242,242,244,0.93)",
  faint: "rgba(255,255,255,0.35)",
  resetBg: "#0a0a0a",
  resetBorder: "rgba(255,255,255,0.19)",
  resetText: "#FFFFFF",
  glassBg: "#0a0a0a",
  glassBlur: "0px",
  glassRing: "rgba(255,255,255,0.19)",
  glassShadow:
    "inset 0 1px 0 rgba(255,255,255,0.11), 0 14px 40px rgba(0,0,0,0.55)",
  glassSheen:
    "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 16%)",
};

const PALETTES: Record<LockerPaletteId, LockerPalette> = {
  "obsidian-glass": LOCKER_PALETTE,
  "tripled-white": TRIPLED_WHITE_PALETTE,
  "tripled-frost": TRIPLED_FROST_PALETTE,
  "tripled-quiet": TRIPLED_QUIET_PALETTE,
  "plates-plus": PLATES_PLUS_PALETTE,
  "active-theory": ACTIVE_THEORY_PALETTE,
  "linear-dense": LINEAR_DENSE_PALETTE,
  "signal-green": SIGNAL_GREEN_PALETTE,
  "slate-plate": SLATE_PLATE_PALETTE,
};

export function getLockerPalette(id?: LockerPaletteId | null): LockerPalette {
  if (id && PALETTES[id]) return PALETTES[id];
  return LOCKER_PALETTE;
}

export function paletteToCssVars(p: LockerPalette): Record<string, string> {
  return {
    "--lt-ink": p.ink,
    "--lt-accent": p.accent,
    "--lt-accent-soft": p.accentSoft,
    "--lt-accent-on": p.accentOn,
    "--lt-accent-shadow": p.accentShadow,
    "--lt-canvas": p.canvas,
    "--lt-panel": p.panel,
    "--lt-panel-ring": p.panelRing,
    "--lt-panel-shadow": p.panelShadow,
    "--lt-pitch": p.pitch,
    "--lt-pitch-ring": p.pitchRing,
    "--lt-pitch-slot": p.pitchSlot,
    "--lt-input-bg": p.inputBg,
    "--lt-chip-track": p.chipTrack,
    "--lt-chip-active": p.chipActive,
    "--lt-chip-active-text": p.chipActiveText,
    "--lt-hairline": p.hairline,
    "--lt-muted": p.muted,
    "--lt-soft": p.soft,
    "--lt-faint": p.faint,
    "--lt-reset-bg": p.resetBg,
    "--lt-reset-border": p.resetBorder,
    "--lt-reset-text": p.resetText,
    "--lt-material": p.material ?? "solid",
    "--lt-glass-bg": p.glassBg ?? "rgba(0,0,0,0.75)",
    "--lt-glass-blur": p.glassBlur ?? "24px",
    "--lt-glass-ring": p.glassRing ?? "rgba(255,255,255,0.20)",
    "--lt-glass-shadow":
      p.glassShadow ??
      "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -12px 28px rgba(0,0,0,0.55), 0 10px 28px rgba(0,0,0,0.45)",
    "--lt-glass-sheen":
      p.glassSheen ??
      "linear-gradient(180deg, rgba(255,255,255,0.08) 0%, transparent 28%)",
  };
}
