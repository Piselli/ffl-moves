import { LEGAL_VERSION } from "@/lib/legal/version";

const PREFIX = "form8:legal:accept:";

function storageKey(wallet: string): string {
  return `${PREFIX}${LEGAL_VERSION}:${wallet.trim().toLowerCase()}`;
}

/** Same-browser remember — backs Redis on slow GET and dev soft-save. */
export function readLegalAcceptanceCache(wallet: string | null | undefined): boolean {
  if (!wallet || typeof sessionStorage === "undefined") return false;
  try {
    return sessionStorage.getItem(storageKey(wallet)) === "1";
  } catch {
    return false;
  }
}

export function writeLegalAcceptanceCache(wallet: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.setItem(storageKey(wallet), "1");
  } catch {
    /* quota / private mode */
  }
}

export function clearLegalAcceptanceCache(wallet: string): void {
  if (typeof sessionStorage === "undefined") return;
  try {
    sessionStorage.removeItem(storageKey(wallet));
  } catch {
    /* ignore */
  }
}
