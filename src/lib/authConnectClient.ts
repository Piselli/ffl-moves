"use client";

/**
 * Auth connect tracking — client side.
 * Fire-and-forget POST to `/api/auth/track`. Session-deduped so autoConnect
 * does not inflate connect counters.
 */

export type AuthMethodClient = "wallet" | "email" | "passkey";

const SESSION_FLAG_PREFIX = "fflmove_auth_track_";

export type TrackAuthConnectInput = {
  wallet: string;
  method: AuthMethodClient;
  /** Extension adapter name (Phantom, Solflare, …). Ignored for email/passkey. */
  provider?: string | null;
};

function sessionFlag(wallet: string, method: AuthMethodClient): string {
  return `${SESSION_FLAG_PREFIX}${method}:${wallet}`;
}

/**
 * Record a successful connect / Helius auth. No-op if already tracked this
 * browser session for the same wallet + method.
 */
export function trackAuthConnect(input: TrackAuthConnectInput): void {
  if (typeof window === "undefined") return;
  const wallet = input.wallet.trim();
  if (!wallet) return;

  const flag = sessionFlag(wallet, input.method);
  try {
    if (sessionStorage.getItem(flag)) return;
    sessionStorage.setItem(flag, "1");
  } catch {
    /* sessionStorage unavailable — still send once this call */
  }

  try {
    const body = JSON.stringify({
      wallet,
      method: input.method,
      provider: input.provider ?? undefined,
    });
    void fetch("/api/auth/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch {
    /* ignore */
  }
}
