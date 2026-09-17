/** Homepage pick welcome + guided tour + per-surface tips. */

export const PICK_WELCOME_STORAGE_KEY = "ffl:homepage:pick-welcome-seen";
export const PICK_TOUR_DONE_KEY = "ffl:homepage:pick-tour-done";

export type SurfaceTipId = "leaderboard" | "season";

/** Guided pick steps — formation first, then list picks (not empty slots). */
export type PickTourStepId =
  | "formation"
  | "players"
  | "captain"
  | "scoring"
  | "register";

export const PICK_TOUR_STEPS: PickTourStepId[] = [
  "formation",
  "players",
  "captain",
  "scoring",
  "register",
];

function tipKey(id: SurfaceTipId): string {
  return `ffl:tip:${id}:seen`;
}

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, on: boolean): void {
  if (typeof window === "undefined") return;
  try {
    if (on) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    /* ignore */
  }
}

function searchParams(): URLSearchParams | null {
  if (typeof window === "undefined") return null;
  try {
    return new URLSearchParams(window.location.search);
  } catch {
    return null;
  }
}

/** `?tour=1` forces; `?tour=reset` clears welcome + tour + tips. */
export function consumeTourQueryFlags(): { forceTour: boolean } {
  const params = searchParams();
  if (!params) return { forceTour: false };
  if (params.get("tour") === "reset") {
    resetAllOnboarding();
    return { forceTour: true };
  }
  if (params.get("tour") === "1") return { forceTour: true };
  return { forceTour: false };
}

/** First-visit welcome. `?welcome=1` forces; `?welcome=reset` clears welcome only. */
export function shouldShowPickWelcome(forceTour = false): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = searchParams();
    if (params?.get("welcome") === "reset") {
      writeFlag(PICK_WELCOME_STORAGE_KEY, false);
      return true;
    }
    if (params?.get("welcome") === "1") return true;
    if (forceTour) return true;
    return !readFlag(PICK_WELCOME_STORAGE_KEY);
  } catch {
    return false;
  }
}

export function markPickWelcomeSeen(): void {
  writeFlag(PICK_WELCOME_STORAGE_KEY, true);
}

export function isPickTourDone(): boolean {
  return readFlag(PICK_TOUR_DONE_KEY);
}

export function shouldStartPickTour(forceTour = false): boolean {
  if (forceTour) return true;
  return !isPickTourDone();
}

export function markPickTourDone(): void {
  writeFlag(PICK_TOUR_DONE_KEY, true);
}

export function clearPickTourDone(): void {
  writeFlag(PICK_TOUR_DONE_KEY, false);
}

export function shouldShowSurfaceTip(id: SurfaceTipId): boolean {
  if (typeof window === "undefined") return false;
  return !readFlag(tipKey(id));
}

export function markSurfaceTipSeen(id: SurfaceTipId): void {
  writeFlag(tipKey(id), true);
}

export function clearSurfaceTip(id: SurfaceTipId): void {
  writeFlag(tipKey(id), false);
}

/** Replay from tablet / FAQ — clears tour + welcome so both re-run. */
export function preparePickTourReplay(): void {
  writeFlag(PICK_WELCOME_STORAGE_KEY, false);
  writeFlag(PICK_TOUR_DONE_KEY, false);
}

export function resetAllOnboarding(): void {
  writeFlag(PICK_WELCOME_STORAGE_KEY, false);
  writeFlag(PICK_TOUR_DONE_KEY, false);
  clearSurfaceTip("leaderboard");
  clearSurfaceTip("season");
}
