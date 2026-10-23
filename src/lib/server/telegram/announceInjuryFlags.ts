/**
 * One-shot feature announcement: injury / doubtful marks on the picker.
 * Idempotent via Redis alert slot — safe to retry.
 */
import { broadcastMediaGroup, type BroadcastResult } from "@/lib/server/telegram/broadcast";
import {
  INJURY_FLAGS_DOUBT_IMG,
  INJURY_FLAGS_OUT_IMG,
  msgInjuryFlagsLaunch,
} from "@/lib/server/telegram/messages";
import {
  claimAlertSlot,
  confirmAlertSlot,
  releaseAlertSlot,
  subscriberCount,
} from "@/lib/server/telegram/subscribers";
import { telegramConfigured } from "@/lib/server/telegram/api";

const ANNOUNCE_KIND = "feature_injury_flags";
/** Slot key is not GW-scoped; use a fixed sentinel id. */
const ANNOUNCE_ID = 1;

export type AnnounceInjuryFlagsResult = {
  ok: boolean;
  skipped?: string;
  subscribers: number;
  broadcast: BroadcastResult | null;
};

export async function announceInjuryFlags(opts?: {
  dryRun?: boolean;
}): Promise<AnnounceInjuryFlagsResult> {
  if (!telegramConfigured()) {
    return { ok: true, skipped: "telegram_disabled_or_unconfigured", subscribers: 0, broadcast: null };
  }

  const subs = await subscriberCount();
  if (opts?.dryRun) {
    return {
      ok: true,
      skipped: "dry_run",
      subscribers: subs,
      broadcast: { attempted: 0, sent: 0, failed: 0, removed: 0, errors: ["dry_run"] },
    };
  }

  const claimed = await claimAlertSlot(ANNOUNCE_KIND, ANNOUNCE_ID);
  if (!claimed) {
    return { ok: true, skipped: "already_sent", subscribers: subs, broadcast: null };
  }

  try {
    const broadcast = await broadcastMediaGroup([
      {
        type: "photo",
        media: INJURY_FLAGS_OUT_IMG,
        caption: msgInjuryFlagsLaunch(),
      },
      {
        type: "photo",
        media: INJURY_FLAGS_DOUBT_IMG,
      },
    ]);
    if (broadcast.attempted > 0 && broadcast.sent === 0) {
      await releaseAlertSlot(ANNOUNCE_KIND, ANNOUNCE_ID);
    } else {
      await confirmAlertSlot(ANNOUNCE_KIND, ANNOUNCE_ID);
    }
    return { ok: true, subscribers: subs, broadcast };
  } catch (err) {
    await releaseAlertSlot(ANNOUNCE_KIND, ANNOUNCE_ID);
    throw err;
  }
}
