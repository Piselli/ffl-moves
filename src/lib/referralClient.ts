"use client";

/**
 * Referral attribution — client side.
 *
 * Captures `?ref=CODE` on landing, persists it (localStorage + cookie, 30 days),
 * and exposes helpers to fire click / conversion events to `/api/referral/track`.
 * All tracking is fire-and-forget: it must never block or break the UX.
 */

const STORAGE_KEY = "fflmove_ref";
const CLICK_FLAG_PREFIX = "fflmove_ref_click_"; // sessionStorage dedupe per code
const COOKIE_NAME = "fflmove_ref";
const COOKIE_MAX_AGE_DAYS = 30;

/** Same normalization as the server, so a stored code always round-trips. */
export function normalizeRefCode(raw: string | null | undefined): string | null {
  if (typeof raw !== "string") return null;
  const code = raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 40);
  return code.length >= 1 ? code : null;
}

function setCookie(value: string) {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function readCookie(): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

/** Currently attributed referral code (localStorage first, then cookie). */
export function getStoredRefCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLs = localStorage.getItem(STORAGE_KEY);
    if (fromLs) return normalizeRefCode(fromLs);
  } catch {
    /* ignore */
  }
  return normalizeRefCode(readCookie());
}

function track(type: "click" | "conversion", code: string, wallet?: string | null) {
  try {
    const body = JSON.stringify({ type, code, wallet: wallet ?? undefined });
    // keepalive lets the request survive a navigation right after a click.
    void fetch("/api/referral/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

/**
 * Read `?ref=` from the URL, persist it (first-touch wins — we don't overwrite an
 * existing code), and fire a click event at most once per code per browser session.
 * Safe to call on every page load.
 */
export function captureReferralFromUrl(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const incoming = normalizeRefCode(params.get("ref"));
  const existing = getStoredRefCode();

  // First-touch attribution: keep the first code the visitor arrived with.
  const code = existing ?? incoming;
  if (!code) return;

  if (incoming && !existing) {
    try {
      localStorage.setItem(STORAGE_KEY, code);
    } catch {
      /* ignore */
    }
    setCookie(code);
  }

  // Count a click only when this visit actually carried a ?ref= param,
  // and only once per session per code.
  if (incoming) {
    const flag = `${CLICK_FLAG_PREFIX}${incoming}`;
    try {
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, "1");
        track("click", incoming);
      }
    } catch {
      // sessionStorage unavailable — still record the click.
      track("click", incoming);
    }
  }
}

/**
 * Fire a conversion for the stored referral code (call after a successful
 * on-chain registration). No-op when there's no attributed code.
 */
export function trackReferralConversion(wallet?: string | null): void {
  const code = getStoredRefCode();
  if (!code) return;
  track("conversion", code, wallet);
}

/** Build a shareable referral link for a given base URL + code. */
export function buildReferralLink(baseUrl: string, code: string): string {
  const normalized = normalizeRefCode(code);
  if (!normalized) return baseUrl;
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("ref", normalized);
    return url.toString();
  } catch {
    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}ref=${encodeURIComponent(normalized)}`;
  }
}
