"use client";

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { client, moduleFunction, getConfig, getGameweek, findOpenGameweekFromChain, type ChainConfig, type GameweekSummary } from "@/lib/movement";
import { cn, formatTxError, toU64Stat, getErrorMessage } from "@/lib/utils";
import { fetchGameweekStats, fetchGameweekStatsFPL, checkApiStatus, type GameweekStatsResult } from "@/lib/football-api";
import { useSiteMessages } from "@/i18n/LocaleProvider";

function normAddr(a: string | undefined | null): string {
  return (a ?? "").toLowerCase();
}

export default function AdminPage() {
  const { connected, account, signAndSubmitTransaction, signTransaction } = useWallet();
  const ad = useSiteMessages().pages.admin;

  const [config, setConfig] = useState<ChainConfig | null>(null);
  /** `get_gameweek(config.current_gameweek)` — покажчик у конфігу (може відставати). */
  const [currentGameweek, setCurrentGameweek] = useState<GameweekSummary | null>(null);
  /** Фактичний OPEN-тур на ланцюгу (скан) — саме його треба закривати для зупинки реєстрації. */
  const [openGameweek, setOpenGameweek] = useState<GameweekSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newGameweekId, setNewGameweekId] = useState("");
  /** Which GW to re-open (can differ from `config.current_gameweek`, e.g. reopen 34 while pointer is 33). */
  const [reopenTargetId, setReopenTargetId] = useState("");
  const [statsJson, setStatsJson] = useState("");
  const [resultsGameweekId, setResultsGameweekId] = useState("");
  const [newPrizePoolPct, setNewPrizePoolPct] = useState("");

  // API states
  const [dataSource, setDataSource] = useState<"fpl" | "api-sports">("fpl");
  const [apiKey, setApiKey] = useState("");
  const [fetchGameweek, setFetchGameweek] = useState("");
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ used: number; limit: number; remaining: number } | null>(null);
  const [apiWarning, setApiWarning] = useState("");
  const [fetchedFixtures, setFetchedFixtures] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState("");

  const loadChainConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      const configData = await getConfig();
      setConfig(configData);
      setCurrentGameweek(null);
      setOpenGameweek(null);
      if (configData) {
        const [pointerGw, openGw] = await Promise.all([
          configData.currentGameweek
            ? getGameweek(configData.currentGameweek).catch(() => null)
            : Promise.resolve(null),
          findOpenGameweekFromChain(configData),
        ]);
        setCurrentGameweek(pointerGw);
        setOpenGameweek(openGw);
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChainConfig();
    try {
      const savedApiKey = localStorage.getItem("fantasy_epl_api_key");
      if (savedApiKey) setApiKey(savedApiKey);
    } catch {
      /* private mode etc. */
    }
  }, [loadChainConfig]);

  // Save API key to localStorage when it changes
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("fantasy_epl_api_key", apiKey);
    }
  }, [apiKey]);

  useEffect(() => {
    if (currentGameweek?.id != null) {
      setReopenTargetId(String(currentGameweek.id));
    }
  }, [currentGameweek?.id]);

  const handleCheckApiStatus = async () => {
    if (!apiKey) return;
    const status = await checkApiStatus(apiKey);
    if (status.valid) {
      setApiStatus({
        used: status.requestsUsed,
        limit: status.requestsLimit,
        remaining: status.requestsRemaining,
      });
      setApiWarning(status.warning || "");
    } else {
      setFetchError(status.error || "Invalid API key");
      setApiWarning("");
    }
  };

  const handleFetchFromApi = async () => {
    if (!fetchGameweek) return;
    if (dataSource === "api-sports" && !apiKey) return;

    setIsFetchingApi(true);
    setFetchError("");
    setFetchedFixtures([]);

    try {
      const result: GameweekStatsResult =
        dataSource === "fpl"
          ? await fetchGameweekStatsFPL(parseInt(fetchGameweek))
          : await fetchGameweekStats(apiKey, parseInt(fetchGameweek));

      if (result.errors.length > 0) {
        setFetchError(result.errors.join("; "));
      }

      if (result.players.length > 0) {
        const formattedStats = {
          gameweekId: result.gameweekId,
          players: result.players,
        };
        setStatsJson(JSON.stringify(formattedStats, null, 2));
        setFetchedFixtures(result.fixtures);
      }

      if (dataSource === "api-sports") {
        await handleCheckApiStatus();
      }
    } catch (error: unknown) {
      setFetchError(getErrorMessage(error, "Failed to fetch stats"));
    } finally {
      setIsFetchingApi(false);
    }
  };

  const walletAddr = normAddr(account?.address?.toString());
  const isAdmin = Boolean(
    walletAddr && config?.admins?.some((a) => normAddr(a) === walletAddr)
  );
  const isOracle = Boolean(
    walletAddr && config?.oracle && normAddr(config.oracle) === walletAddr
  );

  const handleCreateGameweek = async () => {
    if (!connected || !newGameweekId) return;

    const idNum = Number.parseInt(newGameweekId, 10);
    if (!Number.isFinite(idNum) || idNum < 1) {
      alert(ad.alertInvalidGw);
      return;
    }

    const existing = await getGameweek(idNum);
    if (existing) {
      const st =
        existing.status === "open"
          ? ad.statusWordOpen
          : existing.status === "closed"
            ? ad.statusWordClosed
            : ad.statusWordResolved;
      alert(ad.alertGwExists(idNum, st));
      return;
    }

    setIsSubmitting(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("create_gameweek"),
          typeArguments: [],
          functionArguments: [String(idNum)],
        },
      });
      alert(ad.alertGwCreated(idNum));
      setNewGameweekId("");
      const gwData = await getGameweek(idNum);
      setCurrentGameweek(gwData);
      await loadChainConfig();
    } catch (error: unknown) {
      console.error("Failed to create gameweek:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseGameweek = async () => {
    if (!connected) return;
    const toClose = openGameweek?.status === "open" ? openGameweek : null;
    if (!toClose) {
      alert(ad.alertNoOpenToClose);
      return;
    }

    setIsSubmitting(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("close_gameweek"),
          typeArguments: [],
          functionArguments: [String(toClose.id)],
        },
      });
      alert(ad.alertGwClosed(toClose.id));
      await loadChainConfig();
    } catch (error: unknown) {
      console.error("Failed to close gameweek:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenGameweek = async () => {
    if (!connected) return;

    const idNum = Number.parseInt((reopenTargetId || "").trim(), 10);
    if (!Number.isFinite(idNum) || idNum < 1) {
      alert(ad.alertReopenInvalidGw);
      return;
    }

    const gw = await getGameweek(idNum);
    if (!gw) {
      alert(ad.alertGwNotFound(idNum));
      return;
    }
    if (gw.status === "open") {
      alert(ad.alertGwAlreadyOpen(idNum));
      return;
    }

    if (!confirm(ad.alertReopenConfirm(idNum))) {
      return;
    }

    setIsSubmitting(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("reopen_gameweek"),
          typeArguments: [],
          functionArguments: [String(idNum)],
        },
      });
      alert(ad.alertReopenDone(idNum));
      await loadChainConfig();
      const cfg = await getConfig();
      if (cfg?.currentGameweek != null) {
        const fresh = await getGameweek(cfg.currentGameweek);
        setCurrentGameweek(fresh);
      }
    } catch (error: unknown) {
      console.error("Failed to reopen gameweek:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdatePrizePool = async () => {
    if (!connected || !newPrizePoolPct) return;
    
    setIsSubmitting(true);
    try {
      await signAndSubmitTransaction({
        data: {
          function: moduleFunction("set_prize_pool_percent"),
          typeArguments: [],
          functionArguments: [newPrizePoolPct.toString()],
        },
      });
      alert(ad.alertPrizePoolUpdated);
      const configData = await getConfig();
      setConfig(configData);
      setNewPrizePoolPct("");
    } catch (error: unknown) {
      console.error("Failed to update percentage:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSubmitStats = async () => {
    if (!connected || !account || !statsJson) return;

    setIsSubmitting(true);
    try {
      // Parse JSON input
      const stats = JSON.parse(statsJson) as { gameweekId: number | string; players: Record<string, unknown>[] };

      // Validate structure
      if (!stats.gameweekId || !Array.isArray(stats.players)) {
        throw new Error("Invalid stats format. Need { gameweekId, players: [...] }");
      }

      const n = stats.players.length;
      if (n === 0) throw new Error("No players in JSON");

      // Numeric vectors + bools — u64 on chain; APIs may send negatives (e.g. FPL bps).
      const playerIds = stats.players.map((p) => {
        const id = toU64Stat(p.playerId);
        if (id < 1) throw new Error(`Invalid playerId: ${String(p.playerId)}`);
        return id;
      });
      const positions = stats.players.map((p) => {
        const pos = toU64Stat(p.position);
        if (pos > 3) throw new Error(`Invalid position (0–3): ${String(p.position)}`);
        return pos;
      });
      const minutesPlayed = stats.players.map((p) => toU64Stat(p.minutesPlayed));
      const goals = stats.players.map((p) => toU64Stat(p.goals));
      const assists = stats.players.map((p) => toU64Stat(p.assists));
      const cleanSheets = stats.players.map((p) => Boolean(p.cleanSheet));
      const saves = stats.players.map((p) => toU64Stat(p.saves));
      const penaltiesSaved = stats.players.map((p) => toU64Stat(p.penaltiesSaved));
      const penaltiesMissed = stats.players.map((p) => toU64Stat(p.penaltiesMissed));
      const ownGoals = stats.players.map((p) => toU64Stat(p.ownGoals));
      const yellowCards = stats.players.map((p) => toU64Stat(p.yellowCards));
      const redCards = stats.players.map((p) => toU64Stat(p.redCards));
      const ratings = stats.players.map((p) => toU64Stat(p.rating));
      const tackles = stats.players.map((p) => toU64Stat(p.tackles));
      const interceptions = stats.players.map((p) => toU64Stat(p.interceptions));
      const successfulDribbles = stats.players.map((p) => toU64Stat(p.successfulDribbles));
      const freeKickGoals = stats.players.map((p) => toU64Stat(p.freeKickGoals));
      const goalsConceded = stats.players.map((p) =>
        toU64Stat(p.goalsConceded ?? p.goals_conceded),
      );
      const fplBonus = stats.players.map((p) => {
        const b = Number(p.bonus ?? p.fpl_bonus ?? 0);
        return Math.max(0, Math.min(3, Number.isFinite(b) ? Math.floor(b) : 0));
      });
      const fplCleanSheet = stats.players.map((p) => {
        const v = p.fplCleanSheets ?? p.fpl_clean_sheets ?? p.fplCleanSheet;
        return Boolean(v === true || v === 1 || v === "1");
      });

      const transaction = await client.transaction.build.simple({
        sender: account.address.toString(),
        data: {
          function: moduleFunction("submit_player_stats"),
          typeArguments: [],
          functionArguments: [
            Number(stats.gameweekId),
            playerIds,
            positions,
            minutesPlayed,
            goals,
            assists,
            cleanSheets,
            saves,
            penaltiesSaved,
            penaltiesMissed,
            ownGoals,
            yellowCards,
            redCards,
            ratings,
            tackles,
            interceptions,
            successfulDribbles,
            freeKickGoals,
            goalsConceded,
            fplBonus,
            fplCleanSheet,
          ],
        },
      });

      const signResult = await signTransaction({ transactionOrPayload: transaction });
      const pending = await client.transaction.submit.simple({
        transaction,
        senderAuthenticator: signResult.authenticator,
      });
      await client.waitForTransaction({
        transactionHash: pending.hash,
        options: { timeoutSecs: 90, checkSuccess: true },
      });
      alert(ad.alertStatsSubmitted);
    } catch (error: unknown) {
      console.error("Failed to submit stats:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalculateResults = async () => {
    if (!connected || !account || !resultsGameweekId) return;

    setIsSubmitting(true);
    try {
      const gw = Number(resultsGameweekId);
      const transaction = await client.transaction.build.simple({
        sender: account.address.toString(),
        data: {
          function: moduleFunction("calculate_results"),
          typeArguments: [],
          functionArguments: [
            gw,
            [],
            [],
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
            [30, 20, 15, 8, 7, 6, 5, 4, 3, 2],
          ],
        },
      });

      const signResult = await signTransaction({ transactionOrPayload: transaction });
      const pending = await client.transaction.submit.simple({
        transaction,
        senderAuthenticator: signResult.authenticator,
      });
      await client.waitForTransaction({
        transactionHash: pending.hash,
        options: { timeoutSecs: 90, checkSuccess: true },
      });
      alert(ad.alertResultsCalculated(String(resultsGameweekId)));
    } catch (error: unknown) {
      console.error("Failed to calculate results:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Admin Panel</h1>
          <p className="text-muted-foreground">Please connect your wallet to access admin functions.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!config) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <h1 className="text-2xl font-bold text-white mb-3">{ad.loadFailedTitle}</h1>
          <p className="text-muted-foreground mb-6 max-w-md mx-auto">{ad.loadFailedBody}</p>
          <button
            type="button"
            onClick={() => void loadChainConfig()}
            className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-sm hover:bg-emerald-500/30 transition-colors"
          >
            {ad.retry}
          </button>
        </div>
      </div>
    );
  }

  if (!isAdmin && !isOracle) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-12 text-center">
        <div className="glass-card rounded-2xl p-12">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You are not authorized to access admin functions.
          </p>
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Admins: {config?.admins?.length || 0} address(es)</p>
            <p>Oracle: {config?.oracle?.slice(0, 10)}...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 pt-28 pb-12">
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">
          Manage gameweeks and submit match results
        </p>
        <div className="mt-3 flex gap-3">
          {isAdmin && (
            <span className="inline-flex items-center gap-2 text-sm bg-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-lg border border-emerald-500/30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              Admin
            </span>
          )}
          {isOracle && (
            <span className="inline-flex items-center gap-2 text-sm bg-blue-500/20 text-blue-400 px-3 py-1.5 rounded-lg border border-blue-500/30">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              Oracle
            </span>
          )}
        </div>
      </div>

      <div className="glass-card rounded-2xl p-6 mb-8">
        <h2 className="text-xl font-bold text-white mb-4">Current Status</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="stat-card px-4 py-3 rounded-xl col-span-2 lg:col-span-1">
            <p className="text-muted-foreground text-sm mb-1">{ad.statConfigGw}</p>
            <p className="text-3xl font-bold text-white">
              {currentGameweek?.id ?? "—"}
            </p>
          </div>
          <div className="stat-card px-4 py-3 rounded-xl col-span-2 lg:col-span-1">
            <p className="text-muted-foreground text-sm mb-1">{ad.statSameGwStatus}</p>
            <div className={cn(
              "inline-flex items-center gap-2 text-2xl font-bold items-center mt-1",
              currentGameweek?.status === "open" && "text-emerald-400",
              currentGameweek?.status === "closed" && "text-amber-400",
              currentGameweek?.status === "resolved" && "text-blue-400"
            )}>
              <span className={cn(
                "w-2 h-2 rounded-full",
                currentGameweek?.status === "open" && "bg-emerald-400 animate-pulse",
                currentGameweek?.status === "closed" && "bg-amber-400",
                currentGameweek?.status === "resolved" && "bg-blue-400"
              )} />
              {currentGameweek?.status?.toUpperCase() || "N/A"}
            </div>
          </div>
          <div className="stat-card px-4 py-3 rounded-xl col-span-2 lg:col-span-2 border border-emerald-500/20 bg-emerald-500/[0.06]">
            <p className="text-muted-foreground text-sm mb-1">{ad.statOpenRegistration}</p>
            <p className="text-3xl font-bold text-emerald-300 tabular-nums">
              {openGameweek?.status === "open" ? (
                <>GW {openGameweek.id} · OPEN</>
              ) : (
                <span className="text-white/40 text-xl font-semibold">{ad.noOpenGw}</span>
              )}
            </p>
          </div>
          <div className="stat-card px-4 py-3 rounded-xl col-span-2 lg:col-span-2">
            <p className="text-muted-foreground text-sm mb-1">Prize Pool Percentage</p>
            <p className="text-3xl font-bold text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.3)]">
              {config?.prizePoolPercent || "0"}%
            </p>
          </div>
        </div>

        {isAdmin &&
          openGameweek?.status === "open" &&
          currentGameweek &&
          openGameweek.id !== currentGameweek.id && (
            <div className="mt-5 rounded-xl border border-amber-500/35 bg-amber-500/10 px-4 py-3 text-sm text-amber-50/95 leading-relaxed">
              <strong className="text-amber-100">{ad.desyncTitle}</strong>{" "}
              {ad.desyncBody(currentGameweek.id, openGameweek.id)}
            </div>
          )}

        {isAdmin && currentGameweek?.status === "resolved" && openGameweek?.status !== "open" && (
          <div className="mt-5 rounded-xl border border-sky-500/30 bg-sky-500/10 px-4 py-3 text-sm text-sky-50/95 leading-relaxed">
            <strong className="text-sky-100">{ad.manageResolvedTitle}</strong> {ad.manageResolvedBody}
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Close / Re-open — Close прив’язаний до фактичного OPEN на ланцюгу, не лише до покажчика config. */}
        {isAdmin && (openGameweek || currentGameweek) && (
          <div className="glass-card rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {openGameweek?.status === "open" ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  )}
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {openGameweek?.status === "open" ? ad.sectionTitleWhenOpen : ad.sectionTitleWhenClosed}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {openGameweek?.status === "open"
                    ? ad.sectionCloseSubtitleOpen(openGameweek.id)
                    : ad.sectionCloseSubtitleConfig(
                        String(currentGameweek?.id ?? "—"),
                        currentGameweek?.status?.toUpperCase() ?? "—",
                      )}
                </p>
              </div>
            </div>

            {openGameweek?.status === "open" && (
              <>
                <p className="text-muted-foreground mb-4">{ad.closeExplain(openGameweek.id)}</p>
                <button
                  type="button"
                  onClick={handleCloseGameweek}
                  disabled={isSubmitting}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50",
                    "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400",
                  )}
                >
                  {isSubmitting ? "..." : ad.closeGwButtonLabel(openGameweek.id)}
                </button>
              </>
            )}

            {openGameweek?.status !== "open" && (
              <>
                {currentGameweek?.status === "resolved" && (
                  <div className="mb-4 rounded-xl border border-sky-500/25 bg-sky-500/10 px-4 py-3 text-sm text-sky-100/95 leading-relaxed">
                    <strong className="text-sky-200">{ad.whyNoCloseTitle}</strong> {ad.whyNoCloseBody}
                  </div>
                )}

                {currentGameweek?.status === "closed" && (
                  <div className="mb-4 rounded-xl border border-amber-500/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100/90">
                    {ad.noOpenVisibleHint}
                  </div>
                )}

                <p className="text-muted-foreground mb-4">
                  {ad.reopenExplain(String(currentGameweek?.id ?? "—"))}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 mb-4">
                  <label className="flex flex-col gap-1 flex-1">
                    <span className="text-xs text-muted-foreground">{ad.reopenGwLabel}</span>
                    <input
                      type="number"
                      min={1}
                      value={reopenTargetId}
                      onChange={(e) => setReopenTargetId(e.target.value)}
                      className="px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-rose-500 border border-border"
                    />
                  </label>
                </div>
                <button
                  type="button"
                  onClick={handleReopenGameweek}
                  disabled={isSubmitting}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50",
                    "bg-gradient-to-r from-rose-500 to-pink-600 text-white shadow-rose-500/25 hover:from-rose-400 hover:to-pink-500",
                  )}
                >
                  {isSubmitting ? "..." : "Re-open Gameweek"}
                </button>
              </>
            )}
          </div>
        )}

        {/* Create Gameweek (Admin) */}
        {isAdmin && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Create Gameweek</h2>
            </div>
            <div className="flex gap-4">
              <input
                type="number"
                placeholder="Gameweek ID (e.g., 2)"
                value={newGameweekId}
                onChange={(e) => setNewGameweekId(e.target.value)}
                className="flex-1 px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-border"
              />
              <button
                onClick={handleCreateGameweek}
                disabled={isSubmitting || !newGameweekId}
                className="btn-primary px-6 py-3 rounded-xl font-medium disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Create"}
              </button>
            </div>
          </div>
        )}

        {/* Adjust Prize Pool (Admin) */}
        {isAdmin && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">Adjust Prize Pool (%)</h2>
                <p className="text-sm text-muted-foreground mt-1">Change what percentage of entry fees goes to the prize pool vs platform.</p>
              </div>
            </div>
            <div className="flex gap-4 mt-4">
              <input
                type="number"
                placeholder="New Percentage (e.g., 80)"
                value={newPrizePoolPct}
                onChange={(e) => setNewPrizePoolPct(e.target.value)}
                className="flex-1 px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 border border-border"
              />
              <button
                onClick={handleUpdatePrizePool}
                disabled={isSubmitting || !newPrizePoolPct}
                className="px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white rounded-xl font-medium hover:from-indigo-400 hover:to-purple-500 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Update %"}
              </button>
            </div>
          </div>
        )}

        {/* Fetch Stats from API (Oracle) */}
        {isOracle && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Fetch Stats</h2>
            </div>

            {/* Data Source Toggle */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setDataSource("fpl")}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                  dataSource === "fpl"
                    ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-lg shadow-emerald-500/10"
                    : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                )}
              >
                <span className="block font-bold">FPL Official</span>
                <span className="block text-[10px] mt-0.5 opacity-70">Free &middot; No key &middot; 2025/26</span>
              </button>
              <button
                onClick={() => setDataSource("api-sports")}
                className={cn(
                  "flex-1 px-4 py-2.5 rounded-xl text-sm font-medium border transition-all",
                  dataSource === "api-sports"
                    ? "bg-cyan-500/20 text-cyan-400 border-cyan-500/30 shadow-lg shadow-cyan-500/10"
                    : "bg-secondary/30 text-muted-foreground border-border hover:bg-secondary/50"
                )}
              >
                <span className="block font-bold">API-Sports</span>
                <span className="block text-[10px] mt-0.5 opacity-70">100 req/day &middot; Needs key</span>
              </button>
            </div>

            {dataSource === "fpl" && (
              <p className="text-muted-foreground text-sm mb-4">
                Uses the official Fantasy Premier League Live API. Always current season, unlimited requests, no API key needed.
                <br />
                <span className="text-xs text-muted-foreground/60">
                  Provides: goals, assists, saves, clean sheets, cards, penalties, own goals, BPS. Does not include tackles/interceptions/dribbles.
                </span>
              </p>
            )}

            {dataSource === "api-sports" && (
              <p className="text-muted-foreground text-sm mb-4">
                Fetch from API-Sports (100 req/day free). Get your key from{" "}
                <a href="https://www.api-football.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                  api-football.com
                </a>
              </p>
            )}

            <div className="space-y-4">
              {/* API Key Input — only for API-Sports */}
              {dataSource === "api-sports" && (
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">API Key</label>
                  <div className="flex gap-3">
                    <input
                      type="password"
                      placeholder="Enter your API-Sports key"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      className="flex-1 px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-border font-mono text-sm"
                    />
                    <button
                      onClick={handleCheckApiStatus}
                      disabled={!apiKey}
                      className="px-4 py-3 bg-cyan-500/20 text-cyan-400 rounded-xl hover:bg-cyan-500/30 transition-colors disabled:opacity-50 border border-cyan-500/30"
                    >
                      Check
                    </button>
                  </div>
                  {apiStatus && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        API Requests: {apiStatus.used} / {apiStatus.limit} today ({apiStatus.remaining} remaining)
                      </p>
                      {apiWarning && (
                        <p className="text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded border border-amber-500/30">
                          {apiWarning}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Gameweek Input */}
              <div>
                <label className="block text-sm text-muted-foreground mb-2">Gameweek to Fetch</label>
                <div className="flex gap-3">
                  <input
                    type="number"
                    placeholder="e.g., 23"
                    value={fetchGameweek}
                    onChange={(e) => setFetchGameweek(e.target.value)}
                    className="w-32 px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-border"
                  />
                  <button
                    onClick={handleFetchFromApi}
                    disabled={(dataSource === "api-sports" && !apiKey) || !fetchGameweek || isFetchingApi}
                    className={cn(
                      "px-6 py-3 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50",
                      dataSource === "fpl"
                        ? "bg-gradient-to-r from-emerald-500 to-green-500 hover:from-emerald-400 hover:to-green-400 shadow-emerald-500/25"
                        : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-cyan-500/25"
                    )}
                  >
                    {isFetchingApi ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Fetching...
                      </span>
                    ) : (
                      dataSource === "fpl" ? "Fetch from FPL" : "Fetch from API-Sports"
                    )}
                  </button>
                </div>
              </div>

              {/* Error Display */}
              {fetchError && (
                <div className="p-3 bg-rose-500/20 text-rose-400 rounded-xl text-sm border border-rose-500/30">
                  {fetchError}
                </div>
              )}

              {/* Fetched Fixtures */}
              {fetchedFixtures.length > 0 && (
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <p className="text-sm text-emerald-400 font-medium mb-2">
                    Fetched {fetchedFixtures.length} fixtures:
                  </p>
                  {fetchedFixtures.length > 10 && (
                    <p className="text-xs text-amber-400/90 mb-2 leading-relaxed">
                      Official FPL often tags more than 10 matches to one gameweek (blanks, rearranged fixtures). All
                      listed here have <code className="text-amber-300/90">event</code> = this GW in the API. Submit
                      Stats is driven by per-player live minutes/points, not by how many rows you see above.
                    </p>
                  )}
                  <div className="text-xs text-muted-foreground space-y-1">
                    {fetchedFixtures.map((f, i) => (
                      <p key={i}>{f}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Submit Stats (Oracle) */}
        {isOracle && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Submit Player Stats</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              {statsJson ? "Stats fetched from API - review and submit:" : "Paste JSON with player stats for the gameweek. Format:"}
            </p>
            <pre className="text-xs bg-secondary/50 p-4 rounded-xl mb-4 overflow-x-auto text-muted-foreground border border-border">
{`{
  "gameweekId": 1,
  "players": [
    {
      "playerId": 70,
      "position": 3,
      "minutesPlayed": 90,
      "goals": 2,
      "assists": 1,
      "cleanSheet": false,
      "saves": 0,
      "penaltiesSaved": 0,
      "penaltiesMissed": 0,
      "ownGoals": 0,
      "yellowCards": 0,
      "redCards": 0,
      "rating": 95,
      "tackles": 1,
      "interceptions": 0,
      "successfulDribbles": 3,
      "freeKickGoals": 0,
      "goalsConceded": 0,
      "bonus": 0,
      "fplCleanSheets": 0
    }
  ]
}`}
            </pre>
            <textarea
              placeholder="Paste JSON here..."
              value={statsJson}
              onChange={(e) => setStatsJson(e.target.value)}
              rows={10}
              className="w-full px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary font-mono text-sm border border-border"
            />
            <button
              onClick={handleSubmitStats}
              disabled={isSubmitting || !statsJson}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-400 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
            >
              {isSubmitting ? "Submitting..." : "Submit Stats"}
            </button>
          </div>
        )}

        {/* Calculate Results (Oracle) */}
        {isOracle && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                </svg>
              </div>
              <h2 className="text-xl font-bold text-white">Calculate Results</h2>
            </div>
            <p className="text-muted-foreground text-sm mb-4">
              Calculate final scores and distribute prizes. Gameweek must be closed with stats submitted.
            </p>
            <div className="flex gap-4">
              <input
                type="number"
                placeholder="Gameweek ID"
                value={resultsGameweekId}
                onChange={(e) => setResultsGameweekId(e.target.value)}
                className="w-32 px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-primary border border-border"
              />
              <button
                onClick={handleCalculateResults}
                disabled={isSubmitting || !resultsGameweekId}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-violet-600 text-white rounded-xl font-medium hover:from-purple-400 hover:to-violet-500 transition-all shadow-lg shadow-purple-500/25 disabled:opacity-50"
              >
                {isSubmitting ? "..." : "Calculate & Publish"}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
