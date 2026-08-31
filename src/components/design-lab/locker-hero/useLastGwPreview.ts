"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/types";
import {
  fplLivePlayersToStatsMap,
  sampleDraftScore,
  scoreDraftAgainstGw,
  type FplLiveMappedPlayer,
} from "@/lib/fplLiveStatsMap";

export type LastGwPreviewSource = "live" | "sample";

export type LastGwPreview = {
  gwId: number | null;
  total: number;
  starterCount: number;
  source: LastGwPreviewSource;
  ready: boolean;
};

type LivePayload = {
  gameweekId?: number;
  players?: FplLiveMappedPlayer[];
  fixtures?: string[];
  errors?: string[];
};

/**
 * Last finished FPL GW scored with our rules. If live stats are empty,
 * falls back to a labeled sample from catalog form — so the ticker works
 * before FORM8 has opened a tour.
 */
export function useLastGwPreview(
  starters: (Player | null)[],
  bench: (Player | null)[],
  captainIndex: number | null,
): LastGwPreview {
  const [payload, setPayload] = useState<LivePayload | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/fpl-live?gw=last")
      .then((r) => r.json())
      .then((data: LivePayload) => {
        if (!cancelled) setPayload(data);
      })
      .catch(() => {
        if (!cancelled) setPayload({ gameweekId: 0, players: [], fixtures: [] });
      })
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const starterCount = starters.filter(Boolean).length;
    const stats = fplLivePlayersToStatsMap(payload?.players);
    const hasLive =
      Object.keys(stats).length > 0 && (payload?.fixtures?.length ?? 0) > 0;
    const gwId =
      typeof payload?.gameweekId === "number" && payload.gameweekId > 0
        ? payload.gameweekId
        : null;

    if (hasLive) {
      return {
        gwId,
        total: scoreDraftAgainstGw(starters, bench, stats, captainIndex),
        starterCount,
        source: "live" as const,
        ready,
      };
    }

    return {
      gwId,
      total: sampleDraftScore(starters, captainIndex),
      starterCount,
      source: "sample" as const,
      ready,
    };
  }, [payload, starters, bench, captainIndex, ready]);
}
