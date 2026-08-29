"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { useWallet } from "@/hooks/useSolanaWallet";
import { FormationGrid } from "@/components/FormationGrid";
import { FormationPicker } from "@/components/FormationPicker";
import { PositionFilterPills, type PositionFilter } from "@/components/PositionFilterPills";
import { RegisteredSquadShowcase } from "@/components/RegisteredSquadShowcase";
import { PlayerCard } from "@/components/PlayerCard";
import { Player, TeamResult } from "@/lib/types";
import { POSITIONS, MAX_PER_CLUB, FORMATION } from "@/lib/constants";
import {
  DEFAULT_FORMATION,
  inferFormationFromPositions,
  loadFormationId,
  remapStartersToFormation,
  saveFormationId,
  slotPosition,
  type FormationId,
} from "@/lib/formation";
import {
  getConfig,
  findActiveGameweek,
  hasRegisteredTeam,
  getGameweekStats,
  getTeamResult,
  getUserTeam,
  buildRegisterTeam,
  type ChainConfig,
  type GameweekSummary,
} from "@/lib/chainClient";
import {
  isInsufficientFundsError,
  isWalletUserRejection,
  shouldOpenDepositBeforeRegister,
} from "@/lib/registerPayment";
import Link from "next/link";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import { cn, getErrorMessage } from "@/lib/utils";
import { trackReferralConversion } from "@/lib/referralClient";
import { calculateFantasyPointsWithRating, enrichStatsMapWithFplPlayers } from "@/lib/scoring";
import { computeChainAlignedXiBreakdown } from "@/lib/chainAlignedScoring";
import { squadPlayersFromChain } from "@/lib/fplSquadResolve";
import { mergeFplCatalogForChainIds } from "@/lib/fplResolveMissing";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { ShareSquadOnXModal } from "@/components/ShareSquadOnXModal";
import { InsufficientFundsModal } from "@/components/InsufficientFundsModal";
import { buildRandomPopularSquad } from "@/lib/randomSquad";
import { useDeposit } from "@/components/DepositProvider";
import {
  fflTeamDraftKey,
  persistTeamDraftFromLineup,
  tryHydrateTeamDraftFromStorage,
} from "@/lib/teamDraftStorage";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { PRODUCT_PAGE_TOP } from "@/components/SiteBackHome";

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

