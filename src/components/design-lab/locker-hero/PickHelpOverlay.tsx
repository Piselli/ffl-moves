"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { HowToStepArt } from "@/components/design-lab/locker-hero/HowToStepArt";
import { LOCKER_CTA } from "@/components/design-lab/locker-hero/ctaStyles";
import type { SiteMessages } from "@/i18n/messages";
import {
  ASSIST_POINTS,
  CLEAN_SHEET_POINTS,
  DEDUCTIONS,
  FPL_BONUS_MAX,
  GK_SAVE_BATCH,
  GK_SAVE_POINTS_PER_BATCH,
  GOAL_POINTS,
  GOALS_CONCEDED_DIVISOR,
  HAT_TRICK_BONUS,
  MINUTES_POINTS,
  PENALTY_SAVE_POINTS,
  RATING_BONUS_TIERS,
  RATING_SUB_POINTS,
} from "@/lib/scoring-rules";
import { DEFAULT_PRIZE_TIERS } from "@/lib/prize-distribution";
import { modalOverlayMotion, modalPanelMotion } from "@/lib/uiMotion";

const DISPLAY = { fontFamily: "var(--lt-font-display), sans-serif" } as const;

/** Opaque void under crystal frost — same idea as InsufficientFundsModal. */
const BACKPLATE = "rounded-2xl bg-[#080a0e]";

type Kind = "scoring" | "howto" | "split";

type Props = {
  kind: Kind;
  open: boolean;
  onClose: () => void;
  messages: SiteMessages;
  /** Tour spotlight target when this plaque is open. */
  tourAnchor?: string;
  /** How to play — primary CTA after the visual loop (starts the 5-step tour). */
  onContinue?: () => void;
  continueLabel?: string;
};

type Row = { label: string; value?: string };

function useScoringRows(m: SiteMessages): { title: string; rows: Row[] } {
  const g = m.scoringGains;
  const a = m.positionAbbrev;
  const pick = m.pages.lockerPick;
  const home = m.home;

  return useMemo(() => {
    const ratingPlus = (tenths: number) =>
      RATING_BONUS_TIERS.find((t) => t.minTenths === tenths)?.points ?? 0;

    return {
      title: pick.scoringTitle,
      rows: [
        { label: g.minutesPartial, value: `+${MINUTES_POINTS.partial}` },
        { label: g.minutes60, value: `+${MINUTES_POINTS.full}` },
        {
          label: g.goal,
          value: `${a.GK} +${GOAL_POINTS.GK}  ·  ${a.DEF} +${GOAL_POINTS.DEF}  ·  ${a.MID}/${a.FWD} +${GOAL_POINTS.MID}`,
        },
        { label: g.assist, value: `+${ASSIST_POINTS}` },
        { label: g.hattrick, value: `+${HAT_TRICK_BONUS}` },
        {
          label: g.cleanSheet,
          value: `${a.GK}/${a.DEF} +${CLEAN_SHEET_POINTS.GK_DEF}  ·  ${a.MID} +${CLEAN_SHEET_POINTS.MID}`,
        },
        {
          label: home.scoringSavesEvery.replace("{n}", String(GK_SAVE_BATCH)),
          value: `+${GK_SAVE_POINTS_PER_BATCH}`,
        },
        { label: g.penSave, value: `+${PENALTY_SAVE_POINTS}` },
        {
          label: home.scoringConcededGoal.replace(
            "{n}",
            String(GOALS_CONCEDED_DIVISOR),
          ),
          value: `−1`,
        },
        { label: g.yellowCard, value: `−${DEDUCTIONS.yellowCard}` },
        { label: g.redCard, value: `−${DEDUCTIONS.redCardMultiplier}` },
        { label: g.ownGoal, value: `−${DEDUCTIONS.ownGoal}` },
        { label: g.penMiss, value: `−${DEDUCTIONS.penaltyMissed}` },
        { label: g.rating90, value: `+${ratingPlus(90)}` },
        { label: g.rating80, value: `+${ratingPlus(80)}` },
        { label: g.rating75, value: `+${ratingPlus(75)}` },
        {
          label: g.lowRating,
          value: `−${RATING_SUB_POINTS}`,
        },
        { label: g.fplBonus, value: `+0–${FPL_BONUS_MAX}` },
      ],
    };
  }, [a, g, home, pick.scoringTitle]);
}

