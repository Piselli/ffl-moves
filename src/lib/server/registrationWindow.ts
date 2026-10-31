/**
 * Soft FPL-clock check: has the first kickoff (+ grace) passed for this EPL gameweek?
 *
 * NOT used by fee-sponsor anymore — sponsored register follows on-chain OPEN/CLOSED
 * (admin Close / Re-open / auto-close). Keeping this helper for deadline tooling/tests.
 * Fail-open: if the deadline cannot be determined we never report closed.
 */
import { resolveRegistrationDeadline } from "@/lib/server/fplRegistrationDeadline";

/** EPL gameweeks are 1..38; World Cup tours (10001+) have their own gating. */
const MAX_EPL_GAMEWEEK = 38;
/** Tolerate clock skew between FPL's kickoff feed and the user's tx. */
const GRACE_MS = 30_000;
const CACHE_MS = 60_000;

const cache = new Map<number, { at: number; deadlineMs: number | null }>();

export async function isRegistrationClosed(
  gameweekId: number,
  nowMs: number = Date.now(),
): Promise<boolean> {
  if (!Number.isInteger(gameweekId) || gameweekId < 1 || gameweekId > MAX_EPL_GAMEWEEK) {
    return false;
  }
  const hit = cache.get(gameweekId);
  let deadlineMs: number | null;
  if (hit && nowMs - hit.at < CACHE_MS) {
    deadlineMs = hit.deadlineMs;
  } else {
    try {
      // Fail-open: only a CONFIRMED first kickoff may block a registration. A fallback
      // like FPL `deadline_time` is ~90 min early and would reject legit entrants.
      // Short budget so a slow FPL never delays a user's registration.
      const d = await resolveRegistrationDeadline(gameweekId, { attempts: 1, timeoutMs: 3_000 });
      deadlineMs = d.authoritative ? d.deadlineEpochMs : null;
    } catch {
      deadlineMs = null;
    }
    cache.set(gameweekId, { at: nowMs, deadlineMs });
  }
  return deadlineMs != null && nowMs > deadlineMs + GRACE_MS;
}
