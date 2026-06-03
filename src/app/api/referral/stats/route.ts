import { NextRequest, NextResponse } from "next/server";
import { getStats, isReferralStoreDurable, getReferralHealth } from "@/lib/referral";

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
  const expected = process.env.REFERRAL_ADMIN_KEY;
  if (!expected) {
    return NextResponse.json(
      { error: "Referral dashboard disabled: set REFERRAL_ADMIN_KEY in the environment." },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { searchParams } = new URL(req.url);
  const provided = req.headers.get("x-referral-key") ?? searchParams.get("key") ?? "";
  if (provided !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers: { "Cache-Control": "no-store" } });
  }

  const [stats, health] = await Promise.all([getStats(), getReferralHealth()]);
  const totals = stats.reduce(
    (acc, s) => {
      acc.clicks += s.clicks;
      acc.signups += s.signups;
      return acc;
    },
    { clicks: 0, signups: 0 },
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
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
