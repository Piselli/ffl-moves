import {
  buildCloseGameweek,
  findOpenGameweek,
  getGameweek,
} from "@/lib/chainClient";
import { signAndSendAsAdmin } from "@/lib/server/adminSigner";
import {
  resolveRegistrationDeadline,
  type RegistrationDeadline,
} from "@/lib/server/fplRegistrationDeadline";

export type AutoCloseResult =
  | { action: "skipped"; reason: string; detail?: Record<string, unknown> }
  | {
      action: "closed";
      gameweekId: number;
      signature: string;
      deadlineIso: string | null;
      deadlineSource: string;
    }
  | { action: "dry_run_would_close"; gameweekId: number; detail: Record<string, unknown> };

/** Extra wait after the snapshot kickoff when live FPL is unreachable (reschedule safety). */
const DEFAULT_FALLBACK_GRACE_MS = 15 * 60_000;

/**
 * HARD RULE: never close before the official first kickoff. The FPL `deadline_time`
 * fallback is ~90 min early: it closed GW7 11 min before kickoff.
 *  - confirmed first kickoff (live FPL or last confirmed value) → close AT kickoff;
 *  - FPL unreachable and nothing confirmed → shipped fixtures snapshot, but only AFTER
 *    kickoff + a safety grace (covers a reschedule): still closes automatically, never early;
 *  - anything else (e.g. only FPL `deadline_time`) → null = refuse, retry on the next poke.
 * No "lead" setting exists on purpose: nothing can make this close earlier than kickoff.
 */
export function decideCloseAt(
  deadline: Pick<RegistrationDeadline, "deadlineEpochMs" | "deadlineSource" | "authoritative">,
  fallbackGraceMs?: number,
): { closeAtMs: number | null } {
  if (deadline.deadlineEpochMs == null) return { closeAtMs: null };
  if (deadline.authoritative) return { closeAtMs: deadline.deadlineEpochMs };
  if (deadline.deadlineSource !== "snapshot_kickoff") return { closeAtMs: null };
  const grace =
    fallbackGraceMs != null && Number.isFinite(fallbackGraceMs)
      ? Math.max(0, fallbackGraceMs)
      : DEFAULT_FALLBACK_GRACE_MS;
  return { closeAtMs: deadline.deadlineEpochMs + grace };
}

/**
 * If an OPEN on-chain gameweek's registration deadline has passed, close it.
 * Closes at the official first kickoff, never before it (see HARD RULE on `decideCloseAt`).
 */
export async function runAutoCloseGameweek(opts?: {
  dryRun?: boolean;
  nowMs?: number;
}): Promise<AutoCloseResult> {
  if (process.env.AUTO_CLOSE_ENABLED === "false") {
    return { action: "skipped", reason: "AUTO_CLOSE_ENABLED=false" };
  }

  const open = await findOpenGameweek();
  if (!open || open.status !== "open") {
    return { action: "skipped", reason: "no_open_gameweek" };
  }

  const deadline = await resolveRegistrationDeadline(open.id);
  if (deadline.deadlineEpochMs == null) {
    return {
      action: "skipped",
      reason: "no_deadline",
      detail: { gameweekId: open.id },
    };
  }

  // See HARD RULE on `decideCloseAt`: never earlier than the official first kickoff.
  const graceEnv = process.env.AUTO_CLOSE_FALLBACK_GRACE_MS?.trim();
  const decision = decideCloseAt(deadline, graceEnv ? Number(graceEnv) : undefined);
  if (decision.closeAtMs == null) {
    console.error(
      "auto-close: refusing to close — first kickoff not confirmed (FPL unreachable?)",
      { gameweekId: open.id, deadlineSource: deadline.deadlineSource, deadlineIso: deadline.deadlineIso },
    );
    return {
      action: "skipped",
      reason: "deadline_unverified",
      detail: {
        gameweekId: open.id,
        deadlineSource: deadline.deadlineSource,
        deadlineIso: deadline.deadlineIso,
      },
    };
  }
  const closeAt = decision.closeAtMs;
  const now = opts?.nowMs ?? Date.now();

  if (now < closeAt) {
    return {
      action: "skipped",
      reason: "before_deadline",
      detail: {
        gameweekId: open.id,
        deadlineIso: deadline.deadlineIso,
        deadlineSource: deadline.deadlineSource,
        closeAtIso: new Date(closeAt).toISOString(),
        msUntilClose: closeAt - now,
      },
    };
  }

  // Re-check in case another process closed it.
  const fresh = await getGameweek(open.id);
  if (!fresh || fresh.status !== "open") {
    return {
      action: "skipped",
      reason: "already_closed_or_missing",
      detail: { gameweekId: open.id, status: fresh?.status ?? null },
    };
  }

  if (opts?.dryRun) {
    return {
      action: "dry_run_would_close",
      gameweekId: open.id,
      detail: {
        deadlineIso: deadline.deadlineIso,
        deadlineSource: deadline.deadlineSource,
        closeAtIso: new Date(closeAt).toISOString(),
      },
    };
  }

  const { loadAdminKeypair } = await import("@/lib/server/adminSigner");
  const admin = loadAdminKeypair();
  const ixs = await buildCloseGameweek(admin.publicKey.toBase58(), open.id);
  const { signature } = await signAndSendAsAdmin(ixs);

  // Kick Telegram so `reg_closed` can fire promptly (slots are idempotent).
  try {
    const { pokeTelegramAlertsWatchdog } = await import("@/lib/server/telegramAlertsWatchdog");
    pokeTelegramAlertsWatchdog();
  } catch (error) {
    console.warn("auto-close: telegram alerts poke failed", error);
  }

  return {
    action: "closed",
    gameweekId: open.id,
    signature,
    deadlineIso: deadline.deadlineIso,
    deadlineSource: deadline.deadlineSource,
  };
}
