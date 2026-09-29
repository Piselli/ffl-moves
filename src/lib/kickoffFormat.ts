/** Shared kickoff / deadline formatting — always UTC so every client sees the same clock. */

export type KickoffLocale = "en" | "uk" | string;

function localeTag(locale: KickoffLocale): string {
  return locale === "uk" ? "uk-UA" : "en-GB";
}

export function utcDayKey(iso: string | null | undefined): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "tbc";
  const d = new Date(iso);
  return `${d.getUTCFullYear()}-${d.getUTCMonth()}-${d.getUTCDate()}`;
}

/** e.g. "Sat 4 Oct · UTC" */
export function formatMatchDayUtc(iso: string | null | undefined, locale: KickoffLocale): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "TBC";
  const day = new Intl.DateTimeFormat(localeTag(locale), {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
  return `${day} · UTC`;
}

/** Compact kickoff for narrow rows — "14:00" in UTC (pair with a UTC day/section label). */
export function formatKickoffTimeUtc(iso: string | null | undefined, locale: KickoffLocale): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "TBC";
  return new Intl.DateTimeFormat(localeTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Kickoff with zone — "14:00 UTC". */
export function formatKickoffTimeUtcLabeled(
  iso: string | null | undefined,
  locale: KickoffLocale,
): string {
  const t = formatKickoffTimeUtc(iso, locale);
  return t === "TBC" ? t : `${t} UTC`;
}

export function formatKickoffDateUtc(
  iso: string | null | undefined,
  locale: KickoffLocale,
): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "TBC";
  return new Intl.DateTimeFormat(localeTag(locale), {
    day: "2-digit",
    month: "short",
    timeZone: "UTC",
  }).format(new Date(iso));
}

/** Long day header for fixture boards — "Saturday, 4 October · UTC". */
export function formatMatchDayLongUtc(iso: string | null | undefined, locale: KickoffLocale): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "TBC";
  const day = new Intl.DateTimeFormat(localeTag(locale), {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(iso));
  return `${day} · UTC`;
}
