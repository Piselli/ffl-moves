"use client";

import { useState, useEffect, useMemo } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { FormationGrid } from "@/components/FormationGrid";
import { PlayerCard } from "@/components/PlayerCard";
import { Player } from "@/lib/types";
import { POSITIONS, MAX_PER_CLUB, FORMATION } from "@/lib/constants";
import { moduleFunction, getConfig, getGameweek, hasRegisteredTeam, getGameweekStats, getTeamResult, getUserTeam } from "@/lib/aptos";
import { formatMOVE, cn } from "@/lib/utils";

type PositionFilter = "ALL" | "GK" | "DEF" | "MID" | "FWD";

export default function GameweekPage() {
  const { connected, account, signAndSubmitTransaction } = useWallet();

  const [starters, setStarters] = useState<(Player | null)[]>(Array(11).fill(null));
  const [bench, setBench] = useState<(Player | null)[]>(Array(3).fill(null));
  const [positionFilter, setPositionFilter] = useState<PositionFilter>("ALL");
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

      if (configData?.currentGameweek) {
        const gwData = await getGameweek(configData.currentGameweek);
        setCurrentGameweek(gwData);

        if (account?.address) {
          const registered = await hasRegisteredTeam(account.address.toString(), configData.currentGameweek);
          setAlreadyRegistered(registered);

          // Try to restore saved team from localStorage
          if (registered) {
            const key = `ffl_team_gw${configData.currentGameweek}_${account.address.toString()}`;
            const saved = localStorage.getItem(key);
            if (saved) {
              try {
                setRegisteredTeam(JSON.parse(saved));
              } catch {}
            }
          }

          // Fetch stats if resolved
          if (gwData?.status === "resolved") {
            const stats = await getGameweekStats(configData.currentGameweek);
            setGameweekStats(stats);
            
            if (account?.address) {
              const res = await getTeamResult(account.address.toString(), configData.currentGameweek);
              setTeamResult(res);
            }
          }
        }
      }
    }
    fetchData();
  }, [account?.address]);

  // Fallback: load team from chain when localStorage is empty but players list is ready
  useEffect(() => {
    if (!alreadyRegistered || registeredTeam || !players.length || !account?.address || !config) return;

    async function loadFromChain() {
      const key = `ffl_team_gw${config.currentGameweek}_${account!.address.toString()}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try { setRegisteredTeam(JSON.parse(saved)); } catch {}
        return;
      }
      const chainTeam = await getUserTeam(account!.address.toString(), config.currentGameweek);
      if (!chainTeam || !chainTeam.playerIds.length) return;

      const teamPlayers = chainTeam.playerIds
        .map((id) => players.find((p) => p.id === id))
        .filter(Boolean) as Player[];

      if (teamPlayers.length > 0) {
        const teamSnapshot = { starters: teamPlayers.slice(0, 11), bench: teamPlayers.slice(11) };
        setRegisteredTeam(teamSnapshot);
        localStorage.setItem(key, JSON.stringify(teamSnapshot));
      }
    }
    loadFromChain();
  }, [alreadyRegistered, registeredTeam, players, account?.address, config]);

  const selectedPlayers = useMemo(() => {
    const all = [...starters, ...bench].filter(Boolean) as Player[];
    return new Set(all.map((p) => p.id));
  }, [starters, bench]);

  const clubCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    [...starters, ...bench].forEach((p) => {
      if (p) {
        counts[p.teamId] = (counts[p.teamId] || 0) + 1;
      }
    });
    return counts;
  }, [starters, bench]);

  const filteredPlayers = useMemo(() => {
    return players.filter((p) => {
      if (positionFilter !== "ALL" && p.position !== positionFilter) return false;
      if (searchQuery && !p.name.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [players, positionFilter, searchQuery]);

  const canSelectPlayer = (player: Player): boolean => {
    if (selectedPlayers.has(player.id)) return false;
    if ((clubCounts[player.teamId] || 0) >= MAX_PER_CLUB) return false;
    return true;
  };

  const getNextAvailableSlot = (position: string): { index: number; isBench: boolean } | null => {
    const posId = POSITIONS[position as keyof typeof POSITIONS];

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

    // Check bench (any position except GK can be on bench)
    if (position !== "GK") {
      for (let i = 0; i < 3; i++) {
        if (!bench[i]) return { index: i, isBench: true };
      }
    }

    return null;
  };

  const calculatePlayerPoints = (player: Player) => {
    // Try both number and string keys
    const stats = gameweekStats[player.id] || gameweekStats[player.id.toString()];
    if (!stats) return 0;

    let points = 0;
    
    // Safely handle both snake_case (from Move) and potentially camelCase
    const mins = Number(stats.minutes_played ?? stats.minutesPlayed ?? 0);
    const goals = Number(stats.goals ?? 0);
    const assists = Number(stats.assists ?? 0);
    const cleanSheet = stats.clean_sheet ?? stats.cleanSheet ?? false;
    const saves = Number(stats.saves ?? 0);
    const penaltiesSaved = Number(stats.penalties_saved ?? stats.penaltiesSaved ?? 0);
    const penaltiesMissed = Number(stats.penalties_missed ?? stats.penaltiesMissed ?? 0);
    const ownGoals = Number(stats.own_goals ?? stats.ownGoals ?? 0);
    const yellowCards = Number(stats.yellow_cards ?? stats.yellowCards ?? 0);
    const redCards = Number(stats.red_cards ?? stats.redCards ?? 0);

    if (mins > 0) {
      points += 1;
      if (mins >= 60) points += 1;
    }

    if (goals > 0) {
      const posId = player.positionId;
      const goalPoints = posId === 3 ? 4 : posId === 2 ? 5 : 6;
      points += goals * goalPoints;
    }

    points += assists * 3;

    if (cleanSheet && mins >= 60 && (player.positionId === 0 || player.positionId === 1)) {
      points += 4;
    }

    if (player.positionId === 0) {
      points += Math.floor(saves / 3);
    }

    points += penaltiesSaved * 5;

    let deductions = 0;
    deductions += penaltiesMissed * 2;
    deductions += ownGoals * 2;
    deductions += yellowCards;
    deductions += redCards * 3;

    return Math.max(0, points - deductions);
  };

  const handlePlayerSelect = (player: Player) => {
    if (selectedPlayers.has(player.id)) {
      // Remove player
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
        return;
      }
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
    const hasAllStarters = starters.every((p) => p !== null);
    const hasAllBench = bench.every((p) => p !== null);
    return hasAllStarters && hasAllBench;
  }, [starters, bench]);

  const handleSubmitTeam = async () => {
    if (!connected || !account || !isTeamComplete || !currentGameweek) return;

    setIsSubmitting(true);
    try {
      const playerIds = [...starters, ...bench].map((p) => p!.id.toString());
      const playerPositions = [...starters, ...bench].map((p) => p!.positionId.toString());
      const playerClubs = [...starters, ...bench].map((p) => p!.teamId.toString());
      // Captain is required by the contract — auto-assign first starter (hidden from UI for now)
      const captainId = starters[0]!.id.toString();

      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("register_team"),
          typeArguments: [],
          functionArguments: [
            currentGameweek.id.toString(),
            playerIds,
            playerPositions,
            playerClubs,
            captainId,
          ],
        },
      });

      // Save the team snapshot for display (in memory + localStorage)
      const teamSnapshot = { starters: starters.filter(Boolean) as Player[], bench: bench.filter(Boolean) as Player[] };
      setRegisteredTeam(teamSnapshot);
      if (account?.address && currentGameweek?.id) {
        const key = `ffl_team_gw${currentGameweek.id}_${account.address.toString()}`;
        localStorage.setItem(key, JSON.stringify(teamSnapshot));
      }
      setAlreadyRegistered(true);
    } catch (error: any) {
      console.error("Failed to register team:", error);
      alert(`Failed to register team: ${error.message || "Unknown error"}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Squad Selection</h1>
          <p className="text-muted-foreground">Please connect your wallet to select your squad.</p>
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
      <div className="max-w-4xl mx-auto px-4 pt-24 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-sm font-bold uppercase tracking-widest text-emerald-400">Gameweek {currentGameweek?.id}</span>
            </div>
            <h1 className="text-3xl font-bold text-white">Твій зареєстрований склад</h1>
          </div>
          <a
            href="/leaderboard"
            className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold text-sm hover:bg-emerald-500/30 transition-colors"
          >
            Лідерборд →
          </a>
        </div>

        {/* Starters */}
        <div className="glass-card rounded-2xl p-6 mb-4">
          <h2 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Основа</h2>
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
          <div className="glass-card rounded-2xl p-6">
            <h2 className="text-white/60 text-xs font-bold uppercase tracking-widest mb-4">Запасні</h2>
            <div className="space-y-1">
              {benchToShow.map((player) => {
                const points = calculatePlayerPoints(player);
                return (
                  <div key={player.id} className="flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-white/5 transition-colors opacity-70">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase border w-10 text-center flex-shrink-0 ${positionColors[player.position]}`}>
                      {player.position}
                    </span>
                    <div className="flex-1">
                      <p className="text-white font-medium">{player.webName || player.name}</p>
                      <p className="text-white/40 text-[10px]">{player.team}</p>
                    </div>
                    {currentGameweek?.status === "resolved" && (
                      <div className="text-right">
                        <span className="text-xs text-white/40 font-medium">
                          ({points} pts)
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    );
  }

  if (!currentGameweek || currentGameweek.status !== "open") {
    return (
      <div className="max-w-7xl mx-auto px-4 pt-24 pb-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-16 h-16 rounded-2xl bg-amber-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">No Open Gameweek</h1>
          <p className="text-muted-foreground">
            There is no gameweek currently open for registration.
            {currentGameweek && ` Gameweek ${currentGameweek.id} is ${currentGameweek.status}.`}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 pt-24 pb-8">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold text-white">
            Gameweek {currentGameweek?.id} Squad
          </h1>
          <p className="text-muted-foreground">
            Select 11 starters + 3 subs. Max 3 players per club.
          </p>
        </div>
        <div className="glass-card px-6 py-4 rounded-xl">
          <p className="text-sm text-muted-foreground">Entry Fee</p>
          <p className="text-2xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
            {config ? formatMOVE(config.entryFee) : "-"} MOVE
          </p>
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Formation View */}
        <div>
          <FormationGrid
            starters={starters}
            bench={bench}
            onPlayerClick={handleSlotClick}
          />

          <div className="mt-6 glass-card rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-4 text-sm">
              <span className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full",
                starters.filter(Boolean).length === 11
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-secondary text-muted-foreground"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  starters.filter(Boolean).length === 11 ? "bg-emerald-400" : "bg-muted-foreground"
                )} />
                {starters.filter(Boolean).length}/11 Starters
              </span>
              <span className={cn(
                "flex items-center gap-2 px-3 py-1 rounded-full",
                bench.filter(Boolean).length === 3
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                  : "bg-secondary text-muted-foreground"
              )}>
                <span className={cn(
                  "w-2 h-2 rounded-full",
                  bench.filter(Boolean).length === 3 ? "bg-emerald-400" : "bg-muted-foreground"
                )} />
                {bench.filter(Boolean).length}/3 Subs
              </span>
            </div>
          </div>

          <button
            onClick={handleSubmitTeam}
            disabled={!isTeamComplete || isSubmitting}
            className={cn(
              "mt-4 w-full py-4 rounded-xl font-bold text-lg transition-all",
              isTeamComplete && !isSubmitting
                ? "btn-primary"
                : "bg-secondary text-muted-foreground cursor-not-allowed"
            )}
          >
            {isSubmitting
              ? "Submitting..."
              : isTeamComplete
              ? `Confirm Team (${formatMOVE(config?.entryFee || 0)} MOVE)`
              : "Complete Your Squad"}
          </button>
        </div>

        {/* Player List */}
        <div className="glass-card rounded-2xl p-4">
          <div className="mb-4 space-y-3">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 bg-secondary/50 rounded-xl text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary border border-border"
              />
            </div>
            <div className="flex gap-2">
              {(["ALL", "GK", "DEF", "MID", "FWD"] as PositionFilter[]).map((pos) => (
                <button
                  key={pos}
                  onClick={() => setPositionFilter(pos)}
                  className={cn(
                    "px-4 py-2 rounded-lg text-sm font-medium transition-all",
                    positionFilter === pos
                      ? "bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-lg shadow-emerald-500/25"
                      : "bg-secondary text-muted-foreground hover:bg-secondary/80"
                  )}
                >
                  {pos}
                </button>
              ))}
            </div>
          </div>

          <div className="h-[600px] overflow-y-auto space-y-2 pr-2">
            {playersLoading ? (
              // Loading skeleton
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="p-4 rounded-xl bg-secondary/30 animate-pulse flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-secondary/60" />
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-secondary/60 rounded w-32" />
                    <div className="h-3 bg-secondary/40 rounded w-20" />
                  </div>
                  <div className="w-10 h-6 bg-secondary/60 rounded" />
                </div>
              ))
            ) : filteredPlayers.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                <p className="text-lg">No players found</p>
                <p className="text-sm mt-1">Try adjusting your search or filter</p>
              </div>
            ) : (
              filteredPlayers.map((player) => {
                const isSelected = selectedPlayers.has(player.id);
                const canSelect = canSelectPlayer(player);

                return (
                  <div
                    key={player.id}
                    className={cn(
                      !isSelected && !canSelect && "opacity-50"
                    )}
                  >
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
    </div>
  );
}
