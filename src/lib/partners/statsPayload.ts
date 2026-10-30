/**
 * Shared partner-scoped stats payload (Sheets API + cabinet session API).
 */
import {
  getCampaignStats,
  getReferralConversionsDetailed,
  getReferralHealth,
  getStats,
  isReferralStoreDurable,
  normalizeCode,
} from "@/lib/referral";
import { buildReferralLink, buildShortReferralLink } from "@/lib/referralLink";
import {
  fillMissingPartnerCodes,
  filterStatsForPartner,
  type ReferralPartner,
} from "@/lib/referralPartners";
import { getEffectivePartnerCodes } from "@/lib/partners/partnerCodes";

function siteBase(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return configured || "https://www.form8.football";
}

export async function buildPartnerStatsPayload(partner: ReferralPartner) {
  const codesList = await getEffectivePartnerCodes(partner.id);
  const [allStats, campaigns, detailed, health] = await Promise.all([
    getStats(),
    getCampaignStats(codesList),
    getReferralConversionsDetailed(),
    getReferralHealth(),
  ]);

  const codes = fillMissingPartnerCodes(
    filterStatsForPartner(allStats, codesList),
    codesList,
  );
  const allow = new Set(codesList);
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

  // Only real creatives (/r/code/creo). Bare /r/code traffic lives in Codes only.
  const campaignRows = campaigns
    .filter((s) => {
      if (!allow.has(normalizeCode(s.code) ?? s.code)) return false;
      const camp = (s.campaign || "").trim();
      return Boolean(camp) && camp !== "(default)";
    })
    .map((s) => ({
      code: s.code,
      campaign: s.campaign,
      link: buildShortReferralLink(base, s.code, s.campaign),
      linkClassic: buildReferralLink(base, s.code, s.campaign),
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

  return {
    partner: { id: partner.id, label: partner.label, codes: codesList },
    updatedAt: new Date().toISOString(),
    durable: isReferralStoreDurable() && health.reachable,
    health,
    totals: {
      ...totals,
      conversionRate: totals.clicks > 0 ? totals.signups / totals.clicks : 0,
    },
    codes: codeRows,
    campaigns: campaignRows,
    conversions,
    note:
      "Code = main ?ref= / /r/CODE. Campaign = creative under a code (/r/CODE/creo). Fee volume is estimated.",
  };
}
