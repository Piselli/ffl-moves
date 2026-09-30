import { clientIp, safeEqual } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";
import { NextRequest, NextResponse } from "next/server";
import {
  deleteCode,
  getStats,
  isReferralStoreDurable,
  getReferralHealth,
  normalizeCode,
} from "@/lib/referral";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/referral/stats
 *
 * Returns per-code clicks / signups / conversion rate.
 * Gated by an admin key so the promoter (or owner) can view it without being an
 * on-chain admin. Pass the key via `?key=` or the `x-referral-key` header.
 *
 * Set `REFERRAL_ADMIN_KEY` in the environment. If it is unset, the endpoint is
 * disabled (returns 503) to avoid leaking data with a default secret.
 */
export async function GET(req: NextRequest) {
  const gate = await rateLimit(`admin:referral:${clientIp(req)}`, 30, 60);
  if (!gate.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } });
  const expected = process.env.REFERRAL_ADMIN_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Referral dashboard disabled: set REFERRAL_ADMIN_KEY in the environment." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { searchParams } = new URL(req.url);
  const provided = req.headers.get("x-referral-key") ?? searchParams.get("key") ?? "";
  if (!safeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const [stats, health] = await Promise.all([getStats(), getReferralHealth()]);
  const totals = stats.reduce(
    (acc, s) => {
      acc.clicks += s.clicks;
      acc.signups += s.signups;
      acc.estimatedFeeVolumeUsdc += s.estimatedFeeVolumeUsdc;
      return acc;
    },
    { clicks: 0, signups: 0, estimatedFeeVolumeUsdc: 0 },
  );

  return NextResponse.json(
    {
      durable: isReferralStoreDurable() && health.reachable,
      health,
      totals: {
        ...totals,
        conversionRate: totals.clicks > 0 ? totals.signups / totals.clicks : 0,
      },
      codes: stats,
      note:
        "Partner ?ref= links do not award Season Points. Use estimated fee volume for manual commission payouts.",
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * DELETE /api/referral/stats?key=…&code=…
 *
 * Removes a referral code and its click/signup counters from storage.
 */
export async function DELETE(req: NextRequest) {
  const gate = await rateLimit(`admin:referral:${clientIp(req)}`, 30, 60);
  if (!gate.ok) return NextResponse.json({ error: "Too many requests" }, { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } });
  const expected = process.env.REFERRAL_ADMIN_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Referral dashboard disabled: set REFERRAL_ADMIN_KEY in the environment." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { searchParams } = new URL(req.url);
  const provided = req.headers.get("x-referral-key") ?? searchParams.get("key") ?? "";
  if (!safeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const code = normalizeCode(searchParams.get("code"));
  if (!code) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400, headers: { "Cache-Control": "no-store" } });
  }

  const deleted = await deleteCode(code);
  if (!deleted) {
    return NextResponse.json({ error: "Code not found" }, { status: 404, headers: { "Cache-Control": "no-store" } });
  }

  return NextResponse.json({ ok: true, code }, { status: 200, headers: { "Cache-Control": "no-store" } });
}
