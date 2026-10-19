import { telegramSendMessage, type TelegramUpdate } from "@/lib/server/telegram/api";
import { broadcastText } from "@/lib/server/telegram/broadcast";
import {
  msgHelp,
  msgStats,
  msgUnsubscribed,
  msgWelcome,
  WELCOME_INLINE_KEYBOARD,
} from "@/lib/server/telegram/messages";
import {
  isAdminChat,
  subscribeChat,
  subscriberCount,
  unsubscribeChat,
} from "@/lib/server/telegram/subscribers";

function parseCommand(text: string | undefined): { cmd: string; arg: string } | null {
  if (!text) return null;
  const trimmed = text.trim();
  if (!trimmed.startsWith("/")) return null;
  const [raw, ...rest] = trimmed.split(/\s+/);
  const cmd = raw.split("@")[0]!.toLowerCase();
  return { cmd, arg: rest.join(" ").trim() };
}

export async function handleTelegramUpdate(update: TelegramUpdate): Promise<{ handled: boolean; detail?: string }> {
  const message = update.message;
  if (!message?.chat?.id) return { handled: false };

  const chatId = message.chat.id;
  const parsed = parseCommand(message.text);

  // Ignore free text — don't spam users with command lists.
  if (!parsed) {
    return { handled: true, detail: "ignored_text" };
  }

  const { cmd, arg } = parsed;

  if (cmd === "/start") {
    const { added, total } = await subscribeChat(chatId);
    // Same welcome every time — no "already subscribed / stop to leave" noise.
    await telegramSendMessage(chatId, msgWelcome(), { replyMarkup: WELCOME_INLINE_KEYBOARD });
    return { handled: true, detail: added ? `subscribed total=${total}` : `already total=${total}` };
  }

  if (cmd === "/stop" || cmd === "/unsubscribe") {
    await unsubscribeChat(chatId);
    await telegramSendMessage(chatId, msgUnsubscribed());
    return { handled: true, detail: "unsubscribed" };
  }

  if (cmd === "/help") {
    await telegramSendMessage(chatId, msgHelp());
    return { handled: true, detail: "help" };
  }

  // Admin-only — regular users get silence (not a stats dump).
  if (cmd === "/stats") {
    if (!isAdminChat(chatId)) return { handled: true, detail: "stats_denied" };
    const total = await subscriberCount();
    await telegramSendMessage(chatId, msgStats(total));
    return { handled: true, detail: `stats=${total}` };
  }

  if (cmd === "/broadcast") {
    if (!isAdminChat(chatId)) return { handled: true, detail: "broadcast_denied" };
    if (!arg) {
      await telegramSendMessage(chatId, "Usage: /broadcast Your message here");
      return { handled: true, detail: "broadcast_usage" };
    }
    const result = await broadcastText(arg);
    await telegramSendMessage(
      chatId,
      `Broadcast done. sent=${result.sent} failed=${result.failed} removed=${result.removed} of ${result.attempted}`,
    );
    return { handled: true, detail: `broadcast sent=${result.sent}` };
  }

  return { handled: true, detail: "unknown_cmd" };
}
