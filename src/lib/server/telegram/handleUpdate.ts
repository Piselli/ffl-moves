import {
  telegramSendMessage,
  type TelegramMessage,
  type TelegramUpdate,
} from "@/lib/server/telegram/api";
import { announceInjuryFlags } from "@/lib/server/telegram/announceInjuryFlags";
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
  parseAdminChatIds,
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

function formatSubscriberLabel(message: TelegramMessage): string {
  const from = message.from;
  const chat = message.chat;
  const username = from?.username || chat.username;
  if (username) return `@${username}`;
  const name = [from?.first_name ?? chat.first_name, from?.last_name ?? chat.last_name]
    .filter(Boolean)
    .join(" ");
  if (name) return name;
  return `id ${chat.id}`;
}

/** Ping every admin chat (except the actor) about subscribe / unsubscribe. */
async function notifyAdmins(text: string, exceptChatId?: number): Promise<void> {
  for (const adminId of parseAdminChatIds()) {
    if (exceptChatId != null && adminId === exceptChatId) continue;
    try {
      await telegramSendMessage(adminId, text);
    } catch (err) {
      console.warn("[telegram] admin notify failed:", adminId, err);
    }
  }
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
    if (added) {
      const who = formatSubscriberLabel(message);
      await notifyAdmins(`New subscriber: ${who}\nTotal: ${total}`, chatId);
    }
    return { handled: true, detail: added ? `subscribed total=${total}` : `already total=${total}` };
  }

  if (cmd === "/stop" || cmd === "/unsubscribe") {
    const { removed, total } = await unsubscribeChat(chatId);
    await telegramSendMessage(chatId, msgUnsubscribed());
    if (removed) {
      const who = formatSubscriberLabel(message);
      await notifyAdmins(`Unsubscribed: ${who}\nTotal: ${total}`, chatId);
    }
    return { handled: true, detail: removed ? "unsubscribed" : "not_sub" };
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

  if (cmd === "/announce") {
    if (!isAdminChat(chatId)) return { handled: true, detail: "announce_denied" };
    if (arg.toLowerCase() !== "injuries" && arg.toLowerCase() !== "injury_flags") {
      await telegramSendMessage(chatId, "Usage: /announce injuries");
      return { handled: true, detail: "announce_usage" };
    }
    const result = await announceInjuryFlags();
    if (result.skipped) {
      await telegramSendMessage(chatId, `Announce skipped: ${result.skipped}`);
      return { handled: true, detail: `announce_skipped=${result.skipped}` };
    }
    const b = result.broadcast;
    await telegramSendMessage(
      chatId,
      `Injury flags announce done. sent=${b?.sent ?? 0} failed=${b?.failed ?? 0} of ${b?.attempted ?? 0}`,
    );
    return { handled: true, detail: `announce sent=${b?.sent ?? 0}` };
  }

  return { handled: true, detail: "unknown_cmd" };
}
