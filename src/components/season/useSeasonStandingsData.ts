"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@/hooks/useSolanaWallet";
import type { SeasonLeaderboardPayload } from "@/lib/seasonPoints";
import { tourOwnersMatch } from "@/lib/tourClaimHistory";

export function useSeasonStandingsData() {
  const { account } = useWallet();
  const [data, setData] = useState<SeasonLeaderboardPayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/season-points?includeBreakdown=1");
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = (await res.json()) as SeasonLeaderboardPayload;
      setData(json);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const wallet = account?.address?.toString() ?? null;
  const myEntry = useMemo(() => {
    if (!wallet || !data) return null;
    return data.entries.find((e) => tourOwnersMatch(e.owner, wallet)) ?? null;
  }, [data, wallet]);

  return { data, isLoading, error, wallet, myEntry, reload: load };
}
