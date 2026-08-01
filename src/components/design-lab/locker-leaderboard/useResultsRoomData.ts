"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@/hooks/useSolanaWallet";
import { useNickname } from "@/hooks/useNickname";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import {
  getConfig,
  getGameweek,
  getGameweekEntrants,
  getTeamResult,
  getUserTeam,
  getGameweekStats,
  findHighestGameweekId,
  findLatestResolvedGameweekId,
  buildClaimPrize,
  type GameweekSummary,
} from "@/lib/chainClient";
import {
  fetchTourClaimHistoryFromApi,
  mergePriorClaimsIntoResults,
  ownerHasPriorClaimPrize,
  tourOwnersMatch,
} from "@/lib/tourClaimHistory";
import { squadPlayersFromChain } from "@/lib/fplSquadResolve";
import { calculateFantasyPointsWithRating } from "@/lib/scoring";
import { formatTxError } from "@/lib/utils";
import { MIN_PUBLIC_LEADERBOARD_GW } from "@/lib/constants";
import { isWorldCupTour } from "@/lib/worldcup";
import type { Player, TeamResult } from "@/lib/types";
import type { SeasonLeaderboardPayload } from "@/lib/seasonPoints";
import {
  LAB_LEADERBOARD,
  LAB_PREV_LEADERBOARD,
  LAB_SEASON_HIGHLIGHTS,
  type LabLeaderboardRow,
  type LabLeaderboardSnapshot,
  type LabSquadPlayer,
  type SeasonHighlightRow,
} from "./mockData";

export type ResultsRoomData = {
  source: "live" | "mock";
  loading: boolean;
  tablet: LabLeaderboardSnapshot;
  wallPrev: LabLeaderboardSnapshot;
  seasonHighlights: readonly SeasonHighlightRow[];
  claiming: boolean;
  claimError: string | null;
  claimPrize: () => Promise<void>;
  refresh: () => void;
  loadXiForOwner: (owner: string) => Promise<LabSquadPlayer[] | null>;
  setGameweek: (gwId: number) => void;
  pickerMaxGw: number;
  pickerMinGw: number;
};

async function findResolvedIds(highestId: number, count: number): Promise<number[]> {
  const ids: number[] = [];
  const start = Math.max(highestId, 1);
  for (let id = start; id >= 1 && ids.length < count; id--) {
    if (isWorldCupTour(id)) continue;
    if (id < MIN_PUBLIC_LEADERBOARD_GW) continue;
    const g = await getGameweek(id);
    if (g?.status === "resolved") ids.push(id);
  }
  return ids;
}

function resultsToRows(
  results: TeamResult[],
  getNickname: (addr: string) => string,
  wallet?: string | null,
  formatPrize?: (raw: bigint) => number,
): LabLeaderboardRow[] {
  return results.map((r) => ({
    rank: r.rank,
    owner: r.owner,
    nickname: getNickname(r.owner),
    finalPoints: r.finalPoints,
    prizeAmount: formatPrize ? formatPrize(r.prizeAmount) : Number(r.prizeAmount),
    claimed: r.claimed,
    isYou: wallet ? tourOwnersMatch(r.owner, wallet) : false,
  }));
}

function snapshotFromGw(
  gw: GameweekSummary,
  rows: LabLeaderboardRow[],
  prizePoolLabel: string,
  prizeSymbol: string,
): LabLeaderboardSnapshot {
  return {
    gameweek: gw.id,
    status: gw.status,
    prizePoolLabel,
    prizeSymbol,
    entries: gw.totalEntries,
    isPreview: false,
    rows,
  };
}

function seasonToHighlights(
  payload: SeasonLeaderboardPayload,
  getNickname: (addr: string) => string,
  wallet?: string | null,
): SeasonHighlightRow[] {
  const top = payload.entries.filter((e) => e.rank <= 5);
  const you = wallet
    ? payload.entries.find((e) => tourOwnersMatch(e.owner, wallet))
    : undefined;
  const list = [...top];
  if (you && you.rank > 5) list.push(you);
  return list.slice(0, 8).map((e) => ({
    rank: e.rank,
    owner: e.owner,
    nickname: getNickname(e.owner),
    points: e.totalPoints,
    top10: e.top10Finishes,
    bestRank: e.bestRank,
    isYou: wallet ? tourOwnersMatch(e.owner, wallet) : false,
  }));
}

