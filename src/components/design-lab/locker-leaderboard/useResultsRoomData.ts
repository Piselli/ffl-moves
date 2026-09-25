"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useWallet } from "@/hooks/useSolanaWallet";
import { useNickname } from "@/hooks/useNickname";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import {
  getConfig,
  getGameweek,
  getUserTeam,
  getGameweekStats,
  getGameweekResults,
  getGameweekEntrants,
  buildClaimPrize,
  type GameweekSummary,
} from "@/lib/chainClient";
import {
  ownerHasPriorClaimPrize,
  tourOwnersMatch,
} from "@/lib/tourClaimHistory";
import { squadPlayersFromChain } from "@/lib/fplSquadResolve";
import { calculateFantasyPointsWithRating } from "@/lib/scoring";
import { formatTxError } from "@/lib/utils";
import { MIN_PUBLIC_LEADERBOARD_GW } from "@/lib/constants";
import { isWorldCupTour, WC_TOUR_ID_BASE } from "@/lib/worldcup";
import type { Player, TeamResult } from "@/lib/types";
import type { SeasonLeaderboardPayload } from "@/lib/seasonPoints";
import type { HonorBoardPayload } from "@/lib/honorBoard";
import {
  type HonorBoardRow,
  type LabLeaderboardRow,
  type LabLeaderboardSnapshot,
  type LabSquadPlayer,
  type SeasonHighlightRow,
} from "./mockData";
import {
  DEFAULT_FORMATION,
  inferFormationFromPositions,
  type FormationId,
} from "@/lib/formation";

const EMPTY_BOARD: LabLeaderboardSnapshot = {
  gameweek: 0,
  status: "closed",
  prizePoolLabel: "0",
  prizeSymbol: "USDC",
  entries: 0,
  isPreview: false,
  rows: [],
};

type XiPayload = {
  xi: LabSquadPlayer[];
  bench: LabSquadPlayer[];
  formationId: FormationId;
};

type ConfigBundle = {
  currentId: number;
  /** Current GW account when not resolved (open or closed). */
  live: GameweekSummary | null;
  /** Owners already registered for `live` (from config API). */
  registrations: string[];
};

function parseGwPayload(raw: unknown): GameweekSummary | null {
  if (!raw || typeof raw !== "object") return null;
  const g = raw as Record<string, unknown>;
  const id = Number(g.id);
  if (!Number.isFinite(id) || id <= 0) return null;
  const status = g.status;
  if (status !== "open" && status !== "closed" && status !== "resolved") {
    return null;
  }
  return {
    id,
    status,
    prizePool: BigInt(String(g.prizePool ?? 0)),
    totalEntries: Number(g.totalEntries ?? 0),
    resultsRoot:
      typeof g.resultsRoot === "string" ? g.resultsRoot : null,
    prizeAllocated: BigInt(String(g.prizeAllocated ?? 0)),
    prizeClaimed: BigInt(String(g.prizeClaimed ?? 0)),
  };
}

/**
 * Prefer `/api/solana/config` (server RPC) — browser→Helius often fails.
 * Fall back to direct chain reads.
 */
async function loadConfigBundle(): Promise<ConfigBundle | null> {
  try {
    const res = await fetch("/api/solana/config", { cache: "no-store" });
    if (res.ok) {
      const payload = (await res.json()) as {
        config?: { currentGameweek?: number };
        currentGameweek?: unknown;
        openGameweek?: unknown;
        registrations?: unknown;
      };
      const currentId = Number(payload.config?.currentGameweek ?? 0);
      const open = parseGwPayload(payload.openGameweek);
      const current = parseGwPayload(payload.currentGameweek);
      const live =
        open ??
        (current && current.status !== "resolved" ? current : null);
      const registrations = Array.isArray(payload.registrations)
        ? payload.registrations.filter((o): o is string => typeof o === "string")
        : [];
      return {
        currentId: currentId || live?.id || 0,
        live,
        registrations,
      };
    }
  } catch (e) {
    console.warn("Results room config API failed, trying direct RPC:", e);
  }

  try {
    const config = await getConfig();
    if (!config) return null;
    const current = await getGameweek(config.currentGameweek);
    const live =
      current && current.status !== "resolved" ? current : null;
    const registrations = live
      ? await getGameweekEntrants(live.id).catch(() => [] as string[])
      : [];
    return { currentId: config.currentGameweek, live, registrations };
  } catch (e) {
    console.error("Results room direct config failed", e);
    return null;
  }
}

