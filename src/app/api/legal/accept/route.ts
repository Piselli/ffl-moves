import { NextResponse } from "next/server";
import {
  getLegalAcceptance,
  hasAcceptedCurrentLegal,
  hashIp,
  isLegalAccepted,
  saveLegalAcceptance,
} from "@/lib/legal/acceptanceStore";
import { LEGAL_VERSION } from "@/lib/legal/version";
import { clientIp as sharedClientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";

function clientIp(request: Request): string | undefined {
  const ip = sharedClientIp(request);
  return ip && ip !== "unknown" ? ip : undefined;
}

async function tooMany(request: Request, scope: string, limit: number) {
  const gate = await rateLimit(`legal:${scope}:${sharedClientIp(request)}`, limit, 60);
  if (gate.ok) return null;
  return NextResponse.json(
    { error: "Too many requests." },
    { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
  );
}

function normalizeWallet(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const w = raw.trim();
  if (w.length < 32 || w.length > 64) return null;
  return w;
}

/** GET ?wallet=… — whether current LEGAL_VERSION is accepted. */
export async function GET(request: Request) {
  const limited = await tooMany(request, "get", 120);
  if (limited) return limited;
  const { searchParams } = new URL(request.url);
  const wallet = normalizeWallet(searchParams.get("wallet"));
  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet." }, { status: 400 });
  }
  const record = await getLegalAcceptance(wallet);
  const accepted = isLegalAccepted(record);
  return NextResponse.json({
    accepted,
    version: LEGAL_VERSION,
    record: accepted ? record : null,
  });
}

/** POST { wallet, locale } — persist attestation for current LEGAL_VERSION. */
export async function POST(request: Request) {
  const limited = await tooMany(request, "post", 20);
  if (limited) return limited;
  let body: { wallet?: string; locale?: string };
  try {
    body = (await request.json()) as { wallet?: string; locale?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }
  const wallet = normalizeWallet(body.wallet);
  if (!wallet) {
    return NextResponse.json({ error: "Missing wallet." }, { status: 400 });
  }
  const locale = body.locale === "uk" ? "uk" : "en";

  try {
    // Idempotent if already current.
    if (await hasAcceptedCurrentLegal(wallet)) {
      const existing = await getLegalAcceptance(wallet);
      return NextResponse.json({ ok: true, record: existing, version: LEGAL_VERSION });
    }
    const record = await saveLegalAcceptance(wallet, {
      locale,
      ipHash: hashIp(clientIp(request)),
    });
    return NextResponse.json({ ok: true, record, version: LEGAL_VERSION });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to save acceptance.";
    // Local/dev without Redis: still allow UI testing with a soft ack.
    if (process.env.NODE_ENV !== "production" && message.includes("Redis")) {
      return NextResponse.json({
        ok: true,
        soft: true,
        version: LEGAL_VERSION,
        record: {
          version: LEGAL_VERSION,
          acceptedAt: new Date().toISOString(),
          locale,
        },
      });
    }
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
