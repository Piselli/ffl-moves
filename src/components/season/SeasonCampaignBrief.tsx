"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import {
  SP_CLAIM_BONUS,
  SP_FIRST_REGISTRATION,
  SP_REGISTRATION,
  SP_STREAK_TIERS,
  SP_TOP_RANK,
} from "@/lib/season-points-rules";
import type { SeasonLeaderboardPayload } from "@/lib/seasonPoints";
import {
  buildSeasonMetaBits,
  seasonLabel,
  type SeasonEntry,
} from "./seasonStandingsShared";

type Layout = "grid" | "strip" | "accordion" | "details";

export function SeasonRulesDetails({
  data,
  inset = false,
}: {
  data: SeasonLeaderboardPayload;
  /** Rail sidebar — no outer divider, tighter inset plate */
  inset?: boolean;
}) {
  const m = useSiteMessages().pages.seasonLeaderboard;

  const rules = (
    <ul className="space-y-1.5 text-[11px] text-white/50">
      <li className="flex justify-between gap-3">
        <span>{m.ruleRegistration}</span>
        <span className="shrink-0 tabular-nums text-white/70">+{SP_REGISTRATION}</span>
      </li>
      <li className="flex justify-between gap-3">
        <span>{m.ruleFirstReg}</span>
        <span className="shrink-0 tabular-nums text-white/70">+{SP_FIRST_REGISTRATION}</span>
      </li>
      <li className="pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/28">
        {m.ruleTop10Header}
      </li>
      {[1, 2, 3].map((n) => (
        <li key={n} className="flex justify-between gap-3 pl-1">
          <span>{m.ruleRank(n)}</span>
          <span className="tabular-nums text-white/60">+{SP_TOP_RANK[n]}</span>
        </li>
      ))}
      <li className="pl-1 text-white/38">{m.ruleRank4to10}</li>
      <li className="pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/28">
        {m.ruleStreakHeaderEpl}
      </li>
      {[...SP_STREAK_TIERS].reverse().map((t) => (
        <li key={t.minStreak} className="flex justify-between gap-3 pl-1">
          <span>{m.ruleStreak(t.minStreak)}</span>
          <span className="tabular-nums text-white/60">+{t.bonus}</span>
        </li>
      ))}
      <li className="pl-1 text-[10px] text-white/32">{m.ruleStreakCap}</li>
      <li className="flex justify-between gap-3 border-t border-white/[0.06] pt-2">
        <span>{m.ruleClaim}</span>
        <span className="tabular-nums text-white/70">+{SP_CLAIM_BONUS}</span>
      </li>
    </ul>
  );

  return (
    <details className={cn("group", !inset && "border-t border-white/[0.06]")}>
      <summary
        className={cn(
          "cursor-pointer list-none [&::-webkit-details-marker]:hidden",
          inset ? "px-4 py-2.5" : "px-5 py-3",
        )}
      >
        <div className="flex items-center justify-between gap-3">
          <span
            className={cn(
              "font-bold uppercase tracking-[0.12em] text-white/38",
              inset
                ? "font-mono text-[10px] font-medium tracking-[0.16em]"
                : "text-[11px]",
            )}
          >
            {m.actionRulesToggle}
          </span>
          <span className="text-[11px] text-white/32 group-open:hidden">{m.expandRules}</span>
          <span className="hidden text-[11px] text-white/32 group-open:inline">
            {m.collapseRules}
          </span>
        </div>
      </summary>
      <div
        className={cn(
          "border-t border-white/[0.06] pb-4 pt-3",
          inset ? "px-4" : "px-5",
        )}
      >
        {rules}
        <p className="mt-3 text-[10px] leading-relaxed text-white/28">{m.rulesFootnoteEpl}</p>
        <Link
          href="/faq#scoring-and-rewards--season-points"
          className="mt-2 inline-block text-[11px] text-white/45 hover:text-white/70"
        >
          {m.faqLink} →
        </Link>
      </div>
    </details>
  );
}