export default function GameweekPage() {
  const { connected, account, signAndSubmit, hasExternalWallet } = useWallet();
  const { openDeposit } = useDeposit();
  const siteMessages = useSiteMessages();
  const g = siteMessages.pages.gameweek;
  const ss = siteMessages.pages.squadShare;
  const mr = siteMessages.pages.myResult;
  const lt = siteMessages.pages.leaderboardTable;

  const [starters, setStarters] = useState<(Player | null)[]>(Array(11).fill(null));
  const [bench, setBench] = useState<(Player | null)[]>(Array(FORMATION.BENCH).fill(null));
  const [formationId, setFormationIdState] =
    useState<FormationId>(DEFAULT_FORMATION);
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [activeSlot, setActiveSlot] = useState<{ index: number; isBench: boolean } | null>(null);
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState<ChainConfig | null>(null);
  const [currentGameweek, setCurrentGameweek] = useState<GameweekSummary | null>(null);
  const [gameweekLoading, setGameweekLoading] = useState(true);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registeredTeam, setRegisteredTeam] = useState<{ starters: Player[], bench: Player[] } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [insufficientFundsOpen, setInsufficientFundsOpen] = useState(false);
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
  const draftHydrateAttemptedRef = useRef(false);

  const persistOpenGwDraft = useCallback(
    (nextStarters: (Player | null)[], nextBench: (Player | null)[]) => {
      if (
        typeof window === "undefined" ||
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
      persistTeamDraftFromLineup(
        fflTeamDraftKey(currentGameweek.id, account.address.toString()),
        nextStarters,
        nextBench,
        {
          removeIfEmptyAndTouched:
            draftHydrateAttemptedRef.current && lineupTouchedNonEmptySessionRef.current,
        },
      );
    },
    [
      account?.address,
      alreadyRegistered,
      currentGameweek,
      gameweekLoading,
      players.length,
      playersLoading,
    ],
  );

  useEffect(() => {
    setFormationIdState(loadFormationId());
  }, []);

  const setFormationId = (id: FormationId) => {
    setFormationIdState(id);
    saveFormationId(id);
    setStarters((prev) => remapStartersToFormation(prev, id));
  };

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

  const prize = usePrizeAsset();
  const entryFeeLabel = useMemo(() => {
    if (!config) return "—";
    return prize.formatLabel(config.entryFee);
  }, [config, prize]);

  useEffect(() => {
    fetch("/api/players")
      .then(async (r) => {
        if (!r.ok) throw new Error("players api unavailable");
        const data = await r.json();
        if (Array.isArray(data)) {
          setPlayers(data as Player[]);
          return;
        }
        throw new Error("players api invalid response");
      })
      .catch(() => {
        import("@/data/players.json").then((m) => setPlayers(m.default as Player[]));
      })
      .finally(() => setPlayersLoading(false));
  }, []);

  useEffect(() => {
    const prevIdentity = walletIdentityRef.current;
    const nextIdentity = account?.address?.toString();
    const switchedWallet =
      prevIdentity !== undefined &&
      nextIdentity !== undefined &&
      prevIdentity !== nextIdentity;
    walletIdentityRef.current = nextIdentity;

    if (switchedWallet) {
      setAlreadyRegistered(false);
      setRegisteredTeam(null);
      setGameweekStats({});
      setTeamResult(null);
      setStarters(Array(11).fill(null));
      setBench(Array(FORMATION.BENCH).fill(null));
      lineupTouchedNonEmptySessionRef.current = false;
      draftHydrateAttemptedRef.current = false;
    }
    setGameweekLoading(true);

    async function fetchData() {
      const configData = await getConfig();
      setConfig(configData);

      const gwActive = await findActiveGameweek();
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
            const catalog = new Map(players.map((p) => [p.id, p]));
            await mergeFplCatalogForChainIds(catalog, chainTeam.playerIds);
            const teamPlayers = squadPlayersFromChain(
              { playerIds: chainTeam.playerIds, playerPositions: chainTeam.playerPositions },
              catalog,
            );
            if (teamPlayers.length === FORMATION.TOTAL) {
              const snapshot = { starters: teamPlayers.slice(0, 11), bench: teamPlayers.slice(11) };
              setRegisteredTeam(snapshot);
              setFormationIdState(
                inferFormationFromPositions(chainTeam.playerPositions),
              );
              localStorage.setItem(key, JSON.stringify(snapshot));
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
          }
        }
      }
    }
    fetchData();
  }, [account?.address]);

  useEffect(() => {
    if (
      gameweekLoading ||
      alreadyRegistered ||
      !account?.address ||
      !currentGameweek ||
      currentGameweek.status !== "open" ||
      players.length === 0
    ) {
      return;
    }
    const storageKey = fflTeamDraftKey(currentGameweek.id, account.address.toString());
    tryHydrateTeamDraftFromStorage(storageKey, players, setStarters, setBench);
    draftHydrateAttemptedRef.current = true;
  }, [gameweekLoading, alreadyRegistered, account?.address, currentGameweek, players.length]);

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
  useLayoutEffect(() => {
    persistOpenGwDraft(starters, bench);
  }, [persistOpenGwDraft, starters, bench]);

  // Closed/resolved: hydrate squad from chain once wallet/GW are known (catalog may be empty — resolve via FPL ids).
  useEffect(() => {
    if (!alreadyRegistered || !account?.address || !config) return;
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
        setFormationIdState(
          inferFormationFromPositions(chainTeam.playerPositions),
        );
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
    if (!alreadyRegistered || hasValidTeam || !account?.address || !config) return;
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
        setFormationIdState(
          inferFormationFromPositions(chainTeam.playerPositions),
        );
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
    for (let i = 0; i < 11; i++) {
      if (!starters[i] && slotPosition(i, formationId) === position) {
        return { index: i, isBench: false };
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

    let slot = getNextAvailableSlot(player.position);
    if (
      activeSlot &&
      !activeSlot.isBench &&
      !starters[activeSlot.index] &&
      slotPosition(activeSlot.index, formationId) === player.position
    ) {
      slot = { index: activeSlot.index, isBench: false };
    } else if (
      activeSlot?.isBench &&
      !bench[activeSlot.index] &&
      player.position !== "GK"
    ) {
      slot = { index: activeSlot.index, isBench: true };
    }
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
    setActiveSlot(null);
  };


  const handleSlotClick = (index: number, isBench: boolean) => {
    if (isBench && bench[index]) {
      const newBench = [...bench];
      newBench[index] = null;
      setBench(newBench);
      setActiveSlot(null);
      return;
    }
    if (!isBench && starters[index]) {
      const newStarters = [...starters];
      newStarters[index] = null;
      setStarters(newStarters);
      setActiveSlot(null);
      return;
    }
    setActiveSlot({ index, isBench });
    if (!isBench) {
      setPositionFilter(slotPosition(index, formationId));
    }
  };

  const isTeamComplete = useMemo(() => {
    return starters.every((p) => p !== null) && bench.every((p) => p !== null);
  }, [starters, bench]);

  const handleRandomSquad = () => {
    const squad = buildRandomPopularSquad(players, 12, formationId);
    if (!squad) {
      window.alert(g.randomSquadFailed);
      return;
    }
    setStarters(squad.starters);
    setBench(squad.bench);
    lineupTouchedNonEmptySessionRef.current = true;
  };

  const handleSubmitTeam = async () => {
    if (!connected || !account || !isTeamComplete || !currentGameweek) return;

    const requiredRaw = config?.entryFee && config.entryFee > 0n ? config.entryFee : 5_000_000n;
    if (
      await shouldOpenDepositBeforeRegister(
        account.address.toString(),
        requiredRaw,
        hasExternalWallet,
      )
    ) {
      setInsufficientFundsOpen(true);
      return;
    }

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

      const signature = await signAndSubmit(await buildRegisterTeam(
        account.address,
        currentGameweek.id,
        { playerIds, positions: playerPositions, playerPositions, clubs: playerClubs },
      ));
      console.log("Solana transaction submitted:", signature);

      // Save the team snapshot for display (in memory + localStorage)
      const teamSnapshot = { starters: starters.filter(Boolean) as Player[], bench: bench.filter(Boolean) as Player[] };
      setRegisteredTeam(teamSnapshot);
      if (account?.address && currentGameweek?.id) {
        const key = `ffl_team_v2_gw${currentGameweek.id}_${account.address.toString()}`;
        localStorage.setItem(key, JSON.stringify(teamSnapshot));
        try {
          localStorage.removeItem(fflTeamDraftKey(currentGameweek.id, account.address.toString()));
        } catch {
          /* ignore */
        }
      }
      setAlreadyRegistered(true);
      setShareModalOpen(true);

      // Attribute this registration to the referral code the visitor arrived with.
      trackReferralConversion(account?.address?.toString() ?? null);
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
      if (isInsufficientFundsError(error)) {
        setInsufficientFundsOpen(true);
      } else if (!isWalletUserRejection(error)) {
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
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white px-5 py-2.5 text-sm font-display font-black uppercase tracking-wide text-black transition-[filter,transform] duration-150 hover:brightness-95 active:scale-[0.98]"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} aria-hidden>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              {ss.registeredShareButton}
            </button>
            <a
              href="/leaderboard"
              className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-sm hover:bg-emerald-500/30 transition-colors"
            >
              {g.leaderboardLink}
            </a>
          </div>
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
            formationId={formationId}
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

        <ShareSquadOnXModal
          open={shareModalOpen}
          onClose={() => setShareModalOpen(false)}
          starters={teamToShow}
          bench={benchToShow}
          context="gameweek"
          tourLabel={`${g.gwWord} ${currentGameweek?.id ?? ""}`}
          formationId={formationId}
        />
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
  const squadProgressLabel = (
    <span
      className={cn(
        "flex items-center gap-1.5 text-[10px] font-semibold tabular-nums",
        isTeamComplete ? "text-emerald-400" : "text-white/35",
      )}
      title={g.playersProgress(totalCount, FORMATION.TOTAL, starterCount, benchCount)}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full shrink-0",
          isTeamComplete ? "bg-emerald-400" : "bg-white/25",
        )}
      />
      {totalCount}/{FORMATION.TOTAL}
    </span>
  );

  const randomSquadBtn = (extraClass = "") => (
    <button
      type="button"
      onClick={handleRandomSquad}
      disabled={playersLoading || players.length === 0}
      className={cn(
        "shrink-0 px-4 py-3 rounded-2xl font-display font-bold text-sm uppercase tracking-wide transition-[background-color,border-color,color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]",
        "bg-white/[0.04] border border-white/[0.12] text-white/70 hover:bg-white/[0.08] hover:text-white hover:border-[#00f948]/30",
        "disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-white/[0.04] disabled:hover:text-white/70",
        extraClass,
      )}
    >
      {g.randomSquadBtn}
    </button>
  );

  const submitBtn = (extraClass = "") => (
    <button
      onClick={handleSubmitTeam}
      disabled={!isTeamComplete || isSubmitting}
      className={cn(
        "w-full py-4 rounded-2xl font-display font-black text-base uppercase tracking-wide transition-[background-color,color,transform,filter] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]",
        isTeamComplete && !isSubmitting
          ? "bg-gradient-to-r from-emerald-500 to-[#00f948] text-black hover:brightness-110 shadow-[0_0_30px_rgba(0,249,72,0.25)]"
          : "bg-white/[0.05] border border-white/10 text-white/30 cursor-not-allowed",
        extraClass
      )}
    >
      {isSubmitting ? g.submitRegistering : isTeamComplete
        ? g.submitConfirm(entryFeeLabel)
        : `${g.submitNeedPlayers(totalCount, FORMATION.TOTAL)} ${g.submitNeedProgress(totalCount, FORMATION.TOTAL)}`}
    </button>
  );

  return (
    <div className="bg-[#0D0F12] min-h-screen">
      <LockerLabNav liveLinks />
      {/* ── Header ───────────────────────────────────────────────────────── */}
      <div className={cn("max-w-7xl mx-auto px-4", PRODUCT_PAGE_TOP)}>
        {/* Desktop header */}
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 mb-8 items-start">
          <div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight">
              {g.headerTitle(currentGameweek?.id ?? 0)}
            </h1>
            <p className="text-white/40 text-sm">{g.pickPlayersHint}</p>
          </div>
          <div className="flex justify-end">
            <div className="bg-white/[0.03] border border-white/[0.08] px-6 py-4 rounded-2xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{g.entryFeeLabel}</p>
              <p className="text-2xl font-display font-black bg-gradient-to-r from-emerald-400 to-[#00f948] bg-clip-text text-transparent">
                {entryFeeLabel}
              </p>
            </div>
          </div>
        </div>
        {/* Mobile header */}
        <div className="lg:hidden mb-4 space-y-3">
          <div>
            <h1 className="text-lg font-display font-black text-white uppercase tracking-tight leading-none">
              {g.headerTitle(currentGameweek?.id ?? 0)}
            </h1>
            <p className="text-white/30 text-xs mt-0.5">{g.maxThreeHint}</p>
          </div>
        </div>
      </div>

      {/* ── Desktop layout (2 columns) ────────────────────────────────────── */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 pb-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:items-stretch">
          {/* Formation */}
          <div className="flex flex-col">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                Formation
              </p>
              <FormationPicker
                value={formationId}
                onChange={setFormationId}
                size="md"
              />
            </div>
            <FormationGrid
              starters={starters}
              onPlayerClick={handleSlotClick}
              formationId={formationId}
              activeIndex={activeSlot && !activeSlot.isBench ? activeSlot.index : null}
            />

            {/* Bench */}
            <div className="mt-4 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 shrink-0">
                  {g.benchTitle(benchCount, FORMATION.BENCH)}
                </h3>
                {squadProgressLabel}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {bench.map((player, idx) => (
                  <button
                    key={idx}
                    onClick={() => handleSlotClick(idx, true)}
                    className={cn(
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-[border-color,background-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.98]",
                      player
                        ? "bg-white/[0.05] border-white/[0.12] hover:border-rose-400/40"
                        : activeSlot?.isBench && activeSlot.index === idx
                          ? "bg-white/[0.06] border-white/25 text-white/60"
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

            <div className="mt-3 flex gap-2">
              {randomSquadBtn()}
              {submitBtn("flex-1 min-w-0 text-base py-3")}
            </div>
          </div>

          {/* Player List */}
          <div className="relative min-h-0">
            <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 flex flex-col min-h-0 overflow-hidden">
          <div className="mb-4 space-y-3 shrink-0">
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
            <PositionFilterPills
              value={positionFilter}
              onChange={setPositionFilter}
              layoutId="gw-pos"
            />
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
          </div>
        </div>{/* end desktop grid */}
      </div>{/* end desktop layout */}

      {/* ── Mobile layout ─────────────────────────────────────────────────── */}
      <div className="lg:hidden px-3 pb-28">

        {/* Pitch tab */}
        {mobileTab === "pitch" && (
          <div className="flex flex-col gap-3">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/30">
                Formation
              </p>
              <FormationPicker
                value={formationId}
                onChange={setFormationId}
                size="md"
              />
            </div>
            <FormationGrid
              starters={starters}
              onPlayerClick={(idx) => {
                const occupied = Boolean(starters[idx]);
                handleSlotClick(idx, false);
                if (!occupied) setMobileTab("players");
              }}
              formationId={formationId}
              activeIndex={activeSlot && !activeSlot.isBench ? activeSlot.index : null}
            />
            {/* Bench */}
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3">
              <div className="flex items-center justify-between gap-3 mb-2">
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 shrink-0">
                  {g.benchTitle(benchCount, FORMATION.BENCH)}
                </h3>
                {squadProgressLabel}
              </div>
              <div className="grid grid-cols-3 gap-2">
                {bench.map((player, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      const occupied = Boolean(player);
                      handleSlotClick(idx, true);
                      if (!occupied) setMobileTab("players");
                    }}
                    className={cn(
                      "flex items-center gap-2 px-2.5 py-2 rounded-xl border text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98]",
                      player
                        ? "bg-white/[0.05] border-white/[0.12]"
                        : activeSlot?.isBench && activeSlot.index === idx
                          ? "bg-white/[0.06] border-white/25 text-white/60"
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
            {randomSquadBtn("w-full")}
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
              <PositionFilterPills
                value={positionFilter}
                onChange={setPositionFilter}
                layoutId="gw-pos-m"
                size="sm"
                className="w-full"
              />
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
                "relative flex-1 flex flex-col items-center justify-center py-2 rounded-xl gap-0.5 transition-[color,transform] duration-150 active:scale-[0.97]",
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
                "relative flex-1 flex flex-col items-center justify-center py-2 rounded-xl gap-0.5 transition-[color,transform] duration-150 active:scale-[0.97]",
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

      <InsufficientFundsModal
        open={insufficientFundsOpen}
        entryFeeLabel={entryFeeLabel}
        onClose={() => setInsufficientFundsOpen(false)}
        onTopUp={() => {
          setInsufficientFundsOpen(false);
          openDeposit();
        }}
      />

    </div>
  );
}
