"use client";

/**
 * Season rail sidebar — standing, streak, earn rules, register CTA.
 * Content-height layout; not stretched to match the table.
 */

import Link from "next/link";
import { cn } from "@/lib/utils";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import {
  SP_CLAIM_BONUS,
  SP_FIRST_REGISTRATION,
  SP_REGISTRATION,
  SP_STREAK_TIERS,
  SP_TOP_RANK,
  streakBonusForLength,
} from "@/lib/season-points-rules";
import { LOCKER_CTA } from "@/components/design-lab/locker-hero/ctaStyles";
import { computeNextEventId } from "./seasonActionShared";
import type { SeasonLeaderboardPayload } from "@/lib/seasonPoints";
import type { SeasonEntry } from "./seasonStandingsShared";

const LABEL = "text-[10px] font-bold uppercase tracking-[0.14em] text-white/40";
const PAD = "px-4";
const SECTION = cn("shrink-0 border-b border-white/[0.08] py-4", PAD);
const REGISTER_CLASS =
  "inline-flex min-h-11 w-full items-center justify-center rounded-lg px-4 py-3.5 font-display text-[13px] font-black uppercase leading-none tracking-[0.04em] transition hover:brightness-110 active:scale-[0.985]";

function StandingHeader({
  entry,
  m,
}: {
  entry: SeasonEntry | null;
  m: ReturnType<typeof useSiteMessages>["pages"]["seasonLeaderboard"];
}) {
  return (
    <div className={SECTION}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={LABEL}>{m.heroTotalSp}</p>
          <p className="mt-1.5 font-display text-[2.35rem] font-black tabular-nums leading-none text-white">
            {entry ? entry.totalPoints : "—"}
            <span className="ml-1 text-sm font-bold text-white/30">{m.xpUnit}</span>
          </p>
        </div>
        <div className="text-right">
          <p className={LABEL}>{m.heroRank}</p>
          <p className="mt-1.5 font-display text-[2.35rem] font-black tabular-nums leading-none text-white/80">
            {entry ? `#${entry.rank}` : "—"}
          </p>
        </div>
      </div>
    </div>
  );
}

function StreakBlock({
  entry,
  m,
}: {
  entry: SeasonEntry | null;
  m: ReturnType<typeof useSiteMessages>["pages"]["seasonLeaderboard"];
}) {
  const current = entry?.currentStreak ?? 0;
  const cap = 4;
  const filled = Math.min(Math.max(current, 0), cap);
  const activeBonus = current >= 2 ? streakBonusForLength(current) : 0;

  return (
    <section className={SECTION}>
      <div className="flex items-baseline justify-between gap-3">
        <p className={LABEL}>{m.railStreakTitle}</p>
        {current >= 2 ? (
          <p className="shrink-0 text-sm font-medium tabular-nums text-white/50">
            +{activeBonus}
            <span className="text-white/35">{m.railStreakPerGw}</span>
          </p>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-1.5" aria-hidden>
        {Array.from({ length: cap }).map((_, i) => (
          <span
            key={i}
            className={cn(
              "h-2 flex-1 rounded-full transition-colors",
              i < filled ? "bg-[#00f948]" : "bg-white/[0.08]",
            )}
          />
        ))}
      </div>

      {current < 2 ? (
        <p className="mt-2.5 text-sm leading-snug text-white/40">
          {current === 1 ? m.railStreakOneGw : m.railStreakNone}
        </p>
      ) : null}
    </section>
  );
}

function EarnRulesList({
  m,
}: {
  m: ReturnType<typeof useSiteMessages>["pages"]["seasonLeaderboard"];
}) {
  const subHead = "pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/28";

  return (
    <ul className="space-y-2.5 text-[13px] leading-snug text-white/50">
      <li className="flex justify-between gap-3">
        <span>{m.ruleRegistration}</span>
        <span className="shrink-0 tabular-nums text-white/75">+{SP_REGISTRATION}</span>
      </li>
      <li className="flex justify-between gap-3">
        <span>{m.ruleFirstReg}</span>
        <span className="shrink-0 tabular-nums text-white/75">+{SP_FIRST_REGISTRATION}</span>
      </li>
      <li className={subHead}>{m.ruleTop10Header}</li>
      {[1, 2, 3].map((n) => (
        <li key={n} className="flex justify-between gap-3 pl-0.5">
          <span>{m.ruleRank(n)}</span>
          <span className="tabular-nums text-white/65">+{SP_TOP_RANK[n]}</span>
        </li>
      ))}
      <li className="pl-0.5 text-white/38">{m.ruleRank4to10}</li>
      <li className={subHead}>{m.ruleStreakHeaderEpl}</li>
      {[...SP_STREAK_TIERS].reverse().map((t) => (
        <li key={t.minStreak} className="flex justify-between gap-3 pl-0.5">
          <span>{m.ruleStreak(t.minStreak)}</span>
          <span className="tabular-nums text-white/65">+{t.bonus}</span>
        </li>
      ))}
      <li className="flex justify-between gap-3 border-t border-white/[0.06] pt-2.5">
        <span>{m.ruleClaim}</span>
        <span className="tabular-nums text-white/75">+{SP_CLAIM_BONUS}</span>
      </li>
    </ul>
  );
}

export function SeasonRailPanel({
  data,
  myEntry,
  connected,
}: {
  data: SeasonLeaderboardPayload;
  myEntry: SeasonEntry | null;
  connected: boolean;
}) {
  const m = useSiteMessages().pages.seasonLeaderboard;
  const canRegister = data.status === "live" && computeNextEventId(data) != null;

  return (
    <GlassPanel matte className="!rounded-xl">
      <StandingHeader entry={myEntry} m={m} />

      <StreakBlock entry={myEntry} m={m} />

      <section className={cn(SECTION, "border-b-0 pb-3.5")}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white">
          {m.railEarnTitle}
        </p>
        <div className="mt-3">
          <EarnRulesList m={m} />
        </div>
      </section>

      {canRegister ? (
        <div className={cn("shrink-0 pb-4", PAD)}>
          {!connected ? (
            <p className="mb-3 text-[13px] leading-snug text-white/45">{m.actionConnectHook}</p>
          ) : null}
          <Link href="/" className={REGISTER_CLASS} style={LOCKER_CTA.style}>
            {m.actionRegisterCta}
          </Link>
        </div>
      ) : data.status === "ended" ? (
        <div className={cn("shrink-0 pb-4", PAD)}>
          <p className="text-sm leading-relaxed text-white/45">{m.seasonEndedHint}</p>
        </div>
      ) : null}
    </GlassPanel>
  );
}

export function SeasonRailAside(props: Parameters<typeof SeasonRailPanel>[0]) {
  return <SeasonRailPanel {...props} />;
}
