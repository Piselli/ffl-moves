"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import { getConfig, getGameweek, getTeamResult, getGameweekTeams, moduleFunction } from "@/lib/aptos";
import { formatMOVE, cn } from "@/lib/utils";
import { TeamResult } from "@/lib/types";

export default function LeaderboardPage() {
  const { account, connected, signAndSubmitTransaction } = useWallet();
  const [config, setConfig] = useState<any>(null);
  const [currentGameweek, setCurrentGameweek] = useState<any>(null);
  const [selectedGameweek, setSelectedGameweek] = useState<number>(0);
  const [leaderboardData, setLeaderboardData] = useState<TeamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  useEffect(() => {
    async function fetchData() {
      setIsLoading(true);
      try {
        const configData = await getConfig();
        setConfig(configData);

        if (configData) {
          // If no gameweek selected yet, default to current
          const targetGwId = selectedGameweek || configData.currentGameweek;
          if (selectedGameweek === 0 && configData.currentGameweek > 0) {
            setSelectedGameweek(configData.currentGameweek);
          }

          if (targetGwId > 0) {
            const gwData = await getGameweek(targetGwId);
            setCurrentGameweek(gwData);

            // Fetch team results for the selected gameweek
            const addresses = await getGameweekTeams(targetGwId);
            const results = await Promise.all(
              addresses.map((addr) => getTeamResult(addr, targetGwId))
            );

            // Filter out nulls and sort by rank
            const validResults = results.filter((r): r is TeamResult => r !== null);
            validResults.sort((a, b) => a.rank - b.rank);
            setLeaderboardData(validResults);
          }
        }
      } catch (error) {
        console.error("Error fetching leaderboard data:", error);
      } finally {
        setIsLoading(false);
      }
    }
    fetchData();
  }, [selectedGameweek]);

  const handleClaimPrize = async (gameweekId: number) => {
    if (!connected) return;
    setIsClaiming(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("claim_prize"),
          typeArguments: [],
          functionArguments: [gameweekId.toString()],
        },
      });
      alert("Prize claimed successfully!");
      setSelectedGameweek(gameweekId); // refresh
    } catch (error: any) {
      const msg = error?.message || error?.toString() || "Unknown error";
      alert(`Failed to claim: ${msg}`);
    } finally {
      setIsClaiming(false);
    }
  };

  const userResult = account?.address
    ? leaderboardData.find((r) => r.owner === account.address.toString())
    : null;

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto px-4 pt-28 pb-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading blockchain data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-28 pb-12">
      <div className="flex items-center justify-between mb-8 flex-wrap gap-4">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2">Leaderboard</h1>
          <p className="text-muted-foreground">See how you rank against other managers</p>
        </div>

        <div className="glass-card flex items-center gap-3 px-4 py-3 rounded-xl">
          <label className="text-muted-foreground text-sm">Gameweek:</label>
          <select
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(Number(e.target.value))}
            className="bg-secondary text-foreground px-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary border border-border"
          >
            {Array.from({ length: config?.currentGameweek || 1 }, (_, i) => i + 1).map((gw) => (
              <option key={gw} value={gw}>
                GW {gw}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gameweek Summary */}
      {currentGameweek ? (
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">Status</p>
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-lg font-bold",
              currentGameweek.status === "open" && "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30",
              currentGameweek.status === "closed" && "bg-amber-500/20 text-amber-400 border border-amber-500/30",
              currentGameweek.status === "resolved" && "bg-blue-500/20 text-blue-400 border border-blue-500/30"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                currentGameweek.status === "open" && "bg-emerald-400 animate-pulse",
                currentGameweek.status === "closed" && "bg-amber-400",
                currentGameweek.status === "resolved" && "bg-blue-400"
              )} />
              {currentGameweek.status.toUpperCase()}
            </div>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">Prize Pool</p>
            <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
              {formatMOVE(currentGameweek.prizePool)} MOVE
            </p>
          </div>
          <div className="glass-card rounded-2xl p-6 text-center">
            <p className="text-muted-foreground text-sm mb-2">Total Entries</p>
            <p className="text-3xl font-bold text-white">
              {currentGameweek.totalEntries}
            </p>
          </div>
        </div>
      ) : (
        <div className="glass-card rounded-2xl p-8 text-center mb-8">
          <p className="text-muted-foreground">No data available for Gameweek {selectedGameweek}</p>
        </div>
      )}

      {/* User's Result Highlight */}
      {userResult && (
        <div className="glass-card rounded-2xl p-6 mb-8 border-2 border-emerald-500/50 glow-green">
          <div className="flex items-center gap-2 mb-4">
            <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            <div className="flex items-center justify-between w-full">
              <h2 className="text-lg font-bold text-emerald-400">Your Result (GW {selectedGameweek})</h2>
              {userResult.rank > 0 && userResult.rank <= 10 && (
                <span className="text-xs bg-emerald-500/20 text-emerald-400 px-2 py-1 rounded border border-emerald-500/30">
                  IN THE PRIZE MONEY!
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div className="stat-card px-4 py-3 rounded-xl">
              <p className={cn(
                "text-3xl font-bold",
                userResult.rank === 1 && "rank-gold",
                userResult.rank === 2 && "rank-silver",
                userResult.rank === 3 && "rank-bronze",
                userResult.rank > 3 && "text-white",
                userResult.rank === 0 && "text-muted-foreground"
              )}>
                {userResult.rank > 0 ? `#${userResult.rank}` : "N/A"}
              </p>
              <p className="text-sm text-muted-foreground">Rank</p>
            </div>
            <div className="stat-card px-4 py-3 rounded-xl">
              <p className="text-3xl font-bold text-white">{userResult.finalPoints}</p>
              <p className="text-sm text-muted-foreground">Points</p>
            </div>
            <div className="stat-card px-4 py-3 rounded-xl">
              <p className="text-3xl font-bold bg-gradient-to-r from-emerald-400 to-green-500 bg-clip-text text-transparent">
                {userResult.prizeAmount > 0 ? formatMOVE(userResult.prizeAmount) : "-"}
              </p>
              <p className="text-sm text-muted-foreground">Prize (MOVE)</p>
            </div>
            <div className="flex items-center justify-center">
              {userResult.prizeAmount > 0 && !userResult.claimed && (
                <button
                  onClick={() => handleClaimPrize(selectedGameweek)}
                  disabled={isClaiming}
                  className="btn-primary px-6 py-3 rounded-xl font-medium disabled:opacity-50"
                >
                  {isClaiming ? "Claiming..." : "Claim Prize"}
                </button>
              )}
              {userResult.claimed && (
                <span className="flex items-center gap-2 text-emerald-400 font-medium">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  Claimed
                </span>
              )}
              {userResult.prizeAmount === 0 && (
                <span className="text-xs text-muted-foreground">No prize this time</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prize Distribution Info */}
      <div className="glass-card rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-6 text-center">Prize Distribution (Top 10)</h2>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          {[
            { rank: "1st", share: "30%", color: "text-amber-400" },
            { rank: "2nd", share: "20%", color: "text-gray-300" },
            { rank: "3rd", share: "15%", color: "text-orange-400" },
            { rank: "4th", share: "8%", color: "text-white" },
            { rank: "5th", share: "7%", color: "text-white" },
            { rank: "6th", share: "6%", color: "text-white/80" },
            { rank: "7th", share: "5%", color: "text-white/80" },
            { rank: "8th", share: "4%", color: "text-white/80" },
            { rank: "9th", share: "3%", color: "text-white/60" },
            { rank: "10th", share: "2%", color: "text-white/60" }
          ].map((prize) => (
            <div key={prize.rank} className="bg-secondary/30 rounded-xl p-4 text-center border border-border">
              <p className="text-sm text-muted-foreground mb-1">{prize.rank}</p>
              <p className={cn("text-xl font-bold", prize.color)}>{prize.share}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card rounded-2xl overflow-hidden">
        {leaderboardData.length > 0 ? (
          <LeaderboardTable
            results={leaderboardData}
            currentUser={account?.address?.toString()}
          />
        ) : (
          <div className="p-12 text-center">
            <div className="w-16 h-16 bg-secondary/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h3 className="text-xl font-bold text-white mb-2">No results yet</h3>
            <p className="text-muted-foreground max-w-sm mx-auto">
              Results for Gameweek {selectedGameweek} haven't been published by the oracle yet.
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-muted-foreground text-sm mt-6 glass-card rounded-xl py-4 px-6">
        Showing real on-chain results for Gameweek {selectedGameweek}.
        Prize amounts are based on the total MOVE pool for this gameweek.
      </p>
    </div>
  );
}
