"use client";

import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useWallet } from "@/hooks/useSolanaWallet";
import {
  getConfig,
  getGameweek,
  getStatsCommit,
  getGameweekEntrants,
  getUserTeam,
  getVerifiedGameweekStats,
  getPublishedGameweekStats,
  findOpenGameweek,
  NO_CAPTAIN_INDEX,
  type ChainConfig,
  type GameweekSummary,
} from "@/lib/chainClient";
import {
  buildCloseGameweek,
  buildCommitStats,
  buildCreateGameweek,
  buildPublishResults,
  buildReopenGameweek,
  buildSetFees,
  buildSetPrizePoolBps,
  buildSponsorPrizePool,
  buildWithdrawTreasury,
} from "@/lib/chainClient";
import { previewTourPointsFromRegisteredTeam } from "@/lib/chainAlignedScoring";
import { calculateFantasyPoints, ratingTierAdjustment } from "@/lib/scoring";
import { allocatePrizes } from "@/lib/prize-distribution";
import {
  SELF_HOSTED_RESULTS_PATH,
  SELF_HOSTED_STATS_PATH,
  SOLANA_CLUSTER,
  STATS_PUBLISH_BASE_URL,
} from "@/lib/constants";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import { displayAmountToRaw } from "@/lib/entryFee";
import { cn, formatTxError, toU64Stat, getErrorMessage } from "@/lib/utils";
import { fetchGameweekStats, checkApiStatus, type GameweekStatsResult } from "@/lib/football-api";
import { formatAuditReport, type StatsAuditReport } from "@/lib/statsAudit";
import { SitePageShell } from "@/components/SitePageShell";
import { useSiteMessages } from "@/i18n/LocaleProvider";

function normAddr(a: string | undefined | null): string {
  return (a ?? "").toLowerCase();
}

function reviveConfig(raw: Record<string, unknown>): ChainConfig {
  return {
    ...(raw as unknown as ChainConfig),
    entryFee: BigInt(String(raw.entryFee)),
    totalPrizeObligation: BigInt(String(raw.totalPrizeObligation)),
  };
}

function reviveGameweek(raw: Record<string, unknown> | null): GameweekSummary | null {
  if (!raw) return null;
  return {
    ...(raw as unknown as GameweekSummary),
    prizePool: BigInt(String(raw.prizePool)),
    prizeAllocated: BigInt(String(raw.prizeAllocated)),
    prizeClaimed: BigInt(String(raw.prizeClaimed)),
  };
}

/** Accepts a base58 Solana address; returns null when it is not a valid pubkey. */
function normalizeSolanaAddress(raw: string): string | null {
  const trimmed = raw.trim();
  if (!/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(trimmed)) return null;
  return trimmed;
}

/**
 * The URI is written into `StatsCommit` and can never be edited, so mainnet
 * refuses to guess it from whatever origin the admin happens to be open on.
 */
function publishedStatsUri(gameweekId: number): string {
  if (!STATS_PUBLISH_BASE_URL && SOLANA_CLUSTER === "mainnet-beta") {
    throw new Error("Set NEXT_PUBLIC_STATS_BASE_URL before committing stats on mainnet.");
  }
  const base = (
    STATS_PUBLISH_BASE_URL ?? `${window.location.origin}${SELF_HOSTED_STATS_PATH}`
  ).replace(/\/$/, "");
  return `${base}/${gameweekId}.json`;
}

/**
 * Where the operator must put a downloaded file. The results bucket is a
 * server-only variable, so the browser can only name both possible homes.
 */
function publishDestination(path: string, gameweekId: number): string {
  return `${gameweekId}.json in the results bucket, or public${path}/${gameweekId}.json if the app serves them`;
}

