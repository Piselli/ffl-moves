import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";
import { NextRequest, NextResponse } from "next/server";
import { buildPartnerStatsPayload } from "@/lib/partners/statsPayload";
import {
  getReferralPartners,
  resolveReferralPartner,
} from "@/lib/referralPartners";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/referral/partner
 *
 * Partner-scoped export for Google Sheets (Apps Script) or other pull clients.
 * Auth: partner key via `?key=` or `x-referral-partner-key` header.
 * Config: `REFERRAL_PARTNERS` JSON in env (see referralPartners.ts).
 *
 * Query:
 *   key      — partner secret
 *   format   — `json` (default) | `csv`
 */
export async function GET(req: NextRequest) {
  const gate = await rateLimit(`partner:referral:${clientIp(req)}`, 60, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  if (getReferralPartners().length === 0) {
    return NextResponse.json(
      {
        error:
          "Partner export disabled: set REFERRAL_PARTNERS in the environment.",
      },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { searchParams } = new URL(req.url);
  const provided =
    req.headers.get("x-referral-partner-key") ?? searchParams.get("key") ?? "";
  const partner = resolveReferralPartner(provided);
  if (!partner) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const format = (searchParams.get("format") ?? "json").toLowerCase();
  const payload = await buildPartnerStatsPayload(partner);

  // Sheets clients expect partner without codes array in the nested object shape
  // they already use — keep id/label only for backward compatibility.
  const sheetsPayload = {
    partner: { id: payload.partner.id, label: payload.partner.label },
    updatedAt: payload.updatedAt,
    durable: payload.durable,
    totals: payload.totals,
    codes: payload.codes,
    campaigns: payload.campaigns,
    conversions: payload.conversions,
    note: payload.note,
  };

  if (format === "csv") {
    const { codes: codeRows, campaigns: campaignRows, conversions } = payload;
    const lines = [
      "sheet,code,campaign,link,clicks,signups,conversion_rate,estimated_fee_usdc,first_seen,last_activity,wallet",
      ...codeRows.map((r) =>
        [
          "summary",
          r.code,
          "",
          r.link,
          r.clicks,
          r.signups,
          r.conversionRate.toFixed(4),
          r.estimatedFeeVolumeUsdc.toFixed(4),
          r.firstSeen ? new Date(r.firstSeen).toISOString() : "",
          r.lastActivity ? new Date(r.lastActivity).toISOString() : "",
          "",
        ]
          .map(csvEscape)
          .join(","),
      ),
      ...campaignRows.map((r) =>
        [
          "campaigns",
          r.code,
          r.campaign,
          r.link,
          r.clicks,
          r.signups,
          r.conversionRate.toFixed(4),
          r.estimatedFeeVolumeUsdc.toFixed(4),
          r.firstSeen ? new Date(r.firstSeen).toISOString() : "",
          r.lastActivity ? new Date(r.lastActivity).toISOString() : "",
          "",
        ]
          .map(csvEscape)
          .join(","),
      ),
      ...conversions.map((c) =>
        ["conversions", c.code, c.campaign, "", "", "", "", "", "", "", c.wallet]
          .map(csvEscape)
          .join(","),
      ),
    ];
    return new NextResponse(lines.join("\n"), {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Cache-Control": "no-store",
        "Content-Disposition": `attachment; filename="form8-partner-${partner.id}.csv"`,
      },
    });
  }

  return NextResponse.json(sheetsPayload, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
