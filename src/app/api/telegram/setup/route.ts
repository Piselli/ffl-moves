import { NextResponse } from "next/server";
import { safeEqual } from "@/lib/server/clientIp";
import {
  telegramConfigured,
  telegramDeleteWebhook,
  telegramGetMe,
  telegramGetWebhookInfo,
  telegramSetWebhook,
} from "@/lib/server/telegram/api";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

function authorize(request: Request): boolean {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) return false;
  const header = request.headers.get("authorization") ?? "";
  return safeEqual(header, `Bearer ${secret}`);
}

function webhookSecret(): string | null {
  const dedicated = process.env.TELEGRAM_WEBHOOK_SECRET?.trim();
  if (dedicated) return dedicated;
  return process.env.CRON_SECRET?.trim() || null;
}

function publicBaseUrl(): string {
  const fromEnv =
    process.env.TELEGRAM_WEBHOOK_BASE_URL?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "https://www.form8.football";
  return fromEnv.replace(/\/$/, "");
}

/**
 * Register or inspect the Telegram webhook.
 *
 * Auth: Authorization: Bearer $CRON_SECRET
 * POST — setWebhook to {base}/api/telegram/webhook
 * DELETE — deleteWebhook
 * GET — getMe + getWebhookInfo
 */
export async function GET(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "Telegram alerts disabled" }, { status: 503 });
  }
  try {
    const [me, info] = await Promise.all([telegramGetMe(), telegramGetWebhookInfo()]);
    return NextResponse.json({
      ok: true,
      bot: me,
      webhook: info,
      expectedUrl: `${publicBaseUrl()}/api/telegram/webhook`,
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!telegramConfigured()) {
    return NextResponse.json({ error: "Telegram alerts disabled" }, { status: 503 });
  }
  const secret = webhookSecret();
  if (!secret) {
    return NextResponse.json(
      { error: "Set TELEGRAM_WEBHOOK_SECRET or CRON_SECRET" },
      { status: 500 },
    );
  }
  const url = `${publicBaseUrl()}/api/telegram/webhook`;
  try {
    await telegramSetWebhook(url, secret);
    const info = await telegramGetWebhookInfo();
    return NextResponse.json({ ok: true, url, webhook: info });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  if (!authorize(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    await telegramDeleteWebhook();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
