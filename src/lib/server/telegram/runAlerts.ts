/**
 * Decide which FORM8 alerts to fire this tick (registration, deadline windows, claim).
 * Idempotent via Redis SETNX slots — safe to run every 5–15 minutes.
 */
import {
  findLatestResolvedGameweekId,
  findOpenGameweek,
  getConfig,
  getGameweek,
} from "@/lib/chainClient";
import { resolveRegistrationDeadline } from "@/lib/server/fplRegistrationDeadline";
import { broadcastText, type BroadcastResult } from "@/lib/server/telegram/broadcast";
import {
  msgClaimReady,
  msgDeadlineReminder,
  msgRegistrationClosed,
  msgRegistrationOpen,
} from "@/lib/server/telegram/messages";
import {
  claimAlertSlot,
  confirmAlertSlot,
  markAlertSlot,
  releaseAlertSlot,
  subscriberCount,
  takeClaimReadyAlert,
} from "@/lib/server/telegram/subscribers";
import { telegramConfigured } from "@/lib/server/telegram/api";
import { DEADLINE_WINDOWS, pickDeadlineWindow } from "@/lib/server/telegram/deadlineWindows";

export type AlertFire = {
  kind: string;
  gameweekId: number;
  broadcast: BroadcastResult;
};

export type RunAlertsResult = {
  ok: boolean;
  skipped?: string;
  subscribers: number;
  fired: AlertFire[];
  checked: Record<string, unknown>;
};

async function fire(
  kind: string,
  gameweekId: number,
  text: string,
  dryRun: boolean,
): Promise<AlertFire | null> {
  if (dryRun) {
    return {
      kind,
      gameweekId,
      broadcast: { attempted: 0, sent: 0, failed: 0, removed: 0, errors: ["dry_run"] },
    };
  }
  const claimed = await claimAlertSlot(kind, gameweekId);
  if (!claimed) return null;
  try {
    const broadcast = await broadcastText(text);
    if (broadcast.attempted > 0 && broadcast.sent === 0) {
      await releaseAlertSlot(kind, gameweekId);
    } else {
      await confirmAlertSlot(kind, gameweekId);
    }
    return { kind, gameweekId, broadcast };
  } catch (err) {
    await releaseAlertSlot(kind, gameweekId);
    throw err;
  }
}

export async function runTelegramAlerts(opts?: {
  dryRun?: boolean;
  nowMs?: number;
  /** Release these kinds for the open GW before evaluating (unstick a eaten slot). */
  unstickKinds?: string[];
}): Promise<RunAlertsResult> {
  if (!telegramConfigured()) {
    return { ok: true, skipped: "telegram_disabled_or_unconfigured", subscribers: 0, fired: [], checked: {} };
  }

  const dryRun = opts?.dryRun === true;
  const now = opts?.nowMs ?? Date.now();
  const subs = await subscriberCount();
  const fired: AlertFire[] = [];
  const checked: Record<string, unknown> = { nowIso: new Date(now).toISOString() };

  // ── Registration open + deadline reminders ──────────────────────────────
  const open = await findOpenGameweek();
  checked.openGameweekId = open?.id ?? null;

  if (open && open.status === "open" && open.id <= 38) {
    if (opts?.unstickKinds?.length) {
      for (const kind of opts.unstickKinds) {
        await releaseAlertSlot(kind, open.id);
      }
      checked.unstuck = opts.unstickKinds.map((kind) => `${kind}:${open.id}`);
    }

    const deadline = await resolveRegistrationDeadline(open.id);
    checked.deadline = {
      iso: deadline.deadlineIso,
      source: deadline.deadlineSource,
      authoritative: deadline.authoritative,
      epochMs: deadline.deadlineEpochMs,
    };

    const openFire = await fire(
      "reg_open",
      open.id,
      msgRegistrationOpen(open.id, deadline.deadlineIso, deadline.deadlineEpochMs),
      dryRun,
    );
    if (openFire) fired.push(openFire);

    const deadlineMs = deadline.authoritative ? deadline.deadlineEpochMs : null;
    if (deadlineMs != null) {
      const msUntil = deadlineMs - now;
      checked.msUntilDeadline = msUntil;

      const tightest = pickDeadlineWindow(msUntil);
      checked.deadlineWindow = tightest?.kind ?? null;
      if (tightest) {
        // Tightest window only; mark looser ones consumed so we never spam catch-up.
        for (const w of DEADLINE_WINDOWS) {
          if (w.fireWhenMsUntilAtMost > tightest.fireWhenMsUntilAtMost) {
            await markAlertSlot(w.kind, open.id);
          }
        }
        const dFire = await fire(
          tightest.kind,
          open.id,
          msgDeadlineReminder(open.id, tightest.label, deadline.deadlineIso, deadlineMs),
          dryRun,
        );
        if (dFire) fired.push(dFire);
      }
    }
  }

  // ── Registration closed (once per GW after on-chain close) ──────────────
  // ONLY the current gameweek, and ONLY while status === "closed".
  // Never backfill previous GWs while another tour is open — that spammed
  // "registration closed" for an old resolved week during GW8 registration.
  try {
    if (open) {
      checked.regClosedSkipped = "open_gameweek_present";
    } else {
      const config = await getConfig();
      const currentId = config?.currentGameweek ?? 0;
      checked.regClosedCandidate = currentId || null;
      if (currentId >= 1 && currentId <= 38) {
        const gw = await getGameweek(currentId);
        checked.regClosedStatus = gw?.status ?? null;
        if (gw?.status === "closed") {
          const closedFire = await fire(
            "reg_closed",
            gw.id,
            msgRegistrationClosed(gw.totalEntries, gw.prizePool),
            dryRun,
          );
          if (closedFire) {
            fired.push(closedFire);
            const sent = closedFire.broadcast.sent;
            checked.regClosedOutcome = sent > 0 ? "sent" : "failed";
            // Failed send releases the slot — keep chaining so the next tick retries.
            checked.regClosedPending = sent === 0 && closedFire.broadcast.attempted > 0;
          } else {
            // Slot already claimed (sent earlier or in-flight lock).
            checked.regClosedOutcome = "already_claimed";
            checked.regClosedPending = false;
          }
        }
      }
    }
  } catch (err) {
    checked.regClosedError = err instanceof Error ? err.message : String(err);
    // Close already happened on-chain; keep trying the alert on the next chain tick.
    checked.regClosedPending = true;
  }

  // ── Claim ready (latest resolved EPL GW) ────────────────────────────────
  try {
    const config = await getConfig();
    const highest = config?.currentGameweek ?? 0;
    const resolvedId = highest > 0 ? await findLatestResolvedGameweekId(highest) : 0;
    checked.latestResolvedId = resolvedId;
    if (resolvedId > 0 && resolvedId <= 38) {
      if (dryRun) {
        checked.claimWouldSend = true;
        const cFire = await fire("claim_ready", resolvedId, msgClaimReady(resolvedId), true);
        if (cFire) fired.push(cFire);
      } else {
        const shouldSend = await takeClaimReadyAlert(resolvedId);
        checked.claimShouldSend = shouldSend;
        if (shouldSend) {
          const broadcast = await broadcastText(msgClaimReady(resolvedId));
          fired.push({ kind: "claim_ready", gameweekId: resolvedId, broadcast });
        }
      }
    }
  } catch (err) {
    checked.claimError = err instanceof Error ? err.message : String(err);
  }

  return { ok: true, subscribers: subs, fired, checked };
}
