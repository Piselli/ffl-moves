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
 * Webmaster-friendly short link (mtraf-style path):
 *   https://form8.football/r/bonus50
 *   https://form8.football/r/bonus50/creo1
 */
export function buildShortReferralLink(
  baseUrl: string,
  code: string,
  campaign?: string | null,
): string {
  const normalized = normalizeRefForLink(code);
  if (!normalized) return baseUrl;
  const camp = normalizeCampForLink(campaign);
  try {
    const url = new URL(baseUrl);
    url.pathname = camp ? `/r/${normalized}/${camp}` : `/r/${normalized}`;
    url.search = "";
    url.hash = "";
    return url.toString();
  } catch {
    const origin = baseUrl.replace(/\/$/, "");
    return camp ? `${origin}/r/${normalized}/${camp}` : `${origin}/r/${normalized}`;
  }
}

/**
 * Classic query link (still supported):
 *   ?ref=CODE&c=CAMPAIGN
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

/** Parse `/r/:code` or `/r/:code/:campaign` path segments. */
export function parseShortReferralPath(pathname: string): {
  code: string;
  campaign: string;
} | null {
  const m = pathname.match(/^\/r\/([^/]+)(?:\/([^/]+))?\/?$/i);
  if (!m) return null;
  const code = normalizeRefForLink(decodeURIComponent(m[1] ?? ""));
  if (!code) return null;
  const campaign = normalizeCampForLink(
    m[2] != null ? decodeURIComponent(m[2]) : "",
  );
  return { code, campaign };
}