/** Hands the operator the exact bytes that were committed, for upload to the bucket. */
function downloadTextFile(filename: string, contents: string) {
  const url = URL.createObjectURL(new Blob([contents], { type: "application/json" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export default function AdminPage() {
  const { connected, account, signAndSubmit } = useWallet();
  const m = useSiteMessages();
  const ad = m.pages.admin;
  const prize = usePrizeAsset();

  const [config, setConfig] = useState<ChainConfig | null>(null);
  /** `get_gameweek(config.current_gameweek)` — покажчик у конфігу (може відставати). */
  const [currentGameweek, setCurrentGameweek] = useState<GameweekSummary | null>(null);
  /** Фактичний OPEN-тур на ланцюгу (скан) — саме його треба закривати для зупинки реєстрації. */
  const [openGameweek, setOpenGameweek] = useState<GameweekSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form states
  const [newGameweekId, setNewGameweekId] = useState("");
  /** Which GW to re-open (can differ from `config.current_gameweek`, e.g. reopen 34 while pointer is 33). */
  const [reopenTargetId, setReopenTargetId] = useState("");
  const [statsJson, setStatsJson] = useState("");
  const [resultsGameweekId, setResultsGameweekId] = useState("");
  const [newPrizePoolPct, setNewPrizePoolPct] = useState("");
  const [sponsorGwId, setSponsorGwId] = useState("");
  const [sponsorAmountMove, setSponsorAmountMove] = useState("");
  const [withdrawRecipient, setWithdrawRecipient] = useState("");
  const [withdrawAmountMove, setWithdrawAmountMove] = useState("");
  const [feeEntryMove, setFeeEntryMove] = useState("");

  // API states
  const [apiKey, setApiKey] = useState("");
  const [apiKeySource, setApiKeySource] = useState<"env" | "storage" | "manual" | null>(null);
  const [fetchGameweek, setFetchGameweek] = useState("");
  const [isFetchingApi, setIsFetchingApi] = useState(false);
  const [apiStatus, setApiStatus] = useState<{
    used: number;
    limit: number;
    remaining: number;
    plan?: string;
  } | null>(null);
  const [apiWarning, setApiWarning] = useState("");
  const [fetchedFixtures, setFetchedFixtures] = useState<string[]>([]);
  const [fetchError, setFetchError] = useState("");
  const [statsAuditText, setStatsAuditText] = useState("");
  const [statsAuditBlocking, setStatsAuditBlocking] = useState(false);
  const envApiKeyRef = useRef<string | null>(null);

  const loadChainConfig = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      // Prefer server route — avoids browser→Helius blocks (extensions, stale ACLs).
      const res = await fetch("/api/solana/config", { cache: "no-store" });
      const payload = (await res.json()) as {
        error?: string;
        config?: Record<string, unknown>;
        currentGameweek?: Record<string, unknown> | null;
        openGameweek?: Record<string, unknown> | null;
      };
      if (!res.ok || !payload.config) {
        throw new Error(payload.error || `Config HTTP ${res.status}`);
      }

      const configData = reviveConfig(payload.config);
      const pointerGw = reviveGameweek(payload.currentGameweek ?? null);
      const openGw = reviveGameweek(payload.openGameweek ?? null);
      setConfig(configData);
      setCurrentGameweek(pointerGw);
      setOpenGameweek(openGw);
    } catch (err: unknown) {
      // Fallback: direct RPC (works when server route is old, but browser RPC is fine).
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
            findOpenGameweek().catch(() => null),
          ]);
          setCurrentGameweek(pointerGw);
          setOpenGameweek(openGw);
          setLoadError(null);
        } else {
          setLoadError(getErrorMessage(err));
        }
      } catch (fallbackErr: unknown) {
        setConfig(null);
        setCurrentGameweek(null);
        setOpenGameweek(null);
        setLoadError(getErrorMessage(fallbackErr) || getErrorMessage(err));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadChainConfig();

    const STORAGE_KEY = "movematch_api_sports_key";
    const LEGACY_STORAGE_KEY = "fantasy_epl_api_key";
    let cancelled = false;
    const timers: number[] = [];

    const applyKey = (key: string, source: "env" | "storage") => {
      if (cancelled) return;
      setApiKey(key);
      setApiKeySource(source);
      try {
        localStorage.setItem(STORAGE_KEY, key);
        localStorage.removeItem(LEGACY_STORAGE_KEY);
      } catch {
        /* private mode etc. */
      }
    };

    (async () => {
      // Prefer .env.local `API_SPORTS_KEY` on localhost.
      // Re-apply a few times — browser password managers often overwrite type=password after paint.
      try {
        const res = await fetch("/api/admin/api-sports-key", { cache: "no-store" });
        if (res.ok) {
          const payload = (await res.json()) as { key?: string | null };
          const fromEnv = typeof payload.key === "string" ? payload.key.trim() : "";
          if (fromEnv) {
            envApiKeyRef.current = fromEnv;
            applyKey(fromEnv, "env");
            for (const ms of [50, 200, 600, 1500]) {
              timers.push(
                window.setTimeout(() => {
                  if (cancelled) return;
                  if (envApiKeyRef.current) applyKey(envApiKeyRef.current, "env");
                }, ms),
              );
            }
            return;
          }
        }
      } catch {
        /* fall through to localStorage */
      }
      try {
        const saved =
          localStorage.getItem(STORAGE_KEY) ||
          localStorage.getItem(LEGACY_STORAGE_KEY) ||
          "";
        if (saved) applyKey(saved, "storage");
      } catch {
        /* private mode etc. */
      }
    })();

    return () => {
      cancelled = true;
      for (const t of timers) window.clearTimeout(t);
    };
  }, [loadChainConfig]);

  // Persist manual edits (skip while we are forcing the env key).
  useEffect(() => {
    if (!apiKey || apiKeySource === "env") return;
    try {
      localStorage.setItem("movematch_api_sports_key", apiKey);
      localStorage.removeItem("fantasy_epl_api_key");
    } catch {
      /* private mode etc. */
    }
  }, [apiKey, apiKeySource]);

  useEffect(() => {
    if (currentGameweek?.id != null) {
      setReopenTargetId(String(currentGameweek.id));
      setSponsorGwId(String(currentGameweek.id));
    }
  }, [currentGameweek?.id]);

  useEffect(() => {
    if (!config) return;
    setFeeEntryMove(prize.formatUnits(config.entryFee));
  }, [config, prize]);

  const handleCheckApiStatus = async () => {
    const key = (envApiKeyRef.current || apiKey).trim();
    if (!key) return;
    if (envApiKeyRef.current && key !== apiKey) setApiKey(envApiKeyRef.current);
    const status = await checkApiStatus(key);
    if (status.valid) {
      setApiStatus({
        used: status.requestsUsed,
        limit: status.requestsLimit,
        remaining: status.requestsRemaining,
        plan: status.plan,
      });
      setApiWarning(status.warning || "");
      setFetchError("");
    } else {
      setFetchError(status.error || "Invalid API key");
      setApiWarning("");
    }
  };

  /**
   * Cross-check the stats against FPL's live feed (player-id mapping guard). Advisory: returns
   * null when the check itself cannot run, so it never blocks the oracle flow on its own.
   */
  const runStatsAudit = async (
    gw: number,
    players: unknown,
  ): Promise<{ text: string; blocking: boolean; unfinished: boolean } | null> => {
    try {
      const res = await fetch("/api/oracle/stats-audit", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ gameweekId: gw, players }),
      });
      if (!res.ok) return null;
      const report = (await res.json()) as StatsAuditReport;
      const text = formatAuditReport(report);
      const unfinished = report.fixtures.finished < report.fixtures.total;
      return {
        text:
          text ||
          `Stats cross-check vs FPL: OK — no mapping mismatches (${report.fixtures.finished}/${report.fixtures.total} fixtures finished).`,
        blocking: report.blocking > 0,
        unfinished,
      };
    } catch {
      return null;
    }
  };

  const handleFetchFromApi = async () => {
    if (!fetchGameweek) return;
    const sportsKey = (envApiKeyRef.current || apiKey).trim();
    if (!sportsKey) return;
    if (envApiKeyRef.current && sportsKey !== apiKey) setApiKey(envApiKeyRef.current);

    setIsFetchingApi(true);
    setFetchError("");
    setFetchedFixtures([]);
    setStatsAuditText("");
    setStatsAuditBlocking(false);

    try {
      const result: GameweekStatsResult = await fetchGameweekStats(sportsKey, parseInt(fetchGameweek));

      if (result.errors.length > 0) {
        setFetchError(result.errors.join("; "));
      } else if (result.players.length === 0) {
        setFetchError(
          `No player stats returned for GW${fetchGameweek}. API-Sports returned no mappable players — try again or paste JSON manually.`,
        );
      }

      if (result.players.length > 0) {
        const formattedStats = {
          gameweekId: result.gameweekId,
          players: result.players,
        };
        setStatsJson(JSON.stringify(formattedStats, null, 2));
        setFetchedFixtures(result.fixtures);

        const audit = await runStatsAudit(Number(result.gameweekId), result.players);
        if (audit) {
          setStatsAuditText(
            audit.blocking || audit.unfinished
              ? `⚠ Stats cross-check vs FPL\n${audit.text}`
              : audit.text,
          );
          setStatsAuditBlocking(audit.blocking || audit.unfinished);
        }
      }

      await handleCheckApiStatus();
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

  /** OPEN tour on-chain — `config.current_gameweek` when status is open. */
  const activeOpenTour = useMemo((): GameweekSummary | null => {
    if (openGameweek?.status === "open") return openGameweek;
    if (currentGameweek?.status === "open") return currentGameweek;
    return null;
  }, [openGameweek, currentGameweek]);

  const handleCreateGameweekById = async (idNum: number) => {
    if (!connected) return;
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
      await signAndSubmit(await buildCreateGameweek(account!.address, idNum));
      alert(ad.alertGwCreated(idNum));
      await loadChainConfig();
    } catch (error: unknown) {
      console.error("Failed to create gameweek:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateGameweek = async () => {
    if (!newGameweekId) return;
    const idNum = Number.parseInt(newGameweekId, 10);
    await handleCreateGameweekById(idNum);
    setNewGameweekId("");
  };

  const handleCloseGameweekById = async (id: number) => {
    if (!connected) return;
    setIsSubmitting(true);
    try {
      await signAndSubmit(await buildCloseGameweek(account!.address, id));
      alert(ad.alertGwClosed(id));
      await loadChainConfig();
    } catch (error: unknown) {
      console.error("Failed to close gameweek:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCloseGameweek = async () => {
    if (!activeOpenTour) {
      alert(ad.alertNoOpenToClose);
      return;
    }
    await handleCloseGameweekById(activeOpenTour.id);
  };

  const handleReopenGameweekById = async (idNum: number) => {
    if (!connected) return;
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
      await signAndSubmit(await buildReopenGameweek(account!.address, idNum));
      alert(ad.alertReopenDone(idNum));
      await loadChainConfig();
    } catch (error: unknown) {
      console.error("Failed to reopen gameweek:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReopenGameweek = async () => {
    const idNum = Number.parseInt((reopenTargetId || "").trim(), 10);
    await handleReopenGameweekById(idNum);
  };

  const handleUpdatePrizePool = async () => {
    if (!connected || !newPrizePoolPct) return;
    
    setIsSubmitting(true);
    try {
      // The program stores basis points; the form still speaks percent.
      await signAndSubmit(
        await buildSetPrizePoolBps(account!.address, Math.round(Number(newPrizePoolPct) * 100)),
      );
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

  const handleSponsorPrizePool = async () => {
    if (!connected) return;

    const idNum = Number.parseInt((sponsorGwId || "").trim(), 10);
    if (!Number.isFinite(idNum) || idNum < 1) {
      alert(ad.sponsorInvalidGw);
      return;
    }

    const parseMove = (s: string) => Number.parseFloat(s.trim().replace(",", "."));
    const amt = parseMove(sponsorAmountMove || "");
    if (!Number.isFinite(amt) || amt <= 0) {
      alert(ad.sponsorInvalidAmount(prize.symbol));
      return;
    }
    const octas = displayAmountToRaw(amt);
    if (octas < 1) {
      alert(ad.sponsorAmountTooSmall);
      return;
    }

    const gw = await getGameweek(idNum);
    if (!gw) {
      alert(ad.sponsorGwNotFound(idNum));
      return;
    }
    if (gw.status === "resolved") {
      alert(ad.sponsorAlertResolved);
      return;
    }

    setIsSubmitting(true);
    try {
      await signAndSubmit(await buildSponsorPrizePool(account!.address, idNum, BigInt(octas)));
      alert(ad.sponsorSuccess(idNum, prize.formatLabel(octas)));
      setSponsorAmountMove("");
      await loadChainConfig();
    } catch (error: unknown) {
      console.error("Failed to sponsor prize pool:", error);
      const detail = formatTxError(error);
      const raw =
        error instanceof Error
          ? error.message
          : typeof error === "string"
            ? error
            : "";
      alert(
        ad.alertFailed(detail) +
          (raw && raw !== detail ? `\n\n(${raw.slice(0, 180)})` : ""),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleWithdrawPrizeVault = async () => {
    if (!connected) return;

    const recipient = normalizeSolanaAddress(withdrawRecipient || "");
    if (!recipient) {
      alert(ad.withdrawInvalidRecipient);
      return;
    }

    const parseMove = (s: string) => Number.parseFloat(s.trim().replace(",", "."));
    const amt = parseMove(withdrawAmountMove || "");
    if (!Number.isFinite(amt) || amt <= 0) {
      alert(ad.withdrawInvalidAmount(prize.symbol));
      return;
    }
    const octas = displayAmountToRaw(amt);
    if (octas < 1) {
      alert(ad.withdrawAmountTooSmall);
      return;
    }

    setIsSubmitting(true);
    try {
      await signAndSubmit(await buildWithdrawTreasury(account!.address, recipient, BigInt(octas)));
      alert(ad.withdrawSuccess(recipient, prize.formatLabel(octas)));
      setWithdrawAmountMove("");
      await loadChainConfig();
    } catch (error: unknown) {
      console.error("Failed to withdraw prize vault:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateFees = async () => {
    if (!connected) return;
    const entry = Number.parseFloat((feeEntryMove || "").trim().replace(",", "."));
    if (!Number.isFinite(entry) || entry < 0) {
      alert(ad.feesInvalid);
      return;
    }

    setIsSubmitting(true);
    try {
      await signAndSubmit(
        await buildSetFees(account!.address, BigInt(displayAmountToRaw(entry))),
      );
      alert(ad.feesUpdated);
      await loadChainConfig();
    } catch (error: unknown) {
      console.error("Failed to update fees:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * `publishOnly`: publish the JSON (live scores on the closed leaderboard) WITHOUT writing the
   * on-chain hash. The mainnet hash can only be written once per gameweek, so use this after
   * each match and the full submit once, after the last one.
   */
  const handleSubmitStats = async (opts?: { publishOnly?: boolean }) => {
    const publishOnly = opts?.publishOnly === true;
    if (!connected || !account || !statsJson) return;

    setIsSubmitting(true);
    try {
      const stats = JSON.parse(statsJson) as {
        gameweekId: number | string;
        players: Record<string, unknown>[] | Record<string, Record<string, unknown>>;
      };

      if (!stats.gameweekId || stats.players == null) {
        throw new Error("Invalid stats format. Need { gameweekId, players: [...] }");
      }

      // Fetch returns an array; a re-pasted committed file uses an id→stats object.
      const rawPlayers: Record<string, unknown>[] = Array.isArray(stats.players)
        ? stats.players
        : Object.entries(stats.players).map(([playerId, row]) => ({
            ...(row as Record<string, unknown>),
            playerId: (row as Record<string, unknown>).playerId ?? playerId,
          }));
      if (rawPlayers.length === 0) throw new Error("No players in JSON");

      const gwId = Number(stats.gameweekId);

      // Mainnet commit_stats is plain `init`: the on-chain hash can be written ONCE per
      // gameweek and never refreshed. Make the operator confirm anything that would lock in
      // a wrong or premature hash.
      if (!publishOnly && gwId >= 1 && gwId <= 38) {
        const existingCommit = await getStatsCommit(gwId).catch(() => null);
        if (existingCommit) {
          const ok = window.confirm(
            `GW${gwId} already has an on-chain stats commit.\n\n` +
              "The mainnet program cannot refresh it, so this submit only updates the published JSON " +
              "(Calculate will then ask you to confirm the stale-hash dialog).\n\nContinue?",
          );
          if (!ok) return;
        }
        const audit = await runStatsAudit(gwId, rawPlayers);
        if (audit && (audit.blocking || audit.unfinished)) {
          const ok = window.confirm(
            `Stats cross-check vs FPL found problems:\n\n${audit.text}\n\n` +
              "OK = submit anyway.  Cancel = stop (fix the player-id mapping / wait for the last match).",
          );
          if (!ok) return;
        }
      }

      const players: Record<string, Record<string, number | boolean>> = {};
      for (const p of rawPlayers) {
        const id = toU64Stat(p.playerId);
        if (id < 1) throw new Error(`Invalid playerId: ${String(p.playerId)}`);
        const position = toU64Stat(p.position);
        if (position > 3) throw new Error(`Invalid position (0–3): ${String(p.position)}`);
        players[String(id)] = {
          position,
          minutes_played: toU64Stat(p.minutesPlayed ?? p.minutes_played),
          goals: toU64Stat(p.goals),
          assists: toU64Stat(p.assists),
          clean_sheet: Boolean(p.cleanSheet ?? p.clean_sheet),
          saves: toU64Stat(p.saves),
          penalties_saved: toU64Stat(p.penaltiesSaved ?? p.penalties_saved),
          penalties_missed: toU64Stat(p.penaltiesMissed ?? p.penalties_missed),
          own_goals: toU64Stat(p.ownGoals ?? p.own_goals),
          yellow_cards: toU64Stat(p.yellowCards ?? p.yellow_cards),
          red_cards: toU64Stat(p.redCards ?? p.red_cards),
          rating: toU64Stat(p.rating),
          tackles: toU64Stat(p.tackles),
          interceptions: toU64Stat(p.interceptions),
          successful_dribbles: toU64Stat(p.successfulDribbles ?? p.successful_dribbles),
          free_kick_goals: toU64Stat(p.freeKickGoals ?? p.free_kick_goals),
          goals_conceded: toU64Stat(p.goalsConceded ?? p.goals_conceded),
          // MoveMatch does not use FPL BPS bonus — always submit 0.
          bonus: 0,
          fpl_clean_sheets: toU64Stat(p.fplCleanSheets ?? p.fpl_clean_sheets ?? p.fplCleanSheet) ? 1 : 0,
        };
      }

      // Solana keeps only the digest on-chain. Readers fetch these exact bytes from
      // `uri` and re-hash them, so the published file must be byte-identical.
      const canonicalJson = JSON.stringify({ gameweekId: gwId, players });
      const uri = publishedStatsUri(gwId);
      const playerCount = Object.keys(players).length;

      // 1) Auto-publish JSON (Redis + local public file) — no manual download/deploy.
      // Raw body = exact bytes that will be keccak-hashed on-chain (no double-escape).
      let publishBody: {
        error?: string;
        durable?: boolean;
        local?: boolean;
        uriPath?: string;
      } = {};
      try {
        const publishRes = await fetch("/api/oracle/stats", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-oracle-wallet": account.address,
            "x-gameweek-id": String(gwId),
          },
          body: canonicalJson,
        });
        publishBody = (await publishRes.json().catch(() => ({}))) as typeof publishBody;
        if (!publishRes.ok) {
          throw new Error(publishBody.error || `Stats publish failed (${publishRes.status})`);
        }
      } catch (publishErr: unknown) {
        const raw =
          publishErr instanceof Error ? publishErr.message : String(publishErr);
        throw new Error(
          `Publish step failed (${raw}). If this is a cold compile, wait and retry once.`,
        );
      }

      // 2) On-chain commit (init_if_needed): create or refresh hash+URI while GW is CLOSED.
      // Skipping this when a PDA already exists left GW6 stuck on a stale early hash, so
      // Calculate could not verify the freshly published JSON.
      let chainNote: string;
      try {
        if (publishOnly) {
          chainNote =
            "Published only — on-chain hash NOT written (live scores update now). " +
            "After the LAST match: Fetch again and press Submit Stats once.";
        } else {
          await signAndSubmit(
            await buildCommitStats(account.address, gwId, canonicalJson, uri),
          );
          const after = await getStatsCommit(gwId);
          chainNote = after
            ? "On-chain stats commit updated (hash + URI)."
            : "On-chain stats commit submitted.";
        }
      } catch (chainErr: unknown) {
        const msg = formatTxError(chainErr);
        const raw = `${msg}\n${chainErr instanceof Error ? chainErr.message : String(chainErr)}`;
        if (/0x0\b|already in use|custom program error:\s*0x0/i.test(raw)) {
          chainNote =
            "WARNING: JSON published, but on-chain hash NOT updated " +
            "(mainnet commit_stats still uses plain init — PDA already exists). " +
            "In Calculate & Publish, confirm the stale-hash dialog to settle from the published file.";
        } else {
          throw new Error(`On-chain commit failed (${msg}). JSON is already published.`);
        }
      }

      const where = publishBody.durable
        ? `${uri} (Redis — live without redeploy)`
        : publishBody.local
          ? `${uri} (saved locally; deploy or use Redis for prod)`
          : uri;
      alert(
        `${ad.alertStatsSubmitted}\n\n${playerCount} players.\n${chainNote}\n\nPublished: ${where}`,
      );
    } catch (error: unknown) {
      console.error("Failed to submit stats:", error);
      const raw = error instanceof Error ? error.message : String(error);
      // Keep step-specific messages; formatTxError would collapse them to "Network hiccup".
      alert(
        ad.alertFailed(
          /Publish step failed|On-chain commit failed|Invalid stats|No players/i.test(raw)
            ? raw
            : formatTxError(error),
        ),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCalculateResults = async () => {
    if (!connected || !account || !resultsGameweekId) return;

    setIsSubmitting(true);
    try {
      const gw = Number(resultsGameweekId);

      // Fetch all registered teams and compute points off-chain, then sort descending.
      // The contract no longer sorts on-chain (removed O(n²) bubble sort to fit execution limits).
      const addresses = await getGameweekEntrants(gw);
      const loadedTeams = await Promise.all(
        addresses.map(async (addr) => {
          const team = await getUserTeam(addr, gw);
          return { addr, team };
        })
      );

      // getUserTeam recovers the captain from the registration tx for legacy entries. If it
      // still reports "no captain", that player would silently lose the ×2 bonus.
      const missingCaptain = loadedTeams.filter(({ team }) => team && team.captainIndex === NO_CAPTAIN_INDEX);
      if (missingCaptain.length > 0) {
        const list = missingCaptain.map(({ addr }) => addr).join("\n");
        if (
          !window.confirm(
            `${missingCaptain.length} entr${missingCaptain.length === 1 ? "y has" : "ies have"} no recoverable captain ` +
              `(they would get NO ×2 bonus):\n\n${list}\n\nOK = continue anyway. Cancel = stop and retry (RPC may have failed).`,
          )
        ) {
          return;
        }
      }

      // Integrity audit (EPL gameweeks only — World Cup tours use a different catalog).
      // The program stores whatever positions/clubs the client sent and has no deadline,
      // so flag late registrations, >3 per club and position/club labels that contradict
      // the catalog. Scoring then uses the catalog's real positions.
      let teams = loadedTeams;
      if (gw >= 1 && gw <= 38) {
        const { auditEntry, buildCatalogIndex, correctedPositions, summarizeIssues } = await import(
          "@/lib/entryAudit"
        );
        let catalog = new Map<number, { id: number; teamId: number; positionId: number }>();
        try {
          const res = await fetch("/api/players", { cache: "no-store" });
          if (res.ok) catalog = buildCatalogIndex(await res.json());
        } catch {
          /* handled below */
        }
        if (catalog.size === 0) {
          if (!window.confirm("Player catalog is unavailable, so entries cannot be audited. Continue WITHOUT the integrity audit?")) {
            return;
          }
        } else {
          let deadlineSec: number | null = null;
          try {
            const res = await fetch(`/api/registration-deadline?gameweek=${gw}`, { cache: "no-store" });
            if (res.ok) {
              const d = (await res.json()) as {
                deadlineEpochMs: number | null;
                authoritative?: boolean;
              };
              // Only a confirmed first kickoff may flag entries as "late"; a fallback
              // deadline is ~90 min early and would mark legit entries as late.
              deadlineSec =
                d.deadlineEpochMs != null && d.authoritative !== false
                  ? Math.floor(d.deadlineEpochMs / 1000)
                  : null;
            }
          } catch {
            /* deadline unknown → late-registration check skipped */
          }
          const issues = loadedTeams.flatMap(({ addr, team }) =>
            team ? auditEntry(addr, team, catalog, deadlineSec) : [],
          );
          if (issues.length > 0) {
            const proceed = window.confirm(
              `Integrity audit found ${issues.length} issue(s):\n\n${summarizeIssues(issues)}\n\n` +
                "OK = score with catalog positions and continue.\n" +
                "Cancel = stop (refund offending entries with close_entry while the gameweek is CLOSED, then run again).",
            );
            if (!proceed) return;
          }
          teams = loadedTeams.map(({ addr, team }) => {
            if (!team) return { addr, team };
            const positions = correctedPositions(team, catalog);
            return { addr, team: { ...team, positions, playerPositions: positions } };
          });
        }
      }

      const allPlayerIds = Array.from(new Set(teams.flatMap((t) => t.team?.playerIds ?? [])));
      let statsMap: Record<number, Record<string, unknown>> = {};
      try {
        statsMap = (await getVerifiedGameweekStats(gw, allPlayerIds)) as Record<
          number,
          Record<string, unknown>
        >;
      } catch (verifyErr: unknown) {
        const verifyMsg =
          verifyErr instanceof Error ? verifyErr.message : String(verifyErr);
        if (!/hash does not match/i.test(verifyMsg)) throw verifyErr;
        // Mainnet program still uses plain `init` — cannot refresh StatsCommit PDA.
        // publish_results only requires a non-zero commit hash; scoring can use the
        // live published JSON the oracle just wrote (Redis / local).
        const ok = window.confirm(
          `On-chain stats hash is STALE for GW${gw} (re-commit blocked: account already in use).\n\n` +
            `OK = score & publish from the published JSON at /data/stats/${gw}.json anyway.\n` +
            `Cancel = stop (deploy program with init_if_needed, then Submit Stats again).`,
        );
        if (!ok) return;
        statsMap = (await getPublishedGameweekStats(gw, allPlayerIds)) as Record<
          number,
          Record<string, unknown>
        >;
      }
      if (Object.keys(statsMap).length === 0) {
        throw new Error(
          `No published stats for GW${gw}. Run Submit Stats first so /data/stats/${gw}.json exists.`,
        );
      }
      const chainRecord: Record<string, Record<string, unknown>> = {};
      for (const [id, s] of Object.entries(statsMap)) {
        chainRecord[id] = s as Record<string, unknown>;
      }

      const scored = teams.map(({ addr, team }) => {
        if (!team) return { addr, basePts: 0, finalPts: 0 };
        // base = naive XI sum (no auto-sub, matches preview display)
        let basePts = 0;
        for (let i = 0; i < 11; i++) {
          const pid = team.playerIds[i];
          const posId = team.playerPositions[i] ?? 2;
          const s = statsMap[pid] as Record<string, unknown> | undefined;
          if (!s) continue;
          const b = calculateFantasyPoints({ positionId: posId }, s);
          const { add, sub } = ratingTierAdjustment(s);
          basePts += Math.max(0, b + add - sub);
        }
        // preMultiplier uses auto-sub (chain-aligned)
        const finalPts = previewTourPointsFromRegisteredTeam(team, chainRecord);
        return { addr, basePts, finalPts };
      });
      scored.sort((a, b) => b.finalPts - a.finalPts);

      const gameweek = await getGameweek(gw);
      if (!gameweek) throw new Error(`Gameweek ${gw} does not exist on chain.`);

      const statsCommit = await getStatsCommit(gw);
      if (!statsCommit?.hash || statsCommit.hash === "0".repeat(64)) {
        throw new Error(
          `Gameweek ${gw} has no stats commit on chain. Submit stats before publishing results.`,
        );
      }

      // Payouts come from the shared settlement rule
      // and the amounts the UI shows can never drift apart.
      const awards = allocatePrizes(
        BigInt(gameweek.prizePool),
        scored.map((x) => ({ owner: x.addr, finalPoints: x.finalPts })),
        gw,
      );
      const basePointsByOwner = new Map(scored.map((x) => [x.addr, x.basePts]));
      const rows = awards.map((award) => ({
        owner: award.owner,
        rank: award.rank,
        finalPoints: award.finalPoints,
        amount: award.amount,
      }));

      const published = await buildPublishResults(account.address, gw, rows, scored.length);
      await signAndSubmit(published.instructions);

      // Winners cannot claim without their proof, so it ships with the results file.
      const resultsJson = JSON.stringify({
        gameweek: gw,
        root: published.root,
        prizeAllocated: published.total.toString(),
        results: rows.map((row, index) => ({
          owner: row.owner,
          rank: row.rank,
          finalPoints: row.finalPoints,
          basePoints: basePointsByOwner.get(row.owner) ?? 0,
          prizeAmount: row.amount.toString(),
          proof: published.proofs[index].map((node) => ({
            hash: node.hash.toString("hex"),
            sum: node.sum.toString(),
          })),
        })),
      });

      // Auto-publish (Redis + local file) — same flow as Submit Stats. The file is also
      // downloaded as a backup so the proofs can never be lost.
      downloadTextFile(`results-${gw}.json`, resultsJson);
      let resultsNote: string;
      try {
        const res = await fetch("/api/oracle/results", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-oracle-wallet": account.address,
            "x-gameweek-id": String(gw),
          },
          body: resultsJson,
        });
        const body = (await res.json().catch(() => ({}))) as { error?: string; durable?: boolean };
        if (!res.ok) throw new Error(body.error || `status ${res.status}`);
        resultsNote = body.durable
          ? "Results published automatically (Redis) — winners can claim now."
          : "Results saved locally only — deploy or configure Redis, then winners can claim.";
      } catch (publishErr: unknown) {
        const raw = publishErr instanceof Error ? publishErr.message : String(publishErr);
        resultsNote =
          `Auto-publish of results FAILED (${raw}). Upload the downloaded file as ` +
          `${publishDestination(SELF_HOSTED_RESULTS_PATH, gw)} so winners can claim.`;
      }

      alert(`${ad.alertResultsCalculated(String(resultsGameweekId))}\n\n${resultsNote}`);
    } catch (error: unknown) {
      console.error("Failed to calculate results:", error);
      alert(ad.alertFailed(formatTxError(error)));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!connected) {
    return (
      <SitePageShell centered width="lg">
        <div className="glass-card rounded-2xl p-12 text-center w-full max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Admin Panel</h1>
          <p className="text-muted-foreground">Please connect your wallet to access admin functions.</p>
        </div>
      </SitePageShell>
    );
  }

  if (isLoading) {
    return (
      <SitePageShell centered width="lg">
        <div className="glass-card rounded-2xl p-12 text-center w-full max-w-lg">
          <div className="w-8 h-8 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </SitePageShell>
    );
  }

  if (!config) {
    return (
      <SitePageShell centered width="lg">
        <div className="glass-card rounded-2xl p-12 text-center w-full max-w-lg">
          <h1 className="text-2xl font-bold text-white mb-3">{ad.loadFailedTitle}</h1>
          <p className="text-muted-foreground mb-4 max-w-md mx-auto">{ad.loadFailedBody}</p>
          {loadError ? (
            <p className="mb-6 max-w-md mx-auto break-words rounded-xl border border-rose-500/30 bg-rose-500/10 px-3 py-2 font-mono text-xs text-rose-200">
              {loadError}
            </p>
          ) : null}
          <button
            type="button"
            onClick={() => void loadChainConfig()}
            className="px-5 py-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-sm hover:bg-emerald-500/30 transition-colors"
          >
            {ad.retry}
          </button>
        </div>
      </SitePageShell>
    );
  }

  if (!isAdmin && !isOracle) {
    return (
      <SitePageShell centered width="lg">
        <div className="glass-card rounded-2xl p-12 text-center w-full max-w-lg">
          <div className="w-16 h-16 rounded-2xl bg-rose-500/20 flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-rose-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Access Denied</h1>
          <p className="text-muted-foreground mb-4">
            You are not authorized to access admin functions.
          </p>
          {walletAddr ? (
            <p className="text-sm text-muted-foreground mb-4 font-mono break-all">
              Connected: {account?.address?.toString()}
            </p>
          ) : null}
          <div className="text-sm text-muted-foreground space-y-1">
            <p>Admins: {config?.admins?.join(", ") || "—"}</p>
            <p>Oracle: {config?.oracle ?? "—"}</p>
          </div>
          <p className="mt-4 text-xs text-muted-foreground/80 max-w-md mx-auto leading-relaxed">
            Підключи <strong className="text-white/70">Admin</strong> (
            <span className="font-mono text-white/60">CJKNFK…</span>) або{" "}
            <strong className="text-white/70">Oracle</strong> (
            <span className="font-mono text-white/60">6vvo1t…</span>) на Solana{" "}
            <strong className="text-white/70">{SOLANA_CLUSTER}</strong>.
          </p>
        </div>
      </SitePageShell>
    );
  }

  return (
    <SitePageShell width="lg" className="pb-12">
    <div>
      <div className="mb-8">
        <h1 className="text-4xl font-bold text-white mb-2">Admin Panel</h1>
        <p className="text-muted-foreground">
          Solana {SOLANA_CLUSTER} — manage EPL gameweeks, fees, and settlement
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
              {activeOpenTour ? (
                <>
                  GW {activeOpenTour.id} · OPEN
                </>
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
        {/* Close / Re-open */}
        {isAdmin && (activeOpenTour || currentGameweek) && (
          <div className="glass-card rounded-2xl p-6 border border-white/[0.06]">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {activeOpenTour ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  )}
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">
                  {activeOpenTour ? ad.sectionTitleWhenOpen : ad.sectionTitleWhenClosed}
                </h2>
                <p className="text-xs text-muted-foreground mt-1">
                  {activeOpenTour
                    ? ad.sectionCloseSubtitleOpen(activeOpenTour.id)
                    : ad.sectionCloseSubtitleConfig(
                        String(currentGameweek?.id ?? "—"),
                        currentGameweek?.status?.toUpperCase() ?? "—",
                      )}
                </p>
              </div>
            </div>

            {activeOpenTour && (
              <>
                <p className="text-muted-foreground mb-4">{ad.closeExplain(activeOpenTour.id)}</p>
                <button
                  type="button"
                  onClick={handleCloseGameweek}
                  disabled={isSubmitting}
                  className={cn(
                    "px-6 py-3 rounded-xl font-medium transition-all shadow-lg disabled:opacity-50",
                    "bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-amber-500/25 hover:from-amber-400 hover:to-orange-400",
                  )}
                >
                  {isSubmitting ? "..." : ad.closeGwButtonLabel(activeOpenTour.id)}
                </button>
              </>
            )}

            {!activeOpenTour && (
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
              <div>
                <h2 className="text-xl font-bold text-white">Create Gameweek</h2>
                <p className="text-xs text-muted-foreground mt-1">EPL gameweek id — e.g. 39, 40, 41…</p>
              </div>
            </div>
            <div className="flex gap-4">
              <input
                type="number"
                placeholder="Gameweek ID (e.g. 39)"
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

        {/* Sponsor prize pool (Admin) — USDC to vault + on-chain pool before GW is RESOLVED */}
        {isAdmin && (
          <div className="glass-card rounded-2xl p-6 border border-cyan-500/15">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-cyan-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{ad.sponsorSectionTitle}</h2>
                <p className="text-sm text-muted-foreground mt-1">{ad.sponsorSectionHint(prize.symbol)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{ad.sponsorGwLabel}</span>
                <input
                  type="number"
                  min={1}
                  value={sponsorGwId}
                  onChange={(e) => setSponsorGwId(e.target.value)}
                  className="px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-border"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{ad.sponsorAmountLabel(prize.symbol)}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={sponsorAmountMove}
                  onChange={(e) => setSponsorAmountMove(e.target.value)}
                  className="px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-cyan-500 border border-border"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleSponsorPrizePool}
              disabled={isSubmitting || !sponsorGwId || !sponsorAmountMove}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-cyan-600 to-teal-600 text-white rounded-xl font-medium hover:from-cyan-500 hover:to-teal-500 transition-all shadow-lg shadow-cyan-500/20 disabled:opacity-50"
            >
              {isSubmitting ? "..." : ad.sponsorSubmit}
            </button>
          </div>
        )}

        {/* Withdraw prize vault (Admin) — liquidity only; does not edit prize_pool / claims */}
        {isAdmin && (
          <div className="glass-card rounded-2xl p-6 border border-orange-500/20">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-orange-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{ad.withdrawSectionTitle}</h2>
                <p className="text-sm text-muted-foreground mt-1">{ad.withdrawSectionHint(prize.symbol)}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <label className="flex flex-col gap-1 sm:col-span-2">
                <span className="text-xs text-muted-foreground">{ad.withdrawRecipientLabel}</span>
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={withdrawRecipient}
                  onChange={(e) => setWithdrawRecipient(e.target.value)}
                  className="px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 border border-border font-mono text-sm"
                  placeholder="Solana address"
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{ad.withdrawAmountLabel(prize.symbol)}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={withdrawAmountMove}
                  onChange={(e) => setWithdrawAmountMove(e.target.value)}
                  className="px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 border border-border"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleWithdrawPrizeVault}
              disabled={isSubmitting || !withdrawRecipient.trim() || !withdrawAmountMove}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-orange-600 to-amber-700 text-white rounded-xl font-medium hover:from-orange-500 hover:to-amber-600 transition-all shadow-lg shadow-orange-500/20 disabled:opacity-50"
            >
              {isSubmitting ? "..." : ad.withdrawSubmit}
            </button>
          </div>
        )}

        {/* Squad entry fee (Admin) */}
        {isAdmin && (
          <div className="glass-card rounded-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-amber-500/20 flex items-center justify-center">
                <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <div>
                <h2 className="text-xl font-bold text-white">{ad.feesSectionTitle}</h2>
                <p className="text-sm text-muted-foreground mt-1">{ad.feesSectionHint}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-muted-foreground">{ad.feesEntryLabel(prize.symbol)}</span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={feeEntryMove}
                  onChange={(e) => setFeeEntryMove(e.target.value)}
                  className="px-4 py-3 bg-secondary/50 text-foreground rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500 border border-border"
                />
              </label>
            </div>
            <button
              type="button"
              onClick={handleUpdateFees}
              disabled={isSubmitting || !feeEntryMove}
              className="mt-4 px-6 py-3 bg-gradient-to-r from-amber-500 to-orange-600 text-white rounded-xl font-medium hover:from-amber-400 hover:to-orange-500 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
            >
              {isSubmitting ? "..." : ad.feesSubmit}
            </button>
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

            <p className="text-muted-foreground text-sm mb-4">
              Fetch from API-Sports (100 req/day free). Players with no API-Sports row (injured / not in the
              match squad) are added automatically as 0-minute DNP so auto-subs work. Get your key from{" "}
              <a href="https://www.api-football.com/" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:underline">
                api-football.com
              </a>
            </p>

            <div className="space-y-4">
              {(
                <div>
                  <label className="block text-sm text-muted-foreground mb-2">API Key</label>
                  <div className="flex gap-3">
                    <input
                      type="text"
                      inputMode="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      name="mm-oracle-apisports-key"
                      data-1p-ignore="true"
                      data-lpignore="true"
                      data-form-type="other"
                      placeholder="Enter your API-Sports key"
                      value={apiKey}
                      onChange={(e) => {
                        envApiKeyRef.current = null;
                        setApiKeySource("manual");
                        setApiKey(e.target.value.trim());
                      }}
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
                  {apiKeySource === "env" ? (
                    <p className="mt-2 text-xs text-emerald-400/90">
                      Loaded from <span className="font-mono">.env.local</span> (API_SPORTS_KEY)
                      {apiKey ? ` · …${apiKey.slice(-6)}` : ""}
                    </p>
                  ) : null}
                  {apiStatus && (
                    <div className="mt-2 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        {apiStatus.plan ? `${apiStatus.plan} · ` : ""}
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
                    disabled={!apiKey || !fetchGameweek || isFetchingApi}
                    className={cn(
                      "px-6 py-3 text-white rounded-xl font-medium transition-all shadow-lg disabled:opacity-50",
                      "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-400 hover:to-blue-400 shadow-cyan-500/25",
                    )}
                  >
                    {isFetchingApi ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Fetching...
                      </span>
                    ) : (
                      "Fetch from API-Sports"
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

              {/* Stats vs FPL cross-check (player-id mapping guard) */}
              {statsAuditText && (
                <div
                  className={`p-3 rounded-xl text-sm border whitespace-pre-wrap ${
                    statsAuditBlocking
                      ? "bg-amber-500/15 text-amber-300 border-amber-500/40"
                      : "bg-emerald-500/10 text-emerald-300 border-emerald-500/30"
                  }`}
                >
                  {statsAuditText}
                </div>
              )}

              {/* Fetched Fixtures */}
              {fetchedFixtures.length > 0 && (
                <div className="p-3 bg-emerald-500/10 rounded-xl border border-emerald-500/30">
                  <p className="text-sm text-emerald-400 font-medium mb-2">
                    Fetched {fetchedFixtures.length} fixtures:
                  </p>
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
              {statsJson
                ? "Stats fetched from API — Submit publishes the JSON automatically (no manual download/deploy), then commits on-chain."
                : "Paste JSON with player stats for the gameweek. Format:"}
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
            <div className="mt-4 flex flex-wrap items-center gap-3">
              <button
                onClick={() => handleSubmitStats({ publishOnly: true })}
                disabled={isSubmitting || !statsJson}
                className="px-6 py-3 bg-secondary/60 text-foreground rounded-xl font-medium border border-border hover:bg-secondary transition-all disabled:opacity-50"
              >
                {isSubmitting ? "Working..." : "Publish live (no on-chain hash)"}
              </button>
              <button
                onClick={() => handleSubmitStats()}
                disabled={isSubmitting || !statsJson}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-xl font-medium hover:from-blue-400 hover:to-indigo-500 transition-all shadow-lg shadow-blue-500/25 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting..." : "Submit Stats (final, writes hash)"}
              </button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              After each match: <b>Publish live</b>. After the last match of the gameweek: Fetch again, then <b>Submit Stats</b> once.
            </p>
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
    </SitePageShell>
  );
}
