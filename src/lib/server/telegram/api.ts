/**
 * Minimal Telegram Bot API client (no third-party SDK).
 * Docs: https://core.telegram.org/bots/api
 */

const API_BASE = "https://api.telegram.org";

export type TelegramChat = { id: number; type: string; username?: string };
export type TelegramUser = { id: number; is_bot: boolean; first_name?: string; username?: string };
export type TelegramMessage = {
  message_id: number;
  chat: TelegramChat;
  from?: TelegramUser;
  text?: string;
  date: number;
};
export type TelegramUpdate = {
  update_id: number;
  message?: TelegramMessage;
};

type ApiOk<T> = { ok: true; result: T };
type ApiErr = { ok: false; description?: string; error_code?: number };

function token(): string | null {
  const t = process.env.TELEGRAM_BOT_TOKEN?.trim();
  return t || null;
}

export function telegramConfigured(): boolean {
  return !!token() && process.env.TELEGRAM_ALERTS_ENABLED !== "false";
}

async function call<T>(method: string, body?: Record<string, unknown>): Promise<T> {
  const t = token();
  if (!t) throw new Error("TELEGRAM_BOT_TOKEN is not set");
  const res = await fetch(`${API_BASE}/bot${t}/${method}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });
  const data = (await res.json()) as ApiOk<T> | ApiErr;
  if (!data.ok) {
    throw new Error(data.description || `Telegram ${method} failed (${data.error_code ?? res.status})`);
  }
  return data.result;
}

export async function telegramGetMe(): Promise<{ id: number; username?: string; first_name?: string }> {
  return call("getMe");
}

export async function telegramSendMessage(
  chatId: number | string,
  text: string,
  opts?: { disablePreview?: boolean; parseMode?: "HTML" | "Markdown" },
): Promise<TelegramMessage> {
  return call("sendMessage", {
    chat_id: chatId,
    text,
    disable_web_page_preview: opts?.disablePreview ?? true,
    ...(opts?.parseMode ? { parse_mode: opts.parseMode } : {}),
  });
}

export async function telegramSetWebhook(url: string, secretToken: string): Promise<boolean> {
  return call("setWebhook", {
    url,
    secret_token: secretToken,
    allowed_updates: ["message"],
    drop_pending_updates: false,
  });
}

export async function telegramDeleteWebhook(): Promise<boolean> {
  return call("deleteWebhook", { drop_pending_updates: false });
}

export async function telegramGetWebhookInfo(): Promise<{
  url: string;
  has_custom_certificate: boolean;
  pending_update_count: number;
  last_error_message?: string;
}> {
  return call("getWebhookInfo");
}

/** True when Telegram reports the chat blocked the bot / chat gone. */
export function isTelegramBlockedError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    /blocked by the user/i.test(msg) ||
    /chat not found/i.test(msg) ||
    /user is deactivated/i.test(msg) ||
    /bot was kicked/i.test(msg)
  );
}