let playerCatalogPromise: Promise<Player[]> | null = null;

function loadPlayerCatalog(): Promise<Player[]> {
  if (!playerCatalogPromise) {
    playerCatalogPromise = fetch("/api/players")
      .then((r) => (r.ok ? r.json() : null))
      .then((catalogRes) => {
        const catalogList: Player[] = Array.isArray(catalogRes)
          ? catalogRes
          : Array.isArray(catalogRes?.players)
            ? catalogRes.players
            : [];
        return catalogList;
      })
      .catch(() => {
        playerCatalogPromise = null;
        return [] as Player[];
      });
  }
  return playerCatalogPromise;
}

/** Never scan WC tour ids (or the gap beneath them) when looking for EPL boards. */
function eplScanCeiling(highestId: number): number {
  if (!Number.isFinite(highestId) || highestId <= 0) return 0;
  if (isWorldCupTour(highestId)) return WC_TOUR_ID_BASE - 1;
  return highestId;
}

export type ResultsRoomData = {
  source: "live" | "empty";
  loading: boolean;
  tablet: LabLeaderboardSnapshot;
  wallPrev: LabLeaderboardSnapshot;
  seasonHighlights: readonly SeasonHighlightRow[];
  /** Wall honor board — all-time USDC top earners. */
  honorBoard: readonly HonorBoardRow[];
  honorSymbol: string;
  claiming: boolean;
  claimError: string | null;
  claimPrize: () => Promise<void>;
  refresh: () => void;
  loadXiForOwner: (owner: string) => Promise<XiPayload | null>;
  selectedGw: number;
  setGameweek: (gwId: number) => void;
  /** EPL GWs ascending (resolved + live open/closed) — stepper walks this list. */
  pickerGws: readonly number[];
  pickerMaxGw: number;
  pickerMinGw: number;
};

/** Live (open/closed) current EPL GW id, or null if none / WC tour. */
function liveEplIdFrom(gw: GameweekSummary | null): number | null {
  if (!gw) return null;
  if (
    gw.id < MIN_PUBLIC_LEADERBOARD_GW ||
    isWorldCupTour(gw.id) ||
    gw.status === "resolved"
  ) {
    return null;
  }
  return gw.id;
}

/** Merge resolved ids with a live open/closed GW; return ascending unique. */
function mergePickerGws(resolvedDesc: number[], liveId: number | null): number[] {
  const set = new Set(resolvedDesc);
  if (liveId != null) set.add(liveId);
  return [...set].sort((a, b) => a - b);
}

