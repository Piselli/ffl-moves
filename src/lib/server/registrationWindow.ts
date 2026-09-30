/**
 * Is on-chain registration for this gameweek still supposed to be open?
 *
 * The program itself has no deadline — an admin/cron `close_gameweek` ends it, and that
 * cron can lag. The fee sponsor uses this to stop *gasless* late registrations in the
 * gap. Fail-open: if the deadline cannot be determined we never block users.
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
      deadlineMs = (await resolveRegistrationDeadline(gameweekId)).deadlineEpochMs;
    } catch {
      deadlineMs = null;
    }
    cache.set(gameweekId, { at: nowMs, deadlineMs });
  }
  return deadlineMs != null && nowMs > deadlineMs + GRACE_MS;
}
