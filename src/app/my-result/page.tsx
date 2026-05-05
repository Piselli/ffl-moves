"use client";

import { useState, useEffect } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getConfig, getGameweek, getTeamResult, getUserTeam, getGameweekTeams, getGameweekStats, findActiveGameweekFromChain } from "@/lib/movement";
import { formatMOVE, cn, getErrorMessage } from "@/lib/utils";
import { calculateFantasyPointsWithRating, enrichStatsMapWithFplPlayers } from "@/lib/scoring";
import { squadPlayersFromChain } from "@/lib/fplSquadResolve";
import { mergeFplCatalogForChainIds } from "@/lib/fplResolveMissing";
import { Player, TeamResult } from "@/lib/types";
import { FORMATION } from "@/lib/constants";
import { useNickname } from "@/hooks/useNickname";
import { FplPhotoAvatar } from "@/components/FplPhotoAvatar";
import { initialsFromDisplayName } from "@/lib/avatar-fallback";
import { useSiteMessages, useSiteLocale } from "@/i18n/LocaleProvider";
import { messages } from "@/i18n/messages";
import { TEAM_NOT_IN_SITE_CATALOG } from "@/lib/catalog-placeholders";

const positionColor: Record<string, string> = {
  GK:  "text-rose-400",
  DEF: "text-amber-400",
  MID: "text-blue-400",
  FWD: "text-emerald-400",
};

const positionBorder: Record<string, string> = {
  GK:  "border-rose-400/40",
  DEF: "border-amber-400/40",
  MID: "border-blue-400/40",
  FWD: "border-emerald-400/40",
};

const rankMedal: Record<number, string> = { 1: "🥇", 2: "🥈", 3: "🥉" };

function calcPoints(player: Player, stats: Record<string, unknown> | null | undefined): number {
  return calculateFantasyPointsWithRating(player, stats);
}

function PlayerResultCard({
  player,
  stats,
}: {
  player: Player;
  stats: Record<string, unknown> | null | undefined;
}) {
  const pts = calcPoints(player, stats);
  const hasStats = !!stats;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex flex-col items-center gap-1 p-2 rounded-2xl border bg-white/[0.03] hover:bg-white/[0.05] transition-colors",
        positionBorder[player.position]
      )}
    >
      {/* Points badge — top-right */}
      {hasStats && (
        <span className={cn(
          "absolute -top-2 -right-2 min-w-[22px] h-[22px] px-1 rounded-full text-[10px] font-black flex items-center justify-center shadow-lg z-10 tabular-nums",
          pts >= 7 ? "bg-[#00f948] text-black" :
          pts >= 4 ? "bg-amber-400 text-black" :
          pts > 0  ? "bg-white/20 text-white" :
                     "bg-white/10 text-white/40"
        )}>
          {pts}
        </span>
      )}

      {/* Photo */}
      <div
        className={cn(
          "w-14 h-14 rounded-xl overflow-hidden border-2 bg-white/[0.05] shrink-0",
          positionBorder[player.position]
        )}
      >
        <FplPhotoAvatar
          fplPhotoCode={player.fplPhotoCode}
          photoUrl={player.photo}
          alt={player.name}
          size={56}
          teamName={player.team}
          initials={initialsFromDisplayName(player.webName || player.name)}
          className="rounded-xl"
        />
      </div>

      {/* Name */}
      <p className="text-[11px] font-bold text-white text-center leading-tight truncate w-full px-0.5">
        {player.webName || player.name.split(" ").slice(-1)[0]}
      </p>

      {/* Stats breakdown (if available) */}
      {hasStats && (
        <div className="flex flex-wrap justify-center gap-x-1.5 gap-y-0.5 px-0.5">
          {Number(stats.goals ?? 0) > 0 && (
            <span className="text-[9px] text-[#00f948] font-bold">⚽ {Number(stats.goals ?? 0)}</span>
          )}
          {Number(stats.assists ?? 0) > 0 && (
            <span className="text-[9px] text-blue-400 font-bold">🅰 {Number(stats.assists ?? 0)}</span>
          )}
          {Boolean(stats.clean_sheet ?? stats.cleanSheet) && (
            <span className="text-[9px] text-amber-400 font-bold">🧱</span>
          )}
          {Number(stats.yellow_cards ?? stats.yellowCards ?? 0) > 0 && (
            <span className="text-[9px] text-yellow-400 font-bold">🟨</span>
          )}
          {Number(stats.red_cards ?? stats.redCards ?? 0) > 0 && (
            <span className="text-[9px] text-rose-400 font-bold">🟥</span>
          )}
        </div>
      )}

      {/* Position label */}
      <span className={cn("text-[9px] font-bold uppercase tracking-wide", positionColor[player.position])}>
        {player.position}
      </span>
    </motion.div>
  );
}