export function useResultsRoomData(): ResultsRoomData {
  const { account, connected, signAndSubmit } = useWallet();
  const { getNickname } = useNickname();
  const prize = usePrizeAsset();
  const wallet = account?.address?.toString() ?? null;

  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"live" | "mock">("mock");
  const [tablet, setTablet] = useState<LabLeaderboardSnapshot>(LAB_LEADERBOARD);
  const [wallPrev, setWallPrev] = useState<LabLeaderboardSnapshot>(LAB_PREV_LEADERBOARD);
  const [seasonHighlights, setSeasonHighlights] =
    useState<readonly SeasonHighlightRow[]>(LAB_SEASON_HIGHLIGHTS);
  const [selectedGw, setSelectedGw] = useState(0);
  const [resolvedPair, setResolvedPair] = useState<number[]>([]);
  const [pickerMaxGw, setPickerMaxGw] = useState(0);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const xiCache = useRef(new Map<string, LabSquadPlayer[]>());
  const bootstrapped = useRef(false);

  const formatHumanPrize = useCallback(
    (raw: bigint) => {
      const n = Number(prize.formatUnits(raw).replace(/,/g, ""));
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
    },
    [prize],
  );

  const fetchGwBoard = useCallback(
    async (gwId: number): Promise<LabLeaderboardSnapshot | null> => {
      const gw = await getGameweek(gwId);
      if (!gw || gw.status !== "resolved") return null;
      const addresses = await getGameweekEntrants(gwId);
      const [results, priorClaimed] = await Promise.all([
        Promise.all(addresses.map((addr) => getTeamResult(addr, gwId))),
        fetchTourClaimHistoryFromApi(gwId),
      ]);
      const valid = mergePriorClaimsIntoResults(
        results.filter((r): r is TeamResult => r !== null),
        priorClaimed,
      );
      valid.sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (b.finalPoints !== a.finalPoints) return b.finalPoints - a.finalPoints;
        return a.owner.localeCompare(b.owner);
      });
      const rows = resultsToRows(valid, getNickname, wallet, formatHumanPrize);
      return snapshotFromGw(gw, rows, prize.formatUnits(gw.prizePool), prize.symbol);
    },
    [formatHumanPrize, getNickname, prize, wallet],
  );

  // Bootstrap once: resolve latest GWs + season highlights
  useEffect(() => {
    if (bootstrapped.current) return;
    bootstrapped.current = true;
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const config = await getConfig();
        if (!config || cancelled) {
          if (!cancelled) setLoading(false);
          return;
        }

        const highestId = await findHighestGameweekId();
        const latestResolved = await findLatestResolvedGameweekId(highestId);
        const maxPick = Math.max(
          Number(config.currentGameweek) || 0,
          highestId,
          MIN_PUBLIC_LEADERBOARD_GW,
        );
        if (cancelled) return;
        setPickerMaxGw(maxPick);

        const resolved = await findResolvedIds(Math.max(highestId, latestResolved), 2);
        if (cancelled) return;
        setResolvedPair(resolved);

        const primary = resolved[0] ?? 0;
        if (primary > 0) setSelectedGw(primary);

        const seasonRes = await fetch("/api/season-points").then((r) =>
          r.ok ? (r.json() as Promise<SeasonLeaderboardPayload>) : null,
        );
        if (cancelled) return;
        if (seasonRes?.entries?.length) {
          setSeasonHighlights(seasonToHighlights(seasonRes, getNickname, wallet));
        }
      } catch (e) {
        console.error("Results room bootstrap failed", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- bootstrap once
  }, []);

  // Load tablet board when selected GW changes; wall uses next-oldest resolved
  const loadBoards = useCallback(async () => {
    if (selectedGw <= 0) return;
    setLoading(true);
    setClaimError(null);
    xiCache.current.clear();
    try {
      const prevId =
        resolvedPair.find((id) => id !== selectedGw) ??
        (selectedGw > MIN_PUBLIC_LEADERBOARD_GW ? selectedGw - 1 : 0);

      const [tabletSnap, prevSnap] = await Promise.all([
        fetchGwBoard(selectedGw),
        prevId > 0 ? fetchGwBoard(prevId) : Promise.resolve(null),
      ]);

      if (tabletSnap) {
        setTablet(tabletSnap);
        setSource("live");
      } else {
        setTablet({
          ...LAB_LEADERBOARD,
          gameweek: selectedGw || LAB_LEADERBOARD.gameweek,
        });
        setSource("mock");
      }

      if (prevSnap) {
        setWallPrev(prevSnap);
      } else if (tabletSnap) {
        setWallPrev(tabletSnap);
      } else {
        setWallPrev(LAB_PREV_LEADERBOARD);
      }
    } catch (e) {
      console.error("Results room board load failed", e);
      setSource("mock");
      setTablet(LAB_LEADERBOARD);
      setWallPrev(LAB_PREV_LEADERBOARD);
    } finally {
      setLoading(false);
    }
  }, [fetchGwBoard, resolvedPair, selectedGw]);

  useEffect(() => {
    void loadBoards();
  }, [loadBoards]);

  const tabletMarked = useMemo(
    () => ({
      ...tablet,
      rows: tablet.rows.map((r) => ({
        ...r,
        nickname: getNickname(r.owner),
        isYou: wallet ? tourOwnersMatch(r.owner, wallet) : !!r.isYou,
      })),
    }),
    [getNickname, tablet, wallet],
  );

  const wallMarked = useMemo(
    () => ({
      ...wallPrev,
      rows: wallPrev.rows.map((r) => ({
        ...r,
        nickname: getNickname(r.owner),
        isYou: wallet ? tourOwnersMatch(r.owner, wallet) : !!r.isYou,
      })),
    }),
    [getNickname, wallPrev, wallet],
  );

  const seasonMarked = useMemo(
    () =>
      seasonHighlights.map((r) => ({
        ...r,
        nickname: getNickname(r.owner),
        isYou: wallet ? tourOwnersMatch(r.owner, wallet) : !!r.isYou,
      })),
    [getNickname, seasonHighlights, wallet],
  );

  const claimPrize = useCallback(async () => {
    if (!connected || !wallet) {
      setClaimError("Connect wallet to claim");
      return;
    }
    const gwId = tablet.gameweek;
    if (!gwId || source !== "live") {
      setClaimError(null);
      return;
    }

    const alreadyPaid = await ownerHasPriorClaimPrize(gwId, wallet);
    if (alreadyPaid) {
      setClaimError("Already claimed");
      await loadBoards();
      return;
    }

    setClaiming(true);
    setClaimError(null);
    try {
      await signAndSubmit(await buildClaimPrize(wallet, gwId));
      await loadBoards();
    } catch (error: unknown) {
      setClaimError(formatTxError(error));
    } finally {
      setClaiming(false);
    }
  }, [connected, loadBoards, signAndSubmit, source, tablet.gameweek, wallet]);

  const loadXiForOwner = useCallback(
    async (owner: string): Promise<LabSquadPlayer[] | null> => {
      const gwId = tablet.gameweek;
      const cacheKey = `${gwId}:${owner.toLowerCase()}`;
      const cached = xiCache.current.get(cacheKey);
      if (cached) return cached;

      if (source !== "live" || !gwId) {
        const row = tablet.rows.find((r) => r.owner === owner);
        return row?.xi ? [...row.xi] : null;
      }

      try {
        const [chainTeam, catalogRes] = await Promise.all([
          getUserTeam(owner, gwId),
          fetch("/api/players").then((r) => (r.ok ? r.json() : null)),
        ]);
        if (!chainTeam?.playerIds?.length) return null;

        const catalogList: Player[] = Array.isArray(catalogRes)
          ? catalogRes
          : Array.isArray(catalogRes?.players)
            ? catalogRes.players
            : [];
        const catalog = new Map(catalogList.map((p) => [p.id, p]));
        const squad = squadPlayersFromChain(
          {
            playerIds: chainTeam.playerIds,
            playerPositions: chainTeam.playerPositions,
          },
          catalog,
        );
        const starters = squad.slice(0, 11);
        const stats = await getGameweekStats(gwId, chainTeam.playerIds);

        const xi: LabSquadPlayer[] = starters.map((p) => {
          const st = stats[p.id];
          const pts = st
            ? calculateFantasyPointsWithRating(p, st as unknown as Record<string, unknown>)
            : 0;
          return {
            name: p.webName || p.name.split(" ").pop() || p.name,
            pts,
            photo: p.photo || p.imageUrl,
          };
        });
        xiCache.current.set(cacheKey, xi);
        return xi;
      } catch (e) {
        console.error("XI load failed", e);
        return null;
      }
    },
    [source, tablet.gameweek, tablet.rows],
  );

  return {
    source,
    loading,
    tablet: tabletMarked,
    wallPrev: wallMarked,
    seasonHighlights: seasonMarked,
    claiming,
    claimError,
    claimPrize,
    refresh: loadBoards,
    loadXiForOwner,
    setGameweek: setSelectedGw,
    pickerMaxGw,
    pickerMinGw: MIN_PUBLIC_LEADERBOARD_GW,
  };
}