async function findResolvedIds(highestId: number, count: number): Promise<number[]> {
  const ceiling = eplScanCeiling(highestId);
  const candidates: number[] = [];
  for (let id = ceiling; id >= MIN_PUBLIC_LEADERBOARD_GW; id -= 1) {
    if (!isWorldCupTour(id)) candidates.push(id);
  }
  const ids: number[] = [];
  const BATCH = 8;
  for (let i = 0; i < candidates.length && ids.length < count; i += BATCH) {
    const batch = candidates.slice(i, i + BATCH);
    const gws = await Promise.all(batch.map((id) => getGameweek(id)));
    for (let j = 0; j < batch.length && ids.length < count; j += 1) {
      if (gws[j]?.status === "resolved") ids.push(batch[j]!);
    }
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
  opts?: { isPreview?: boolean; entries?: number },
): LabLeaderboardSnapshot {
  return {
    gameweek: gw.id,
    status: gw.status,
    prizePoolLabel,
    prizeSymbol,
    entries: opts?.entries ?? gw.totalEntries,
    isPreview: opts?.isPreview ?? false,
    rows,
  };
}

/** Owners registered for a GW — API first (browser RPC often fails), then chain. */
async function fetchEntrantOwners(gwId: number): Promise<string[]> {
  try {
    const res = await fetch(`/api/registrations?gw=${gwId}`, { cache: "no-store" });
    if (res.ok) {
      const data = (await res.json()) as { registrations?: unknown };
      if (Array.isArray(data.registrations)) {
        return data.registrations.filter((o): o is string => typeof o === "string");
      }
    }
  } catch (e) {
    console.warn("Registrations API failed, trying direct RPC:", e);
  }
  try {
    return await getGameweekEntrants(gwId);
  } catch (e) {
    console.error("getGameweekEntrants failed", e);
    return [];
  }
}

function entrantsToRows(
  owners: string[],
  getNickname: (addr: string) => string,
  wallet?: string | null,
): LabLeaderboardRow[] {
  return [...owners]
    .sort((a, b) =>
      getNickname(a).localeCompare(getNickname(b), undefined, {
        sensitivity: "base",
      }),
    )
    .map((owner, i) => ({
      rank: i + 1,
      owner,
      nickname: getNickname(owner),
      finalPoints: 0,
      prizeAmount: 0,
      claimed: false,
      isYou: wallet ? tourOwnersMatch(owner, wallet) : false,
    }));
}

function seasonToHighlights(
  payload: SeasonLeaderboardPayload,
  getNickname: (addr: string) => string,
  wallet?: string | null,
): SeasonHighlightRow[] {
  return payload.entries
    .filter((e) => e.rank <= 10)
    .slice(0, 10)
    .map((e) => ({
      rank: e.rank,
      owner: e.owner,
      nickname: getNickname(e.owner),
      points: e.totalPoints,
      top10: e.top10Finishes,
      bestRank: e.bestRank,
      isYou: wallet ? tourOwnersMatch(e.owner, wallet) : false,
    }));
}

function honorFromPayload(
  payload: HonorBoardPayload,
  getNickname: (addr: string) => string,
  wallet?: string | null,
): HonorBoardRow[] {
  return payload.entries.slice(0, 10).map((e) => ({
    rank: e.rank,
    owner: e.owner,
    nickname: getNickname(e.owner),
    earned: e.earned,
    earnedLabel: e.earnedLabel,
    isYou: wallet ? tourOwnersMatch(e.owner, wallet) : false,
  }));
}

export function useResultsRoomData(): ResultsRoomData {
  const { account, connected, signAndSubmit } = useWallet();
  const { getNickname } = useNickname();
  const prize = usePrizeAsset();
  const wallet = account?.address?.toString() ?? null;

  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"live" | "empty">("empty");
  const [tablet, setTablet] = useState<LabLeaderboardSnapshot>(EMPTY_BOARD);
  const [wallPrev, setWallPrev] = useState<LabLeaderboardSnapshot>(EMPTY_BOARD);
  const [seasonHighlights, setSeasonHighlights] =
    useState<readonly SeasonHighlightRow[]>([]);
  const [honorBoard, setHonorBoard] = useState<readonly HonorBoardRow[]>([]);
  const [honorSymbol, setHonorSymbol] = useState("USDC");
  const [selectedGw, setSelectedGw] = useState(0);
  const [resolvedPair, setResolvedPair] = useState<number[]>([]);
  const [pickerGws, setPickerGws] = useState<number[]>([]);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const xiCache = useRef(new Map<string, XiPayload>());
  /** Seeded open/closed GW from config API — used when direct getGameweek fails. */
  const liveGwRef = useRef<GameweekSummary | null>(null);
  /** Skip one tablet refetch after bootstrap already painted this GW. */
  const skipTabletLoadGwRef = useRef<number | null>(null);
  const tabletRef = useRef(tablet);
  tabletRef.current = tablet;

  const formatHumanPrize = useCallback(
    (raw: bigint) => {
      const n = Number(prize.formatUnits(raw).replace(/,/g, ""));
      return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
    },
    [prize],
  );

  const fetchGwBoard = useCallback(
    async (gwId: number): Promise<LabLeaderboardSnapshot | null> => {
      // Prefer seeded live summary — avoids a slow failing browser RPC.
      let gw =
        liveGwRef.current?.id === gwId
          ? liveGwRef.current
          : await getGameweek(gwId).catch(() => null);
      if (!gw && liveGwRef.current?.id === gwId) {
        gw = liveGwRef.current;
      }
      if (!gw) return null;
      const poolLabel = prize.formatUnits(gw.prizePool);

      // Open / closed: list registered managers (no points / no XI) until resolve.
      if (gw.status !== "resolved") {
        const owners = await fetchEntrantOwners(gwId);
        const rows = entrantsToRows(owners, getNickname, wallet);
        return snapshotFromGw(gw, rows, poolLabel, prize.symbol, {
          isPreview: true,
          entries: owners.length || gw.totalEntries,
        });
      }

      const results = await getGameweekResults(gwId);
      const valid = [...results].sort((a, b) => {
        if (a.rank !== b.rank) return a.rank - b.rank;
        if (b.finalPoints !== a.finalPoints) return b.finalPoints - a.finalPoints;
        return a.owner.localeCompare(b.owner);
      });
      const rows = resultsToRows(valid, getNickname, wallet, formatHumanPrize);
      return snapshotFromGw(gw, rows, poolLabel, prize.symbol);
    },
    [formatHumanPrize, getNickname, prize, wallet],
  );

  // Honor board is independent of chain config — published results JSON is enough.
  useEffect(() => {
    let cancelled = false;
    void fetch("/api/honor-board")
      .then((r) => (r.ok ? (r.json() as Promise<HonorBoardPayload>) : null))
      .then((honorRes) => {
        if (cancelled || !honorRes) return;
        setHonorSymbol(honorRes.symbol || "USDC");
        setHonorBoard(
          honorRes.entries?.length
            ? honorFromPayload(honorRes, getNickname, wallet)
            : [],
        );
      })
      .catch(() => {
        if (!cancelled) setHonorBoard([]);
      });
    return () => {
      cancelled = true;
    };
  }, [getNickname, wallet]);

  // Bootstrap once: config (+ registrations) → paint live board in one shot
  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const bundle = await loadConfigBundle();
        if (cancelled) return;
        if (!bundle) {
          setLoading(false);
          return;
        }

        const liveId = liveEplIdFrom(bundle.live);
        liveGwRef.current = bundle.live;

        const highestId = Math.max(bundle.currentId, liveId ?? 0);
        const eplCeiling = eplScanCeiling(highestId);

        // Paint live open/closed GW fully (pool + managers) before showing UI.
        if (bundle.live && liveId != null) {
          const owners =
            bundle.registrations.length > 0
              ? bundle.registrations
              : await fetchEntrantOwners(liveId);
          if (cancelled) return;
          const rows = entrantsToRows(owners, getNickname, wallet);
          const snap = snapshotFromGw(
            bundle.live,
            rows,
            prize.formatUnits(bundle.live.prizePool),
            prize.symbol,
            {
              isPreview: true,
              entries: owners.length || bundle.live.totalEntries,
            },
          );
          setTablet(snap);
          setSource(rows.length ? "live" : "empty");
          setPickerGws([liveId]);
          setSelectedGw(liveId);
          skipTabletLoadGwRef.current = liveId;
          setLoading(false);
        }

        // Stepper list fills in parallel / after paint — never blocks first paint.
        void findResolvedIds(eplCeiling, 2).then((firstPair) => {
          if (cancelled) return;
          setPickerGws(mergePickerGws(firstPair, liveId));
          setResolvedPair(firstPair);
          if (liveId == null) {
            const primary = firstPair[0] ?? 0;
            if (primary > 0) setSelectedGw(primary);
          }
          setLoading(false);
        });

        void loadPlayerCatalog();

        void findResolvedIds(eplCeiling, 40).then((resolvedDesc) => {
          if (cancelled) return;
          setPickerGws(mergePickerGws(resolvedDesc, liveId));
          setResolvedPair(resolvedDesc.slice(0, 2));
        });

        void fetch("/api/season-points")
          .then((r) => (r.ok ? (r.json() as Promise<SeasonLeaderboardPayload>) : null))
          .then((seasonRes) => {
            if (cancelled || !seasonRes?.entries?.length) return;
            setSeasonHighlights(seasonToHighlights(seasonRes, getNickname, wallet));
          });
      } catch (e) {
        console.error("Results room bootstrap failed", e);
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

    const skipTablet = skipTabletLoadGwRef.current === selectedGw;
    if (skipTablet) skipTabletLoadGwRef.current = null;

    // Bootstrap already painted this live board — only refresh the wall.
    const tabletAlready =
      skipTablet ||
      (tabletRef.current.gameweek === selectedGw &&
        tabletRef.current.rows.length > 0 &&
        tabletRef.current.status !== "resolved");

    setClaimError(null);
    if (!tabletAlready) {
      setLoading(true);
      xiCache.current.clear();
    }

    try {
      const prevId =
        resolvedPair.find((id) => id !== selectedGw) ??
        (selectedGw > MIN_PUBLIC_LEADERBOARD_GW ? selectedGw - 1 : 0);

      const [tabletSnap, prevSnap] = await Promise.all([
        tabletAlready ? Promise.resolve(null) : fetchGwBoard(selectedGw),
        prevId > 0 ? fetchGwBoard(prevId) : Promise.resolve(null),
      ]);

      if (tabletSnap) {
        if (tabletSnap.rows.length) {
          setTablet(tabletSnap);
          setSource("live");
        } else {
          setSource("empty");
          setTablet({ ...tabletSnap, rows: [] });
        }
      }

      if (prevSnap) {
        setWallPrev(prevSnap);
      } else if (tabletSnap) {
        setWallPrev(tabletSnap);
      } else if (!tabletAlready) {
        setWallPrev(EMPTY_BOARD);
      }
    } catch (e) {
      console.error("Results room board load failed", e);
      if (!tabletAlready) {
        setSource("empty");
        setTablet(EMPTY_BOARD);
        setWallPrev(EMPTY_BOARD);
      }
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

  const honorMarked = useMemo(
    () =>
      honorBoard.map((r) => ({
        ...r,
        nickname: getNickname(r.owner),
        isYou: wallet ? tourOwnersMatch(r.owner, wallet) : !!r.isYou,
      })),
    [getNickname, honorBoard, wallet],
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
    async (owner: string): Promise<XiPayload | null> => {
      // Registration board (open/closed) — no squad peek until results.
      if (tablet.status !== "resolved") return null;

      const gwId = tablet.gameweek;
      const cacheKey = `${gwId}:${owner.toLowerCase()}`;
      const cached = xiCache.current.get(cacheKey);
      if (cached) return cached;

      if (source !== "live" || !gwId) {
        const row = tablet.rows.find((r) => r.owner === owner);
        if (!row?.xi?.length) return null;
        const payload: XiPayload = {
          xi: [...row.xi],
          bench: [...(row.bench ?? [])],
          formationId: row.formationId ?? DEFAULT_FORMATION,
        };
        xiCache.current.set(cacheKey, payload);
        return payload;
      }

      try {
        const [chainTeam, catalogList] = await Promise.all([
          getUserTeam(owner, gwId),
          loadPlayerCatalog(),
        ]);
        if (!chainTeam?.playerIds?.length) return null;

        const catalog = new Map(catalogList.map((p) => [p.id, p]));
        const squad = squadPlayersFromChain(
          {
            playerIds: chainTeam.playerIds,
            playerPositions: chainTeam.playerPositions,
          },
          catalog,
        );
        const starters = squad.slice(0, 11);
        const benchPlayers = squad.slice(11, 14);
        const stats = await getGameweekStats(gwId, chainTeam.playerIds);

        const toLab = (p: (typeof squad)[number], slotIndex: number): LabSquadPlayer => {
          const st = stats[p.id] as Record<string, unknown> | undefined;
          const pts = st
            ? calculateFantasyPointsWithRating(p, st)
            : 0;
          return {
            name: p.webName || p.name.split(" ").pop() || p.name,
            pts,
            teamId: p.teamId,
            photo: p.photo || p.imageUrl,
            fplPhotoCode: p.fplPhotoCode,
            apiId: p.apiId,
            positionId: p.positionId,
            position: p.position,
            slotIndex,
            isStarter: slotIndex < 11,
            stats: st,
          };
        };

        const xi: LabSquadPlayer[] = starters.map((p, i) => toLab(p, i));
        const bench: LabSquadPlayer[] = benchPlayers.map((p, i) => toLab(p, 11 + i));
        const payload: XiPayload = {
          xi,
          bench,
          formationId: inferFormationFromPositions(chainTeam.playerPositions),
        };
        xiCache.current.set(cacheKey, payload);
        return payload;
      } catch (e) {
        console.error("XI load failed", e);
        return null;
      }
    },
    [source, tablet.gameweek, tablet.rows, tablet.status],
  );

  return {
    source,
    loading,
    tablet: tabletMarked,
    wallPrev: wallMarked,
    seasonHighlights: seasonMarked,
    honorBoard: honorMarked,
    honorSymbol,
    claiming,
    claimError,
    claimPrize,
    refresh: loadBoards,
    loadXiForOwner,
    selectedGw,
    setGameweek: setSelectedGw,
    pickerGws,
    pickerMaxGw: pickerGws.length ? pickerGws[pickerGws.length - 1]! : 0,
    pickerMinGw: pickerGws.length ? pickerGws[0]! : MIN_PUBLIC_LEADERBOARD_GW,
  };
}
