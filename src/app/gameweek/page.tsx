"use client";

import {
  useState,
  useEffect,
  useMemo,
  useRef,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { FormationGrid } from "@/components/FormationGrid";
import { RegisteredSquadShowcase } from "@/components/RegisteredSquadShowcase";
import { PlayerCard } from "@/components/PlayerCard";
import { Player, TeamResult } from "@/lib/types";
import { POSITIONS, MAX_PER_CLUB, FORMATION } from "@/lib/constants";
import {
  client,
  moduleFunction,
  getConfig,
  findActiveGameweekFromChain,
  hasRegisteredTeam,
  getGameweekStats,
  getTeamResult,
  getUserTeam,
  type ChainConfig,
  type GameweekSummary,
} from "@/lib/movement";
import { formatMOVE, cn, getErrorMessage } from "@/lib/utils";
import { calculateFantasyPointsWithRating, enrichStatsMapWithFplPlayers } from "@/lib/scoring";
import { computeChainAlignedXiBreakdown } from "@/lib/chainAlignedScoring";
import { squadPlayersFromChain } from "@/lib/fplSquadResolve";
import { mergeFplCatalogForChainIds } from "@/lib/fplResolveMissing";
import { useSiteMessages } from "@/i18n/LocaleProvider";

type PositionFilter = "ALL" | "GK" | "DEF" | "MID" | "FWD";
type TeamFilter = string;
type MobileTab = "pitch" | "players";

// Hoisted constant: lives outside the component so the filteredPlayers `useMemo`
// doesn't need to depend on it (avoids a react-hooks/exhaustive-deps warning).
const POSITION_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

function isCompleteRegisteredSnapshot(
  t: { starters: Player[]; bench: Player[] } | null | undefined,
): boolean {
  if (!t || !Array.isArray(t.starters) || !Array.isArray(t.bench)) return false;
  return t.starters.length === 11 && t.bench.length === FORMATION.BENCH;
}

/** Incomplete squad while GW is still open — separate from confirmed `ffl_team_v2_*` snapshots */
function teamDraftStorageKey(gwId: number, addr: string) {
  return `ffl_team_draft_v1_gw${gwId}_${addr}`;
}

type TeamDraftPayload = {
  starterIds: (number | null)[];
  benchIds: (number | null)[];
};

function lineupIdsFromDraft(
  draft: TeamDraftPayload,
  catalog: Map<number, Player>,
): { starters: (Player | null)[]; bench: (Player | null)[] } | null {
  if (!Array.isArray(draft.starterIds) || draft.starterIds.length !== 11) return null;
  if (!Array.isArray(draft.benchIds) || draft.benchIds.length !== FORMATION.BENCH) return null;
  const starters = draft.starterIds.map((id) =>
    typeof id !== "number" ? null : (catalog.get(id) ?? null),
  );
  const bench = draft.benchIds.map((id) =>
    typeof id !== "number" ? null : (catalog.get(id) ?? null),
  );
  return { starters, bench };
}

function lineupIdsDraftPayload(
  starters: (Player | null)[],
  bench: (Player | null)[],
): TeamDraftPayload {
  return {
    starterIds: starters.map((p) => (p ? p.id : null)),
    benchIds: bench.map((p) => (p ? p.id : null)),
  };
}

/** After chain confirms open GW & not registered — avoids hydrating draft before we know registration. */
function tryHydrateTeamDraftFromStorage(
  gwId: number,
  addr: string,
  playersCatalog: Player[],
  setStarters: Dispatch<SetStateAction<(Player | null)[]>>,
  setBench: Dispatch<SetStateAction<(Player | null)[]>>,
) {
  if (typeof window === "undefined" || playersCatalog.length === 0) return;

  try {
    const raw = window.localStorage.getItem(teamDraftStorageKey(gwId, addr));
    if (!raw) return;
    const parsed = JSON.parse(raw) as TeamDraftPayload;
    const catalog = new Map(playersCatalog.map((p) => [p.id, p]));
    const restored = lineupIdsFromDraft(parsed, catalog);
    if (!restored) return;
    const hasAnyone = [...restored.starters, ...restored.bench].some(Boolean);
    if (!hasAnyone) return;

    const unique = new Set<number>();
    let dupOrBad = false;
    const registerId = (p: Player | null) => {
      if (!p) return;
      if (unique.has(p.id)) dupOrBad = true;
      unique.add(p.id);
    };
    restored.starters.forEach(registerId);
    restored.bench.forEach(registerId);

    let clubViolation = false;
    const counts: Record<number, number> = {};
    Array.from(unique).forEach((id) => {
      const p = catalog.get(id)!;
      const n = (counts[p.teamId] = (counts[p.teamId] || 0) + 1);
      if (n > MAX_PER_CLUB) clubViolation = true;
    });
    if (dupOrBad || clubViolation) return;

    setStarters(restored.starters);
    setBench(restored.bench);
  } catch {
    /* ignore corrupt draft */
  }
}

export default function GameweekPage() {
  const { connected, account, signTransaction } = useWallet();
  const siteMessages = useSiteMessages();
  const g = siteMessages.pages.gameweek;
  const mr = siteMessages.pages.myResult;
  const lt = siteMessages.pages.leaderboardTable;

  const [starters, setStarters] = useState<(Player | null)[]>(Array(11).fill(null));
  const [bench, setBench] = useState<(Player | null)[]>(Array(FORMATION.BENCH).fill(null));
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState<ChainConfig | null>(null);
  const [currentGameweek, setCurrentGameweek] = useState<GameweekSummary | null>(null);
  const [gameweekLoading, setGameweekLoading] = useState(true);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registeredTeam, setRegisteredTeam] = useState<{ starters: Player[], bench: Player[] } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [gameweekStats, setGameweekStats] = useState<Record<string, Record<string, unknown>>>({});
  const [teamResult, setTeamResult] = useState<TeamResult | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("players");

  const walletIdentityRef = useRef<string | undefined>(undefined);
  /**
   * After a hard refresh starters/bench begin empty until fetch hydrates LS — we must NOT
   * `removeItem` the draft during that gap. Once the user actually had lineup in RAM this
   * session, clearing to empty intentionally removes the stale draft key.
   */
  const lineupTouchedNonEmptySessionRef = useRef(false);

  const officialResolved = useMemo(() => {
    if (teamResult == null || !registeredTeam) return null;
    if (!isCompleteRegisteredSnapshot(registeredTeam)) return null;
    const { starters, bench } = registeredTeam;
    const breakdown = computeChainAlignedXiBreakdown(starters, bench, gameweekStats);
    return { teamResult, breakdown };
  }, [teamResult, registeredTeam, gameweekStats]);

  const interimBreakdown = useMemo(() => {
    if (teamResult != null) return null;
    if (currentGameweek?.status !== "closed" && currentGameweek?.status !== "resolved") return null;
    if (!registeredTeam || !isCompleteRegisteredSnapshot(registeredTeam)) return null;
    if (Object.keys(gameweekStats).length === 0) return null;
    const { starters, bench } = registeredTeam;
    return computeChainAlignedXiBreakdown(starters, bench, gameweekStats);
  }, [teamResult, currentGameweek?.status, registeredTeam, gameweekStats]);

  const chainAlignedCopy = useMemo(
    () =>
      officialResolved || interimBreakdown
        ? {
            multiplierFooter: g.registeredMultiplierFooter,
            viaSub: g.registeredViaSub,
          }
        : null,
    [officialResolved, interimBreakdown, g],
  );

  useEffect(() => {
    fetch("/api/players")
      .then(async (r) => {
        const data = await r.json();
        if (r.ok && Array.isArray(data) && data.length > 0) {
          setPlayers(data as Player[]);
          return;
        }
        throw new Error("players api unavailable or empty");
      })
      .catch(() => {
        import("@/data/players.json").then((m) => setPlayers(m.default as Player[]));
      })
      .finally(() => setPlayersLoading(false));
  }, []);

  useEffect(() => {
    const nextIdentity = account?.address?.toString();
    const identityChanged = walletIdentityRef.current !== nextIdentity;
    walletIdentityRef.current = nextIdentity;

    if (identityChanged) {
      setAlreadyRegistered(false);
      setRegisteredTeam(null);
      setGameweekStats({});
      setTeamResult(null);
      setStarters(Array(11).fill(null));
      setBench(Array(FORMATION.BENCH).fill(null));
      lineupTouchedNonEmptySessionRef.current = false;
    }
    setGameweekLoading(true);

    async function fetchData() {
      const configData = await getConfig();
      setConfig(configData);

      const gwActive = await findActiveGameweekFromChain(configData);
      const gwData = gwActive;

      setCurrentGameweek(gwData);
      setGameweekLoading(false);

      if (!gwData) return;

      const targetGwId = gwData.id;

      if (account?.address) {
        const addr = account.address.toString();

        // For closed/resolved GWs, load team from chain directly — more reliable
        // than hasRegisteredTeam alone (avoids race conditions and contract edge cases).
        if (gwData.status === "closed" || gwData.status === "resolved") {
          const [chainTeam, res] = await Promise.all([
            getUserTeam(addr, targetGwId),
            gwData.status === "closed" || gwData.status === "resolved"
              ? getTeamResult(addr, targetGwId)
              : Promise.resolve(null),
          ]);
          setTeamResult(res);

          if (chainTeam?.playerIds?.length) {
            // User has a registered team — mark as registered
            setAlreadyRegistered(true);

            const key = `ffl_team_v2_gw${targetGwId}_${addr}`;
            // Authoritative formation + positions come from chain (matches leaderboard / Move).
            // Never prefer raw localStorage here — it keeps catalog positions and drifts from get_user_team.
            if (players.length > 0) {
              const catalog = new Map(players.map((p) => [p.id, p]));
              await mergeFplCatalogForChainIds(catalog, chainTeam.playerIds);
              const teamPlayers = squadPlayersFromChain(
                { playerIds: chainTeam.playerIds, playerPositions: chainTeam.playerPositions },
                catalog,
              );
              if (teamPlayers.length === FORMATION.TOTAL) {
                const snapshot = { starters: teamPlayers.slice(0, 11), bench: teamPlayers.slice(11) };
                setRegisteredTeam(snapshot);
                localStorage.setItem(key, JSON.stringify(snapshot));
              }
            }

            // Fetch stats for intermediate/final results
            const stats = await getGameweekStats(targetGwId, chainTeam.playerIds);
            try {
              const fpl = await fetch(`/api/fpl-live?gw=${targetGwId}`).then((r) => (r.ok ? r.json() : null));
              const merged = fpl?.players
                ? enrichStatsMapWithFplPlayers(stats as Record<string, unknown>, fpl.players)
                : stats;
              setGameweekStats(merged as Record<string, Record<string, unknown>>);
            } catch {
              setGameweekStats(stats as Record<string, Record<string, unknown>>);
            }

          } else {
            // No team on chain → not registered
            setAlreadyRegistered(false);
          }
        } else {
          // Open GW: use hasRegisteredTeam as before
          const registered = await hasRegisteredTeam(addr, targetGwId);
          setAlreadyRegistered(registered);

          if (registered) {
            const key = `ffl_team_v2_gw${targetGwId}_${addr}`;
            const saved = localStorage.getItem(key);
            if (saved) {
              try {
                const parsed = JSON.parse(saved) as { starters?: Player[]; bench?: Player[] };
                if (isCompleteRegisteredSnapshot(parsed as { starters: Player[]; bench: Player[] })) {
                  setRegisteredTeam(parsed as { starters: Player[]; bench: Player[] });
                }
              } catch { /* ignore */ }
            }
          } else {
            tryHydrateTeamDraftFromStorage(targetGwId, addr, players, setStarters, setBench);
          }
        }
      }
    }
    fetchData();
  }, [account?.address, players.length]);

  /** Tracks when current session has had at least one filled slot (avoids wiping draft on initial empty state). */
  useEffect(() => {
    if (starters.some(Boolean) || bench.some(Boolean)) {
      lineupTouchedNonEmptySessionRef.current = true;
    }
  }, [starters, bench]);

  /** If signing never settles (wallet closed without rejecting), `finally` won't run → unblock on disconnect. */
  useEffect(() => {
    if (!connected) setIsSubmitting(false);
  }, [connected]);

  /** Persist unfinished lineup for open GW before on-chain confirmation (refresh / tab switch). */
  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !connected ||
      !account?.address ||
      !currentGameweek ||
      currentGameweek.status !== "open" ||
      gameweekLoading ||
      playersLoading ||
      players.length === 0 ||
      alreadyRegistered
    ) {
      return;
    }
    const gwId = currentGameweek.id;
    const addr = account.address.toString();
    const key = teamDraftStorageKey(gwId, addr);
    const draft = lineupIdsDraftPayload(starters, bench);
    const isEmpty =
      draft.starterIds.every((id) => id == null) && draft.benchIds.every((id) => id == null);
    try {
      if (isEmpty) {
        if (lineupTouchedNonEmptySessionRef.current) {
          window.localStorage.removeItem(key);
        }
      } else {
        window.localStorage.setItem(key, JSON.stringify(draft));
      }
    } catch {
      /* ignore quota / privacy mode */
    }
  }, [
    connected,
    account?.address,
    currentGameweek,
    gameweekLoading,
    playersLoading,
    players.length,
    alreadyRegistered,
    starters,
    bench,
  ]);

  // Closed/resolved: hydrate squad from chain once catalog is ready (covers wallet fetch before /api/players).
  useEffect(() => {
    if (!alreadyRegistered || !players.length || !account?.address || !config) return;
    const st = currentGameweek?.status;
    if (st !== "closed" && st !== "resolved") return;

    const addr = account.address.toString();
    const gwId = currentGameweek?.id ?? config.currentGameweek;
    const key = `ffl_team_v2_gw${gwId}_${addr}`;

    let cancelled = false;
    async function syncFromChain() {
      const chainTeam = await getUserTeam(addr, gwId);
      if (cancelled || !chainTeam?.playerIds?.length) return;

      const catalog = new Map(players.map((p) => [p.id, p]));
      await mergeFplCatalogForChainIds(catalog, chainTeam.playerIds);
      const teamPlayers = squadPlayersFromChain(
        { playerIds: chainTeam.playerIds, playerPositions: chainTeam.playerPositions },
        catalog,
      );

      if (teamPlayers.length === FORMATION.TOTAL) {
        const teamSnapshot = { starters: teamPlayers.slice(0, 11), bench: teamPlayers.slice(11) };
        setRegisteredTeam(teamSnapshot);
        localStorage.setItem(key, JSON.stringify(teamSnapshot));
      }
    }
    void syncFromChain();
    return () => {
      cancelled = true;
    };
  }, [
    alreadyRegistered,
    players,
    account?.address,
    config,
    currentGameweek?.id,
    currentGameweek?.status,
  ]);

  // Open GW (and legacy): load team from chain when localStorage is empty or incomplete
  useEffect(() => {
    const hasValidTeam = isCompleteRegisteredSnapshot(registeredTeam);
    if (!alreadyRegistered || hasValidTeam || !players.length || !account?.address || !config) return;
    // Closed/resolved squads are synced from chain in the dedicated effect above.
    const gwStatus = currentGameweek?.status;
    if (gwStatus === "closed" || gwStatus === "resolved") return;

    const addr = account.address.toString();
    const cfg = config;
    async function loadFromChain() {
      const gwId = currentGameweek?.id ?? cfg.currentGameweek;
      const key = `ffl_team_v2_gw${gwId}_${addr}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved) as { starters?: Player[]; bench?: Player[] };
          if (isCompleteRegisteredSnapshot(parsed as { starters: Player[]; bench: Player[] })) {
            setRegisteredTeam(parsed as { starters: Player[]; bench: Player[] });
            return;
          }
        } catch {
          /* fall through to chain */
        }
      }

      const chainTeam = await getUserTeam(addr, gwId);
      if (!chainTeam || !chainTeam.playerIds.length) return;

      const catalog = new Map(players.map((p) => [p.id, p]));
      await mergeFplCatalogForChainIds(catalog, chainTeam.playerIds);
      const teamPlayers = squadPlayersFromChain(
        { playerIds: chainTeam.playerIds, playerPositions: chainTeam.playerPositions },
        catalog,
      );

      if (teamPlayers.length === FORMATION.TOTAL) {
        const teamSnapshot = { starters: teamPlayers.slice(0, 11), bench: teamPlayers.slice(11) };
        setRegisteredTeam(teamSnapshot);
        localStorage.setItem(key, JSON.stringify(teamSnapshot));
      }
    }
    loadFromChain();
  }, [alreadyRegistered, registeredTeam, players, account, config, currentGameweek]);

  const selectedPlayers = useMemo(() => {
    return new Set([...starters, ...bench].filter(Boolean).map((p) => p!.id));
  }, [starters, bench]);

  const clubCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    [...starters, ...bench].forEach((p) => {
      if (p) counts[p.teamId] = (counts[p.teamId] || 0) + 1;
    });
    return counts;
  }, [starters, bench]);

  const uniqueTeams = useMemo(() => {
    const teams = Array.from(new Set(players.map((p) => p.team))).filter(Boolean);
    return teams.sort((a, b) => a.localeCompare(b));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (positionFilter !== "ALL" && p.position !== positionFilter) return false;
        if (teamFilter && p.team !== teamFilter) return false;
        if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
            !p.webName?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => {
        // Group by team first, then by position order within team
        const teamCmp = a.team.localeCompare(b.team);
        if (teamCmp !== 0) return teamCmp;
        return (POSITION_ORDER[a.position] ?? 4) - (POSITION_ORDER[b.position] ?? 4);
      });
  }, [players, positionFilter, teamFilter, searchQuery]);

  const canSelectPlayer = (player: Player): boolean => {
    if (selectedPlayers.has(player.id)) return false;
    if ((clubCounts[player.teamId] || 0) >= MAX_PER_CLUB) return false;
    return true;
  };

  const getNextAvailableSlot = (position: string): { index: number; isBench: boolean } | null => {
    // Check starters first
    if (position === "GK" && !starters[0]) return { index: 0, isBench: false };
    if (position === "DEF") {
      for (let i = 1; i <= 4; i++) {
        if (!starters[i]) return { index: i, isBench: false };
      }
    }
    if (position === "MID") {
      for (let i = 5; i <= 7; i++) {
        if (!starters[i]) return { index: i, isBench: false };
      }
    }
    if (position === "FWD") {
      for (let i = 8; i <= 10; i++) {
        if (!starters[i]) return { index: i, isBench: false };
      }
    }

    // Then check bench (any position)
    for (let i = 0; i < FORMATION.BENCH; i++) {
      if (!bench[i]) return { index: i, isBench: true };
    }

    return null;
  };

  const calculatePlayerPoints = (player: Player) => {
    const stats = gameweekStats[player.id] || gameweekStats[player.id.toString()];
    return calculateFantasyPointsWithRating(player, stats as Record<string, unknown>);
  };

  const handlePlayerSelect = (player: Player) => {
    if (selectedPlayers.has(player.id)) {
      const starterIdx = starters.findIndex((p) => p?.id === player.id);
      if (starterIdx !== -1) {
        const newStarters = [...starters];
        newStarters[starterIdx] = null;
        setStarters(newStarters);
        return;
      }
      const benchIdx = bench.findIndex((p) => p?.id === player.id);
      if (benchIdx !== -1) {
        const newBench = [...bench];
        newBench[benchIdx] = null;
        setBench(newBench);
      }
      return;
    }

    if (!canSelectPlayer(player)) return;

    const slot = getNextAvailableSlot(player.position);
    if (!slot) return;

    if (slot.isBench) {
      const newBench = [...bench];
      newBench[slot.index] = player;
      setBench(newBench);
    } else {
      const newStarters = [...starters];
      newStarters[slot.index] = player;
      setStarters(newStarters);
    }
  };


  const handleSlotClick = (index: number, isBench: boolean) => {
    if (isBench && bench[index]) {
      const newBench = [...bench];
      newBench[index] = null;
      setBench(newBench);
    } else if (!isBench && starters[index]) {
      const newStarters = [...starters];
      newStarters[index] = null;
      setStarters(newStarters);
    }
  };

  const isTeamComplete = useMemo(() => {
    return starters.every((p) => p !== null) && bench.every((p) => p !== null);
  }, [starters, bench]);

  const handleSubmitTeam = async () => {
    if (!connected || !account || !isTeamComplete || !currentGameweek) return;

    setIsSubmitting(true);
    try {
      const allPlayers = [...starters, ...bench] as Player[];
      const playerIds = allPlayers.map((p) => p.id);
      const playerPositions = allPlayers.map((p) => p.positionId);
      const playerClubs = allPlayers.map((p) => p.teamId);

      console.log("=== REGISTER TEAM TX ===");
      console.log("gameweek:", currentGameweek.id);
      console.log("playerIds:", playerIds);
      console.log("positions:", playerPositions);
      console.log("clubs:", playerClubs);

      // Build the transaction via TS SDK (fullnode from NEXT_PUBLIC_MOVEMENT_RPC_URL)
      const transaction = await client.transaction.build.simple({
        sender: account.address.toString(),
        data: {
          function: moduleFunction("register_team"),
          typeArguments: [],
          functionArguments: [
            currentGameweek.id,
            playerIds,
            playerPositions,
            playerClubs,
          ],
        },
        options: {
          expireTimestamp: Math.floor(Date.now() / 1000) + 120,
        },
      });

      // Sign via the wallet extension. Some wallets leave the promise pending if the popup
      // is closed without confirm — `finally` never runs and the CTA stays stuck. Race a timeout.
      const signDeadlineMs = 4 * 60 * 1000;
      const signResult = await Promise.race([
        signTransaction({ transactionOrPayload: transaction }),
        new Promise<never>((_, reject) => {
          window.setTimeout(() => {
            reject(new Error("Wallet signing timed out. Close the wallet popup and tap Register again."));
          }, signDeadlineMs);
        }),
      ]);

      // Submit to the configured Movement fullnode
      const pending = await client.transaction.submit.simple({
        transaction,
        senderAuthenticator: signResult.authenticator,
      });

      console.log("TX submitted, hash:", pending.hash);

      // Wait for on-chain confirmation
      const confirmed = await client.waitForTransaction({
        transactionHash: pending.hash,
        options: { timeoutSecs: 30, checkSuccess: true },
      });
      console.log("TX confirmed:", confirmed.success, confirmed.vm_status);

      // Save the team snapshot for display (in memory + localStorage)
      const teamSnapshot = { starters: starters.filter(Boolean) as Player[], bench: bench.filter(Boolean) as Player[] };
      setRegisteredTeam(teamSnapshot);
      if (account?.address && currentGameweek?.id) {
        const key = `ffl_team_v2_gw${currentGameweek.id}_${account.address.toString()}`;
        localStorage.setItem(key, JSON.stringify(teamSnapshot));
        try {
          localStorage.removeItem(teamDraftStorageKey(currentGameweek.id, account.address.toString()));
        } catch {
          /* ignore */
        }
      }
      setAlreadyRegistered(true);
    } catch (error: unknown) {
      console.error("=== REGISTRATION ERROR ===");
      console.error("Error type:", typeof error);
      console.error("Error:", error);
      const errRec =
        error !== null && typeof error === "object"
          ? (error as { message?: unknown; code?: unknown; data?: unknown })
          : null;
      console.error("Error message:", errRec?.message);
      console.error("Error code:", errRec?.code);
      console.error("Error data:", errRec?.data);
      console.error(
        "Full error JSON:",
        JSON.stringify(error, Object.getOwnPropertyNames(Object(error)), 2),
      );

      // Clean, user-friendly error message (wallet vendors vary: "User rejected" vs "User has rejected the request", casing, EIP-1193 code 4001)
      const msg = getErrorMessage(error);
      const msgLower = msg.toLowerCase();
      const code = errRec?.code;
      const isUserRejection =
        code === 4001 ||
        msgLower.includes("user rejected") ||
        msgLower.includes("user has rejected") ||
        msgLower.includes("rejected the request") ||
        msgLower.includes("user denied") ||
        msgLower.includes("denied transaction") ||
        msgLower.includes("denied message") ||
        msgLower.includes("request rejected") ||
        msgLower.includes("cancelled") ||
        msgLower.includes("canceled");

      if (isUserRejection) {
        // User dismissed the wallet prompt — no error alert
      } else {
        alert(`${g.registerErrorPrefix} ${msg}`);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-14 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-black text-white mb-3 uppercase tracking-tight">{g.connectTitle}</h1>
          <p className="text-white/40 text-sm leading-relaxed">{g.connectDesc}</p>
        </div>
      </div>
    );
  }

  if (alreadyRegistered) {
    const teamToShow = registeredTeam?.starters || [];
    const benchToShow = registeredTeam?.bench || [];

    const isPreviewMode = currentGameweek?.status === "closed";
    const hasStats = Object.keys(gameweekStats).length > 0;
    const showScores =
      currentGameweek?.status === "resolved" ||
      (currentGameweek?.status === "closed" && hasStats);

    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-12">
        {/* Preview banner */}
        {isPreviewMode && hasStats && (
          <div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">
              Preview — Intermediate results. Not final until all matches are played.
            </p>
          </div>
        )}
        {isPreviewMode && !hasStats && (
          <div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-2xl bg-white/[0.04] border border-white/10">
            <svg className="w-4 h-4 text-white/30 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-white/40 text-xs font-bold uppercase tracking-widest">
              Registration closed. Scores will appear here once match stats are submitted.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold uppercase tracking-widest text-emerald-400">{g.gwWord} {currentGameweek?.id}</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight">{g.registeredTitle}</h1>
          </div>
          <a
            href="/leaderboard"
            className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-sm hover:bg-emerald-500/30 transition-colors"
          >
            {g.leaderboardLink}
          </a>
        </div>

        {teamToShow.length > 0 && (
          <RegisteredSquadShowcase
            starters={teamToShow}
            bench={benchToShow}
            gameweekStats={gameweekStats}
            showScores={showScores}
            getPoints={calculatePlayerPoints}
            posAbbrev={siteMessages.positionAbbrev}
            benchAbbrev={siteMessages.recap.benchAbbrev}
            startersHeading={g.startersSection}
            benchSectionLabel={g.benchSection}
            statsPendingHint={
              !showScores && currentGameweek && currentGameweek.status !== "open"
                ? mr.statsPending
                : null
            }
            scoresSidebarTitle={g.registeredScoresTitle}
            playerColLabel={g.registeredPlayerCol}
            pointsColLabel={lt.colPoints}
            xiTotalLabel={g.registeredXiTotalLabel}
            officialTotalHint={g.registeredOfficialTotalHint}
            publishedTourTotal={teamResult != null ? teamResult.finalPoints : null}
            officialResolved={officialResolved}
            interimBreakdown={interimBreakdown}
            chainAlignedCopy={chainAlignedCopy}
          />
        )}

      </div>
    );
  }

  if (gameweekLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
      </div>
    );
  }

  if (!currentGameweek || currentGameweek.status !== "open") {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-14 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-black text-white mb-3 uppercase tracking-tight">{g.unavailableTitle}</h1>
          <p className="text-white/40 text-sm leading-relaxed mb-4">
            {g.unavailableIntro}
            {currentGameweek &&
              g.unavailableGwSuffix(
                currentGameweek.id,
                currentGameweek.status === "closed"
                  ? g.statusClosed
                  : currentGameweek.status === "resolved"
                    ? g.statusResolved
                    : String(currentGameweek.status),
              )}
          </p>
          {currentGameweek?.status === "closed" && (
            <a
              href="/leaderboard"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 font-display font-bold text-xs uppercase tracking-wider hover:bg-amber-500/20 transition-colors"
            >
              View Intermediate Results →
            </a>
          )}
        </div>
      </div>
    );
  }

  const starterCount = starters.filter(Boolean).length;
  const benchCount = bench.filter(Boolean).length;
  const totalCount = starterCount + benchCount;
  const submitBtn = (extraClass = "") => (
    <button
      onClick={handleSubmitTeam}
      disabled={!isTeamComplete || isSubmitting}
      className={cn(
        "w-full py-4 rounded-2xl font-display font-black text-base uppercase tracking-wide transition-all duration-200",
        isTeamComplete && !isSubmitting
          ? "bg-gradient-to-r from-emerald-500 to-[#00f948] text-black hover:brightness-110 shadow-[0_0_30px_rgba(0,249,72,0.25)]"
          : "bg-white/[0.05] border border-white/10 text-white/30 cursor-not-allowed",
        extraClass
      )}
    >
      {isSubmitting ? g.submitRegistering : isTeamComplete
        ? g.submitConfirm(formatMOVE(config?.entryFee || 0))
        : g.submitNeedPlayers(totalCount, FORMATION.TOTAL)}
    </button>
  );

  return (
    <div className="bg-[#0D0F12] min-h-screen">
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className="max-w-7xl mx-auto px-4 pt-28">
        {/* Desktop header */}
        <div className="hidden lg:flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight">
              {g.headerTitle(currentGameweek?.id ?? 0)}
            </h1>
            <p className="text-white/40 text-sm">{g.pickPlayersHint}</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] px-6 py-4 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{g.entryFeeLabel}</p>
            <p className="text-2xl font-display font-black bg-gradient-to-r from-emerald-400 to-[#00f948] bg-clip-text text-transparent">
              {config ? formatMOVE(config.entryFee) : "—"} MOVE
            </p>
          </div>
        </div>
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-display font-black text-white uppercase tracking-tight leading-none">
              {g.headerTitle(currentGameweek?.id ?? 0)}
            </h1>
            <p className="text-white/30 text-xs mt-0.5">{g.maxThreeHint}</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">{g.entryShort}</p>
            <p className="text-base font-display font-black text-[#00f948]">
              {config ? formatMOVE(config.entryFee) : "—"} MOVE
            </p>
          </div>
        </div>
      </div>

      {/* ── Desktop layout (2 columns) ────────────────────────────────────── */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 pb-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:items-start">
          {/* Formation */}
          <div className="flex flex-col">
            <FormationGrid starters={starters} onPlayerClick={handleSlotClick} />

            {/* Bench */}
            <div className="mt-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">{g.benchTitle(benchCount, FORMATION.BENCH)}</h3>
              <div className="grid grid-cols-3 gap-2">
                {bench.map((player, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSlotClick(idx, true)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border transition-all text-left",
                      player
                        ? "bg-white/[0.05] border-white/[0.12] hover:border-rose-400/40"
                        : "bg-white/[0.02] border-dashed border-white/[0.08] text-white/20"
                    )}
                  >
                    {player ? (
                      <>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/10 text-white/50 shrink-0">{player.position}</span>
                        <span className="text-xs font-medium text-white truncate">{player.webName || player.name}</span>
                      </>
                    ) : (
                      <span className="text-xs">{g.benchSlotEmpty(idx)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="mt-3 bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3">
              <span className={cn(
                "flex items-center gap-2 text-sm font-semibold",
                isTeamComplete ? "text-emerald-400" : "text-white/40"
              )}>
                <span className={cn("w-2 h-2 rounded-full", isTeamComplete ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-white/20")} />
                {g.playersProgress(totalCount, FORMATION.TOTAL, starterCount, benchCount)}
              </span>
            </div>
            {submitBtn("mt-3 text-lg")}
          </div>

          {/* Player List */}
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 flex flex-col" style={{ maxHeight: 'calc(100vh - 120px)', position: 'sticky', top: '88px' }}>
          <div className="mb-4 space-y-3">
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder={g.searchPlaceholder}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/[0.04] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00f948]/50 border border-white/[0.08] focus:border-[#00f948]/30 transition-colors"
              />
            </div>
            {/* Position filter */}
            <div className="flex gap-2 flex-wrap">
              {(["ALL", "GK", "DEF", "MID", "FWD"] as PositionFilter[]).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(pos)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    positionFilter === pos
                      ? "bg-[#00f948]/15 text-[#00f948] border border-[#00f948]/30 shadow-[0_0_12px_rgba(0,249,72,0.15)]"
                      : "bg-white/[0.04] border border-white/[0.08] text-white/50 hover:bg-white/[0.08] hover:text-white/80"
                  )}
                >
                  {pos}
                </button>
              ))}
            </div>
            {/* Team filter */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h12M3 18h8" />
              </svg>
              <select
                value={teamFilter}
                onChange={(e) => setTeamFilter(e.target.value)}
                className="w-full pl-9 pr-8 py-2.5 bg-white/[0.04] rounded-xl text-white border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#00f948]/50 focus:border-[#00f948]/30 text-sm appearance-none cursor-pointer transition-colors"
              >
                <option value="" className="text-black bg-white">{g.allTeams}</option>
                {uniqueTeams.map((team) => (
                  <option key={team} value={team} className="text-black bg-white">{team}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {/* Active filters count */}
            {(teamFilter || positionFilter !== "ALL" || searchQuery) && (
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>{g.playersFound(filteredPlayers.length)}</span>
                <button
                  onClick={() => { setTeamFilter(""); setPositionFilter("ALL"); setSearchQuery(""); }}
                  className="text-[#00f948]/70 hover:text-[#00f948] font-semibold transition-colors"
                >
                  {g.resetFilters}
                </button>
              </div>
            )}
          </div>

          <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
            {playersLoading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/[0.08] shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3.5 bg-white/[0.08] rounded-lg w-32" />
                    <div className="h-2.5 bg-white/[0.05] rounded-lg w-20" />
                  </div>
                  <div className="w-10 h-6 bg-white/[0.08] rounded-lg" />
                </div>
              ))
            ) : filteredPlayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-white/30">
                <p className="text-base font-semibold">{g.noPlayersTitle}</p>
                <p className="text-sm mt-1 text-white/20">{g.noPlayersHint}</p>
              </div>
            ) : (
              filteredPlayers.map((player) => {
                const isSelected = selectedPlayers.has(player.id);
                const canSelect = canSelectPlayer(player);
                return (
                  <div key={player.id} className={cn(!isSelected && !canSelect && "opacity-50")}>
                    <PlayerCard
                      player={player}
                      selected={isSelected}
                      onClick={() => handlePlayerSelect(player)}
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>
        </div>{/* end desktop grid */}
      </div>{/* end desktop layout */}

      {/* ── Mobile layout ─────────────────────────────────────────────────── */}
      <div className="lg:hidden px-3 pb-28">

        {/* Pitch tab */}
        {mobileTab === "pitch" && (
          <div className="flex flex-col gap-3">
            <FormationGrid starters={starters} onPlayerClick={(idx) => { handleSlotClick(idx, false); setMobileTab("players"); }} />
            {/* Bench */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3">
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">{g.benchTitle(benchCount, FORMATION.BENCH)}</h3>
              <div className="grid grid-cols-3 gap-2">
                {bench.map((player, idx) => (
                  <button
                    key={idx}
                    onClick={() => { handleSlotClick(idx, true); if (player) setMobileTab("players"); }}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-xl border transition-all text-left",
                      player
                        ? "bg-white/[0.05] border-white/[0.12]"
                        : "bg-white/[0.02] border-dashed border-white/[0.08] text-white/20"
                    )}
                  >
                    {player ? (
                      <>
                        <span className="text-[8px] font-bold uppercase px-1 py-0.5 rounded bg-white/10 text-white/50 shrink-0">{player.position}</span>
                        <span className="text-[11px] font-medium text-white truncate">{player.webName || player.name}</span>
                      </>
                    ) : (
                      <span className="text-[11px]">{g.benchSlotEmpty(idx)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3">
              <span className={cn("flex items-center gap-2 text-sm font-semibold", isTeamComplete ? "text-emerald-400" : "text-white/40")}>
                <span className={cn("w-2 h-2 rounded-full", isTeamComplete ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-white/20")} />
                {g.playersProgressShort(totalCount, FORMATION.TOTAL)}
              </span>
            </div>
          </div>
        )}

        {/* Players tab */}
        {mobileTab === "players" && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 flex flex-col" style={{ minHeight: 'calc(100vh - 240px)' }}>
            {/* Filters */}
            <div className="mb-3 space-y-2">
              <div className="relative">
                <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder={g.searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00f948]/50 border border-white/[0.08] text-sm transition-colors"
                />
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {(["ALL", "GK", "DEF", "MID", "FWD"] as PositionFilter[]).map((pos) => (
                  <button
                    key={pos}
                    onClick={() => setPositionFilter(pos)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 transition-all",
                      positionFilter === pos
                        ? "bg-[#00f948]/15 text-[#00f948] border border-[#00f948]/30"
                        : "bg-white/[0.04] border border-white/[0.08] text-white/50"
                    )}
                  >
                    {pos}
                  </button>
                ))}
              </div>
              <div className="relative">
                <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 6h18M3 14h12M3 18h8" />
                </svg>
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full pl-8 pr-7 py-2 bg-white/[0.04] rounded-xl text-white border border-white/[0.08] text-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00f948]/50"
                >
                  <option value="" className="text-black bg-white">{g.allTeams}</option>
                  {uniqueTeams.map((team) => <option key={team} value={team} className="text-black bg-white">{team}</option>)}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {(teamFilter || positionFilter !== "ALL" || searchQuery) && (
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{g.playersFound(filteredPlayers.length)}</span>
                  <button onClick={() => { setTeamFilter(""); setPositionFilter("ALL"); setSearchQuery(""); }} className="text-[#00f948]/70 font-semibold">
                    {g.reset}
                  </button>
                </div>
              )}
            </div>
            {/* Player list */}
            <div className="flex-1 space-y-1.5 overflow-y-auto">
              {playersLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="p-3 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-white/[0.08] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-white/[0.08] rounded w-28" />
                      <div className="h-2 bg-white/[0.05] rounded w-16" />
                    </div>
                  </div>
                ))
              ) : filteredPlayers.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-white/30">
                  <p className="text-sm font-semibold">{g.noPlayersTitle}</p>
                </div>
              ) : (
                filteredPlayers.map((player) => {
                  const isSelected = selectedPlayers.has(player.id);
                  const canSelect = canSelectPlayer(player);
                  return (
                    <div key={player.id} className={cn(!isSelected && !canSelect && "opacity-50")}>
                      <PlayerCard
                        player={player}
                        selected={isSelected}
                        onClick={() => { handlePlayerSelect(player); }}
                      />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      {/* ── Mobile bottom bar ─────────────────────────────────────────────── */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0F12]/95 backdrop-blur-xl border-t border-white/[0.08] px-3 py-3 safe-area-bottom">
        {isTeamComplete ? (
          submitBtn("text-sm py-3")
        ) : (
          <div className="flex items-center gap-2">
            {/* Pitch tab */}
            <button
              onClick={() => setMobileTab("pitch")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all gap-0.5",
                mobileTab === "pitch" ? "bg-[#00f948]/10 text-[#00f948]" : "text-white/30 hover:text-white/60"
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
                <path strokeLinecap="round" d="M3 12h18M12 3v18" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wide">{g.tabPitch}</span>
            </button>

            {/* Progress pill */}
            <div className={cn(
              "px-4 py-2 rounded-xl border text-center shrink-0",
              isTeamComplete ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/[0.08] bg-white/[0.03]"
            )}>
              <span className={cn("text-sm font-display font-black tabular-nums", isTeamComplete ? "text-emerald-400" : "text-white/50")}>
                {totalCount}/{FORMATION.TOTAL}
              </span>
            </div>

            {/* Players tab */}
            <button
              onClick={() => setMobileTab("players")}
              className={cn(
                "flex-1 flex flex-col items-center justify-center py-2 rounded-xl transition-all gap-0.5",
                mobileTab === "players" ? "bg-[#00f948]/10 text-[#00f948]" : "text-white/30 hover:text-white/60"
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wide">{g.tabPlayers}</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
