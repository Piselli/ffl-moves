export const PICK_WELCOME_STORAGE_KEY = "ffl:homepage:pick-welcome-seen";

/** First-visit welcome on homepage pick tablet. `?welcome=1` forces; `?welcome=reset` clears. */
export function shouldShowPickWelcome(): boolean {
  if (typeof window === "undefined") return false;
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.get("welcome") === "reset") {
      window.localStorage.removeItem(PICK_WELCOME_STORAGE_KEY);
      return true;
    }
    if (params.get("welcome") === "1") return true;
    return window.localStorage.getItem(PICK_WELCOME_STORAGE_KEY) !== "1";
  } catch {
    return false;
  }
}

export function markPickWelcomeSeen(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(PICK_WELCOME_STORAGE_KEY, "1");
  } catch {
    /* ignore */
  }
}
