import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";
import { NextRequest, NextResponse } from "next/server";
import {
  getCampaignStats,
  getReferralConversionsDetailed,
  getStats,
  isReferralStoreDurable,
  getReferralHealth,
  normalizeCode,
} from "@/lib/referral";
import {
  fillMissingPartnerCodes,
  filterStatsForPartner,
  getReferralPartners,
  resolveReferralPartner,
} from "@/lib/referralPartners";
import { buildReferralLink, buildShortReferralLink } from "@/lib/referralLink";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function siteBase(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return configured || "https://www.form8.football";
}

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
  const [allStats, campaigns, detailed, health] = await Promise.all([
    getStats(),
    getCampaignStats(partner.codes),
    getReferralConversionsDetailed(),
    getReferralHealth(),
  ]);

  const codes = fillMissingPartnerCodes(
    filterStatsForPartner(allStats, partner),
    partner,
  );
  const allow = new Set(partner.codes);
  const base = siteBase();

  const codeRows = codes.map((s) => ({
    code: s.code,
    link: buildShortReferralLink(base, s.code),
    linkClassic: buildReferralLink(base, s.code),
    clicks: s.clicks,
    signups: s.signups,
    conversionRate: s.conversionRate,
    estimatedFeeVolumeUsdc: s.estimatedFeeVolumeUsdc,
    firstSeen: s.firstSeen,
    lastActivity: s.lastActivity,
  }));

  const campaignRows = campaigns
    .filter((s) => allow.has(normalizeCode(s.code) ?? s.code))
    .map((s) => ({
      code: s.code,
      campaign: s.campaign || "(default)",
      link: buildShortReferralLink(base, s.code, s.campaign || null),
      linkClassic: buildReferralLink(base, s.code, s.campaign || null),
      clicks: s.clicks,
      signups: s.signups,
      conversionRate: s.conversionRate,
      estimatedFeeVolumeUsdc: s.estimatedFeeVolumeUsdc,
      firstSeen: s.firstSeen,
      lastActivity: s.lastActivity,
    }));

  const conversions = detailed
    .filter((row) => allow.has(normalizeCode(row.code) ?? row.code))
    .map((row) => ({
      wallet: row.wallet,
      code: normalizeCode(row.code) ?? row.code,
      campaign: row.campaign || "(default)",
    }))
    .sort(
      (a, b) =>
        a.code.localeCompare(b.code) ||
        a.campaign.localeCompare(b.campaign) ||
        a.wallet.localeCompare(b.wallet),
    );

  const totals = codeRows.reduce(
    (acc, s) => {
      acc.clicks += s.clicks;
      acc.signups += s.signups;
      acc.estimatedFeeVolumeUsdc += s.estimatedFeeVolumeUsdc;
      return acc;
    },
    { clicks: 0, signups: 0, estimatedFeeVolumeUsdc: 0 },
  );

  const payload = {
    partner: { id: partner.id, label: partner.label },
    updatedAt: new Date().toISOString(),
    durable: isReferralStoreDurable() && health.reachable,
    totals: {
      ...totals,
      conversionRate: totals.clicks > 0 ? totals.signups / totals.clicks : 0,
    },
    codes: codeRows,
    campaigns: campaignRows,
    conversions,
    note:
      "Short links: /r/CODE and /r/CODE/CAMPAIGN (webmaster style). Classic ?ref=&c= still works. Fee volume is estimated.",
  };

  if (format === "csv") {
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

  return NextResponse.json(payload, {
    status: 200,
    headers: { "Cache-Control": "no-store" },
  });
}

function csvEscape(value: string | number): string {
  const s = String(value);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}
