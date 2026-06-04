"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { useSiteMessages, useSiteLocale } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import { WcSectionEyebrow } from "@/components/wc/WcSectionEyebrow";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

interface ApiFixture {
  id: number;
  kickoffTime: string | null;
  home: string;
  away: string;
  homeCode: string | null;
  awayCode: string | null;
  homeCrest: string | null;
  awayCrest: string | null;
  finished: boolean;
  started: boolean;
  scoreH: number | null;
  scoreA: number | null;
  group: string | null;
}

function localeTag(locale: string): string {
  return locale === "uk" ? "uk-UA" : "en-GB";
}

function Crest({ url, code }: { url: string | null; code: string | null }) {
  const [broken, setBroken] = useState(false);
  if (url && !broken) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={url}
        alt=""
        width={22}
        height={22}
        className="h-[22px] w-[22px] object-contain"
        onError={() => setBroken(true)}
        referrerPolicy="no-referrer"
        aria-hidden
      />
    );
  }
  return (
    <span className="flex h-[22px] w-[22px] items-center justify-center rounded-[2px] bg-white/[0.06] font-mono text-[8px] font-bold text-white/40">
      {(code || "—").slice(0, 2)}
    </span>
  );
}

function TeaserCard({ f, locale, delay }: { f: ApiFixture; locale: string; delay: number }) {
  const reduce = useReducedMotion();
  const live = f.started && !f.finished;
  const hasScore = (f.finished || live) && f.scoreH != null && f.scoreA != null;
  const time = f.kickoffTime && Number.isFinite(Date.parse(f.kickoffTime))
    ? new Intl.DateTimeFormat(localeTag(locale), {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(new Date(f.kickoffTime))
    : "TBC";

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay, ease: EASE_OUT }}
      className={cn(
        "flex flex-col gap-2 rounded-xl border bg-[#0a0c0f]/70 px-3.5 py-3",
        live ? "border-[#00f948]/30" : "border-white/[0.07]",
      )}
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[8.5px] font-bold uppercase tracking-[0.16em] text-white/30">
          {f.group ? `Group ${f.group}` : ""}
        </span>
        <span className={cn("font-mono text-[8.5px] uppercase tracking-[0.08em]", live ? "text-[#00f948]" : "text-white/30")}>
          {hasScore ? (live ? "LIVE" : "FT") : time}
        </span>
      </div>
      <div className="flex items-center justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <Crest url={f.homeCrest} code={f.homeCode} />
          <span className="truncate font-display text-[12px] font-bold uppercase tracking-wide text-white/80">
            {f.homeCode || f.home.slice(0, 3).toUpperCase()}
          </span>
        </div>
        <span className="shrink-0 font-display text-sm font-black tabular-nums text-white/70">
          {hasScore ? `${f.scoreH}-${f.scoreA}` : <span className="text-white/20">vs</span>}
        </span>
        <div className="flex min-w-0 flex-row-reverse items-center gap-2">
          <Crest url={f.awayCrest} code={f.awayCode} />
          <span className="truncate font-display text-[12px] font-bold uppercase tracking-wide text-white/80">
            {f.awayCode || f.away.slice(0, 3).toUpperCase()}
          </span>
        </div>
      </div>
    </motion.div>
  );
}

/** Compact upcoming-matches teaser for the WC hub. Links to the full /world-cup/fixtures board. */
export function WcUpcomingMatches({ roundKey = "md1" }: { roundKey?: string }) {
  const m = useSiteMessages();
  const wc = m.pages.worldCup;
  const fx = wc.fx;
  const { locale } = useSiteLocale();
  const [fixtures, setFixtures] = useState<ApiFixture[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/wc-fixtures?round=${roundKey}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: { fixtures?: ApiFixture[] }) => {
        if (!cancelled) setFixtures(Array.isArray(d.fixtures) ? d.fixtures : []);
      })
      .catch(() => {
        if (!cancelled) setFixtures([]);
      });
    return () => {
      cancelled = true;
    };
  }, [roundKey]);

  // Nothing to tease until the schedule is published — keep the hub clean.
  if (fixtures != null && fixtures.length === 0) return null;

  const shown = (fixtures ?? []).filter((f) => !(f.home === "TBD" && f.away === "TBD")).slice(0, 6);

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6 sm:py-14">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <WcSectionEyebrow>{wc.roundName(roundKey)}</WcSectionEyebrow>
          <h2 className="mt-4 font-wc-display text-3xl uppercase leading-[0.95] tracking-tight text-white sm:text-4xl">
            {fx.teaserTitle}
          </h2>
        </div>
        <Link
          href="/world-cup/fixtures"
          className="group inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.04] px-5 py-2.5 font-wc-hero text-xs font-bold uppercase tracking-[0.06em] text-white/90 transition-colors hover:border-[#00f948]/30 hover:bg-[#00f948]/[0.08] hover:text-[#00f948]"
        >
          {fx.seeAll}
          <svg className="h-3.5 w-3.5 transition-transform duration-200 ease-out group-hover:translate-x-[2px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>

      {shown.length === 0 ? (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-[78px] animate-pulse rounded-xl border border-white/[0.06] bg-white/[0.02]" />
          ))}
        </div>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((f, i) => (
            <TeaserCard key={f.id} f={f} locale={locale} delay={i * 0.04} />
          ))}
        </div>
      )}
    </section>
  );
}
