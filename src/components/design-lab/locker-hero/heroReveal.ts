/**
 * Homepage first-paint choreography — Emil ease-out + TripleD / Motion stagger.
 * Rare per session → delight OK; keep total under ~500ms so it feels fast.
 */
export const HERO_EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export const HERO_REVEAL = {
  duration: 0.4,
  /** Stagger offsets (seconds) after boot lifts. */
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

export function heroPanelReveal(
  delay: number,
  reduceMotion: boolean,
): {
  initial: { opacity: number; y: number; filter: string };
  animate: { opacity: number; y: number; filter: string };
  transition: { duration: number; delay: number; ease: typeof HERO_EASE_OUT };
} {
  if (reduceMotion) {
    return {
      initial: { opacity: 1, y: 0, filter: "blur(0px)" },
      animate: { opacity: 1, y: 0, filter: "blur(0px)" },
      transition: { duration: 0, delay: 0, ease: HERO_EASE_OUT },
    };
  }
  return {
    initial: { opacity: 0, y: 12, filter: "blur(8px)" },
    animate: { opacity: 1, y: 0, filter: "blur(0px)" },
    transition: {
      duration: HERO_REVEAL.duration,
      delay,
      ease: HERO_EASE_OUT,
    },
  };
}
