/** Same charset rules as server `normalizeCode` / client `normalizeRefCode`. */
function normalizeRefForLink(raw: string): string | null {
  const code = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
  return code.length >= 1 ? code : null;
}

function normalizeCampForLink(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, 48);
}

/**
 * Build a shareable referral link.
 * Optional `campaign` → `?ref=CODE&c=CAMPAIGN` (same partner code, creative split).
 */
export function buildReferralLink(
  baseUrl: string,
  code: string,
  campaign?: string | null,
): string {
  const normalized = normalizeRefForLink(code);
  if (!normalized) return baseUrl;
  const camp = normalizeCampForLink(campaign);
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("ref", normalized);
    if (camp) url.searchParams.set("c", camp);
    else url.searchParams.delete("c");
    return url.toString();
  } catch {
    const sep = baseUrl.includes("?") ? "&" : "?";
    const campQ = camp ? `&c=${encodeURIComponent(camp)}` : "";
    return `${baseUrl}${sep}ref=${encodeURIComponent(normalized)}${campQ}`;
  }
}
