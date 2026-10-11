"use client";

import { nicknameClaimMessage, sanitizeNickname, validateNickname } from "@/lib/nicknames";

export const NICK_EVENT = "ffl:nicknames";
const FRESH_MS = 30_000;

let remote: Record<string, string> = {};
let loadedAt = 0;
let inflight: Promise<void> | null = null;

export function getRemoteNicknames(): Record<string, string> {
  return remote;
}

/** Shared, de-duplicated fetch of every claimed nickname (server is the source of truth). */
export function loadRemoteNicknames(force = false): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (!force && Date.now() - loadedAt < FRESH_MS) return Promise.resolve();
  if (inflight) return inflight;
  inflight = fetch("/api/nicknames", { cache: "no-store" })
    .then((r) => (r.ok ? r.json() : null))
    .then((body: { nicknames?: Record<string, string> } | null) => {
      if (!body?.nicknames) return;
      remote = body.nicknames;
      loadedAt = Date.now();
      window.dispatchEvent(new Event(NICK_EVENT));
    })
    .catch(() => {})
    .finally(() => {
      inflight = null;
    });
  return inflight;
}

export type ClaimResult =
  | { ok: true; synced: boolean }
  | { ok: false; error: string };

/**
 * Claim a nickname for `wallet` on the server. The wallet must sign the claim, so nobody
 * can set a nickname for somebody else's address.
 * `synced: false` means the server could not be reached / wallet cannot sign — the caller
 * may still keep the nickname locally.
 */
export async function claimNickname(
  wallet: string,
  rawNickname: string,
  signMessage: ((message: string) => Promise<string>) | null | undefined,
): Promise<ClaimResult> {
  const nickname = sanitizeNickname(rawNickname);
  const invalid = validateNickname(nickname);
  if (invalid) return { ok: false, error: invalid };
  if (!signMessage) return { ok: true, synced: false };

  const ts = Date.now();
  let signature: string;
  try {
    signature = await signMessage(nicknameClaimMessage(wallet, nickname, ts));
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (/cannot sign messages|not support/i.test(msg)) return { ok: true, synced: false };
    if (/reject|denied|cancel/i.test(msg)) {
      return { ok: false, error: "Signature cancelled." };
    }
    return { ok: false, error: "Could not sign with your wallet." };
  }

  try {
    const res = await fetch("/api/nicknames", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet, nickname, ts, signature }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string };
    if (!res.ok) {
      if (res.status >= 500 || res.status === 429) return { ok: true, synced: false };
      return { ok: false, error: body.error ?? "Could not save nickname." };
    }
    remote = { ...remote, [wallet]: nickname };
    loadedAt = Date.now();
    window.dispatchEvent(new Event(NICK_EVENT));
    return { ok: true, synced: true };
  } catch {
    return { ok: true, synced: false };
  }
}
