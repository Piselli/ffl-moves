/**
 * Marks that the user opened the login UI this page lifetime.
 * Welcome modal may auto-open only when a connect follows this intent —
 * not when a session is restored on refresh.
 */
let loginIntent = false;

export function markLoginIntent(): void {
  loginIntent = true;
}

export function clearLoginIntent(): void {
  loginIntent = false;
}

/** Returns true once, then clears. */
export function consumeLoginIntent(): boolean {
  const v = loginIntent;
  loginIntent = false;
  return v;
}
