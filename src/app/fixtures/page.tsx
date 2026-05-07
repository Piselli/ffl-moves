"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { resolveFplDeadlineRaw, formatFplDeadlineLocale } from "@/lib/fpl-deadline";
import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";

type Fixture = {
  id: number;
  kickoffTime: string | null;
  finished: boolean;
  started: boolean;
  scoreH: number | null;
  scoreA: number | null;
  teamH: { id: number; name: string; shortName: string; badge: string };
  teamA: { id: number; name: string; shortName: string; badge: string };
};

type FixturesData = {
  gameweek: {
    id: number;
    name: string;
    deadlineTime: string | null;
    deadlineEpochMs?: number | null;
    isCurrent: boolean;
    isNext: boolean;
  };
  fixtures: Fixture[];
};

function groupByDate(fixtures: Fixture[], localeTag: string, dateTbcLabel: string): Record<string, Fixture[]> {
  const groups: Record<string, Fixture[]> = {};
  for (const fx of fixtures) {
    if (!fx.kickoffTime) {
      if (!groups[dateTbcLabel]) groups[dateTbcLabel] = [];
      groups[dateTbcLabel].push(fx);
      continue;
    }
    const key = new Date(fx.kickoffTime).toLocaleDateString(localeTag, {
      weekday: "long", day: "numeric", month: "long",
    });
    if (!groups[key]) groups[key] = [];
    groups[key].push(fx);
  }
  return groups;
}

