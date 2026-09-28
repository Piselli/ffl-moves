"use client";

/**
 * Player invite attribution — client side.
 *
 * Captures `?inv=CODE` (first-touch), persists localStorage + cookie,
 * and claims Season Points after a successful first-season registration.
 * Partner `?ref=` stays in referralClient.ts (analytics / fee share only).
 */

import { normalizeInviteCode } from "@/lib/inviteCode";

const STORAGE_KEY = "fflmove_inv";
const COOKIE_NAME = "fflmove_inv";
const COOKIE_MAX_AGE_DAYS = 30;

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

export function getStoredInviteCode(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const fromLs = localStorage.getItem(STORAGE_KEY);
    if (fromLs) return normalizeInviteCode(fromLs);
  } catch {
    /* ignore */
  }
  return normalizeInviteCode(readCookie());
}

const WELCOME_INVITE_DISMISS_KEY = "fflmove_invite_welcome_done";

function welcomeDismissMap(): Record<string, true> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(WELCOME_INVITE_DISMISS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return parsed && typeof parsed === "object" ? (parsed as Record<string, true>) : {};
  } catch {
    return {};
  }
}

/** User finished / skipped the welcome invite step for this wallet. */
export function isInviteWelcomeDismissed(wallet: string): boolean {
  const key = wallet.trim().toLowerCase();
  if (!key) return false;
  return welcomeDismissMap()[key] === true;
}

export function dismissInviteWelcome(wallet: string): void {
  const key = wallet.trim().toLowerCase();
  if (!key || typeof window === "undefined") return;
  try {
    const map = welcomeDismissMap();
    map[key] = true;
    localStorage.setItem(WELCOME_INVITE_DISMISS_KEY, JSON.stringify(map));
  } catch {
    /* ignore */
  }
}

/** Persist an invite code (first-touch: does not overwrite an existing code). */
export function storeInviteCode(raw: string, opts?: { overwrite?: boolean }): string | null {
  const code = normalizeInviteCode(raw);
  if (!code) return null;
  if (!opts?.overwrite) {
    const existing = getStoredInviteCode();
    if (existing) return existing;
  }
  try {
    localStorage.setItem(STORAGE_KEY, code);
  } catch {
    /* ignore */
  }
  setCookie(code);
  return code;
}

/** Read `?inv=` from the URL and persist (first-touch). Safe on every page load. */
export function captureInviteFromUrl(): void {
  if (typeof window === "undefined") return;
  const params = new URLSearchParams(window.location.search);
  const incoming = normalizeInviteCode(params.get("inv"));
  if (!incoming) return;
  storeInviteCode(incoming);
}

/**
 * After successful register_team: claim invite SP if a code is stored.
 * Fire-and-forget — must never block UX.
 */
export function claimInviteConversion(wallet?: string | null): void {
  const code = getStoredInviteCode();
  if (!code || !wallet) return;
  try {
    const body = JSON.stringify({ invitee: wallet, code });
    void fetch("/api/invite/claim", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}

export function buildInviteLink(baseUrl: string, code: string): string {
  const normalized = normalizeInviteCode(code);
  if (!normalized) return baseUrl;
  try {
    const url = new URL(baseUrl);
    url.searchParams.set("inv", normalized);
    return url.toString();
  } catch {
    const sep = baseUrl.includes("?") ? "&" : "?";
    return `${baseUrl}${sep}inv=${encodeURIComponent(normalized)}`;
  }
}

export { normalizeInviteCode };
