/**
 * Keep a cron route calling itself every ~minute near a deadline.
 * GitHub Actions `schedule` routinely skips hours; self-chain is the reliable path.
 */
import { waitUntilCompat } from "@/lib/server/waitUntilCompat";

export const DEFAULT_CHAIN_DELAY_MS = 55_000;
const DEFAULT_MAX_DEPTH = 220;
/** Never sleep less than this between chain ticks (RPC/settle headroom). */
const MIN_CHAIN_DELAY_MS = 2_000;
/** Aim to land this far after the target instant (kickoff). */
const AFTER_TARGET_BUFFER_MS = 1_500;

/**
 * When the deadline is still far away, tick every ~55s.
 * When it is closer than that, sleep until just after the deadline so we do not
 * sit idle for a full minute past kickoff (the GW8 ~110s lag case).
 */
export function chainDelayUntilMs(msUntilTarget: unknown): number {
  if (
    typeof msUntilTarget !== "number" ||
    !Number.isFinite(msUntilTarget) ||
    msUntilTarget <= 0
  ) {
    return DEFAULT_CHAIN_DELAY_MS;
  }
  if (msUntilTarget >= DEFAULT_CHAIN_DELAY_MS) return DEFAULT_CHAIN_DELAY_MS;
  return Math.max(MIN_CHAIN_DELAY_MS, Math.ceil(msUntilTarget + AFTER_TARGET_BUFFER_MS));
}

export function scheduleCronSelfChain(opts: {
  request: Request;
  depth: number;
  /** Header that carries chain depth (must match the reader on the route). */
  depthHeader: string;
  maxDepth?: number;
  delayMs?: number;
  /** Query keys to strip before the next poke (one-shot flags). */
  stripParams?: string[];
  label?: string;
}): void {
  const maxDepth = opts.maxDepth ?? DEFAULT_MAX_DEPTH;
  const delayMs = opts.delayMs ?? DEFAULT_CHAIN_DELAY_MS;
  const label = opts.label ?? "cron-chain";

  if (opts.depth >= maxDepth) {
    console.warn(`${label}: max depth reached`, opts.depth);
    return;
  }
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return;

  const next = new URL(opts.request.url);
  for (const key of opts.stripParams ?? []) {
    next.searchParams.delete(key);
  }

  waitUntilCompat(
    (async () => {
      await new Promise((r) => setTimeout(r, delayMs));
      const res = await fetch(next.toString(), {
        method: "POST",
        headers: {
          authorization: `Bearer ${secret}`,
          [opts.depthHeader]: String(opts.depth + 1),
        },
        cache: "no-store",
        signal: AbortSignal.timeout(55_000),
      });
      if (!res.ok) {
        console.warn(`${label}: poke failed`, res.status, `depth=${opts.depth + 1}`);
      }
    })().catch((error) => {
      console.warn(`${label}: failed`, error);
    }),
  );
}

export function readChainDepth(request: Request, depthHeader: string): number {
  const raw = request.headers.get(depthHeader);
  const n = raw != null ? Number(raw) : 0;
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
}
