/**
 * Locked color direction for the locker tablet UI.
 */

export type LockerPaletteId = "obsidian-glass";

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
};

export function getLockerPalette(): LockerPalette {
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
  };
}
