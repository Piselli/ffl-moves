"use client";

import { useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/types";
import bootstrapLite from "@/data/fpl-bootstrap-lite.json";
import { sampleDraftScore, scoreDraftAgainstGw } from "@/lib/draftScore";
import { remapStatsKeysToFplIds } from "@/lib/remapStatsToFplIds";

export type LastGwPreviewSource = "live" | "sample";

export type LastGwPreview = {
  gwId: number | null;
  total: number;
  starterCount: number;
  source: LastGwPreviewSource;
  ready: boolean;
};

type StatsPayload = {
  gameweekId?: number;
  players?: Record<string, Record<string, unknown>>;
};

/** Latest GW marked finished in the shipped season metadata. */
function lastFinishedGwId(): number | null {
  const ids = bootstrapLite.events.filter((e) => e.finished).map((e) => e.id);
  return ids.length > 0 ? Math.max(...ids) : null;
}

/**
 * Last finished GW scored with our rules from the published oracle stats
 * (`/data/stats/<gw>.json`, API-Sports). If none are published, falls back to
 * a labeled sample from catalog form — so the ticker works before a tour opens.
 */
export function useLastGwPreview(
  starters: (Player | null)[],
  bench: (Player | null)[],
  captainIndex: number | null,
): LastGwPreview {
  const [gwId, setGwId] = useState<number | null>(null);
  const [stats, setStats] = useState<Record<string, Record<string, unknown>>>({});
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const gw = lastFinishedGwId();
    if (gw == null) {
      setReady(true);
      return;
    }
    (async () => {
      try {
        const res = await fetch(`/data/stats/${gw}.json`, { cache: "no-store" });
        if (!res.ok) return;
        const payload = (await res.json()) as StatsPayload;
        const remapped = await remapStatsKeysToFplIds(payload.players ?? {});
        if (!cancelled) {
          setGwId(gw);
          setStats(remapped);
        }
      } catch {
        /* sample fallback */
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(() => {
    const starterCount = starters.filter(Boolean).length;
    const hasLive = Object.keys(stats).length > 0;

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
  }, [gwId, stats, starters, bench, captainIndex, ready]);
}
