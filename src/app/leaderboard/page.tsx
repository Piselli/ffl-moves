"use client";

import { useCallback, useEffect, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Link from "next/link";
import { LeaderboardTable } from "@/components/LeaderboardTable";
import {
  client,
  getConfig,
  getGameweek,
  findOpenGameweekFromChain,
  findHighestGameweekIdOnChain,
  findLatestResolvedGameweekId,
  getTeamResult,
  getGameweekTeams,
  moduleFunction,
  type ChainConfig,
  type GameweekSummary,
} from "@/lib/movement";
import { formatMOVE, cn, formatTxError } from "@/lib/utils";
import { TeamResult } from "@/lib/types";

export default function LeaderboardPage() {
  const { account, connected, signTransaction } = useWallet();
  const [config, setConfig] = useState<ChainConfig | null>(null);
  /** Upper bound for tour dropdown; can exceed `config.currentGameweek` if pointer lags. */
  const [pickerMaxGw, setPickerMaxGw] = useState(0);
  const [currentGameweek, setCurrentGameweek] = useState<GameweekSummary | null>(null);
  const [selectedGameweek, setSelectedGameweek] = useState<number>(0);
  const [leaderboardData, setLeaderboardData] = useState<TeamResult[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);

  // Load config & resolve initial gameweek (runs once)
  useEffect(() => {
    async function loadConfig() {
      try {
        const configData = await getConfig();
        setConfig(configData);
        if (!configData) {
          setIsLoading(false);
          return;
        }

        const [openGw, highestId] = await Promise.all([
          findOpenGameweekFromChain(configData),
          findHighestGameweekIdOnChain(configData),
        ]);

        const maxPick = Math.max(Number(configData.currentGameweek) || 0, highestId);
        setPickerMaxGw(maxPick);

        const latestResolved = await findLatestResolvedGameweekId(highestId);

        let initial = 0;
        if (latestResolved > 0) {
          initial = latestResolved;
        } else if (openGw) {
          initial = openGw.id;
        } else if (maxPick > 0) {
          initial = maxPick;
        }

        if (initial > 0) {
          setSelectedGameweek(initial);
        } else {
          setIsLoading(false);
        }
      } catch (error) {
        console.error("Error loading config:", error);
        setIsLoading(false);
      }
    }
    loadConfig();
  }, []);

  // Fetch gameweek data when selection changes (also reused after a successful claim).
  const fetchGameweekData = useCallback(async (gwId: number) => {
    if (gwId === 0) return;
    setIsLoading(true);
    try {
      const gwData = await getGameweek(gwId);
      setCurrentGameweek(gwData);

      if (gwData && gwData.status === "resolved") {
        const addresses = await getGameweekTeams(gwId);
        const results = await Promise.all(
          addresses.map((addr) => getTeamResult(addr, gwId)),
        );
        const validResults = results.filter((r): r is TeamResult => r !== null);
        validResults.sort((a, b) => a.rank - b.rank);
        setLeaderboardData(validResults);
      } else {
        setLeaderboardData([]);
      }
    } catch (error) {
      console.error("Error fetching gameweek data:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedGameweek === 0) return;
    fetchGameweekData(selectedGameweek);
  }, [selectedGameweek, fetchGameweekData]);

  const handleClaimPrize = async (gameweekId: number) => {
    if (!connected || !account?.address) return;
    setIsClaiming(true);
    try {
      // Same path as gameweek registration: build on Movement fullnode, sign raw tx.
      // `signAndSubmitTransaction` always runs wallet-adapter `getAptosConfig` and breaks on Movement ("custom").
      const transaction = await client.transaction.build.simple({
        sender: account.address.toString(),
        data: {
          function: moduleFunction("claim_prize"),
          typeArguments: [],
          functionArguments: [gameweekId.toString()],
        },
      });
      const signResult = await signTransaction({ transactionOrPayload: transaction });
      const pending = await client.transaction.submit.simple({
        transaction,
        senderAuthenticator: signResult.authenticator,
      });
      await client.waitForTransaction({
        transactionHash: pending.hash,
        options: { timeoutSecs: 30, checkSuccess: true },
      });
      alert("Клейм виконано: MOVE надіслано на твій гаманець (перевір баланс у гаманці / в експлорері).");
      // setSelectedGameweek(gameweekId) here is a no-op (same value) — React skips state updates,
      // so the leaderboard would never reflect `claimed: true` until the user changes the dropdown.
      // Re-run the fetch directly instead.
      await fetchGameweekData(gameweekId);
    } catch (error: unknown) {
      alert(`Не вдалося заклеймити: ${formatTxError(error)}`);
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
          <div className="w-8 h-8 border-2 border-[#00C46A]/60 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-white/40 text-sm">Завантаження даних...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto px-4 pt-28 pb-12">
      {/* Header */}
      <div className="flex items-end justify-between mb-8 flex-wrap gap-3">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00C46A]/60">Сезон 2024/25</span>
          <h1 className="text-4xl font-display font-black text-white uppercase tracking-tight mt-1">Лідерборд</h1>
        </div>

        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-4 py-2 rounded-2xl mb-1">
          <span className="text-white/40 text-xs font-bold uppercase tracking-widest">Тур</span>
          <select
            value={selectedGameweek}
            onChange={(e) => setSelectedGameweek(Number(e.target.value))}
            className="bg-transparent text-white text-sm font-bold focus:outline-none cursor-pointer"
          >
            {Array.from(
              { length: Math.max(1, pickerMaxGw || Number(config?.currentGameweek) || 1) },
              (_, i) => i + 1,
            ).map((gw) => (
              <option key={gw} value={gw} className="bg-[#0D0F12]">
                {gw}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Gameweek Summary — compact single row */}
      {currentGameweek ? (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-6 py-4 mb-8 flex items-center gap-6 flex-wrap">

          {/* Status */}
          <div className="flex items-center gap-2.5">
            <span className={cn(
              "w-2 h-2 rounded-full shrink-0",
              currentGameweek.status === "open" && "bg-emerald-400 animate-pulse shadow-[0_0_6px_#34d399]",
              currentGameweek.status === "closed" && "bg-amber-400",
              currentGameweek.status === "resolved" && "bg-[#00C46A]"
            )} />
            <span className={cn(
              "text-sm font-bold uppercase tracking-wide",
              currentGameweek.status === "open" && "text-emerald-400",
              currentGameweek.status === "closed" && "text-amber-400",
              currentGameweek.status === "resolved" && "text-[#00C46A]"
            )}>
              {currentGameweek.status === "open" ? "Відкрито" : currentGameweek.status === "closed" ? "Закрито" : "Завершено"}
            </span>
          </div>

          <div className="w-px h-5 bg-white/[0.08]" />

          {/* Prize Pool */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Фонд</span>
            <span className="text-xl font-display font-black bg-gradient-to-r from-emerald-400 to-[#00C46A] bg-clip-text text-transparent tabular-nums">
              {formatMOVE(currentGameweek.prizePool)}
            </span>
            <span className="text-white/30 text-xs">MOVE</span>
          </div>

          <div className="w-px h-5 bg-white/[0.08]" />

          {/* Entries */}
          <div className="flex items-baseline gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/30">Учасників</span>
            <span className="text-xl font-display font-black text-white tabular-nums">
              {currentGameweek.totalEntries}
            </span>
          </div>

          {/* Distribution tooltip — pushed to the right */}
          <div className="ml-auto relative group/dist">
            <span className="text-[10px] font-bold uppercase tracking-widest text-white/25 hover:text-white/50 cursor-default transition-colors underline decoration-dotted underline-offset-2 whitespace-nowrap">
              Розподіл призів
            </span>
            <div className="absolute top-full right-0 mt-2 hidden group-hover/dist:block z-50 w-44 pointer-events-none">
              <div className="bg-[#1a1d26] border border-white/10 rounded-xl p-3 shadow-2xl">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30 mb-2">Топ-10 отримують</p>
                <div className="space-y-1">
                  {[
                    { rank: "1",  icon: "🥇", share: "30%", color: "text-[#FFD700]" },
                    { rank: "2",  icon: "🥈", share: "20%", color: "text-white/60" },
                    { rank: "3",  icon: "🥉", share: "15%", color: "text-[#F59E0B]" },
                    { rank: "4",  icon: null,  share: "8%",  color: "text-white/40" },
                    { rank: "5",  icon: null,  share: "7%",  color: "text-white/40" },
                    { rank: "6",  icon: null,  share: "6%",  color: "text-white/35" },
                    { rank: "7",  icon: null,  share: "5%",  color: "text-white/35" },
                    { rank: "8",  icon: null,  share: "4%",  color: "text-white/30" },
                    { rank: "9",  icon: null,  share: "3%",  color: "text-white/30" },
                    { rank: "10", icon: null,  share: "2%",  color: "text-white/25" },
                  ].map((p) => (
                    <div key={p.rank} className="flex items-center justify-between">
                      <span className="text-white/30 text-[11px]">{p.icon ?? `#${p.rank}`}</span>
                      <span className={cn("text-xs font-bold tabular-nums", p.color)}>{p.share}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 text-center mb-8">
          <p className="text-white/30 text-sm">Немає даних для GW {selectedGameweek}</p>
        </div>
      )}

      {/* User's Result Highlight */}
      {userResult && (
        <div className="bg-[#00C46A]/[0.04] border border-[#00C46A]/20 shadow-[0_0_40px_rgba(0,196,106,0.06)] rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-[#00C46A]/15 border border-[#00C46A]/25 flex items-center justify-center">
                <svg className="w-4 h-4 text-[#00C46A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <h2 className="text-sm font-display font-black text-white uppercase tracking-wide">Мій результат · Тур {selectedGameweek}</h2>
            </div>
            <div className="flex items-center gap-2">
              {userResult.rank > 0 && userResult.rank <= 10 && (
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 rounded-full">
                  У призах 🎉
                </span>
              )}
              <Link
                href="/my-result"
                className="text-[10px] font-bold uppercase tracking-wider text-[#00C46A]/70 hover:text-[#00C46A] border border-[#00C46A]/20 hover:border-[#00C46A]/40 px-3 py-1 rounded-full transition-colors"
              >
                Детальніше →
              </Link>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-3">
            {[
              {
                label: "Місце",
                value: userResult.rank > 0 ? `#${userResult.rank}` : "—",
                className:
                  userResult.rank === 1
                    ? "text-[#FFD700]"
                    : userResult.rank === 2
                      ? "text-[#E2E8F0]"
                      : userResult.rank === 3
                        ? "text-[#F59E0B]"
                        : "text-white",
              },
              {
                label: "Очки",
                value: String(userResult.finalPoints),
                className: "text-white",
              },
              {
                label: "Приз (MOVE)",
                value: userResult.prizeAmount > 0 ? formatMOVE(userResult.prizeAmount) : "—",
                className: "text-emerald-400",
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
                  className="w-full py-3 rounded-xl font-display font-black text-sm uppercase tracking-wide bg-gradient-to-r from-emerald-500 to-[#00C46A] text-black hover:brightness-110 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
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


      {/* Leaderboard Table */}
      <div className="bg-white/[0.03] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
        {leaderboardData.length > 0 ? (
          <LeaderboardTable
            results={leaderboardData}
            currentUser={account?.address?.toString()}
          />
        ) : (
          <div className="py-10 text-center">
            <div className="text-3xl mb-3">🏆</div>
            <h3 className="text-base font-display font-black text-white uppercase tracking-tight mb-1">Результатів поки немає</h3>
            {currentGameweek?.status === "closed" ? (
              <p className="text-white/40 text-xs max-w-md mx-auto mb-4 leading-relaxed">
                Тур {selectedGameweek} на ланцюгу в статусі «Закрито»: склади зафіксовано, статистику можна вже відправити в контракт.
                Таблиця лідерборду з’явиться після останнього кроку в адмінці — кнопка{" "}
                <span className="text-amber-400/90 font-semibold">Calculate &amp; Publish</span>{" "}
                (транзакція обчислення та публікації). До цього on-chain статус туру не «Завершено».
              </p>
            ) : (
              <p className="text-white/30 text-xs mb-4">
                Результати Туру {selectedGameweek} ще не опубліковані.
              </p>
            )}
            <a
              href="/gameweek"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00C46A]/10 border border-[#00C46A]/20 text-[#00C46A] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#00C46A]/20 hover:border-[#00C46A]/30 transition-all"
            >
              Зареєструй свій склад
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </a>
          </div>
        )}
      </div>

      <p className="text-center text-white/20 text-xs mt-6">
        Реальні on-chain результати · Тур {selectedGameweek} · Movement
      </p>
    </div>
  );
}
