import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/server/clientIp";
import { telegramConfigured, type TelegramUpdate } from "@/lib/server/telegram/api";
import { handleTelegramUpdate } from "@/lib/server/telegram/handleUpdate";

export const dynamic = "force-dynamic";
export const maxDuration = 30;
export const preferredRegion = "lhr1";

function webhookSecret(): string | null {
  const dedicated = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (dedicated) return dedicated;
  return process.env.CRON_SECRET?.trim() || null;
}

function authorize(request: Request): boolean {
  const secret = webhookSecret();
  if (!secret) return false;
  const header = request.headers.get("x-telegram-bot-api-secret-token") ?? "";
  return safeEqual(header, secret);
}

/**
 * Telegram sends updates here after setWebhook.
 * Auth: header `X-Telegram-Bot-Api-Secret-Token` = TELEGRAM_WEBHOOK_SECRET || CRON_SECRET
 */
export async function POST(request: Request) {
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "Telegram alerts disabled" }, { status: 503 });
  }
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let update: TelegramUpdate;
  try {
    update = (await request.json()) as TelegramUpdate;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await handleTelegramUpdate(update);
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    console.error("telegram webhook failed:", error);
    // Still 200 so Telegram does not retry forever on bad messages.
    return NextResponse.json({
      ok: false,
      error: error instanceof Error ? error.message : String(error),
    });
  }
}
