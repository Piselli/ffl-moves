export type BoardThemeId = "neon" | "quiet";

export type BoardTheme = {
  id: BoardThemeId;
  mode: "dark" | "light";
  vars: Record<string, string>;
};

/**
 * Board themes inside the locker visual family only.
 * neon = homepage brand green · quiet = same materials, restrained accent
 */
export const BOARD_THEMES: Record<BoardThemeId, BoardTheme> = {
  neon: {
    id: "neon",
    mode: "dark",
    vars: {
      "--lb-ink": "#ffffff",
      "--lb-muted": "rgba(255,255,255,0.38)",
      "--lb-soft": "rgba(255,255,255,0.55)",
      "--lb-body": "rgba(255,255,255,0.88)",
      "--lb-accent": "#00f948",
      "--lb-accent-on": "#000000",
      "--lb-accent-soft": "rgba(0,249,72,0.1)",
      "--lb-accent-ring": "rgba(0,249,72,0.28)",
      "--lb-panel": "rgba(0,0,0,0.4)",
      "--lb-panel-ring": "rgba(255,255,255,0.12)",
      "--lb-hairline": "rgba(255,255,255,0.1)",
      "--lb-row-you": "rgba(0,249,72,0.07)",
      "--lb-row-hover": "rgba(255,255,255,0.03)",
      "--lb-rank-1": "#FFD700",
      "--lb-rank-2": "#E8ECF2",
      "--lb-rank-3": "#D4A574",
      "--lb-rank-n": "rgba(255,255,255,0.55)",
      "--lb-tooltip-bg": "rgba(20,18,16,0.95)",
    },
  },
  quiet: {
    id: "quiet",
    mode: "dark",
    vars: {
      "--lb-ink": "#f4f1ec",
      "--lb-muted": "rgba(244,241,236,0.4)",
      "--lb-soft": "rgba(244,241,236,0.58)",
      "--lb-body": "rgba(244,241,236,0.88)",
      "--lb-accent": "#d7d2c8",
      "--lb-accent-on": "#141210",
      "--lb-accent-soft": "rgba(255,255,255,0.06)",
      "--lb-accent-ring": "rgba(255,255,255,0.18)",
      "--lb-panel": "rgba(12,11,10,0.55)",
      "--lb-panel-ring": "rgba(255,255,255,0.1)",
      "--lb-hairline": "rgba(255,255,255,0.09)",
      "--lb-row-you": "rgba(255,255,255,0.07)",
      "--lb-row-hover": "rgba(255,255,255,0.035)",
      "--lb-rank-1": "#E8D5A3",
      "--lb-rank-2": "#E4E0D8",
      "--lb-rank-3": "#C4B49A",
      "--lb-rank-n": "rgba(244,241,236,0.45)",
      "--lb-tooltip-bg": "rgba(18,16,14,0.96)",
    },
  },
};

export function getBoardTheme(id: BoardThemeId): BoardTheme {
  return BOARD_THEMES[id];
}
