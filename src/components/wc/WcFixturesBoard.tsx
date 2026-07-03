"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import { WC_ROUNDS, type WorldCupRound } from "@/lib/worldcup";
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
  penaltyH?: number | null;
  penaltyA?: number | null;
  winner?: "home" | "away" | null;
  group: string | null;
  roundKey: string | null;
}

interface FixturesPayload {
  source?: string;
  deadlineTime?: string | null;
  deadlineEpochMs?: number | null;
  fixtures?: ApiFixture[];
}

type Status = "finished" | "live" | "upcoming";

function fixtureStatus(f: ApiFixture): Status {
  if (f.finished) return "finished";
  if (f.started) return "live";
  return "upcoming";
}

function isTbd(f: ApiFixture): boolean {
  return f.home === "TBD" && f.away === "TBD";
}

function localeTag(locale: string): string {
  return locale === "uk" ? "uk-UA" : "en-GB";
}

function formatKickoff(iso: string | null, locale: string): { date: string; time: string } | null {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  const d = new Date(ms);
  const tag = localeTag(locale);
  return {
    date: new Intl.DateTimeFormat(tag, { day: "2-digit", month: "short" }).format(d),
    time: new Intl.DateTimeFormat(tag, { hour: "2-digit", minute: "2-digit" }).format(d),
  };
}

/** A single team side — crest (with graceful fallback) + 3-letter code. */
function TeamSide({
  name,
  code,
  crest,
  align,
}: {
  name: string;
  code: string | null;
  crest: string | null;
  align: "left" | "right";
}) {
  const [broken, setBroken] = useState(false);
  const label = code || name?.slice(0, 3).toUpperCase() || "—";
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center gap-2.5",
        align === "right" ? "flex-row-reverse text-right" : "text-left",
      )}
      title={name}
    >
      <span className="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-[3px] bg-white/[0.06] ring-1 ring-white/10">
        {crest && !broken ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={crest}
            alt=""
            width={28}
            height={28}
            className="h-full w-full object-contain"
            onError={() => setBroken(true)}
            referrerPolicy="no-referrer"
            aria-hidden
          />
        ) : (
          <span className="font-mono text-[8px] font-bold uppercase text-white/40">{label.slice(0, 2)}</span>
        )}
      </span>
      <span className="min-w-0">
        <span className="block truncate font-display text-[13px] font-bold uppercase tracking-wide text-white/85">
          {label}
        </span>
        <span className="block truncate text-[10px] leading-tight text-white/35">{name}</span>
      </span>
    </div>
  );
}

function MatchRow({ f, delay }: { f: ApiFixture; delay: number }) {
  const m = useSiteMessages();
  const fx = m.pages.worldCup.fx;
  const { locale } = useSiteLocale();
  const reduce = useReducedMotion();
  const status = fixtureStatus(f);
  const tbd = isTbd(f);
  const kick = formatKickoff(f.kickoffTime, locale);
  const hasScore = (status === "finished" || status === "live") && f.scoreH != null && f.scoreA != null;
  const hasPens = hasScore && f.penaltyH != null && f.penaltyA != null;

  return (
    <motion.div
      initial={reduce ? false : { opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4, delay, ease: EASE_OUT }}
      className={cn(
        "flex items-center gap-3 rounded-xl border px-3.5 py-3 transition-colors sm:px-4",
        status === "live"
          ? "border-[#00f948]/30 bg-[#00f948]/[0.04]"
          : "border-white/[0.07] bg-[#0a0c0f]/70 hover:border-white/15",
      )}
    >
      {tbd ? (
        <span className="flex-1 text-center font-display text-sm font-bold uppercase tracking-widest text-white/25">
          {fx.tbd} <span className="px-1 text-white/15">vs</span> {fx.tbd}
        </span>
      ) : (
        <>
          <TeamSide name={f.home} code={f.homeCode} crest={f.homeCrest} align="left" />

          {/* Center — score or kickoff time */}
          <div className="flex w-[78px] shrink-0 flex-col items-center">
            {hasScore ? (
              <span className="font-display text-lg font-black tabular-nums leading-none text-white">
                {f.scoreH}
                {hasPens ? <span className="text-xs text-white/45">({f.penaltyH})</span> : null}
                <span className="px-1 text-white/30">-</span>
                {f.scoreA}
                {hasPens ? <span className="text-xs text-white/45">({f.penaltyA})</span> : null}
              </span>
            ) : (
              <span className="font-display text-sm font-bold tabular-nums leading-none text-white/70">
                {kick?.time ?? fx.timeTbc}
              </span>
            )}
            <span
              className={cn(
                "mt-1.5 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider",
                status === "finished" && "bg-white/[0.06] text-white/45",
                status === "live" && "bg-[#00f948]/15 text-[#00f948]",
                status === "upcoming" && "text-white/30",
              )}
            >
              {status === "live" ? (
                <span className="h-1 w-1 animate-pulse rounded-full bg-[#00f948]" aria-hidden />
              ) : null}
              {status === "finished" ? fx.statusFinished : status === "live" ? fx.statusLive : kick?.date ?? fx.statusUpcoming}
            </span>
          </div>

          <TeamSide name={f.away} code={f.awayCode} crest={f.awayCrest} align="right" />
        </>
      )}
    </motion.div>
  );
}

