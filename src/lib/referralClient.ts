"use client";

/**
 * Referral attribution — client side.
 *
 * Captures `?ref=CODE` (+ optional `?c=` / `?camp=` campaign) on landing,
 * persists it (localStorage + cookie, 30 days), and exposes helpers to fire
 * click / conversion events to `/api/referral/track`.
 * All tracking is fire-and-forget: it must never block or break the UX.
 */

import { buildReferralLink } from "@/lib/referralLink";

const STORAGE_KEY = "fflmove_ref";
const STORAGE_CAMP_KEY = "fflmove_ref_camp";
const CLICK_FLAG_PREFIX = "fflmove_ref_click_"; // sessionStorage dedupe per code+campaign
const COOKIE_NAME = "fflmove_ref";
const COOKIE_CAMP_NAME = "fflmove_ref_camp";
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

/** Same rules as server `normalizeCampaign`. */
export function normalizeRefCampaign(raw: string | null | undefined): string {
  if (typeof raw !== "string") return "";
  return raw
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\p{L}\p{N}_-]/gu, "")
    .slice(0, 48);
}

function setCookie(name: string, value: string) {
  if (typeof document === "undefined") return;
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${name}=${encodeURIComponent(value)}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${name}=([^;]*)`));
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
  return normalizeRefCode(readCookie(COOKIE_NAME));
}

/** Campaign slug stored with the first-touch ref (`""` = bare ref link). */
export function getStoredRefCampaign(): string {
  if (typeof window === "undefined") return "";
  try {
    const fromLs = localStorage.getItem(STORAGE_CAMP_KEY);
    if (fromLs != null) return normalizeRefCampaign(fromLs);
  } catch {
    /* ignore */
  }
  return normalizeRefCampaign(readCookie(COOKIE_CAMP_NAME) ?? "");
}

function track(
  type: "click" | "conversion",
  code: string,
  campaign: string,
  wallet?: string | null,
) {
  try {
    const body = JSON.stringify({
      type,
      code,
      campaign: campaign || undefined,
      wallet: wallet ?? undefined,
    });
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
 * Read `?ref=` (+ optional `?c=` / `?camp=`) from the URL, persist first-touch,
 * and fire a click event at most once per code+campaign per browser session.
 */
export function captureReferralFromUrl(): void {
  if (typeof window === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const incoming = normalizeRefCode(params.get("ref"));
  const incomingCamp = normalizeRefCampaign(params.get("c") ?? params.get("camp"));
  const existing = getStoredRefCode();

  const code = existing ?? incoming;
  if (!code) return;

  if (incoming && !existing) {
    try {
      localStorage.setItem(STORAGE_KEY, code);
      localStorage.setItem(STORAGE_CAMP_KEY, incomingCamp);
    } catch {
      /* ignore */
    }
    setCookie(COOKIE_NAME, code);
    setCookie(COOKIE_CAMP_NAME, incomingCamp);
  }

  // Clicks always count toward the campaign on *this* URL (creative testing).
  // Conversion still uses first-touch stored campaign.
  if (incoming) {
    const flag = `${CLICK_FLAG_PREFIX}${incoming}:${incomingCamp || "_"}`;
    try {
      if (!sessionStorage.getItem(flag)) {
        sessionStorage.setItem(flag, "1");
        track("click", incoming, incomingCamp);
      }
    } catch {
      track("click", incoming, incomingCamp);
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
  track("conversion", code, getStoredRefCampaign(), wallet);
}

export { buildReferralLink, buildShortReferralLink } from "@/lib/referralLink";
