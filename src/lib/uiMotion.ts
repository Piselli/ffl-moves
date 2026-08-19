/** Shared product motion — TripleD dialog/tabs + Emil timings. */

export const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export const SPRING_SNAPPY = { type: "spring" as const, stiffness: 480, damping: 34 };
export const SPRING_PILL = { type: "spring" as const, stiffness: 420, damping: 34 };
export const SPRING_MODAL = { type: "spring" as const, duration: 0.42, bounce: 0 };

export function modalOverlayMotion(reduce: boolean) {
  return {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: reduce ? 0.12 : 0.22 },
  };
}

export function modalPanelMotion(reduce: boolean) {
  return {
    initial: reduce
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.96, filter: "blur(10px)" },
    animate: { opacity: 1, scale: 1, filter: "blur(0px)" },
    exit: reduce
      ? { opacity: 0 }
      : { opacity: 0, scale: 0.96, filter: "blur(10px)" },
    transition: reduce ? { duration: 0.14 } : SPRING_MODAL,
  };
}
