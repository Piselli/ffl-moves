import {
  isTelegramBlockedError,
  telegramSendMediaGroup,
  telegramSendMessage,
  type TelegramInputMediaPhoto,
} from "@/lib/server/telegram/api";
import {
  listSubscriberIds,
  unsubscribeChat,
} from "@/lib/server/telegram/subscribers";

export type BroadcastResult = {
  attempted: number;
  sent: number;
  failed: number;
  removed: number;
  errors: string[];
};

function emptyResult(attempted: number): BroadcastResult {
  return { attempted, sent: 0, failed: 0, removed: 0, errors: [] };
}

/**
 * Fan-out a text message to every subscriber. Removes chats that blocked the bot.
 * Sequential with a small delay so we stay under Telegram's ~30 msg/s soft limit.
 */
export async function broadcastText(text: string): Promise<BroadcastResult> {
  const ids = await listSubscriberIds();
  const result = emptyResult(ids.length);

  for (const chatId of ids) {
    try {
      await telegramSendMessage(chatId, text);
      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      if (result.errors.length < 8) result.errors.push(`${chatId}: ${msg}`);
      if (isTelegramBlockedError(err)) {
        await unsubscribeChat(chatId);
        result.removed += 1;
      }
    }
    // ~25 msg/s ceiling with margin
    await new Promise((r) => setTimeout(r, 40));
  }

  return result;
}

/**
 * Fan-out a photo album. Caption belongs on media[0].
 * Slightly slower pacing — media uploads cost more than text.
 */
export async function broadcastMediaGroup(
  media: TelegramInputMediaPhoto[],
): Promise<BroadcastResult> {
  const ids = await listSubscriberIds();
  const result = emptyResult(ids.length);

  for (const chatId of ids) {
    try {
      await telegramSendMediaGroup(chatId, media);
      result.sent += 1;
    } catch (err) {
      result.failed += 1;
      const msg = err instanceof Error ? err.message : String(err);
      if (result.errors.length < 8) result.errors.push(`${chatId}: ${msg}`);
      if (isTelegramBlockedError(err)) {
        await unsubscribeChat(chatId);
        result.removed += 1;
      }
    }
    await new Promise((r) => setTimeout(r, 80));
  }

  return result;
}
