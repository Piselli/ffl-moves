"use client";

import { useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { REGISTER_CTA_CLASS } from "@/components/season/seasonActionShared";
import type { PagesMessages } from "@/i18n/pages";
import type { SiteLocale } from "@/i18n/types";
import { cn } from "@/lib/utils";

const EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1];

export type FplFixture = {
  id: number;
  kickoffTime: string | null;
  finished: boolean;
  started: boolean;
  scoreH: number | null;
  scoreA: number | null;
  teamH: { id: number; name: string; shortName: string; badge: string };
  teamA: { id: number; name: string; shortName: string; badge: string };
};

export type FplFixturesPayload = {
  gameweek: {
    id: number;
    name: string;
    deadlineTime: string | null;
    deadlineEpochMs?: number | null;
    isCurrent: boolean;
    isNext: boolean;
  };
  fixtures: FplFixture[];
};

type Status = "finished" | "live" | "upcoming";

function fixtureStatus(f: FplFixture): Status {
  if (f.finished) return "finished";
  if (f.started) return "live";
  return "upcoming";
}

function localeTag(locale: SiteLocale): string {
  return locale === "uk" ? "uk-UA" : "en-GB";
}

function formatKickoffTime(iso: string | null, locale: SiteLocale): string {
  if (!iso || !Number.isFinite(Date.parse(iso))) return "TBC";
  return new Intl.DateTimeFormat(localeTag(locale), {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function TeamCrest({
  badge,
  shortName,
}: {
  badge: string;
  shortName: string;
}) {
  const [broken, setBroken] = useState(false);

  if (badge && !broken) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={badge}
        alt=""
        width={28}
        height={28}
        className="h-7 w-7 shrink-0 object-contain"
        onError={() => setBroken(true)}
        referrerPolicy="no-referrer"
        aria-hidden
      />
    );
  }

  return (
    <span
      className="flex h-7 w-7 shrink-0 items-center justify-center font-mono text-[9px] font-bold uppercase text-white/30"
      aria-hidden
    >
      {shortName.slice(0, 3)}
    </span>
  );
}

function TeamSide({
  name,
  shortName,
  badge,
  align,
}: {
  name: string;
  shortName: string;
  badge: string;
  align: "left" | "right";
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5",
        align === "right" ? "flex-row-reverse justify-self-end" : "justify-self-start",
      )}
      title={name}
    >
      <TeamCrest badge={badge} shortName={shortName} />
      <span className="min-w-0 truncate font-display text-[13px] font-bold uppercase tracking-wide text-white/85">
        {shortName}
      </span>
    </div>
  );
}

function MatchRow({
  match,
  locale,
  fx,
}: {
  match: FplFixture;
  locale: SiteLocale;
  fx: PagesMessages["fixtures"];
}) {
  const status = fixtureStatus(match);
  const hasScore =
    (status === "finished" || status === "live") &&
    match.scoreH != null &&
    match.scoreA != null;

  return (
    <div
      className={cn(
        "grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-center gap-x-4 px-4 py-3.5 sm:gap-x-5 sm:px-5",
        status === "live" && "bg-white/[0.025]",
      )}
    >
      <TeamSide
        name={match.teamH.name}
        shortName={match.teamH.shortName}
        badge={match.teamH.badge}
        align="left"
      />

      <div className="flex flex-col items-center justify-center">
        {hasScore ? (
          <span className="font-display text-base font-black tabular-nums leading-none text-white sm:text-lg">
            {match.scoreH}
            <span className="px-0.5 text-white/30">–</span>
            {match.scoreA}
          </span>
        ) : (
          <span className="font-display text-sm font-bold tabular-nums leading-none text-white/55">
            {formatKickoffTime(match.kickoffTime, locale)}
          </span>
        )}
        <span
          className={cn(
            "mt-1 h-[10px] text-[8px] font-bold uppercase leading-none tracking-[0.12em]",
            status === "finished" && "text-white/30",
            status === "live" && "text-rose-400/90",
            status === "upcoming" && "text-transparent",
          )}
        >
          {status === "finished"
            ? fx.finished
            : status === "live"
              ? fx.statusLive
              : "·"}
        </span>
      </div>

      <TeamSide
        name={match.teamA.name}
        shortName={match.teamA.shortName}
        badge={match.teamA.badge}
        align="right"
      />
    </div>
  );
}