export function WcFixturesBoard({ initialRoundKey }: { initialRoundKey?: string }) {
  const m = useSiteMessages();
  const wc = m.pages.worldCup;
  const fx = wc.fx;
  const { locale } = useSiteLocale();
  const reduce = useReducedMotion();

  const validInitial = WC_ROUNDS.some((r) => r.key === initialRoundKey)
    ? (initialRoundKey as string)
    : WC_ROUNDS[0].key;
  const [activeKey, setActiveKey] = useState<string>(validInitial);
  const [payload, setPayload] = useState<FixturesPayload | null>(null);
  const [loading, setLoading] = useState(true);

  const activeRound: WorldCupRound =
    WC_ROUNDS.find((r) => r.key === activeKey) ?? WC_ROUNDS[0];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/wc-fixtures?round=${activeKey}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: FixturesPayload) => {
        if (!cancelled) setPayload(d);
      })
      .catch(() => {
        if (!cancelled) setPayload({ fixtures: [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeKey]);

  const fixtures = useMemo(() => payload?.fixtures ?? [], [payload]);

  /** Group-stage fixtures bucketed by group letter A..L (in order). */
  const groups = useMemo(() => {
    if (activeRound.stage !== "group") return null;
    const byLetter = new Map<string, ApiFixture[]>();
    for (const f of fixtures) {
      const key = f.group ?? "?";
      const arr = byLetter.get(key) ?? [];
      arr.push(f);
      byLetter.set(key, arr);
    }
    return Array.from(byLetter.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [fixtures, activeRound.stage]);

  const deadline = formatKickoff(payload?.deadlineTime ?? null, locale);

  return (
    <div className="mx-auto max-w-4xl px-4 pb-20 pt-28 sm:px-6">
      <div className="mb-5">
        <Link
          href="/world-cup"
          className="text-xs font-bold uppercase tracking-widest text-[#00f948]/70 transition-colors hover:text-[#00f948]"
        >
          {wc.backToHub}
        </Link>
      </div>

      <WcSectionEyebrow>{wc.badge}</WcSectionEyebrow>
      <h1 className="mt-4 font-wc-display text-4xl uppercase leading-[0.95] tracking-tight text-white sm:text-5xl">
        {fx.title}
      </h1>
      <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/45">{fx.subtitle}</p>

      {/* Round switcher */}
      <div className="relative -mx-4 mt-7 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-2">
          {WC_ROUNDS.map((r) => {
            const active = r.key === activeKey;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setActiveKey(r.key)}
                className={cn(
                  "shrink-0 rounded-full border px-3.5 py-1.5 font-wc-hero text-[11px] font-bold uppercase tracking-[0.06em] transition-colors",
                  active
                    ? "border-[#00f948]/40 bg-[#00f948]/[0.1] text-[#00f948]"
                    : "border-white/10 bg-white/[0.03] text-white/50 hover:border-white/20 hover:text-white/80",
                )}
              >
                {wc.roundName(r.key)}
              </button>
            );
          })}
        </div>
      </div>

      {/* Deadline */}
      {deadline ? (
        <div className="mt-4 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-white/35">
          <span className="h-1 w-1 rounded-full bg-[#00f948]" aria-hidden />
          {fx.deadlineLabel}: <span className="text-white/70">{deadline.date} · {deadline.time}</span>
        </div>
      ) : null}

      {/* Body */}
      <div className="mt-6">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="h-9 w-9 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
            <span className="ml-3 text-sm text-white/40">{fx.loading}</span>
          </div>
        ) : fixtures.length === 0 ? (
          <div className="rounded-2xl border border-white/[0.08] bg-white/[0.02] px-6 py-14 text-center">
            <h2 className="font-display text-xl font-black uppercase tracking-tight text-white">{fx.emptyTitle}</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/40">{fx.emptyHint}</p>
          </div>
        ) : groups ? (
          <motion.div
            key={activeKey}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="grid gap-5 sm:grid-cols-2"
          >
            {groups.map(([letter, list]) => (
              <div key={letter}>
                <h3 className="mb-2.5 flex items-center gap-2 font-display text-xs font-black uppercase tracking-widest text-white/40">
                  <span className="h-px w-3 bg-[#00f948]/50" aria-hidden />
                  {fx.groupLabel(letter)}
                </h3>
                <div className="flex flex-col gap-2">
                  {list.map((f, i) => (
                    <MatchRow key={f.id} f={f} delay={i * 0.03} />
                  ))}
                </div>
              </div>
            ))}
          </motion.div>
        ) : (
          <motion.div
            key={activeKey}
            initial={reduce ? false : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col gap-2"
          >
            {fixtures.map((f, i) => (
              <MatchRow key={f.id} f={f} delay={i * 0.03} />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
