/**
 * Best-effort in-memory rate limits for /api/solana/sponsor-send.
 * Softens fee-grief spam across a single serverless instance; not a global
 * distributed limiter. Prefer a dedicated low-balance fee wallet regardless.
 */

type Bucket = { count: number; resetAt: number };

const ipBuckets = new Map<string, Bucket>();
const walletBuckets = new Map<string, Bucket>();

const WINDOW_MS = 60_000;
/** Sustained automated drain was ~1 tx / few seconds; keep human register/claim usable. */
const MAX_PER_IP_PER_MIN = 20;
const MAX_PER_WALLET_PER_MIN = 8;

function take(map: Map<string, Bucket>, key: string, max: number): boolean {
  const now = Date.now();
  const cur = map.get(key);
  if (!cur || now >= cur.resetAt) {
    map.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return true;
  }
  if (cur.count >= max) return false;
  cur.count += 1;
  return true;
}

/** Periodically drop expired buckets so the map cannot grow without bound. */
function gc(map: Map<string, Bucket>): void {
  if (map.size < 500) return;
  const now = Date.now();
  for (const [k, v] of map) {
    if (now >= v.resetAt) map.delete(k);
  }
}

export function allowSponsoredSend(opts: {
  ip: string;
  wallets: string[];
}): { ok: true } | { ok: false; retryAfterSec: number } {
  gc(ipBuckets);
  gc(walletBuckets);

  const ip = opts.ip.trim() || "unknown";
  if (!take(ipBuckets, ip, MAX_PER_IP_PER_MIN)) {
    return { ok: false, retryAfterSec: 60 };
  }
  for (const w of opts.wallets) {
    if (!w) continue;
    if (!take(walletBuckets, w, MAX_PER_WALLET_PER_MIN)) {
      return { ok: false, retryAfterSec: 60 };
    }
  }
  return { ok: true };
}