export default function MyResultPage() {
  const { connected, account } = useWallet();
  const address = account?.address?.toString() ?? null;
  const { myNickname } = useNickname(address);
  const { locale } = useSiteLocale();
  const mr = useSiteMessages().pages.myResult;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gwId, setGwId] = useState(0);
  const [result, setResult] = useState<(TeamResult & { owner: string }) | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [gwStats, setGwStats] = useState<Record<string, Record<string, unknown>>>({});
  const [siteHost, setSiteHost] = useState("");
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    setSiteHost(typeof window !== "undefined" ? window.location.host : "");
  }, []);

  useEffect(() => {
    if (!connected || !address) { setLoading(false); return; }
    const addr: string = address;

    async function load() {
      const mr = messages[locale].pages.myResult;
      setLoading(true);
      setError(null);
      try {
        const config = await getConfig();
        if (!config) throw new Error(mr.errConfig);
        let currentGwId: number = Number(config.currentGameweek) || 1;

        // Latest GW where this wallet has a result (config may already point at the next open week).
        let teamResult = await getTeamResult(addr, currentGwId);
        if (!teamResult) {
          for (let i = currentGwId - 1; i >= Math.max(1, currentGwId - 45); i--) {
            const tr = await getTeamResult(addr, i);
            if (tr) {
              currentGwId = i;
              teamResult = tr;
              break;
            }
          }
        }
        if (!teamResult) {
          for (let i = currentGwId + 1; i <= currentGwId + 20; i++) {
            const tr = await getTeamResult(addr, i);
            if (tr) {
              currentGwId = i;
              teamResult = tr;
              break;
            }
            const g = await getGameweek(i);
            if (!g) break;
          }
        }

        // If still no result, check if there's a closed (in-progress) gameweek for preview
        let previewMode = false;
        if (!teamResult) {
          const activeGw = await findActiveGameweekFromChain(config);
          if (activeGw && activeGw.status === "closed") {
            currentGwId = activeGw.id;
            previewMode = true;
            setIsPreview(true);
          } else {
            throw new Error(mr.errResultNotFound);
          }
        }

        setGwId(currentGwId);

        const [teams, userTeam, playersRes] = await Promise.all([
          getGameweekTeams(currentGwId),
          getUserTeam(addr, currentGwId),
          fetch("/api/players"),
        ]);

        setTotalParticipants(teams.length);

        if (!teamResult && !previewMode) throw new Error(mr.errResultNotFound);

        if (teamResult) {
          setResult({ ...teamResult, owner: addr });
        }

        if (!userTeam) throw new Error(mr.errSquadNotFound);

        // Fetch per-player stats using the actual player IDs from the team
        if (userTeam?.playerIds?.length) {
          const stats = await getGameweekStats(currentGwId, userTeam.playerIds);
          let merged: Record<string, Record<string, unknown>> = stats as Record<
            string,
            Record<string, unknown>
          >;
          try {
            const fpl = await fetch(`/api/fpl-live?gw=${currentGwId}`).then((r) => (r.ok ? r.json() : null));
            if (fpl?.players)
              merged = enrichStatsMapWithFplPlayers(
                stats as Record<string, unknown>,
                fpl.players,
              ) as Record<string, Record<string, unknown>>;
          } catch {
            /* keep chain-only */
          }
          setGwStats(merged);
        }

        if (!playersRes.ok) throw new Error(mr.errPlayersLoad);
        const allPlayers: Player[] = await playersRes.json();
        const playerMap = new Map(allPlayers.map((p) => [p.id, p]));
        await mergeFplCatalogForChainIds(playerMap, userTeam.playerIds);

        // Same order as on-chain register_team (11 starters + bench).
        const squad = squadPlayersFromChain(
          { playerIds: userTeam.playerIds, playerPositions: userTeam.playerPositions },
          playerMap,
        );
        setPlayers(squad);
      } catch (e: unknown) {
        setError(getErrorMessage(e, mr.errGeneric));
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [connected, address, locale]);

  // ── Not connected ──────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="bg-[#0D0F12] min-h-screen flex items-center justify-center text-white">
        <div className="text-center px-6">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-display font-black uppercase mb-2">{mr.connectTitle}</h1>
          <p className="text-white/40 text-sm">{mr.connectHint}</p>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-[#0D0F12] min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/30">
          <div className="w-8 h-8 border-2 border-white/10 border-t-[#00f948] rounded-full animate-spin" />
          <p className="text-sm">{mr.loading}</p>
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-[#0D0F12] min-h-screen flex items-center justify-center text-white px-6">
        <div className="text-center max-w-sm">
          <p className="text-3xl mb-4">⚠️</p>
          <h1 className="text-lg font-display font-black uppercase mb-2">{mr.unavailableTitle}</h1>
          <p className="text-white/40 text-sm mb-6">{error}</p>
          <Link href="/leaderboard" className="text-[#00f948] text-sm font-semibold hover:underline">
            {mr.viewLeaderboard}
          </Link>
        </div>
      </div>
    );
  }

  const displayName = myNickname ?? (address ? address.slice(0, 6) + "…" + address.slice(-4) : "");
  const isTop3 = result && result.rank >= 1 && result.rank <= 3;
  const hasStats = Object.keys(gwStats).length > 0;

  return (
    <div className="bg-[#0D0F12] min-h-screen text-white">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-28 pb-16">

        {/* Preview banner */}
        {isPreview && (
          <div className="mb-6 flex items-center gap-3 px-5 py-3 rounded-2xl bg-amber-500/10 border border-amber-500/25">
            <svg className="w-4 h-4 text-amber-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <p className="text-amber-300 text-xs font-bold uppercase tracking-widest">
              Preview — Intermediate results. Final scores will be published after all matches.
            </p>
          </div>
        )}

        {/* Back */}
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs font-medium transition-colors mb-8"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          {mr.backLeaderboard}
        </Link>

        {/* ── Card ────────────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden"
        >
          {isTop3 && (
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#00f948]/10 blur-[60px] pointer-events-none" />
          )}

          {/* Header */}
          <div className="relative px-6 pt-7 pb-5 border-b border-white/[0.06]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#00f948] text-[10px] font-bold uppercase tracking-widest mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f948]" />
                  {mr.gwBadge(gwId)}
                </div>
                <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight leading-none">
                  {displayName}
                </h1>
                <p className="text-white/30 text-xs mt-1 font-mono">
                  {address?.slice(0, 6)}…{address?.slice(-4)}
                </p>
              </div>

              {result && result.rank > 0 && (
                <div className={cn(
                  "shrink-0 flex flex-col items-center justify-center w-16 h-16 rounded-2xl border text-center",
                  result.rank === 1 ? "bg-[#FFD700]/10 border-[#FFD700]/30 shadow-[0_0_20px_rgba(255,215,0,0.15)]" :
                  result.rank === 2 ? "bg-white/[0.06] border-white/20" :
                  result.rank === 3 ? "bg-amber-500/10 border-amber-500/30" :
                  "bg-white/[0.04] border-white/[0.08]"
                )}>
                  <span className="text-xl leading-none">{rankMedal[result.rank] ?? ""}</span>
                  <span className={cn(
                    "text-lg font-display font-black tabular-nums leading-none mt-0.5",
                    result.rank === 1 ? "text-[#FFD700]" : result.rank === 2 ? "text-white" : result.rank === 3 ? "text-amber-400" : "text-white/70"
                  )}>
                    #{result.rank}
                  </span>
                </div>
              )}
            </div>

            {/* Stats row */}
            {result && (
              <div className="grid grid-cols-3 gap-3 mt-5">
                {[
                  {
                    label: mr.pointsLabel,
                    value: String(result.finalPoints),
                    accent: false,
                  },
                  {
                    label: mr.prizeLabel,
                    value: result.prizeAmount > 0 ? `${formatMOVE(result.prizeAmount)} MOVE` : "—",
                    accent: result.prizeAmount > 0,
                  },
                  {
                    label: mr.participantsLabel,
                    value: totalParticipants > 0 ? String(totalParticipants) : "—",
                    accent: false,
                  },
                ].map(({ label, value, accent }) => (
                  <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-3 text-center">
                    <p className={cn("text-xl font-display font-black tabular-nums leading-none", accent ? "text-[#00f948]" : "text-white")}>
                      {value}
                    </p>
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">{label}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Players: starters vs bench (same order as on-chain registration) */}
          {players.length > 0 && (
            <div className="px-6 py-5 space-y-6">
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-bold">{mr.squadTitle}</p>
                {!hasStats && (
                  <p className="text-[10px] text-white/20 italic">{mr.statsPending}</p>
                )}
              </div>
              {players.some((p) => p.team === TEAM_NOT_IN_SITE_CATALOG) && (
                <p className="text-[10px] text-amber-400/90 leading-snug -mt-2">
                  {mr.catalogHint}
                </p>
              )}

              <div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2.5">
                  {mr.startingXi(FORMATION.GK + FORMATION.DEF + FORMATION.MID + FORMATION.FWD)}
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                  {players.slice(0, 11).map((p, i) => (
                    <PlayerResultCard
                      key={`gw${gwId}-xi-${i}-${p.id}`}
                      player={p}
                      stats={gwStats[p.id] ?? gwStats[p.id.toString()] ?? null}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-1 border-t border-white/[0.06]">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35 mb-2.5">
                  {mr.bench(FORMATION.BENCH)}
                </p>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                  {players.slice(11, 14).map((p, i) => (
                    <PlayerResultCard
                      key={`gw${gwId}-bench-${i}-${p.id}`}
                      player={p}
                      stats={gwStats[p.id] ?? gwStats[p.id.toString()] ?? null}
                    />
                  ))}
                </div>
              </div>

              {/* Points legend */}
              {hasStats && (
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                  <span className="text-[9px] text-white/20 uppercase tracking-widest font-bold">{mr.pointsLegend}</span>
                  {[
                    { color: "bg-[#00f948]", label: "7+" },
                    { color: "bg-amber-400", label: "4–6" },
                    { color: "bg-white/20", label: "1–3" },
                  ].map(({ color, label }) => (
                    <div key={label} className="flex items-center gap-1">
                      <span className={cn("w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center text-black", color)} />
                      <span className="text-[9px] text-white/30">{label}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Footer */}
          <div className="px-6 py-4 border-t border-white/[0.04] flex items-center justify-between">
            <span className="text-xs font-display font-black text-white/20 uppercase tracking-widest">
              MOVE<span className="text-[#00f948]/40">MATCH</span>
            </span>
            <span className="text-[10px] text-white/15">{siteHost}</span>
          </div>
        </motion.div>

        {/* CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-5"
        >
          <Link
            href="/gameweek"
            className="flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/[0.10] text-white/60 font-display font-bold uppercase tracking-wider text-sm hover:border-white/[0.20] hover:text-white/80 transition-all"
          >
            {mr.ctaNextGw}
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
