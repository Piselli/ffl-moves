"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSiteLocale } from "@/i18n/LocaleProvider";
import { LEGAL_VERSION } from "@/lib/legal/version";

/**
 * Tracks whether the connected wallet has accepted the current legal pack.
 * Soft-fails open when Redis is unavailable in non-production (API returns soft).
 */
export function useLegalAttestation(wallet: string | null | undefined) {
  const { locale } = useSiteLocale();
  const [accepted, setAccepted] = useState(false);
  const [checked, setChecked] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fetchedFor = useRef<string | null>(null);

  useEffect(() => {
    if (!wallet) {
      fetchedFor.current = null;
      setAccepted(false);
      setChecked(false);
      setLoading(false);
      setError(null);
      return;
    }
    if (fetchedFor.current === wallet) return;
    fetchedFor.current = wallet;
    let cancelled = false;
    setLoading(true);
    fetch(`/api/legal/accept?wallet=${encodeURIComponent(wallet)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((d: { accepted?: boolean }) => {
        if (cancelled) return;
        const ok = Boolean(d.accepted);
        setAccepted(ok);
        setChecked(ok);
      })
      .catch(() => {
        if (!cancelled) {
          setAccepted(false);
          setChecked(false);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
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
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setError(data.error || "save_failed");
        return false;
      }
      setAccepted(true);
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
