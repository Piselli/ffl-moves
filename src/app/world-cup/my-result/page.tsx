"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from "react";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { RegisteredSquadShowcase } from "@/components/RegisteredSquadShowcase";
import {
  getGameweek,
  getGameweekStats,
  getTeamResult,
  getUserTeam,
  hasRegisteredTeam,
  type GameweekSummary,
} from "@/lib/movement";
import {
  WC_ROUNDS,
  findOpenWorldCupTourFromChain,
  getWorldCupRound,
} from "@/lib/worldcup";
import { computeChainAlignedXiBreakdown } from "@/lib/chainAlignedScoring";
import { enrichSquadFromCatalog, squadPlayersFromChain } from "@/lib/fplSquadResolve";
import { calculateFantasyPointsWithRating } from "@/lib/scoring";
import { FORMATION } from "@/lib/constants";
import { Player, TeamResult } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";

type TourOption = {
  tourId: number;
  label: string;
  summary: GameweekSummary | null;
};

function isCompleteSquad(starters: Player[], bench: Player[]) {
  return starters.length === 11 && bench.length === FORMATION.BENCH;
}

function WorldCupMyResultContent() {
  const { connected, account } = useWallet();
  const searchParams = useSearchParams();
  const msgs = useSiteMessages();
  const wc = msgs.pages.worldCup;
  const g = msgs.pages.gameweek;
  const mr = msgs.pages.myResult;
  const lt = msgs.pages.leaderboardTable;

  const [loading, setLoading] = useState(true);
  const [tourOptions, setTourOptions] = useState<TourOption[]>([]);
  const [selectedTourId, setSelectedTourId] = useState(0);
  const [tourSummary, setTourSummary] = useState<GameweekSummary | null>(null);
  const [teamResult, setTeamResult] = useState<TeamResult | null>(null);
  const [starters, setStarters] = useState<Player[]>([]);
  const [bench, setBench] = useState<Player[]>([]);
  const [tourStats, setTourStats] = useState<Record<string, Record<string, unknown>>>({});
  const [openTourId, setOpenTourId] = useState<number | null>(null);

  useEffect(() => {
    if (!connected || !account?.address) {
      setLoading(false);
      return;
    }

    const addr = account.address.toString();
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [openTour] = await Promise.all([findOpenWorldCupTourFromChain()]);
        if (cancelled) return;
        setOpenTourId(openTour?.id ?? null);

        const registered: TourOption[] = [];

        for (const round of WC_ROUNDS) {
          const hasTeam = await hasRegisteredTeam(addr, round.tourId);
          if (!hasTeam) continue;
          const summary = await getGameweek(round.tourId);
          registered.push({
            tourId: round.tourId,
            label: wc.roundName(round.key),
            summary,
          });
        }

        if (cancelled) return;
        setTourOptions(registered);

        const fromQuery = Number.parseInt(searchParams.get("tour") ?? "", 10);
        const preferred =
          registered.find((t) => t.tourId === fromQuery)?.tourId ??
          registered[registered.length - 1]?.tourId ??
          0;
        setSelectedTourId(preferred);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [connected, account?.address, searchParams, wc]);

  const loadTourSquad = useCallback(
    async (tourId: number) => {
      if (!account?.address || tourId <= 0) return;
      const addr = account.address.toString();

      const [summary, chainTeam, result, playersRes] = await Promise.all([
        getGameweek(tourId),
        getUserTeam(addr, tourId),
        getTeamResult(addr, tourId),
        fetch("/api/wc-players").then((r) => (r.ok ? r.json() : [])),
      ]);

      setTourSummary(summary);
      setTeamResult(result);

      if (!chainTeam?.playerIds?.length) {
        setStarters([]);
        setBench([]);
        setTourStats({});
        return;
      }

      const catalog = new Map((playersRes as Player[]).map((p) => [p.id, p]));
      const squad = squadPlayersFromChain(
        { playerIds: chainTeam.playerIds, playerPositions: chainTeam.playerPositions },
        catalog,
      );
      if (squad.length !== FORMATION.TOTAL) {
        setStarters([]);
        setBench([]);
        setTourStats({});
        return;
      }

      const nextStarters = squad.slice(0, 11);
      const nextBench = squad.slice(11);
      setStarters(nextStarters);
      setBench(nextBench);

      const stats = (await getGameweekStats(tourId, chainTeam.playerIds)) as Record<
        string,
        Record<string, unknown>
      >;
      setTourStats(stats);

      const snapshot = enrichSquadFromCatalog({ starters: nextStarters, bench: nextBench }, catalog);
      if (isCompleteSquad(snapshot.starters, snapshot.bench)) {
        setStarters(snapshot.starters);
        setBench(snapshot.bench);
      }
    },
    [account?.address],
  );

  useEffect(() => {
    if (selectedTourId <= 0) return;
    void loadTourSquad(selectedTourId);
  }, [selectedTourId, loadTourSquad]);

  const officialResolved = useMemo(() => {
    if (teamResult == null || !isCompleteSquad(starters, bench)) return null;
    return {
      teamResult,
      breakdown: computeChainAlignedXiBreakdown(starters, bench, tourStats),
    };
  }, [teamResult, starters, bench, tourStats]);

  const interimBreakdown = useMemo(() => {
    if (teamResult != null) return null;
    if (tourSummary?.status !== "closed" && tourSummary?.status !== "resolved") return null;
    if (!isCompleteSquad(starters, bench)) return null;
    if (Object.keys(tourStats).length === 0) return null;
    return computeChainAlignedXiBreakdown(starters, bench, tourStats);
  }, [teamResult, tourSummary?.status, starters, bench, tourStats]);

  const showScores =
    (tourSummary?.status === "closed" || tourSummary?.status === "resolved") &&
    Object.keys(tourStats).length > 0;

  const calculatePlayerPoints = (player: Player) => {
    const stats = tourStats[player.id] ?? tourStats[String(player.id)];
    return calculateFantasyPointsWithRating(player, stats as Record<string, unknown>);
  };

  const chainAlignedCopy = {
    multiplierFooter: g.registeredMultiplierFooter,
    viaSub: g.registeredViaSub,
  };

  if (!connected) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-3xl p-14 text-center max-w-md w-full">
          <h1 className="text-2xl font-display font-black text-white mb-3 uppercase tracking-tight">{mr.connectTitle}</h1>
          <p className="text-white/40 text-sm">{mr.connectHint}</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
        <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#00f948] animate-spin" />
      </div>
    );
  }

  if (tourOptions.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 pt-28 pb-12">
        <Link href="/world-cup/leaderboard" className="text-xs font-bold uppercase tracking-widest text-[#00f948]/70 hover:text-[#00f948]">
          {wc.myResultBackLeaderboard}
        </Link>
        <div className="mt-8 bg-white/[0.03] border border-white/[0.08] rounded-3xl p-14 text-center">
          <p className="text-white/40 text-sm mb-6">{wc.myResultNoSquads}</p>
          {openTourId != null ? (
            <Link
              href="/world-cup/squad"
              className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-[#00f948]/10 border border-[#00f948]/20 text-[#00f948] font-display font-bold text-xs uppercase tracking-wider hover:bg-[#00f948]/20 transition-all"
            >
              {wc.myResultOpenRegistrationCta}
            </Link>
          ) : (
            <Link href="/world-cup" className="text-[#00f948] text-sm font-semibold hover:underline">
              {wc.backToHub}
            </Link>
          )}
        </div>
      </div>
    );
  }

  const roundLabel = wc.roundName(getWorldCupRound(selectedTourId)?.key ?? "");

  return (
    <div className="max-w-4xl mx-auto px-4 pt-28 pb-12">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <Link href="/world-cup/leaderboard" className="text-xs font-bold uppercase tracking-widest text-[#00f948]/70 hover:text-[#00f948]">
          {wc.myResultBackLeaderboard}
        </Link>
        {openTourId != null && openTourId !== selectedTourId ? (
          <Link
            href="/world-cup/squad"
            className="text-[10px] font-bold uppercase tracking-wider text-white/45 hover:text-[#00f948] border border-white/10 hover:border-[#00f948]/30 px-3 py-1 rounded-full transition-colors"
          >
            {wc.myResultOpenRegistrationCta}
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
        <div>
          <span className="text-[10px] font-bold uppercase tracking-widest text-[#00f948]/60">{wc.badge}</span>
          <h1 className="text-3xl font-display font-black text-white uppercase tracking-tight mt-1">{wc.myResultPageTitle}</h1>
        </div>
        <div className="flex items-center gap-2 bg-white/[0.04] border border-white/[0.08] px-4 py-2 rounded-2xl">
          <span className="text-white/40 text-xs font-bold uppercase tracking-widest">{wc.myResultTourPicker}</span>
          <select
            value={selectedTourId}
            onChange={(e) => setSelectedTourId(Number(e.target.value))}
            className="bg-transparent text-white text-sm font-bold focus:outline-none cursor-pointer"
          >
            {tourOptions.map((t) => (
              <option key={t.tourId} value={t.tourId} className="bg-[#0D0F12]">
                {t.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {tourSummary ? (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-3 mb-6 flex items-center gap-4 flex-wrap">
          <span className="text-sm font-bold text-white">{roundLabel}</span>
          <span
            className={cn(
              "text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full border",
              tourSummary.status === "open" && "text-emerald-400 border-emerald-500/25 bg-emerald-500/10",
              tourSummary.status === "closed" && "text-amber-400 border-amber-500/25 bg-amber-500/10",
              tourSummary.status === "resolved" && "text-[#00f948] border-[#00f948]/25 bg-[#00f948]/10",
            )}
          >
            {tourSummary.status === "open"
              ? wc.statusOpen
              : tourSummary.status === "closed"
                ? wc.statusClosed
                : wc.statusResolved}
          </span>
          {teamResult && teamResult.rank > 0 ? (
            <span className="text-xs text-white/45 tabular-nums">
              #{teamResult.rank} · {teamResult.finalPoints} {lt.colPoints.toLowerCase()}
            </span>
          ) : null}
        </div>
      ) : null}

      {isCompleteSquad(starters, bench) ? (
        <RegisteredSquadShowcase
          starters={starters}
          bench={bench}
          gameweekStats={tourStats}
          showScores={showScores}
          getPoints={calculatePlayerPoints}
          posAbbrev={msgs.positionAbbrev}
          benchAbbrev={msgs.recap.benchAbbrev}
          startersHeading={g.startersSection}
          benchSectionLabel={g.benchSection}
          statsPendingHint={!showScores && tourSummary && tourSummary.status !== "open" ? mr.statsPending : null}
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
      ) : (
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-10 text-center text-white/35 text-sm">
          {mr.loading}
        </div>
      )}
    </div>
  );
}

export default function WorldCupMyResultPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-4xl mx-auto px-4 pt-28 pb-12 flex items-center justify-center">
          <div className="w-10 h-10 rounded-full border-2 border-white/10 border-t-[#00f948] animate-spin" />
        </div>
      }
    >
      <WorldCupMyResultContent />
    </Suspense>
  );
}
