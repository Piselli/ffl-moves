"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getUserTeam, getTeamResult, getGameweekStats } from "@/lib/chainClient";
import { squadPlayersFromChain } from "@/lib/fplSquadResolve";
import { mergeFplCatalogForChainIds } from "@/lib/fplResolveMissing";
import {
  calculateFantasyPointsWithRating,
  enrichStatsMapWithFplPlayers,
} from "@/lib/scoring";
import { computeChainAlignedXiBreakdown } from "@/lib/chainAlignedScoring";
import { FORMATION } from "@/lib/constants";
import type { Player, TeamResult } from "@/lib/types";

export type ManagerSquad = {
  starters: Player[];
  bench: Player[];
  chainResult: TeamResult | null;
  stats: Record<string, Record<string, unknown>>;
  breakdown: ReturnType<typeof computeChainAlignedXiBreakdown> | null;
};

export function useManagerSquad(
  owner: string | null,
  gameweekId: number,
  isPreview: boolean,
  enabled: boolean,
) {
  const cacheRef = useRef<Map<string, ManagerSquad>>(new Map());
  const [squad, setSquad] = useState<ManagerSquad | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    cacheRef.current.clear();
    setSquad(null);
    setError(false);
  }, [gameweekId, isPreview]);

  const load = useCallback(
    async (target: string) => {
      const cached = cacheRef.current.get(target);
      if (cached) {
        setSquad(cached);
        setError(false);
        return;
      }
      setLoading(true);
      setError(false);
      try {
        const [playersRes, chainTeam, chainResult] = await Promise.all([
          fetch("/api/players").then((r) =>
            r.ok ? r.json() : Promise.reject(new Error("players")),
          ),
          getUserTeam(target, gameweekId),
          isPreview ? Promise.resolve(null) : getTeamResult(target, gameweekId),
        ]);
        if (!chainTeam?.playerIds?.length) throw new Error("no team");

        const catalog = new Map(
          (playersRes as Player[]).map((p) => [p.id, p]),
        );
        await mergeFplCatalogForChainIds(catalog, chainTeam.playerIds);
        const resolved = squadPlayersFromChain(
          {
            playerIds: chainTeam.playerIds,
            playerPositions: chainTeam.playerPositions,
          },
          catalog,
        );
        if (resolved.length !== FORMATION.TOTAL) throw new Error("incomplete");

        let stats: Record<string, Record<string, unknown>> =
          (await getGameweekStats(
            gameweekId,
            chainTeam.playerIds,
          )) as Record<string, Record<string, unknown>>;

        try {
          const fpl = await fetch(`/api/fpl-live?gw=${gameweekId}`).then((r) =>
            r.ok ? r.json() : null,
          );
          if (fpl?.players) {
            stats = enrichStatsMapWithFplPlayers(
              stats as Record<string, unknown>,
              fpl.players,
            ) as Record<string, Record<string, unknown>>;
          }
        } catch {
          /* chain-only */
        }

        const starters = resolved.slice(0, 11);
        const bench = resolved.slice(11);
        const breakdown =
          Object.keys(stats).length > 0
            ? computeChainAlignedXiBreakdown(starters, bench, stats)
            : null;
        const packed: ManagerSquad = {
          starters,
          bench,
          chainResult,
          stats,
          breakdown,
        };
        cacheRef.current.set(target, packed);
        setSquad(packed);
      } catch {
        setSquad(null);
        setError(true);
      } finally {
        setLoading(false);
      }
    },
    [gameweekId, isPreview],
  );

  useEffect(() => {
    if (!enabled || !owner || gameweekId <= 0) {
      setSquad(null);
      setError(false);
      return;
    }
    void load(owner);
  }, [enabled, owner, gameweekId, load]);

  const getPoints = useCallback(
    (player: Player) => {
      if (!squad) return 0;
      const stats =
        squad.stats[player.id] ?? squad.stats[String(player.id)];
      return calculateFantasyPointsWithRating(
        player,
        stats as Record<string, unknown>,
      );
    },
    [squad],
  );

  return { squad, loading, error, getPoints };
}