export default function FixturesPage() {
  const { locale } = useSiteLocale();
  const fx = useSiteMessages().pages.fixtures;
  const localeTag = locale === "uk" ? "uk-UA" : "en-GB";
  const [data, setData] = useState<FixturesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    fetch("/api/fixtures", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(true);
        else setData(d);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const groups = data ? groupByDate(data.fixtures, localeTag, fx.dateTbc) : {};
  const totalMatches = data?.fixtures.length ?? 0;
  const finishedCount = data?.fixtures.filter((f) => f.finished).length ?? 0;

  const deadlineRaw = data ? resolveFplDeadlineRaw(data.gameweek) : null;

  return (
    <div className="bg-[#0D0F12] min-h-screen text-white">
      <div className="max-w-4xl mx-auto px-6 sm:px-10 pt-28 pb-16">

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-10"
        >
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-white/30 hover:text-white/60 text-[10px] font-bold uppercase tracking-widest transition-colors mb-6"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
            {fx.back}
          </Link>

          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              {data && (
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[#00f948] text-[10px] font-bold uppercase tracking-widest mb-3">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00f948]" />
                  {data.gameweek.name}
                </div>
              )}
              <h1 className="text-4xl md:text-5xl font-display font-black text-white uppercase tracking-tight leading-[1.1]">
                {fx.title}
              </h1>
            </div>

            {deadlineRaw != null && deadlineRaw !== "" && (
              <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl px-5 py-3 text-right sm:text-left shrink-0">
                <p className="text-[9px] text-white/30 uppercase tracking-[0.2em] font-bold mb-1">{fx.deadlineLabel}</p>
                <p className="text-base font-display font-black text-white">
                  {formatFplDeadlineLocale(deadlineRaw, locale === "uk" ? "uk" : "en")}
                </p>
              </div>
            )}
          </div>

          {/* Progress bar */}
          {data && totalMatches > 0 && (
            <div className="mt-5 flex items-center gap-3">
              <div className="flex-1 h-1 bg-white/[0.06] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#00f948] rounded-full transition-all duration-700"
                  style={{ width: `${(finishedCount / totalMatches) * 100}%` }}
                />
              </div>
              <span className="text-xs text-white/30 font-medium tabular-nums shrink-0">
                {fx.progressDone(finishedCount, totalMatches)}
              </span>
            </div>
          )}
        </motion.div>

        {/* Loading */}
        {loading && (
          <div className="space-y-6">
            <p className="text-white/30 text-xs font-bold uppercase tracking-widest animate-pulse">{fx.loading}</p>
            {[1, 2].map((g) => (
              <div key={g}>
                <div className="h-3 w-32 bg-white/[0.06] rounded animate-pulse mb-3" />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-14 rounded-xl bg-white/[0.03] border border-white/[0.05] animate-pulse" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error */}
        {error && !loading && (
          <div className="text-center py-20 text-white/30">
            <p className="text-lg font-semibold">{fx.errorTitle}</p>
            <p className="text-sm mt-1">{fx.errorHint}</p>
          </div>
        )}

        {/* Fixtures grouped by date */}
        {!loading && !error && data && (
          <div className="space-y-8">
            {data.fixtures.length === 0 && (
              <p className="text-white/45 text-sm leading-relaxed max-w-xl">{fx.emptyScheduleHint}</p>
            )}
            {Object.entries(groups).map(([date, matches], gi) => (
              <motion.div
                key={date}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: gi * 0.07 }}
              >
                {/* Date label */}
                <p className="text-[10px] font-bold text-white/25 uppercase tracking-[0.2em] mb-3 capitalize">
                  {date}
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {matches.map((match) => {
                    const time =
                      match.kickoffTime != null
                        ? new Date(match.kickoffTime).toLocaleTimeString(localeTag, {
                            hour: "2-digit",
                            minute: "2-digit",
                          })
                        : fx.timeTbc;

                    const statusBadge = match.finished
                      ? <span className="text-[9px] font-bold text-white/25 uppercase tracking-wider">{fx.finished}</span>
                      : match.started
                      ? <span className="flex items-center gap-1 text-[9px] font-bold text-[#00f948] uppercase tracking-wider"><span className="w-1.5 h-1.5 rounded-full bg-[#00f948] animate-pulse" />Live</span>
                      : null;

                    return (
                      <div
                        key={match.id}
                        className="group flex items-center gap-4 px-5 py-4 rounded-2xl bg-white/[0.02] border border-white/[0.06] hover:bg-white/[0.04] hover:border-white/[0.10] transition-all duration-200"
                      >
                        {/* Home team */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0">
                          <img
                            src={match.teamH.badge}
                            alt={match.teamH.shortName}
                            className="w-7 h-7 object-contain shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                          />
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-white truncate leading-none">{match.teamH.shortName}</p>
                            <p className="text-[10px] text-white/30 truncate mt-0.5 hidden sm:block">{match.teamH.name}</p>
                          </div>
                        </div>

                        {/* Center: score or time */}
                        <div className="shrink-0 flex flex-col items-center gap-0.5 px-1">
                          {match.finished ? (
                            <span className="text-lg font-display font-black text-white tabular-nums leading-none">
                              {match.scoreH} – {match.scoreA}
                            </span>
                          ) : match.started ? (
                            <span className="text-lg font-display font-black text-[#00f948] tabular-nums leading-none animate-pulse">
                              {match.scoreH ?? 0} – {match.scoreA ?? 0}
                            </span>
                          ) : (
                            <span className="text-sm font-display font-black text-white/50 tabular-nums leading-none">
                              {time}
                            </span>
                          )}
                          {statusBadge}
                        </div>

                        {/* Away team */}
                        <div className="flex items-center gap-2.5 flex-1 min-w-0 justify-end">
                          <div className="min-w-0 text-right">
                            <p className="text-sm font-bold text-white truncate leading-none">{match.teamA.shortName}</p>
                            <p className="text-[10px] text-white/30 truncate mt-0.5 hidden sm:block">{match.teamA.name}</p>
                          </div>
                          <img
                            src={match.teamA.badge}
                            alt={match.teamA.shortName}
                            className="w-7 h-7 object-contain shrink-0"
                            onError={(e) => { (e.target as HTMLImageElement).style.opacity = "0"; }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            ))}

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="pt-4 text-center"
            >
              <Link
                href="/gameweek"
                className="inline-flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-[#00f948] text-black font-display font-black uppercase tracking-widest text-sm hover:brightness-110 hover:scale-[1.02] transition-all duration-200 shadow-[0_0_20px_rgba(0,249,72,0.25)]"
              >
                {fx.buildSquad}
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
            </motion.div>
          </div>
        )}

      </div>
    </div>
  );
}
