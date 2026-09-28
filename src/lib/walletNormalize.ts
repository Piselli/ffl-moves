/**
 * Wallet address normalization for Redis keys / attribution.
 * Supports Solana base58 (current) and legacy Movement `0x…` hex.
 */

const SOLANA_BASE58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const MOVEMENT_HEX = /^0x[0-9a-f]{1,64}$/;

export function normalizeWallet(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (SOLANA_BASE58.test(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  if (MOVEMENT_HEX.test(lower)) return lower;
  return null;
}

/** Case-insensitive lookup helper (hex wallets; Solana base58 matched exactly first). */
export function lookupByWalletKey<T>(
  map: Record<string, T>,
  owner: string,
): T | undefined {
  if (Object.prototype.hasOwnProperty.call(map, owner)) return map[owner];
  const lower = owner.toLowerCase();
  if (Object.prototype.hasOwnProperty.call(map, lower)) return map[lower];
  for (const [k, v] of Object.entries(map)) {
    if (k.toLowerCase() === lower) return v;
  }
  return undefined;
}
