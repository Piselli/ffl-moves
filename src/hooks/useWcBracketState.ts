"use client";

import { useCallback, useEffect, useState } from "react";
import type { WcBracketState } from "@/lib/wcBracketState";

export function useWcBracketState(pollMs = 30_000) {
  const [state, setState] = useState<WcBracketState | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/wc-bracket-state", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as WcBracketState;
      setState(data);
    } catch {
      // keep last good state
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
    if (pollMs <= 0) return;
    const id = window.setInterval(() => void refresh(), pollMs);
    return () => window.clearInterval(id);
  }, [refresh, pollMs]);

  return { state, loading, refresh };
}