/**
 * Help plaque — same family as Login / Deposit.
 * How to play: illustrated steps + continue into the 5-step coachmark tour.
 * Scoring / prize split: compact tables.
 */
export function PickHelpOverlay({
  kind,
  open,
  onClose,
  messages: m,
  tourAnchor,
  onContinue,
  continueLabel,
}: Props) {
  const reduce = Boolean(useReducedMotion());
  const pick = m.pages.lockerPick;
  const scoring = useScoringRows(m);
  const title =
    kind === "howto"
      ? pick.howToPlayTitle
      : kind === "split"
        ? pick.prizeSplitTitle
        : scoring.title;
  const titleId = `lt-help-${kind}`;
  const overlay = modalOverlayMotion(reduce);
  const panel = modalPanelMotion(reduce);
  const isHowto = kind === "howto";
  const isSplit = kind === "split";

  return (
    <AnimatePresence>
      {open ? (
        <div
          className={
            isHowto
              ? "absolute inset-0 z-[50] flex items-start justify-center overflow-hidden p-3 pt-3 sm:p-4 sm:pt-3.5"
              : "absolute inset-0 z-[50] flex items-center justify-center p-3 sm:p-4"
          }
        >
          <motion.button
            type="button"
            aria-label={pick.close}
            className="absolute inset-0 bg-black/25"
            initial={overlay.initial}
            animate={overlay.animate}
            exit={overlay.exit}
            transition={overlay.transition}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            data-tour-anchor={tourAnchor}
            className={
              isHowto
                ? "relative z-10 flex max-h-full w-full max-w-[min(560px,100%)] flex-col"
                : "relative z-10 w-full max-w-[min(440px,100%)]"
            }
            initial={panel.initial}
            animate={panel.animate}
            exit={panel.exit}
            transition={panel.transition}
          >
            <div
              className={
                isHowto ? `${BACKPLATE} flex min-h-0 max-h-full flex-col` : BACKPLATE
              }
            >
              <GlassPanel
                crystal
                className={
                  isHowto
                    ? "flex min-h-0 max-h-full w-full flex-col !rounded-2xl p-3.5 sm:p-5"
                    : "w-full !rounded-2xl p-4 sm:p-5"
                }
              >
                <h2
                  id={titleId}
                  className={
                    isHowto
                      ? "shrink-0 pr-9 text-[22px] font-black uppercase tracking-[-0.02em] text-white sm:text-[26px]"
                      : "pr-9 text-[20px] font-black uppercase tracking-[-0.02em] text-white sm:text-[22px]"
                  }
                  style={DISPLAY}
                >
                  {title}
                </h2>
                {isHowto && pick.howToPlaySubtitle ? (
                  <p className="mt-1 shrink-0 pr-9 text-[13px] font-medium leading-snug text-white/60 sm:text-[14px]">
                    {pick.howToPlaySubtitle}
                  </p>
                ) : null}
                {isSplit && pick.prizeSplitHint ? (
                  <p className="mt-1.5 truncate pr-9 text-[12px] font-medium leading-none text-white/55 sm:text-[13px]">
                    {pick.prizeSplitHint}
                  </p>
                ) : null}

                {isHowto ? (
                  <>
                    <ul className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain sm:mt-4 sm:space-y-2.5">
                      {pick.howToPlaySteps.map((step) => (
                        <li
                          key={step.title}
                          className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-white/[0.03] p-2 pr-2.5 sm:gap-3.5 sm:p-2.5 sm:pr-3"
                        >
                          <HowToStepArt
                            id={step.art}
                            className="h-[72px] w-[72px] rounded-xl sm:h-[80px] sm:w-[80px]"
                          />
                          <div className="min-w-0 flex-1 pt-0.5">
                            <p
                              className="text-[15px] font-bold leading-snug text-white sm:text-[16px]"
                              style={DISPLAY}
                            >
                              {step.title}
                            </p>
                            <div className="mt-1 space-y-0.5">
                              {step.body.map((line) => (
                                <p
                                  key={line}
                                  className="text-[13px] font-medium leading-snug text-white/65 sm:text-[14px] sm:leading-relaxed"
                                >
                                  {line}
                                </p>
                              ))}
                            </div>
                          </div>
                        </li>
                      ))}
                    </ul>
                    {onContinue ? (
                      <button
                        type="button"
                        onClick={onContinue}
                        className="mt-3 flex h-11 w-full shrink-0 items-center justify-center rounded-xl text-[14px] font-black uppercase tracking-[0.06em] text-white transition hover:brightness-[1.06] active:scale-[0.985] sm:mt-4 sm:h-12 sm:text-[15px]"
                        style={LOCKER_CTA.style}
                      >
                        {continueLabel ?? pick.tourNext}
                      </button>
                    ) : null}
                  </>
                ) : isSplit ? (
                  <div className="mt-4 overflow-hidden rounded-xl border border-white/[0.1] bg-white/[0.03]">
                    <div className="flex items-center justify-between gap-3 border-b border-white/[0.08] px-3.5 py-2">
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                        {pick.prizeSplitRank}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                        {pick.prizeSplitShare}
                      </span>
                    </div>
                    <ul className="max-h-[min(52vh,420px)] overflow-y-auto overscroll-contain [-ms-overflow-style:none] [scrollbar-width:thin]">
                      {DEFAULT_PRIZE_TIERS.map((tier, i) => (
                        <li
                          key={tier.rank}
                          className={
                            i === 0
                              ? "flex items-baseline justify-between gap-3 border-b border-white/[0.06] bg-[rgba(0,249,72,0.07)] px-3.5 py-2.5"
                              : "flex items-baseline justify-between gap-3 border-b border-white/[0.06] px-3.5 py-2.5 last:border-0"
                          }
                        >
                          <span
                            className={
                              i === 0
                                ? "text-[15px] font-bold tabular-nums text-[#00f948]"
                                : i < 3
                                  ? "text-[14px] font-semibold tabular-nums text-white"
                                  : "text-[14px] font-medium tabular-nums text-white/80"
                            }
                            style={DISPLAY}
                          >
                            #{tier.rank}
                          </span>
                          <span
                            className={
                              i === 0
                                ? "text-[15px] font-black tabular-nums tracking-tight text-white"
                                : "text-[14px] font-semibold tabular-nums tracking-tight text-white"
                            }
                            style={DISPLAY}
                          >
                            {tier.pct}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <ul className="mt-4 max-h-[min(52vh,420px)] space-y-0 overflow-y-auto overscroll-contain pr-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
                    {scoring.rows.map((row) => (
                      <li
                        key={`${row.label}-${row.value ?? ""}`}
                        className="flex items-baseline justify-between gap-3 border-b border-white/[0.08] py-2.5 last:border-0"
                      >
                        <span className="min-w-0 text-[14px] font-medium leading-snug text-white/88">
                          {row.label}
                        </span>
                        {row.value ? (
                          <span
                            className="shrink-0 text-right text-[13px] font-semibold tabular-nums tracking-tight text-white"
                            style={DISPLAY}
                          >
                            {row.value}
                          </span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                )}
              </GlassPanel>
            </div>

            <button
              type="button"
              onClick={onClose}
              aria-label={pick.close}
              className="absolute right-1.5 top-1.5 z-30 grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-[transform,background-color,color] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] hover:bg-white/[0.06] hover:text-white/85 active:scale-[0.96]"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path
                  d="M6 6l12 12M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.7"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}
