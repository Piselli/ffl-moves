/**
 * Ping subscribers when live GW stats are rewritten after finished matches.
 * Called from auto-publish — never throws into the publish path.
 */
import { telegramConfigured } from "@/lib/server/telegram/api";
import { broadcastText } from "@/lib/server/telegram/broadcast";
import { msgStatsUpdate } from "@/lib/server/telegram/messages";
import { claimAlertSlot } from "@/lib/server/telegram/subscribers";

function slotSuffix(fixtures: string[]): string {
  const raw = fixtures
    .map((f) => f.trim())
    .filter(Boolean)
    .sort()
    .join("|");
  // Keep Redis key bounded.
  return raw.slice(0, 160) || "batch";
}

export async function notifyStatsUpdate(opts: {
  gameweekId: number;
  fixtures: string[];
  contentChanged: boolean;
}): Promise<{ sent: boolean; detail: string }> {
  try {
    if (!telegramConfigured()) return { sent: false, detail: "telegram_disabled" };
    if (!opts.contentChanged) return { sent: false, detail: "unchanged" };
    if (!Number.isInteger(opts.gameweekId) || opts.gameweekId < 1 || opts.gameweekId > 38) {
      return { sent: false, detail: "not_epl_gw" };
    }

    const suffix = slotSuffix(opts.fixtures);
    const claimed = await claimAlertSlot("stats_update", opts.gameweekId, suffix);
    if (!claimed) return { sent: false, detail: "already_sent" };

    const result = await broadcastText(msgStatsUpdate(opts.gameweekId, opts.fixtures));
    return {
      sent: result.sent > 0,
      detail: `sent=${result.sent} failed=${result.failed} removed=${result.removed}`,
    };
  } catch (err) {
    console.warn("[telegram] notifyStatsUpdate failed:", err);
    return { sent: false, detail: err instanceof Error ? err.message : String(err) };
  }
}
