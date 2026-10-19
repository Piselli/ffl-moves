import { telegramSendMessage, type TelegramUpdate } from "@/lib/server/telegram/api";
import { broadcastText } from "@/lib/server/telegram/broadcast";
import {
  msgAlreadySubscribed,
  msgHelp,
  msgNotSubscribed,
  msgStats,
  msgUnsubscribed,
  msgWelcome,
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
  if (!parsed) {
    await telegramSendMessage(chatId, msgHelp());
    return { handled: true, detail: "help_fallback" };
  }

  const { cmd, arg } = parsed;

  if (cmd === "/start") {
    const { added, total } = await subscribeChat(chatId);
    await telegramSendMessage(chatId, added ? msgWelcome() : msgAlreadySubscribed());
    return { handled: true, detail: added ? `subscribed total=${total}` : `already total=${total}` };
  }

  if (cmd === "/stop" || cmd === "/unsubscribe") {
    const { removed, total } = await unsubscribeChat(chatId);
    await telegramSendMessage(chatId, removed ? msgUnsubscribed() : msgNotSubscribed());
    return { handled: true, detail: removed ? `unsubscribed total=${total}` : `not_sub total=${total}` };
  }

  if (cmd === "/help") {
    await telegramSendMessage(chatId, msgHelp());
    return { handled: true, detail: "help" };
  }

  if (cmd === "/stats") {
    if (!isAdminChat(chatId)) {
      await telegramSendMessage(chatId, msgHelp());
      return { handled: true, detail: "stats_denied" };
    }
    const total = await subscriberCount();
    await telegramSendMessage(chatId, msgStats(total));
    return { handled: true, detail: `stats=${total}` };
  }

  if (cmd === "/broadcast") {
    if (!isAdminChat(chatId)) {
      await telegramSendMessage(chatId, msgHelp());
      return { handled: true, detail: "broadcast_denied" };
    }
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

  await telegramSendMessage(chatId, msgHelp());
  return { handled: true, detail: "unknown_cmd" };
}
