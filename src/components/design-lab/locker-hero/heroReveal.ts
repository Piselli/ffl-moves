/**
 * Homepage first-paint choreography.
 * Site: content paints fully under the boot curtain (instant).
 * Lab: optional stagger after boot for mixer delight.
 */
export const HERO_EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export const HERO_REVEAL = {
  duration: 0.4,
  /** Stagger offsets (seconds) — lab / legacy only. */
  delays: {
    room: 0,
    header: 0.04,
    meta: 0.08,
    fixtures: 0.12,
    pitch: 0.16,
    players: 0.22,
    footer: 0.28,
  },
} as const;

/** Site boot: hold curtain at least this long so lift feels intentional. */
export const HERO_BOOT_MIN_MS = 420;
/** Soft wait for player catalog before lifting (then proceed anyway). */
export const HERO_BOOT_DATA_WAIT_MS = 1600;
/** rAF frames after paint-ready before lifting. */
export const HERO_BOOT_SETTLE_FRAMES = 3;

export type HeroRevealStyle = "stagger" | "instant";

const VISIBLE = {
  opacity: 1,
  y: 0,
  filter: "blur(0px)",
} as const;

export function heroPanelReveal(
  delay: number,
  reduceMotion: boolean,
  style: HeroRevealStyle = "stagger",
): {
  initial: { opacity: number; y: number; filter: string };
  animate: { opacity: number; y: number; filter: string };
  transition: { duration: number; delay: number; ease: typeof HERO_EASE_OUT };
} {
  if (reduceMotion || style === "instant") {
    return {
      initial: { ...VISIBLE },
      animate: { ...VISIBLE },
      transition: { duration: 0, delay: 0, ease: HERO_EASE_OUT },
    };
  }
  return {
    initial: { opacity: 0, y: 12, filter: "blur(8px)" },
    animate: { ...VISIBLE },
    transition: {
      duration: HERO_REVEAL.duration,
      delay,
      ease: HERO_EASE_OUT,
    },
  };
}
