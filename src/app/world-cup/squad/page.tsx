"use client";

import {
  useState,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import Link from "next/link";
import { useWallet } from "@/hooks/useSolanaWallet";
import { FormationGrid } from "@/components/FormationGrid";
import { PositionFilterPills, type PositionFilter } from "@/components/PositionFilterPills";
import { RegisteredSquadShowcase } from "@/components/RegisteredSquadShowcase";
import { PlayerCard } from "@/components/PlayerCard";
import { Player, TeamResult } from "@/lib/types";
import { MAX_PER_CLUB, FORMATION } from "@/lib/constants";
import { DEFAULT_FORMATION, slotPosition } from "@/lib/formation";
import {
  hasRegisteredTeam,
  getGameweekStats,
  getTeamResult,
  getUserTeam,
  buildRegisterTeam,
  type GameweekSummary,
} from "@/lib/chainClient";
import {
  isInsufficientFundsError,
  isWalletUserRejection,
  shouldOpenDepositBeforeRegister,
} from "@/lib/registerPayment";
import { findActiveWorldCupTourFromChain, getWorldCupRound } from "@/lib/worldcup";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import { cn, getErrorMessage } from "@/lib/utils";
import { trackReferralConversion } from "@/lib/referralClient";
import { calculateFantasyPointsWithRating } from "@/lib/scoring";
import { computeChainAlignedXiBreakdown } from "@/lib/chainAlignedScoring";
import { enrichSquadFromCatalog, squadPlayersFromChain } from "@/lib/fplSquadResolve";
import { ConnectWalletCTA } from "@/components/ConnectWalletCTA";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { ShareSquadOnXModal } from "@/components/ShareSquadOnXModal";
import { InsufficientFundsModal } from "@/components/InsufficientFundsModal";
import { buildRandomSquad } from "@/lib/randomSquad";
import { useDeposit } from "@/components/DepositProvider";
import {
  persistTeamDraftFromLineup,
  tryHydrateTeamDraftFromStorage,
  wcTeamDraftKey,
} from "@/lib/teamDraftStorage";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { PRODUCT_PAGE_TOP } from "@/components/SiteBackHome";

type MobileTab = "pitch" | "players";

const POSITION_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

function isCompleteRegisteredSnapshot(
  t: { starters: Player[]; bench: Player[] } | null | undefined,
): boolean {
  if (!t || !Array.isArray(t.starters) || !Array.isArray(t.bench)) return false;
  return t.starters.length === 11 && t.bench.length === FORMATION.BENCH;
}

function registeredStorageKey(tourId: number, addr: string) {
  return `wc_team_v2_t${tourId}_${addr}`;
}

export default function WorldCupSquadPage() {
  const { connected, account, signAndSubmit, hasExternalWallet } = useWallet();
  const { openDeposit } = useDeposit();
  const siteMessages = useSiteMessages();
  const wc = siteMessages.pages.worldCup;
  const g = siteMessages.pages.gameweek;
  const ss = siteMessages.pages.squadShare;
  const mr = siteMessages.pages.myResult;
  const lt = siteMessages.pages.leaderboardTable;

  const [starters, setStarters] = useState<(Player | null)[]>(Array(11).fill(null));
  const [bench, setBench] = useState<(Player | null)[]>(Array(FORMATION.BENCH).fill(null));
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [activeSlot, setActiveSlot] = useState<{ index: number; isBench: boolean } | null>(null);
  const [teamFilter, setTeamFilter] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentTour, setCurrentTour] = useState<GameweekSummary | null>(null);
  const [tourLoading, setTourLoading] = useState(true);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registeredTeam, setRegisteredTeam] = useState<{ starters: Player[]; bench: Player[] } | null>(null);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [insufficientFundsOpen, setInsufficientFundsOpen] = useState(false);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [tourStats, setTourStats] = useState<Record<string, Record<string, unknown>>>({});
  const [teamResult, setTeamResult] = useState<TeamResult | null>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("players");

  const walletIdentityRef = useRef<string | undefined>(undefined);
  const lineupTouchedNonEmptySessionRef = useRef(false);
  const draftHydrateAttemptedRef = useRef(false);

  const persistOpenTourDraft = useCallback(
    (nextStarters: (Player | null)[], nextBench: (Player | null)[]) => {
      if (
        typeof window === "undefined" ||
        !account?.address ||
        !currentTour ||
        currentTour.status !== "open" ||
        tourLoading ||
        playersLoading ||
        players.length === 0 ||
        alreadyRegistered
      ) {
        return;
      }
      persistTeamDraftFromLineup(
        wcTeamDraftKey(currentTour.id, account.address.toString()),
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
      currentTour,
      players.length,
      playersLoading,
      tourLoading,
    ],
  );

  // Registration fee is read from the shared on-chain config (same as EPL).
  const [entryFee, setEntryFee] = useState<bigint | null>(null);

  const officialResolved = useMemo(() => {
    if (teamResult == null || !registeredTeam) return null;
    if (!isCompleteRegisteredSnapshot(registeredTeam)) return null;
    const breakdown = computeChainAlignedXiBreakdown(registeredTeam.starters, registeredTeam.bench, tourStats);
    return { teamResult, breakdown };
  }, [teamResult, registeredTeam, tourStats]);

  const interimBreakdown = useMemo(() => {
    if (teamResult != null) return null;
    if (currentTour?.status !== "closed" && currentTour?.status !== "resolved") return null;
    if (!registeredTeam || !isCompleteRegisteredSnapshot(registeredTeam)) return null;
    if (Object.keys(tourStats).length === 0) return null;
    return computeChainAlignedXiBreakdown(registeredTeam.starters, registeredTeam.bench, tourStats);
  }, [teamResult, currentTour?.status, registeredTeam, tourStats]);

  const chainAlignedCopy = useMemo(
    () =>
      officialResolved || interimBreakdown
        ? { multiplierFooter: g.registeredMultiplierFooter, viaSub: g.registeredViaSub }
        : null,
    [officialResolved, interimBreakdown, g],
  );

  const catalogById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const registeredTeamForDisplay = useMemo(() => {
    if (!registeredTeam || !isCompleteRegisteredSnapshot(registeredTeam)) return null;
    if (players.length === 0) return null;
    return enrichSquadFromCatalog(registeredTeam, catalogById);
  }, [registeredTeam, catalogById, players.length]);

  const prize = usePrizeAsset();
  const entryFeeLabel = useMemo(() => {
    if (entryFee == null) return "—";
    return prize.formatLabel(entryFee);
  }, [entryFee, prize]);

  // WC player catalog (API-Sports based), fallback to bundled JSON.
  useEffect(() => {
    let cancelled = false;

    async function loadCatalog() {
      for (let attempt = 0; attempt < 3; attempt++) {
        if (cancelled) return;
        try {
          const r = await fetch("/api/wc-players");
          if (!r.ok) throw new Error("wc players api unavailable");
          const data = await r.json();
          if (!Array.isArray(data)) throw new Error("wc players api invalid response");
          if (!cancelled) setPlayers(data as Player[]);
          return;
        } catch {
          if (attempt < 2) {
            await new Promise((resolve) => setTimeout(resolve, 150 * (attempt + 1)));
          }
        }
      }
      if (!cancelled) setPlayers([]);
    }

    loadCatalog().finally(() => {
      if (!cancelled) setPlayersLoading(false);
    });

    return () => {
      cancelled = true;
    };
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
      setTourStats({});
      setTeamResult(null);
      setStarters(Array(11).fill(null));
      setBench(Array(FORMATION.BENCH).fill(null));
      lineupTouchedNonEmptySessionRef.current = false;
      draftHydrateAttemptedRef.current = false;
    }
    setTourLoading(true);

    let cancelled = false;

    async function fetchData() {
      try {
        const [{ getConfig }, gwData] = await Promise.all([
          import("@/lib/chainClient"),
          findActiveWorldCupTourFromChain(),
        ]);
        if (cancelled) return;

        const cfg = await getConfig();
        if (cancelled) return;

        if (cancelled) return;
        setEntryFee(cfg ? cfg.entryFee : null);
        setCurrentTour(gwData);

        if (!gwData || !account?.address) {
          if (!cancelled) {
            setAlreadyRegistered(false);
            setRegisteredTeam(null);
          }
          return;
        }
        if (cancelled) return;

        const targetTourId = gwData.id;
        const addr = account.address.toString();
        const regKey = registeredStorageKey(targetTourId, addr);

        const hydrateRegisteredSnapshot = (raw: string | null) => {
          if (!raw || cancelled) return false;
          try {
            const parsed = JSON.parse(raw) as { starters?: Player[]; bench?: Player[] };
            if (!isCompleteRegisteredSnapshot(parsed as { starters: Player[]; bench: Player[] })) return false;
            setRegisteredTeam(parsed as { starters: Player[]; bench: Player[] });
            return true;
          } catch {
            return false;
          }
        };

        if (gwData.status === "closed" || gwData.status === "resolved") {
          const [chainTeam, res] = await Promise.all([
            getUserTeam(addr, targetTourId),
            getTeamResult(addr, targetTourId),
          ]);
          if (cancelled) return;

          setTeamResult(res);

          if (chainTeam?.playerIds?.length) {
            if (!cancelled) setAlreadyRegistered(true);
            if (!hydrateRegisteredSnapshot(localStorage.getItem(regKey)) && !cancelled) {
              setRegisteredTeam(null);
            }
            const stats = await getGameweekStats(targetTourId, chainTeam.playerIds);
            if (!cancelled) setTourStats(stats as Record<string, Record<string, unknown>>);
          } else if (!cancelled) {
            setAlreadyRegistered(false);
            setRegisteredTeam(null);
          }
        } else {
          // Optimistic hydrate so registered users don't flash the squad picker.
          const saved = localStorage.getItem(regKey);
          if (hydrateRegisteredSnapshot(saved) && !cancelled) {
            setAlreadyRegistered(true);
          }

          const registered = await hasRegisteredTeam(addr, targetTourId);
          if (cancelled) return;

          setAlreadyRegistered(registered);
          if (registered) {
            if (!hydrateRegisteredSnapshot(localStorage.getItem(regKey)) && !cancelled) {
              const chainTeam = await getUserTeam(addr, targetTourId);
              if (cancelled) return;
              if (chainTeam?.playerIds?.length) {
                setRegisteredTeam(null);
              }
            }
          } else if (!cancelled) {
            setRegisteredTeam(null);
          }
        }
      } finally {
        if (!cancelled) setTourLoading(false);
      }
    }
    fetchData();

    return () => {
      cancelled = true;
    };
  }, [account?.address]);

  useEffect(() => {
    if (
      tourLoading ||
      alreadyRegistered ||
      !account?.address ||
      !currentTour ||
      currentTour.status !== "open" ||
      players.length === 0
    ) {
      return;
    }
    const storageKey = wcTeamDraftKey(currentTour.id, account.address.toString());
    tryHydrateTeamDraftFromStorage(storageKey, players, setStarters, setBench);
    draftHydrateAttemptedRef.current = true;
  }, [tourLoading, alreadyRegistered, account?.address, currentTour, players.length]);

  useEffect(() => {
    if (starters.some(Boolean) || bench.some(Boolean)) lineupTouchedNonEmptySessionRef.current = true;
  }, [starters, bench]);

  useEffect(() => {
    if (!connected) setIsSubmitting(false);
  }, [connected]);

  // Persist unfinished lineup for the open tour (layout effect runs before paint / route change).
  useLayoutEffect(() => {
    persistOpenTourDraft(starters, bench);
  }, [persistOpenTourDraft, starters, bench]);

  // Hydrate registered squad from chain for closed/resolved when catalog/localStorage is incomplete.
  useEffect(() => {
    if (!alreadyRegistered || !account?.address || !currentTour) return;
    if (players.length === 0) return;
    if (isCompleteRegisteredSnapshot(registeredTeam)) return;
    const addr = account.address.toString();
    const tourId = currentTour.id;
    let cancelled = false;
    (async () => {
      const chainTeam = await getUserTeam(addr, tourId);
      if (cancelled || !chainTeam?.playerIds?.length) return;
      const catalog = new Map(players.map((p) => [p.id, p]));
      const teamPlayers = squadPlayersFromChain(
        { playerIds: chainTeam.playerIds, playerPositions: chainTeam.playerPositions },
        catalog,
      );
      if (teamPlayers.length === FORMATION.TOTAL) {
        const snapshot = { starters: teamPlayers.slice(0, 11), bench: teamPlayers.slice(11) };
        setRegisteredTeam(snapshot);
        localStorage.setItem(registeredStorageKey(tourId, addr), JSON.stringify(snapshot));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [alreadyRegistered, registeredTeam, players, account?.address, currentTour]);

  // When the WC catalog loads, merge portrait fields (apiId, photo) into registered state.
  useEffect(() => {
    if (!alreadyRegistered || !account?.address || !currentTour || players.length === 0) return;
    if (!registeredTeam || !isCompleteRegisteredSnapshot(registeredTeam)) return;

    const enriched = enrichSquadFromCatalog(registeredTeam, catalogById);
    const flatOrig = [...registeredTeam.starters, ...registeredTeam.bench];
    const flatNew = [...enriched.starters, ...enriched.bench];
    const improved = flatNew.some((p, i) => {
      const orig = flatOrig[i];
      return (
        (p.apiId ?? 0) > 0 &&
        (orig.apiId !== p.apiId ||
          orig.photo !== p.photo ||
          orig.fplPhotoCode !== p.fplPhotoCode ||
          orig.imageUrl !== p.imageUrl)
      );
    });
    if (!improved) return;

    setRegisteredTeam(enriched);
    try {
      localStorage.setItem(
        registeredStorageKey(currentTour.id, account.address.toString()),
        JSON.stringify(enriched),
      );
    } catch {
      /* ignore */
    }
  }, [alreadyRegistered, account?.address, currentTour, players.length, registeredTeam, catalogById]);

  const selectedPlayers = useMemo(
    () => new Set([...starters, ...bench].filter(Boolean).map((p) => p!.id)),
    [starters, bench],
  );

  const clubCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    [...starters, ...bench].forEach((p) => {
      if (p) counts[p.teamId] = (counts[p.teamId] || 0) + 1;
    });
    return counts;
  }, [starters, bench]);

  const uniqueTeams = useMemo(() => {
    return Array.from(new Set(players.map((p) => p.team))).filter(Boolean).sort((a, b) => a.localeCompare(b));
  }, [players]);

  const filteredPlayers = useMemo(() => {
    return players
      .filter((p) => {
        if (positionFilter !== "ALL" && p.position !== positionFilter) return false;
        if (teamFilter && p.team !== teamFilter) return false;
        if (
          searchQuery &&
          !p.name.toLowerCase().includes(searchQuery.toLowerCase()) &&
          !p.webName?.toLowerCase().includes(searchQuery.toLowerCase())
        )
          return false;
        return true;
      })
      .sort((a, b) => {
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
    if (position === "GK" && !starters[0]) return { index: 0, isBench: false };
    if (position === "DEF") for (let i = 1; i <= 4; i++) if (!starters[i]) return { index: i, isBench: false };
    if (position === "MID") for (let i = 5; i <= 7; i++) if (!starters[i]) return { index: i, isBench: false };
    if (position === "FWD") for (let i = 8; i <= 10; i++) if (!starters[i]) return { index: i, isBench: false };
    for (let i = 0; i < FORMATION.BENCH; i++) if (!bench[i]) return { index: i, isBench: true };
    return null;
  };

  const calculatePlayerPoints = (player: Player) => {
    const stats = tourStats[player.id] || tourStats[player.id.toString()];
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
      slotPosition(activeSlot.index, DEFAULT_FORMATION) === player.position
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
      setPositionFilter(slotPosition(index, DEFAULT_FORMATION));
    }
  };

  const isTeamComplete = useMemo(
    () => starters.every((p) => p !== null) && bench.every((p) => p !== null),
    [starters, bench],
  );

  const handleRandomSquad = () => {
    const squad = buildRandomSquad(players, { mode: "uniform" });
    if (!squad) {
      window.alert(g.randomSquadFailed);
      return;
    }
    setStarters(squad.starters);
    setBench(squad.bench);
    lineupTouchedNonEmptySessionRef.current = true;
  };

  const handleSubmitTeam = async () => {
    if (!connected || !account || !isTeamComplete || !currentTour) return;

    const requiredRaw = entryFee != null && entryFee > 0n ? entryFee : 5_000_000n;
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

      await signAndSubmit(await buildRegisterTeam(
        account.address,
        currentTour.id,
        { playerIds, positions: playerPositions, playerPositions, clubs: playerClubs, captainIndex: 8 },
      ));

      const teamSnapshot = {
        starters: starters.filter(Boolean) as Player[],
        bench: bench.filter(Boolean) as Player[],
      };
      setRegisteredTeam(teamSnapshot);
      if (account?.address) {
        const addr = account.address.toString();
        localStorage.setItem(registeredStorageKey(currentTour.id, addr), JSON.stringify(teamSnapshot));
        try {
          localStorage.removeItem(wcTeamDraftKey(currentTour.id, addr));
        } catch {
          /* ignore */
        }
      }
      setAlreadyRegistered(true);
      setShareModalOpen(true);

      // Attribute this registration to the referral code the visitor arrived with.
      trackReferralConversion(account?.address?.toString() ?? null);
    } catch (error: unknown) {
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

  const roundLabel = currentTour ? wc.roundName(getWorldCupRound(currentTour.id)?.key ?? "") : "";

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
          <p className="text-white/40 text-sm leading-relaxed mb-2">{g.connectDesc}</p>
          <ConnectWalletCTA className="mt-6 text-left" />
        </div>
      </div>
    );
  }

  const pageBootstrapping = tourLoading;
  const registeredBootstrapping =
    alreadyRegistered && (playersLoading || !registeredTeamForDisplay);

  if (pageBootstrapping || registeredBootstrapping) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-white/60 animate-spin" />
      </div>
    );
  }

  if (alreadyRegistered) {
    const teamToShow = registeredTeamForDisplay!.starters;
    const benchToShow = registeredTeamForDisplay!.bench;
    const isPreviewMode = currentTour?.status === "closed";
    const hasStats = Object.keys(tourStats).length > 0;
    const showScores =
      currentTour?.status === "resolved" || (currentTour?.status === "closed" && hasStats);

    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-12">
        <div className="mb-6">
          <Link href="/world-cup" className="text-xs font-bold uppercase tracking-widest text-[#00f948]/70 hover:text-[#00f948]">
            {wc.backToHub}
          </Link>
        </div>
        <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold uppercase tracking-widest text-emerald-400">{roundLabel}</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight">{g.registeredTitle}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShareModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-white/15 bg-white px-5 py-2.5 text-sm font-display font-black uppercase tracking-wide text-black transition-all hover:brightness-95"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {ss.registeredShareButton}
            </button>
            <Link
              href="/world-cup/my-result"
              className="px-5 py-2.5 rounded-xl bg-white/[0.04] text-white/70 border border-white/10 font-semibold text-sm hover:bg-white/[0.08] transition-colors"
            >
              {wc.mySquadsCta}
            </Link>
            <Link
              href="/world-cup/leaderboard"
              className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-sm hover:bg-emerald-500/30 transition-colors"
            >
              {g.leaderboardLink}
            </Link>
          </div>
        </div>

        {teamToShow.length > 0 && (
          <RegisteredSquadShowcase
            starters={teamToShow}
            bench={benchToShow}
            gameweekStats={tourStats}
            showScores={showScores}
            getPoints={calculatePlayerPoints}
            posAbbrev={siteMessages.positionAbbrev}
            benchAbbrev={siteMessages.recap.benchAbbrev}
            startersHeading={g.startersSection}
            benchSectionLabel={g.benchSection}
            statsPendingHint={!showScores && currentTour && currentTour.status !== "open" ? mr.statsPending : null}
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
          context="world-cup"
          tourLabel={roundLabel}
          sitePath="/world-cup/squad"
        />
      </div>
    );
  }

  if (!currentTour || currentTour.status !== "open") {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-14 text-center max-w-md w-full">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-display font-black text-white mb-3 uppercase tracking-tight">{wc.noActiveTourTitle}</h1>
          <p className="text-white/40 text-sm leading-relaxed mb-4">{wc.noActiveTourHint}</p>
          <Link
            href="/world-cup"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00f948]/10 border border-[#00f948]/20 text-[#00f948] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#00f948]/20 transition-colors"
          >
            {wc.backToHub}
          </Link>
        </div>
      </div>
    );
  }

  if (!playersLoading && players.length === 0) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-14 text-center max-w-md w-full">
          <h1 className="text-2xl font-display font-black text-white mb-3 uppercase tracking-tight">{wc.catalogEmptyTitle}</h1>
          <p className="text-white/40 text-sm leading-relaxed">{wc.catalogEmptyHint}</p>
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
        extraClass,
      )}
    >
      {isSubmitting
        ? g.submitRegistering
        : isTeamComplete
          ? g.submitConfirm(entryFeeLabel)
          : `${g.submitNeedPlayers(totalCount, FORMATION.TOTAL)} ${g.submitNeedProgress(totalCount, FORMATION.TOTAL)}`}
    </button>
  );

  return (
    <div className="bg-[#0D0F12] min-h-screen">
      <LockerLabNav liveLinks />
      <div className={cn("max-w-7xl mx-auto px-4", PRODUCT_PAGE_TOP)}>
        <div className="mb-4">
          <Link href="/world-cup" className="text-xs font-bold uppercase tracking-widest text-[#00f948]/70 hover:text-[#00f948]">
            {wc.backToHub}
          </Link>
        </div>
        <div className="hidden lg:grid lg:grid-cols-2 lg:gap-8 mb-8 items-start">
          <div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight">
              {wc.squadTitle}
            </h1>
            <p className="text-white/40 text-sm">{roundLabel} · {wc.pickHint}</p>
            <Link
              href="/world-cup/my-result"
              className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wider text-[#00f948]/70 hover:text-[#00f948]"
            >
              {wc.mySquadsCta}
            </Link>
          </div>
          <div className="flex flex-wrap items-center justify-end gap-3">
            <Link
              href="/world-cup/my-result"
              className="text-[10px] font-bold uppercase tracking-wider text-[#00f948]/70 hover:text-[#00f948] border border-[#00f948]/20 hover:border-[#00f948]/40 px-3 py-2 rounded-xl transition-colors"
            >
              {wc.mySquadsCta}
            </Link>
            <div className="bg-white/[0.03] border border-white/[0.08] px-6 py-4 rounded-2xl">
              <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">{g.entryFeeLabel}</p>
              <p className="text-2xl font-display font-black bg-gradient-to-r from-emerald-400 to-[#00f948] bg-clip-text text-transparent">
                {entryFeeLabel}
              </p>
            </div>
          </div>
        </div>
        <div className="lg:hidden mb-4 space-y-3">
          <div>
            <h1 className="text-lg font-display font-black text-white uppercase tracking-tight leading-none">{wc.squadTitle}</h1>
            <p className="text-white/30 text-xs mt-0.5">{wc.maxThreeNation}</p>
            <Link href="/world-cup/my-result" className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-[#00f948]/70">
              {wc.mySquadsCta}
            </Link>
          </div>
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden lg:block max-w-7xl mx-auto px-4 pb-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:items-stretch">
          <div className="flex flex-col">
            <FormationGrid
              starters={starters}
              onPlayerClick={handleSlotClick}
              activeIndex={activeSlot && !activeSlot.isBench ? activeSlot.index : null}
            />
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
                      "flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-[border-color,background-color,transform] duration-150 active:scale-[0.98]",
                      player
                        ? "bg-white/[0.05] border-white/[0.12] hover:border-rose-400/40"
                        : activeSlot?.isBench && activeSlot.index === idx
                          ? "bg-white/[0.06] border-white/25 text-white/60"
                          : "bg-white/[0.02] border-dashed border-white/[0.08] text-white/20",
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

          <div className="relative min-h-0">
            <div className="absolute inset-0 bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-4 flex flex-col min-h-0 overflow-hidden">
            <div className="mb-4 space-y-3 shrink-0">
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
                layoutId="wc-pos"
              />
              <div className="relative">
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full pl-3 pr-8 py-2.5 bg-white/[0.04] rounded-xl text-white border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#00f948]/50 focus:border-[#00f948]/30 text-sm appearance-none cursor-pointer transition-colors"
                >
                  <option value="" className="text-black bg-white">{wc.nationFilterAll}</option>
                  {uniqueTeams.map((team) => (
                    <option key={team} value={team} className="text-black bg-white">{team}</option>
                  ))}
                </select>
              </div>
              {(teamFilter || positionFilter !== "ALL" || searchQuery) && (
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{g.playersFound(filteredPlayers.length)}</span>
                  <button onClick={() => { setTeamFilter(""); setPositionFilter("ALL"); setSearchQuery(""); }} className="text-[#00f948]/70 hover:text-[#00f948] font-semibold transition-colors">
                    {g.resetFilters}
                  </button>
                </div>
              )}
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-2">
              {playersLoading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.05] animate-pulse flex items-center gap-3">
                    <div className="w-11 h-11 rounded-xl bg-white/[0.08] shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3.5 bg-white/[0.08] rounded-lg w-32" />
                      <div className="h-2.5 bg-white/[0.05] rounded-lg w-20" />
                    </div>
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
                      <PlayerCard player={player} selected={isSelected} onClick={() => handlePlayerSelect(player)} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
          </div>
        </div>
      </div>

      {/* Mobile */}
      <div className="lg:hidden px-3 pb-28">
        {mobileTab === "pitch" && (
          <div className="flex flex-col gap-3">
            <FormationGrid
              starters={starters}
              onPlayerClick={(idx) => {
                const occupied = Boolean(starters[idx]);
                handleSlotClick(idx, false);
                if (!occupied) setMobileTab("players");
              }}
              activeIndex={activeSlot && !activeSlot.isBench ? activeSlot.index : null}
            />
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
                          : "bg-white/[0.02] border-dashed border-white/[0.08] text-white/20",
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

        {mobileTab === "players" && (
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-3 flex flex-col" style={{ minHeight: "calc(100vh - 240px)" }}>
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
                layoutId="wc-pos-m"
                size="sm"
                className="w-full"
              />
              <div className="relative">
                <select
                  value={teamFilter}
                  onChange={(e) => setTeamFilter(e.target.value)}
                  className="w-full pl-3 pr-7 py-2 bg-white/[0.04] rounded-xl text-white border border-white/[0.08] text-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00f948]/50"
                >
                  <option value="" className="text-black bg-white">{wc.nationFilterAll}</option>
                  {uniqueTeams.map((team) => <option key={team} value={team} className="text-black bg-white">{team}</option>)}
                </select>
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
                      <PlayerCard player={player} selected={isSelected} onClick={() => handlePlayerSelect(player)} />
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>

      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0D0F12]/95 backdrop-blur-xl border-t border-white/[0.08] px-3 py-3 safe-area-bottom">
        {isTeamComplete ? (
          submitBtn("text-sm py-3")
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setMobileTab("pitch")}
              className={cn("flex-1 flex flex-col items-center justify-center py-2 rounded-xl gap-0.5 transition-[color,transform] duration-150 active:scale-[0.97]", mobileTab === "pitch" ? "bg-[#00f948]/10 text-[#00f948]" : "text-white/30 hover:text-white/60")}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
                <path strokeLinecap="round" d="M3 12h18M12 3v18" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wide">{g.tabPitch}</span>
            </button>
            <div className={cn("px-4 py-2 rounded-xl border text-center shrink-0", isTeamComplete ? "border-emerald-500/30 bg-emerald-500/10" : "border-white/[0.08] bg-white/[0.03]")}>
              <span className={cn("text-sm font-display font-black tabular-nums", isTeamComplete ? "text-emerald-400" : "text-white/50")}>
                {totalCount}/{FORMATION.TOTAL}
              </span>
            </div>
            <button
              onClick={() => setMobileTab("players")}
              className={cn("flex-1 flex flex-col items-center justify-center py-2 rounded-xl gap-0.5 transition-[color,transform] duration-150 active:scale-[0.97]", mobileTab === "players" ? "bg-[#00f948]/10 text-[#00f948]" : "text-white/30 hover:text-white/60")}
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
