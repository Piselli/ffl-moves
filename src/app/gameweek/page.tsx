"use client";

import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { FormationGrid } from "@/components/FormationGrid";
import { PlayerCard } from "@/components/PlayerCard";
import { Player } from "@/lib/types";
import { POSITIONS, MAX_PER_CLUB, FORMATION } from "@/lib/constants";
import {
  aptos,
  moduleFunction,
  getConfig,
  findOpenGameweekFromChain,
  hasRegisteredTeam,
  getGameweekStats,
  getTeamResult,
  getUserTeam,
} from "@/lib/aptos";
import { formatMOVE, cn } from "@/lib/utils";
import { calculateFantasyPointsWithRating, enrichStatsMapWithFplPlayers } from "@/lib/scoring";
import { squadPlayersFromChain } from "@/lib/fplSquadResolve";

type PositionFilter = "ALL" | "GK" | "DEF" | "MID" | "FWD";
type TeamFilter = string;
type MobileTab = "pitch" | "players";

export default function GameweekPage() {
  const { connected, account, signAndSubmitTransaction, signTransaction } = useWallet();

  const [starters, setStarters] = useState<(Player | null)[]>(Array(11).fill(null));
  const [bench, setBench] = useState<(Player | null)[]>(Array(FORMATION.BENCH).fill(null));
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
  const [teamFilter, setTeamFilter] = useState<TeamFilter>("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [currentGameweek, setCurrentGameweek] = useState<any>(null);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registeredTeam, setRegisteredTeam] = useState<{ starters: Player[], bench: Player[] } | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);
  const [gameweekStats, setGameweekStats] = useState<Record<string, any>>({});
  const [teamResult, setTeamResult] = useState<any>(null);
  const [mobileTab, setMobileTab] = useState<MobileTab>("players");

  // Fetch live FPL players
  useEffect(() => {
    fetch("/api/players")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPlayers(data as Player[]);
      })
      .catch(() => {
        // Fall back to local data if API fails
        import("@/data/players.json").then((m) => setPlayers(m.default as Player[]));
      })
      .finally(() => setPlayersLoading(false));
  }, []);

  useEffect(() => {
    async function fetchData() {
      const configData = await getConfig();
      setConfig(configData);

      const gwData = await findOpenGameweekFromChain(configData);
      setCurrentGameweek(gwData);

      if (!gwData) return;

      const targetGwId = gwData.id;

      if (account?.address) {
        const registered = await hasRegisteredTeam(account.address.toString(), targetGwId);
        setAlreadyRegistered(registered);

        if (registered) {
          const key = `ffl_team_gw${targetGwId}_${account.address.toString()}`;
          const saved = localStorage.getItem(key);
          if (saved) {
            try {
              setRegisteredTeam(JSON.parse(saved));
            } catch {}
          }
        }

        if (gwData.status === "resolved") {
          const [chainTeam, res] = await Promise.all([
            getUserTeam(account.address.toString(), targetGwId),
            getTeamResult(account.address.toString(), targetGwId),
          ]);
          setTeamResult(res);
          if (chainTeam?.playerIds?.length) {
            const stats = await getGameweekStats(targetGwId, chainTeam.playerIds);
            try {
              const fpl = await fetch(`/api/fpl-live?gw=${targetGwId}`).then((r) => (r.ok ? r.json() : null));
              const merged = fpl?.players
                ? enrichStatsMapWithFplPlayers(stats as Record<string, unknown>, fpl.players)
                : stats;
              setGameweekStats(merged);
            } catch {
              setGameweekStats(stats);
            }
          }
        }
      }
    }
    fetchData();
  }, [account?.address]);

  // Fallback: load team from chain when localStorage is empty but players list is ready
  useEffect(() => {
    const hasValidTeam = (registeredTeam?.starters?.length ?? 0) > 0;
    if (!alreadyRegistered || hasValidTeam || !players.length || !account?.address || !config) return;

    async function loadFromChain() {
      const gwId = currentGameweek?.id ?? config.currentGameweek;
      const key = `ffl_team_gw${gwId}_${account!.address.toString()}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if ((parsed?.starters?.length ?? 0) > 0) {
            setRegisteredTeam(parsed);
            return;
          }
        } catch {}
      }

      const chainTeam = await getUserTeam(account!.address.toString(), gwId);
      if (!chainTeam || !chainTeam.playerIds.length) return;

      const catalog = new Map(players.map((p) => [p.id, p]));
      const teamPlayers = squadPlayersFromChain(
        { playerIds: chainTeam.playerIds, playerPositions: chainTeam.playerPositions },
        catalog,
      );

      if (teamPlayers.length > 0) {
        const teamSnapshot = { starters: teamPlayers.slice(0, 11), bench: teamPlayers.slice(11) };
        setRegisteredTeam(teamSnapshot);
        localStorage.setItem(key, JSON.stringify(teamSnapshot));
      }
    }
    loadFromChain();
  }, [alreadyRegistered, registeredTeam, players, account?.address, config, currentGameweek]);

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

  const POSITION_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

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

      // Build the transaction via Aptos SDK (fullnode from NEXT_PUBLIC_MOVEMENT_RPC_URL)
      const transaction = await aptos.transaction.build.simple({
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
      });

      // Sign via the wallet extension
      const signResult = await signTransaction({ transactionOrPayload: transaction });

      // Submit through Aptos SDK to the configured fullnode
      const pending = await aptos.transaction.submit.simple({
        transaction,
        senderAuthenticator: signResult.authenticator,
      });

      console.log("TX submitted, hash:", pending.hash);

      // Wait for on-chain confirmation
      const confirmed = await aptos.waitForTransaction({
        transactionHash: pending.hash,
        options: { timeoutSecs: 30, checkSuccess: true },
      });
      console.log("TX confirmed:", confirmed.success, confirmed.vm_status);

      // Save the team snapshot for display (in memory + localStorage)
      const teamSnapshot = { starters: starters.filter(Boolean) as Player[], bench: bench.filter(Boolean) as Player[] };
      setRegisteredTeam(teamSnapshot);
      if (account?.address && currentGameweek?.id) {
        const key = `ffl_team_gw${currentGameweek.id}_${account.address.toString()}`;
        localStorage.setItem(key, JSON.stringify(teamSnapshot));
      }
      setAlreadyRegistered(true);
    } catch (error: any) {
      console.error("=== REGISTRATION ERROR ===");
      console.error("Error type:", typeof error);
      console.error("Error:", error);
      console.error("Error message:", error?.message);
      console.error("Error code:", error?.code);
      console.error("Error data:", error?.data);
      console.error("Full error JSON:", JSON.stringify(error, Object.getOwnPropertyNames(error || {}), 2));
      
      // Clean, user-friendly error message (wallet vendors vary: "User rejected" vs "User has rejected the request", casing, EIP-1193 code 4001)
      const msg = String(error?.message || error?.toString?.() || "Unknown error");
      const msgLower = msg.toLowerCase();
      const code = error?.code;
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
        alert(`Помилка реєстрації: ${msg}`);
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
          <h1 className="text-2xl font-display font-black text-white mb-3 uppercase tracking-tight">Вибір складу</h1>
          <p className="text-white/40 text-sm leading-relaxed">Підключи гаманець щоб вибрати свій склад на поточний тур.</p>
        </div>
      </div>
    );
  }

  if (alreadyRegistered) {
    const positionOrder = ["GK", "DEF", "MID", "FWD"];
    const positionColors: Record<string, string> = {
      GK: "bg-amber-500/20 text-amber-400 border-amber-500/30",
      DEF: "bg-blue-500/20 text-blue-400 border-blue-500/30",
      MID: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
      FWD: "bg-rose-500/20 text-rose-400 border-rose-500/30",
    };
    const teamToShow = registeredTeam?.starters || [];
    const benchToShow = registeredTeam?.bench || [];

    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold uppercase tracking-widest text-emerald-400">Тур {currentGameweek?.id}</span>
            </div>
            <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight">Твій зареєстрований склад</h1>
          </div>
          <a
            href="/leaderboard"
            className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-sm hover:bg-emerald-500/30 transition-colors"
          >
            Лідерборд →
          </a>
        </div>

        {/* Starters */}
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 mb-4">
          <h2 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4">Основа</h2>
          <div className="space-y-1">
            {positionOrder.map((pos) => {
              const posPlayers = teamToShow.filter((p) => p.position === pos);
              if (!posPlayers.length) return null;
              return (
                <div key={pos}>
                  {posPlayers.map((player) => {
                    const points = calculatePlayerPoints(player);
                    return (
                      <div key={player.id} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors">
                        <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border w-10 text-center flex-shrink-0 ${positionColors[player.position]}`}>
                          {player.position}
                        </span>
                        <div className="flex-1">
                          <p className="text-white font-medium">{player.webName || player.name}</p>
                          <p className="text-white/40 text-[10px]">{player.team}</p>
                        </div>
                        {currentGameweek?.status === "resolved" && (
                          <div className="text-right">
                            <span className={cn(
                              "text-sm font-bold",
                              points > 0 ? "text-emerald-400" : points < 0 ? "text-rose-400" : "text-white/40"
                            )}>
                              {points > 0 ? `+${points}` : points} pts
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        {/* Bench */}
        {benchToShow.length > 0 && (
          <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6 mb-4">
            <h2 className="text-white/40 text-[10px] font-bold uppercase tracking-widest mb-4">Запасні</h2>
            <div className="space-y-1">
              {benchToShow.map((player) => (
                <div key={player.id} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors">
                  <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border w-10 text-center flex-shrink-0 ${positionColors[player.position]}`}>
                    {player.position}
                  </span>
                  <div className="flex-1">
                    <p className="text-white font-medium">{player.webName || player.name}</p>
                    <p className="text-white/40 text-[10px]">{player.team}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
          <h1 className="text-2xl font-display font-black text-white mb-3 uppercase tracking-tight">Тур недоступний</h1>
          <p className="text-white/40 text-sm leading-relaxed">
            Зараз немає відкритого ігрового тижня.
            {currentGameweek && ` Тур ${currentGameweek.id} — ${currentGameweek.status === "closed" ? "закрито" : currentGameweek.status === "resolved" ? "завершено" : currentGameweek.status}.`}
          </p>
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
          ? "bg-gradient-to-r from-emerald-500 to-[#00C46A] text-black hover:brightness-110 shadow-[0_0_30px_rgba(0,196,106,0.25)]"
          : "bg-white/[0.05] border border-white/10 text-white/30 cursor-not-allowed",
        extraClass
      )}
    >
      {isSubmitting ? "Реєстрація..." : isTeamComplete
        ? `Підтвердити склад · ${formatMOVE(config?.entryFee || 0)} MOVE`
        : `Обери ${FORMATION.TOTAL} гравців (${totalCount}/${FORMATION.TOTAL})`}
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
              Тур {currentGameweek?.id} · Вибір складу
            </h1>
            <p className="text-white/40 text-sm">Обери 11 гравців. Максимум 3 з однієї команди.</p>
          </div>
          <div className="bg-white/[0.03] border border-white/[0.08] px-6 py-4 rounded-2xl">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/40 mb-1">Вартість реєстрації</p>
            <p className="text-2xl font-display font-black bg-gradient-to-r from-emerald-400 to-[#00C46A] bg-clip-text text-transparent">
              {config ? formatMOVE(config.entryFee) : "—"} MOVE
            </p>
          </div>
        </div>
        {/* Mobile header */}
        <div className="lg:hidden flex items-center justify-between mb-4">
          <div>
            <h1 className="text-lg font-display font-black text-white uppercase tracking-tight leading-none">
              Тур {currentGameweek?.id} · Вибір складу
            </h1>
            <p className="text-white/30 text-xs mt-0.5">Максимум 3 з однієї команди</p>
          </div>
          <div className="text-right shrink-0">
            <p className="text-[10px] text-white/30 uppercase tracking-widest">Внесок</p>
            <p className="text-base font-display font-black text-[#00C46A]">
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
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Запасні ({benchCount}/{FORMATION.BENCH})</h3>
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
                      <span className="text-xs">Запасний {idx + 1}</span>
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
                {totalCount}/{FORMATION.TOTAL} гравців ({starterCount} основних + {benchCount} запасних)
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
                placeholder="Пошук гравця..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-white/[0.04] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00C46A]/50 border border-white/[0.08] focus:border-[#00C46A]/30 transition-colors"
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
                      ? "bg-[#00C46A]/15 text-[#00C46A] border border-[#00C46A]/30 shadow-[0_0_12px_rgba(0,196,106,0.15)]"
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
                className="w-full pl-9 pr-8 py-2.5 bg-white/[0.04] rounded-xl text-white border border-white/[0.08] focus:outline-none focus:ring-2 focus:ring-[#00C46A]/50 focus:border-[#00C46A]/30 text-sm appearance-none cursor-pointer transition-colors"
              >
                <option value="">Всі команди</option>
                {uniqueTeams.map((team) => (
                  <option key={team} value={team}>{team}</option>
                ))}
              </select>
              <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
            {/* Active filters count */}
            {(teamFilter || positionFilter !== "ALL" || searchQuery) && (
              <div className="flex items-center justify-between text-xs text-white/40">
                <span>{filteredPlayers.length} гравців</span>
                <button
                  onClick={() => { setTeamFilter(""); setPositionFilter("ALL"); setSearchQuery(""); }}
                  className="text-[#00C46A]/70 hover:text-[#00C46A] font-semibold transition-colors"
                >
                  Скинути фільтри
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
                <p className="text-base font-semibold">Гравців не знайдено</p>
                <p className="text-sm mt-1 text-white/20">Спробуй інші фільтри</p>
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
              <h3 className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-2">Запасні ({benchCount}/{FORMATION.BENCH})</h3>
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
                      <span className="text-[11px]">Запасний {idx + 1}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-4 py-3">
              <span className={cn("flex items-center gap-2 text-sm font-semibold", isTeamComplete ? "text-emerald-400" : "text-white/40")}>
                <span className={cn("w-2 h-2 rounded-full", isTeamComplete ? "bg-emerald-400 shadow-[0_0_6px_#34d399]" : "bg-white/20")} />
                {totalCount}/{FORMATION.TOTAL} гравців
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
                  placeholder="Пошук гравця..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-white/[0.04] rounded-xl text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-[#00C46A]/50 border border-white/[0.08] text-sm transition-colors"
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
                        ? "bg-[#00C46A]/15 text-[#00C46A] border border-[#00C46A]/30"
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
                  className="w-full pl-8 pr-7 py-2 bg-white/[0.04] rounded-xl text-white border border-white/[0.08] text-xs appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-[#00C46A]/50"
                >
                  <option value="">Всі команди</option>
                  {uniqueTeams.map((team) => <option key={team} value={team}>{team}</option>)}
                </select>
                <svg className="absolute right-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </div>
              {(teamFilter || positionFilter !== "ALL" || searchQuery) && (
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{filteredPlayers.length} гравців</span>
                  <button onClick={() => { setTeamFilter(""); setPositionFilter("ALL"); setSearchQuery(""); }} className="text-[#00C46A]/70 font-semibold">
                    Скинути
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
                  <p className="text-sm font-semibold">Гравців не знайдено</p>
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
                mobileTab === "pitch" ? "bg-[#00C46A]/10 text-[#00C46A]" : "text-white/30 hover:text-white/60"
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" />
                <path strokeLinecap="round" d="M3 12h18M12 3v18" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wide">Поле</span>
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
                mobileTab === "players" ? "bg-[#00C46A]/10 text-[#00C46A]" : "text-white/30 hover:text-white/60"
              )}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="text-[10px] font-bold uppercase tracking-wide">Гравці</span>
            </button>
          </div>
        )}
      </div>

    </div>
  );
}
