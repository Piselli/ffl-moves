"use client";

import { useMemo } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
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
import { modalOverlayMotion, modalPanelMotion } from "@/lib/uiMotion";

const DISPLAY = { fontFamily: "var(--lt-font-display), sans-serif" } as const;

/** Opaque void under crystal frost — same idea as InsufficientFundsModal. */
const BACKPLATE = "rounded-2xl bg-[#080a0e]";

type Kind = "scoring" | "howto";

type Props = {
  kind: Kind;
  open: boolean;
  onClose: () => void;
  messages: SiteMessages;
};

type Row = { label: string; value?: string };

function useRows(kind: Kind, m: SiteMessages): { title: string; rows: Row[] } {
  const g = m.scoringGains;
  const a = m.positionAbbrev;
  const pick = m.pages.lockerPick;
  const home = m.home;

  return useMemo(() => {
    if (kind === "howto") {
      return {
        title: pick.howToPlayTitle,
        rows: pick.howToPlaySteps.map((label) => ({ label })),
      };
    }

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
  }, [a, g, home, kind, pick]);
}

/**
 * Help plaque — same family as Login / Deposit:
 * crystal GlassPanel, noble white type, TripleD spring enter.
 */
export function PickHelpOverlay({ kind, open, onClose, messages: m }: Props) {
  const reduce = Boolean(useReducedMotion());
  const pick = m.pages.lockerPick;
  const { title, rows } = useRows(kind, m);
  const titleId = `lt-help-${kind}`;
  const overlay = modalOverlayMotion(reduce);
  const panel = modalPanelMotion(reduce);

  return (
    <AnimatePresence>
      {open ? (
        <div className="absolute inset-0 z-40 flex items-center justify-center p-3 sm:p-4">
          <motion.button
            type="button"
            aria-label={pick.close}
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
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
            className="relative z-10 w-full max-w-[400px]"
            initial={panel.initial}
            animate={panel.animate}
            exit={panel.exit}
            transition={panel.transition}
          >
            <div className={BACKPLATE}>
              <GlassPanel crystal className="w-full !rounded-2xl p-5 sm:p-6">
                <h2
                  id={titleId}
                  className="pr-9 text-[22px] font-black uppercase tracking-[-0.02em] text-white"
                  style={DISPLAY}
                >
                  {title}
                </h2>

                <ul className="mt-4 max-h-[min(52vh,420px)] space-y-0 overflow-y-auto overscroll-contain pr-0.5 [-ms-overflow-style:none] [scrollbar-width:thin]">
                  {rows.map((row, i) => (
                    <li
                      key={`${row.label}-${row.value ?? ""}`}
                      className="flex items-baseline justify-between gap-3 border-b border-white/[0.08] py-2.5 last:border-0"
                    >
                      <span className="min-w-0 text-[14px] font-medium leading-snug text-white/88">
                        {kind === "howto" ? (
                          <span className="mr-2.5 tabular-nums text-white/40">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                        ) : null}
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
