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
      <div className="max-w-6xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-3xl p-14 text-center">
          <div className="w-8 h-8 border-2 border-[#00F0FF]/60 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Завантаження даних...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-28 pb-12">
      {/* Header */}
      <div className="flex items-start justify-between mb-10 flex-wrap gap-4">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#00F0FF]/60">Сезон 2024/25</span>
          </div>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tight mb-1">Лідерборд</h1>
          <p className="text-white/40 text-sm">Реальні результати з блокчейну Movement</p>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-4 py-2.5 rounded-2xl">
          <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Тур</span>
          <select
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(Number(e.target.value))}
            className="bg-transparent text-white text-sm font-bold focus:outline-none cursor-pointer"
          >
            {Array.from({ length: config?.currentGameweek || 1 }, (_, i) => i + 1).map((gw) => (
              <option key={gw} value={gw} className="bg-[#0D0F12]">
                GW {gw}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gameweek Summary */}
      {currentGameweek ? (
        <div className="grid md:grid-cols-3 gap-4 mb-8">
          {/* Status */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Статус</p>
            <div className={cn(
              "inline-flex items-center gap-2 px-4 py-2 rounded-full text-sm font-bold uppercase tracking-wide border",
              currentGameweek.status === "open" && "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
              currentGameweek.status === "closed" && "bg-amber-500/10 text-amber-400 border-amber-500/25",
              currentGameweek.status === "resolved" && "bg-[#00F0FF]/10 text-[#00F0FF] border-[#00F0FF]/25"
            )}>
              <span className={cn(
                "w-1.5 h-1.5 rounded-full",
                currentGameweek.status === "open" && "bg-emerald-400 animate-pulse",
                currentGameweek.status === "closed" && "bg-amber-400",
                currentGameweek.status === "resolved" && "bg-[#00F0FF]"
              )} />
              {currentGameweek.status === "open" ? "Відкрито" : currentGameweek.status === "closed" ? "Закрито" : "Завершено"}
            </div>
          </div>

          {/* Prize Pool */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Призовий фонд</p>
            <p className="text-3xl font-display font-black bg-gradient-to-r from-emerald-400 to-[#00F0FF] bg-clip-text text-transparent tabular-nums">
              {formatMOVE(currentGameweek.prizePool)}
            </p>
            <p className="text-white/30 text-xs mt-0.5">MOVE</p>
          </div>

          {/* Entries */}
          <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-center">
            <p className="text-[10px] font-bold uppercase tracking-widest text-white/30 mb-3">Учасників</p>
            <p className="text-3xl font-display font-black text-white tabular-nums">
              {currentGameweek.totalEntries}
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-8 text-center mb-8">
          <p className="text-white/30 text-sm">Немає даних для Gameweek {selectedGameweek}</p>
        </div>
      )}

      {/* User's Result Highlight */}
      {userResult && (
        <div className="bg-[#00F0FF]/[0.04] border border-[#00F0FF]/20 shadow-[0_0_40px_rgba(0,240,255,0.06)] rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00F0FF]/15 border border-[#00F0FF]/25 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#00F0FF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-sm font-display font-black text-white uppercase tracking-wide">Мій результат · GW {selectedGameweek}</h2>
            </div>
            {userResult.rank > 0 && userResult.rank <= 10 && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                У призах 🎉
              </span>
            )}
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Місце",
                value: userResult.rank > 0 ? `#${userResult.rank}` : "—",
                className: userResult.rank === 1 ? "text-[#FFD700]" : userResult.rank === 2 ? "text-[#E2E8F0]" : userResult.rank === 3 ? "text-[#F59E0B]" : "text-white"
              },
              { label: "Очки", value: String(userResult.finalPoints), className: "text-white" },
              {
                label: "Приз (MOVE)",
                value: userResult.prizeAmount > 0 ? formatMOVE(userResult.prizeAmount) : "—",
                className: "text-emerald-400"
              },
            ].map(({ label, value, className }) => (
              <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-3 text-center">
                <p className={cn("text-2xl font-display font-black tabular-nums", className)}>{value}</p>
                <p className="text-[10px] text-white/30 uppercase tracking-wider mt-0.5">{label}</p>
              </div>
            ))}
            <div className="flex items-center justify-center">
              {userResult.prizeAmount > 0 && !userResult.claimed && (
                <button
                  onClick={() => handleClaimPrize(selectedGameweek)}
                  disabled={isClaiming}
                  className="w-full py-3 rounded-xl font-display font-black text-sm uppercase tracking-wide bg-gradient-to-r from-emerald-500 to-[#00F0FF] text-black hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isClaiming ? "..." : "Отримати"}
                </button>
              )}
              {userResult.claimed && (
                <div className="text-center">
                  <p className="text-emerald-400 font-bold text-sm">✓ Отримано</p>
                </div>
              )}
              {userResult.prizeAmount === 0 && (
                <p className="text-white/20 text-xs text-center">Без призу</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Prize Distribution Info */}
      <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 mb-8">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/25 mb-4">Розподіл призового фонду</p>

        {/* Top 3 */}
        <div className="flex gap-2 mb-3">
          {[
            { rank: 1, medal: "🥇", share: "30%", bg: "bg-[#FFD700]/[0.07] border-[#FFD700]/20", text: "text-[#FFD700]" },
            { rank: 2, medal: "🥈", share: "20%", bg: "bg-white/[0.04] border-white/[0.10]", text: "text-[#E2E8F0]" },
            { rank: 3, medal: "🥉", share: "15%", bg: "bg-[#F59E0B]/[0.07] border-[#F59E0B]/20", text: "text-[#F59E0B]" },
          ].map((p) => (
            <div key={p.rank} className={cn("flex-1 flex items-center gap-3 rounded-xl px-4 py-3 border", p.bg)}>
              <span className="text-2xl leading-none">{p.medal}</span>
              <div>
                <p className="text-[10px] text-white/30 uppercase tracking-wider">Місце {p.rank}</p>
                <p className={cn("text-xl font-display font-black leading-tight", p.text)}>{p.share}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Places 4–10 */}
        <div className="flex gap-1.5 flex-wrap">
          {[
            { rank: 4, share: "8%" },
            { rank: 5, share: "7%" },
            { rank: 6, share: "6%" },
            { rank: 7, share: "5%" },
            { rank: 8, share: "4%" },
            { rank: 9, share: "3%" },
            { rank: 10, share: "2%" },
          ].map((p) => (
            <div key={p.rank} className="flex items-center gap-1.5 bg-white/[0.03] border border-white/[0.06] rounded-lg px-3 py-1.5">
              <span className="text-white/25 text-[10px] font-bold">#{p.rank}</span>
              <span className="text-white/50 text-xs font-bold">{p.share}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Leaderboard Table */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
        {leaderboardData.length > 0 ? (
          <LeaderboardTable
            results={leaderboardData}
            currentUser={account?.address?.toString()}
          />
        ) : (
          <div className="p-14 text-center">
            <div className="text-4xl mb-4">🏆</div>
            <h3 className="text-lg font-display font-black text-white uppercase tracking-tight mb-2">Результатів поки немає</h3>
            <p className="text-white/30 text-sm max-w-xs mx-auto">
              Результати Gameweek {selectedGameweek} ще не опубліковані.
            </p>
          </div>
        )}
      </div>

      <p className="text-center text-white/20 text-xs mt-6">
        Реальні on-chain результати · Gameweek {selectedGameweek} · Movement Testnet
      </p>
    </div>
  );
}
