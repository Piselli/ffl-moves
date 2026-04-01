"use client";

import { useState, useEffect, useRef } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import { motion } from "framer-motion";
import Link from "next/link";
import { getConfig, getTeamResult, getUserTeam } from "@/lib/aptos";
import { formatMOVE, cn } from "@/lib/utils";
import { Player, TeamResult } from "@/lib/types";
import { useNickname } from "@/hooks/useNickname";

const POSITION_ORDER: Record<string, number> = { GK: 0, DEF: 1, MID: 2, FWD: 3 };

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

function PlayerResultCard({ player, isCaptain }: { player: Player; isCaptain: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "relative flex flex-col items-center gap-1.5 p-2 rounded-2xl border bg-white/[0.03] hover:bg-white/[0.05] transition-colors",
        positionBorder[player.position]
      )}
    >
      {/* Captain badge */}
      {isCaptain && (
        <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#00C46A] text-black text-[9px] font-black flex items-center justify-center shadow-lg shadow-[#00C46A]/30 z-10">
          C
        </span>
      )}

      {/* Photo */}
      <div className={cn("w-14 h-14 rounded-xl overflow-hidden border-2 bg-white/[0.05] flex items-center justify-center shrink-0", positionBorder[player.position])}>
        {player.photo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={player.photo}
            alt={player.name}
            className="w-full h-full object-cover object-top"
            onError={(e) => {
              const img = e.target as HTMLImageElement;
              img.style.display = "none";
              const fb = img.nextElementSibling as HTMLElement;
              if (fb) fb.style.display = "flex";
            }}
          />
        ) : null}
        <span
          className={cn("text-xs font-black items-center justify-center", positionColor[player.position])}
          style={{ display: player.photo ? "none" : "flex" }}
        >
          {player.position}
        </span>
      </div>

      {/* Name */}
      <p className="text-[11px] font-bold text-white text-center leading-tight truncate w-full px-0.5">
        {player.webName || player.name.split(" ").slice(-1)[0]}
      </p>

      {/* Position */}
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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [gwId, setGwId] = useState(0);
  const [result, setResult] = useState<(TeamResult & { owner: string }) | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalParticipants, setTotalParticipants] = useState(0);
  const [copied, setCopied] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!connected || !address) { setLoading(false); return; }

    async function load() {
      setLoading(true);
      setError(null);
      try {
        // 1. Get current gameweek id
        const config = await getConfig();
        if (!config) throw new Error("Не вдалось завантажити конфіг");
        const currentGwId: number = config.currentGameweek;
        setGwId(currentGwId);
        setTotalParticipants(config.totalManagers ?? 0);

        // 2. Get result
        const teamResult = await getTeamResult(address, currentGwId);
        if (!teamResult) throw new Error("Результат не знайдено — тур ще не закритий або ти не реєстрував склад");
        setResult({ ...teamResult, owner: address });

        // 3. Get team player IDs
        const userTeam = await getUserTeam(address, currentGwId);
        if (!userTeam) throw new Error("Склад не знайдено");

        // 4. Load players and map by id
        const playersRes = await fetch("/api/players");
        if (!playersRes.ok) throw new Error("Не вдалось завантажити гравців");
        const allPlayers: Player[] = await playersRes.json();
        const playerMap = new Map(allPlayers.map((p) => [p.id, p]));

        const squad = userTeam.playerIds
          .map((id) => playerMap.get(id))
          .filter(Boolean) as Player[];

        // Sort by position order
        squad.sort((a, b) => (POSITION_ORDER[a.position] ?? 4) - (POSITION_ORDER[b.position] ?? 4));
        setPlayers(squad);
      } catch (e: any) {
        setError(e.message ?? "Щось пішло не так");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [connected, address]);

  const handleShare = async () => {
    const text = result
      ? `🏆 GW${gwId} результат у FPLMove!\n📍 Місце: #${result.rank}\n⚡ Очки: ${result.finalPoints}\n${result.prizeAmount > 0 ? `💰 Приз: ${formatMOVE(result.prizeAmount)} MOVE\n` : ""}🔗 ffl-moves.vercel.app`
      : "FPLMove — Fantasy Football на блокчейні!";

    if (navigator.share) {
      await navigator.share({ text });
    } else {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // ── Not connected ───────────────────────────────────────────────────────────
  if (!connected) {
    return (
      <div className="bg-[#0D0F12] min-h-screen flex items-center justify-center text-white">
        <div className="text-center px-6">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="text-xl font-display font-black uppercase mb-2">Підключи гаманець</h1>
          <p className="text-white/40 text-sm">Щоб побачити свій результат</p>
        </div>
      </div>
    );
  }

  // ── Loading ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="bg-[#0D0F12] min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-white/30">
          <div className="w-8 h-8 border-2 border-white/10 border-t-[#00C46A] rounded-full animate-spin" />
          <p className="text-sm">Завантаження результату…</p>
        </div>
      </div>
    );
  }

  // ── Error ───────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="bg-[#0D0F12] min-h-screen flex items-center justify-center text-white px-6">
        <div className="text-center max-w-sm">
          <p className="text-3xl mb-4">⚠️</p>
          <h1 className="text-lg font-display font-black uppercase mb-2">Результат недоступний</h1>
          <p className="text-white/40 text-sm mb-6">{error}</p>
          <Link href="/leaderboard" className="text-[#00C46A] text-sm font-semibold hover:underline">
            Переглянути лідерборд →
          </Link>
        </div>
      </div>
    );
  }

  const displayName = myNickname ?? (address ? address.slice(0, 6) + "…" + address.slice(-4) : "");
  const isTop3 = result && result.rank >= 1 && result.rank <= 3;

  return (
    <div className="bg-[#0D0F12] min-h-screen text-white">
      <div className="max-w-2xl mx-auto px-5 sm:px-8 pt-28 pb-16">

        {/* Back */}
        <Link
          href="/leaderboard"
          className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-xs font-medium transition-colors mb-8"
        >
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
          Лідерборд
        </Link>

        {/* ── Shareable card ────────────────────────────────────────────────── */}
        <div ref={cardRef}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="relative rounded-3xl border border-white/[0.08] bg-gradient-to-b from-white/[0.04] to-transparent overflow-hidden"
          >
            {/* Top glow for top-3 */}
            {isTop3 && (
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#00C46A]/10 blur-[60px] pointer-events-none" />
            )}

            {/* Header */}
            <div className="relative px-6 pt-7 pb-5 border-b border-white/[0.06]">
              <div className="flex items-start justify-between gap-4">
                <div>
                  {/* GW badge */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.05] border border-white/[0.08] text-[#00C46A] text-[10px] font-bold uppercase tracking-widest mb-3">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00C46A]" />
                    Gameweek {gwId}
                  </div>
                  <h1 className="text-2xl font-display font-black text-white uppercase tracking-tight leading-none">
                    {displayName}
                  </h1>
                  <p className="text-white/30 text-xs mt-1 font-mono">
                    {address?.slice(0, 6)}…{address?.slice(-4)}
                  </p>
                </div>

                {/* Rank badge */}
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
                    { label: "Очки", value: String(result.finalPoints), accent: false },
                    {
                      label: "Приз",
                      value: result.prizeAmount > 0 ? `${formatMOVE(result.prizeAmount)} MOVE` : "—",
                      accent: result.prizeAmount > 0,
                    },
                    {
                      label: "Учасників",
                      value: totalParticipants > 0 ? String(totalParticipants) : "—",
                      accent: false,
                    },
                  ].map(({ label, value, accent }) => (
                    <div key={label} className="bg-white/[0.03] border border-white/[0.06] rounded-xl px-3 py-3 text-center">
                      <p className={cn("text-xl font-display font-black tabular-nums leading-none", accent ? "text-[#00C46A]" : "text-white")}>
                        {value}
                      </p>
                      <p className="text-[10px] text-white/30 uppercase tracking-wider mt-1">{label}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Players grid */}
            {players.length > 0 && (
              <div className="px-6 py-5">
                <p className="text-[10px] text-white/25 uppercase tracking-[0.2em] font-bold mb-4">Склад туру</p>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2.5">
                  {players.map((p) => (
                    <PlayerResultCard
                      key={p.id}
                      player={p}
                      isCaptain={false}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Footer brand */}
            <div className="px-6 py-4 border-t border-white/[0.04] flex items-center justify-between">
              <span className="text-xs font-display font-black text-white/20 uppercase tracking-widest">
                FPL<span className="text-[#00C46A]/40">MOVE</span>
              </span>
              <span className="text-[10px] text-white/15">ffl-moves.vercel.app</span>
            </div>
          </motion.div>
        </div>

        {/* Share / CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="mt-5 flex flex-col sm:flex-row gap-3"
        >
          <button
            onClick={handleShare}
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-[#00C46A] text-black font-display font-black uppercase tracking-wider text-sm hover:brightness-110 hover:scale-[1.01] transition-all shadow-[0_0_20px_rgba(0,196,106,0.25)]"
          >
            {copied ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                Скопійовано!
              </>
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Поділитись результатом
              </>
            )}
          </button>

          <Link
            href="/gameweek"
            className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-2xl border border-white/[0.10] text-white/60 font-display font-bold uppercase tracking-wider text-sm hover:border-white/[0.20] hover:text-white/80 transition-all"
          >
            Наступний тур →
          </Link>
        </motion.div>

      </div>
    </div>
  );
}
