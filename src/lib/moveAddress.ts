import { AccountAddress } from "@aptos-labs/ts-sdk";

/**
 * Canonical 32-byte Movement/Aptos address (lowercase, 0x + 64 hex).
 * Wallets often return leading-zero-padded forms (`0x0d66a…`) while on-chain
 * views may omit them (`0xd66a…`) — both must compare equal.
 */
export function normalizeMoveAccountAddress(raw: string): string {
  const t = raw.trim();
  if (!t) return "";
  try {
    return AccountAddress.fromString(t).toString().toLowerCase();
  } catch {
    let hex = t.toLowerCase();
    if (!hex.startsWith("0x")) hex = `0x${hex}`;
    const body = hex.slice(2);
    if (!/^[0-9a-f]+$/.test(body) || body.length < 1 || body.length > 64) return hex;
    return `0x${body.padStart(64, "0")}`;
  }
}

export function moveAddressesMatch(a: string, b: string): boolean {
  return normalizeMoveAccountAddress(a) === normalizeMoveAccountAddress(b);
}