function DayGroupPanel({
  date,
  matches,
  locale,
  fx,
  delay,
}: {
  date: string;
  matches: FplFixture[];
  locale: SiteLocale;
  fx: PagesMessages["fixtures"];
  delay: number;
}) {
  const reduce = useReducedMotion();

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay, ease: EASE_OUT }}
    >
      <GlassPanel matte>
        <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
          <p className="shrink-0 text-[11px] font-bold uppercase tracking-[0.14em] text-white/40 capitalize">
            {date}
          </p>
          <div className="h-px flex-1 bg-white/[0.08]" aria-hidden />
          <span className="shrink-0 text-[10px] font-semibold tabular-nums text-white/25">
            {matches.length}
          </span>
        </div>
        <div className="divide-y divide-white/[0.05]">
          {matches.map((match) => (
            <MatchRow key={match.id} match={match} locale={locale} fx={fx} />
          ))}
        </div>
      </GlassPanel>
    </motion.div>
  );
}

export function FplFixturesBoard({
  data,
  locale,
  fx,
  loading,
  error,
}: {
  data: FplFixturesPayload | null;
  locale: SiteLocale;
  fx: PagesMessages["fixtures"];
  loading: boolean;
  error: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-5">
        <p className="text-xs text-white/30">{fx.loading}</p>
        {[1, 2].map((g) => (
          <GlassPanel key={g} matte className="overflow-hidden">
            <div className="border-b border-white/[0.06] px-5 py-3">
              <div className="h-3 w-36 animate-pulse rounded bg-white/[0.06]" />
            </div>
            <div className="divide-y divide-white/[0.05]">
              {Array.from({ length: g === 1 ? 3 : 2 }).map((_, i) => (
                <div
                  key={i}
                  className="grid grid-cols-[minmax(0,1fr)_4.5rem_minmax(0,1fr)] items-center gap-x-5 px-5 py-3.5"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="h-7 w-7 animate-pulse rounded bg-white/[0.05]" />
                    <div className="h-3 w-12 animate-pulse rounded bg-white/[0.05]" />
                  </div>
                  <div className="mx-auto h-4 w-10 animate-pulse rounded bg-white/[0.06]" />
                  <div className="flex flex-row-reverse items-center gap-2.5 justify-self-end">
                    <div className="h-7 w-7 animate-pulse rounded bg-white/[0.05]" />
                    <div className="h-3 w-12 animate-pulse rounded bg-white/[0.05]" />
                  </div>
                </div>
              ))}
            </div>
          </GlassPanel>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-20 text-center text-white/30">
        <p className="text-lg font-semibold">{fx.errorTitle}</p>
        <p className="mt-1 text-sm">{fx.errorHint}</p>
      </div>
    );
  }

  if (!data) return null;

  const localeTagStr = localeTag(locale);
  const groups: { date: string; matches: FplFixture[] }[] = [];
  const groupIndex = new Map<string, FplFixture[]>();

  for (const fxMatch of data.fixtures) {
    const key =
      fxMatch.kickoffTime != null
        ? new Date(fxMatch.kickoffTime).toLocaleDateString(localeTagStr, {
            weekday: "long",
            day: "numeric",
            month: "long",
          })
        : fx.dateTbc;
    const bucket = groupIndex.get(key);
    if (bucket) bucket.push(fxMatch);
    else {
      const arr = [fxMatch];
      groupIndex.set(key, arr);
      groups.push({ date: key, matches: arr });
    }
  }

  if (data.fixtures.length === 0) {
    return (
      <p className="max-w-xl text-sm leading-relaxed text-white/45">{fx.emptyScheduleHint}</p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group, gi) => (
        <DayGroupPanel
          key={group.date}
          date={group.date}
          matches={group.matches}
          locale={locale}
          fx={fx}
          delay={gi * 0.05}
        />
      ))}

      <div className="pt-6 text-center">
        <Link href="/" className={REGISTER_CTA_CLASS}>
          {fx.buildSquad}
          <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
