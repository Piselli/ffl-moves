"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSiteLocale } from "@/i18n/LocaleProvider";
import {
  readLegalAcceptanceCache,
  writeLegalAcceptanceCache,
} from "@/lib/legal/acceptanceClientCache";
import { LEGAL_VERSION } from "@/lib/legal/version";

/**
 * Tracks whether the connected wallet has accepted the current legal pack.
 * Session cache avoids re-prompting after navigation; Redis is source of truth.
 */
export function useLegalAttestation(wallet: string | null | undefined) {
  const { locale } = useSiteLocale();
  const cached = wallet ? readLegalAcceptanceCache(wallet) : false;
  const [accepted, setAccepted] = useState(cached);
  const [checked, setChecked] = useState(cached);
  /** True only while revalidating and we have no cached accept for this wallet. */
  const [loading, setLoading] = useState(() => Boolean(wallet) && !cached);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const walletRef = useRef(wallet);

  useEffect(() => {
    if (walletRef.current !== wallet) {
      walletRef.current = wallet;
      const hit = wallet ? readLegalAcceptanceCache(wallet) : false;
      setAccepted(hit);
      setChecked(hit);
      setLoading(Boolean(wallet) && !hit);
      setError(null);
    }

    if (!wallet) {
      setLoading(false);
      return;
    }

    let cancelled = false;
    const ac = new AbortController();

    fetch(`/api/legal/accept?wallet=${encodeURIComponent(wallet)}`, {
      cache: "no-store",
      signal: ac.signal,
    })
      .then((r) => r.json())
      .then((d: { accepted?: boolean }) => {
        if (cancelled) return;
        const ok = Boolean(d.accepted);
        if (ok) {
          setAccepted(true);
          setChecked(true);
          writeLegalAcceptanceCache(wallet);
          return;
        }
        // Dev soft-save / slow Redis: keep same-tab accept from session cache.
        const hit = readLegalAcceptanceCache(wallet);
        if (hit) {
          setAccepted(true);
          setChecked(true);
        } else {
          setAccepted(false);
          setChecked(false);
        }
      })
      .catch((err: unknown) => {
        if (cancelled || (err instanceof DOMException && err.name === "AbortError")) return;
        // Keep session cache on network blips — don't wipe a known-good accept.
        const hit = readLegalAcceptanceCache(wallet);
        if (!hit) {
          setAccepted(false);
          setChecked(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
      ac.abort();
    };
  }, [wallet]);

  const ensureAccepted = useCallback(async (): Promise<boolean> => {
    if (!wallet) return false;
    if (accepted) return true;
    if (!checked) {
      setError("attest");
      return false;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/legal/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet, locale }),
      });
      const data = (await res.json()) as { ok?: boolean; soft?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "save_failed");
        return false;
      }
      setAccepted(true);
      writeLegalAcceptanceCache(wallet);
      return true;
    } catch {
      setError("save_failed");
      return false;
    } finally {
      setSaving(false);
    }
  }, [accepted, checked, locale, wallet]);

  return {
    needsAttest: Boolean(wallet) && !accepted && !loading,
    accepted,
    checked,
    setChecked,
    loading,
    saving,
    error,
    version: LEGAL_VERSION,
    ensureAccepted,
  };
}
