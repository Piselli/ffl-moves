"use client";

import { useEffect, useState } from "react";

/** Whether the connected wallet may open Partners (nickname sheet / account area). */
export function usePartnerAccess(wallet: string | null | undefined) {
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    if (!wallet) {
      setAllowed(false);
      return;
    }
    let cancelled = false;
    void fetch(`/api/partners/access?wallet=${encodeURIComponent(wallet)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((body: { allowed?: boolean }) => {
        if (!cancelled) setAllowed(body.allowed === true);
      })
      .catch(() => {
        if (!cancelled) setAllowed(false);
      });
    return () => {
      cancelled = true;
    };
  }, [wallet]);

  return allowed;
}
