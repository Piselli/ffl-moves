/** Client-only browser helpers. Safe to call during SSR (returns false). */

export function isFirefoxBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Firefox\//i.test(navigator.userAgent);
}