export function SeasonCampaignBrief({
  data,
  layout = "grid",
}: {
  data: SeasonLeaderboardPayload;
  layout?: Layout;
}) {
  const m = useSiteMessages().pages.seasonLeaderboard;
  const metaBits = buildSeasonMetaBits(data, m);

  if (layout === "details") {
    return <SeasonRulesDetails data={data} />;
  }

  const rules = (
    <ul className="space-y-1.5 text-[11px] text-white/50">
      <li className="flex justify-between gap-3">
        <span>{m.ruleRegistration}</span>
        <span className="shrink-0 tabular-nums text-white/70">+{SP_REGISTRATION}</span>
      </li>
      <li className="flex justify-between gap-3">
        <span>{m.ruleFirstReg}</span>
        <span className="shrink-0 tabular-nums text-white/70">+{SP_FIRST_REGISTRATION}</span>
      </li>
      <li className="pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/28">
        {m.ruleTop10Header}
      </li>
      {[1, 2, 3].map((n) => (
        <li key={n} className="flex justify-between gap-3 pl-1">
          <span>{m.ruleRank(n)}</span>
          <span className="tabular-nums text-white/60">+{SP_TOP_RANK[n]}</span>
        </li>
      ))}
      <li className="pl-1 text-white/38">{m.ruleRank4to10}</li>
      <li className="pt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/28">
        {m.ruleStreakHeaderEpl}
      </li>
      {[...SP_STREAK_TIERS].reverse().map((t) => (
        <li key={t.minStreak} className="flex justify-between gap-3 pl-1">
          <span>{m.ruleStreak(t.minStreak)}</span>
          <span className="tabular-nums text-white/60">+{t.bonus}</span>
        </li>
      ))}
      <li className="pl-1 text-[10px] text-white/32">{m.ruleStreakCap}</li>
      <li className="flex justify-between gap-3 border-t border-white/[0.06] pt-2">
        <span>{m.ruleClaim}</span>
        <span className="tabular-nums text-white/70">+{SP_CLAIM_BONUS}</span>
      </li>
    </ul>
  );

  if (layout === "strip") {
    return (
      <section className="mb-6 border-b border-white/[0.08] pb-5">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
          {seasonLabel(data, m)} · {m.campaignTag}
        </p>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-white/45">{m.subtitleLead}</p>
        {metaBits.length > 0 ? (
          <p className="mt-2 text-[11px] text-white/30">{metaBits.join(" · ")}</p>
        ) : null}
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-[11px] sm:grid-cols-4">
          <div>
            <dt className="text-white/35">{m.ruleRegistration}</dt>
            <dd className="font-semibold tabular-nums text-white/70">+{SP_REGISTRATION}</dd>
          </div>
          <div>
            <dt className="text-white/35">{m.ruleFirstReg}</dt>
            <dd className="font-semibold tabular-nums text-white/70">+{SP_FIRST_REGISTRATION}</dd>
          </div>
          <div>
            <dt className="text-white/35">{m.ruleTop10Header}</dt>
            <dd className="font-semibold tabular-nums text-white/70">+{SP_TOP_RANK[1]}…{SP_TOP_RANK[10]}</dd>
          </div>
          <div>
            <dt className="text-white/35">{m.ruleClaim}</dt>
            <dd className="font-semibold tabular-nums text-white/70">+{SP_CLAIM_BONUS}</dd>
          </div>
        </dl>
        <p className="mt-3 text-[11px] text-white/35">
          {m.campaignEarnHint}{" "}
          <Link
            href="/faq#scoring-and-rewards--season-points"
            className="text-white/55 underline decoration-white/20 underline-offset-2 hover:text-white"
          >
            {m.faqInlineLink}
          </Link>
        </p>
      </section>
    );
  }

  if (layout === "accordion") {
    return (
      <details className="mb-6 group border border-white/[0.08]">
        <summary className="cursor-pointer list-none px-4 py-3 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white/70">
                {m.rulesTitle}
              </p>
              <p className="mt-1 text-[11px] text-white/35">{m.campaignEarnHint}</p>
            </div>
            <span className="text-[10px] text-white/30 group-open:hidden">{m.expandRules}</span>
            <span className="hidden text-[10px] text-white/30 group-open:inline">{m.collapseRules}</span>
          </div>
        </summary>
        <div className="border-t border-white/[0.06] px-4 pb-4 pt-3">
          {rules}
          <p className="mt-3 text-[10px] leading-relaxed text-white/28">{m.rulesFootnoteEpl}</p>
          <Link
            href="/faq#scoring-and-rewards--season-points"
            className="mt-2 inline-block text-[11px] text-white/45 hover:text-white/70"
          >
            {m.faqLink} →
          </Link>
        </div>
      </details>
    );
  }

  return (
    <section className="mb-8 border border-white/[0.08] px-4 py-4 sm:px-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="max-w-xl">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">
            {m.campaignTag}
          </p>
          <h2 className="mt-1 font-display text-sm font-black uppercase tracking-tight text-white">
            {m.rulesTitle}
          </h2>
          <p className="mt-2 text-[13px] leading-relaxed text-white/45">{m.subtitleLead}</p>
          {metaBits.length > 0 ? (
            <p className="mt-2 text-[11px] text-white/30">{metaBits.join(" · ")}</p>
          ) : null}
        </div>
        <Link
          href="/faq#scoring-and-rewards--season-points"
          className="text-[11px] text-white/40 hover:text-white/65"
        >
          {m.faqLink} →
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2">
        {rules}
        <div className="text-[11px] leading-relaxed text-white/35">
          <p>{m.campaignEarnHint}</p>
          <p className="mt-3 text-[10px] text-white/28">{m.rulesFootnoteEpl}</p>
        </div>
      </div>
    </section>
  );
}

export function SeasonSparkline({ entry }: { entry: SeasonEntry | null }) {
  if (!entry?.breakdown?.length) return null;
  const slices = entry.breakdown.filter((s) => s.registered);
  if (!slices.length) return null;
  const max = Math.max(...slices.map((s) => s.total), 1);
  return (
    <div className="flex items-end gap-0.5">
      {slices.map((s) => (
        <div
          key={s.gameweekId}
          className="w-1.5 min-w-[4px] flex-1 rounded-[1px] bg-white/25"
          style={{ height: `${Math.max(6, Math.round((s.total / max) * 32))}px` }}
          title={`GW ${s.gameweekId} · +${s.total}`}
        />
      ))}
    </div>
  );
}
