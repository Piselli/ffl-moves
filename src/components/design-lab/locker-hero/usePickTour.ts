"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { FORMATION } from "@/lib/constants";
import {
  clearPickTourDone,
  consumeTourQueryFlags,
  markPickTourDone,
  markPickWelcomeSeen,
  PICK_TOUR_STEPS,
  preparePickTourReplay,
  shouldShowPickWelcome,
  shouldStartPickTour,
  type PickTourStepId,
} from "./onboardingStorage";

type Opts = {
  /** Homepage shipping surface only. */
  enabled: boolean;
  filledCount: number;
  hasCaptain: boolean;
  /**
   * After Matchday Gate — force the How to play plaque first
   * (coachmark tour starts when that plaque continues / closes).
   */
  kickTour?: boolean;
};

function resolveStartStep(
  filledCount: number,
  hasCaptain: boolean,
): PickTourStepId {
  if (filledCount <= 0) return "formation";
  if (filledCount < FORMATION.TOTAL) return "players";
  if (!hasCaptain) return "captain";
  return "scoring";
}

function nextStep(current: PickTourStepId): PickTourStepId | null {
  const i = PICK_TOUR_STEPS.indexOf(current);
  if (i < 0 || i >= PICK_TOUR_STEPS.length - 1) return null;
  return PICK_TOUR_STEPS[i + 1]!;
}

/**
 * Action-triggered guided pick tour.
 * Gate / How to play → always start at formation (1/5), manual Next through all steps.
 */
export function usePickTour({
  enabled,
  filledCount,
  hasCaptain,
  kickTour = false,
}: Opts) {
  const forceRef = useRef(false);
  /** When true, don't auto-skip steps just because the squad is already filled. */
  const manualOnlyRef = useRef(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [step, setStep] = useState<PickTourStepId | null>(null);
  const kickedRef = useRef(false);
  const bootRef = useRef(false);

  const beginGuidedTour = useCallback(() => {
    preparePickTourReplay();
    clearPickTourDone();
    markPickWelcomeSeen();
    forceRef.current = true;
    manualOnlyRef.current = true;
    setWelcomeOpen(false);
    setStep("formation");
    setTourActive(true);
  }, []);

  // Gate dismiss → welcome skipped; How to play plaque opens in LockerTablet.
  // Coachmarks start only after that plaque continues / closes (beginGuidedTour).
  useEffect(() => {
    if (!enabled || !kickTour || kickedRef.current) return;
    kickedRef.current = true;
    bootRef.current = true;
    markPickWelcomeSeen();
    clearPickTourDone();
  }, [enabled, kickTour]);

  useEffect(() => {
    if (!enabled || bootRef.current) return;
    // Gate path owns start via kickTour — never resolveStartStep mid-squad.
    if (kickTour) return;
    bootRef.current = true;
    const { forceTour } = consumeTourQueryFlags();
    forceRef.current = forceTour;
    if (shouldShowPickWelcome(forceTour)) {
      setWelcomeOpen(true);
    } else if (shouldStartPickTour(forceTour)) {
      manualOnlyRef.current = false;
      setStep(resolveStartStep(filledCount, hasCaptain));
      setTourActive(true);
    }
    // Intentionally once on mount for this surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, kickTour]);

  const dismissWelcome = useCallback(() => {
    markPickWelcomeSeen();
    setWelcomeOpen(false);
    if (shouldStartPickTour(forceRef.current)) {
      manualOnlyRef.current = forceRef.current;
      setStep(
        forceRef.current
          ? "formation"
          : resolveStartStep(filledCount, hasCaptain),
      );
      setTourActive(true);
    }
  }, [filledCount, hasCaptain]);

  const completeTour = useCallback(() => {
    markPickTourDone();
    forceRef.current = false;
    manualOnlyRef.current = false;
    setTourActive(false);
    setStep(null);
  }, []);

  const skipTour = useCallback(() => {
    completeTour();
  }, [completeTour]);

  const goNext = useCallback(() => {
    if (!step) return;
    const n = nextStep(step);
    if (!n) {
      completeTour();
      return;
    }
    setStep(n);
  }, [completeTour, step]);

  const replay = useCallback(() => {
    beginGuidedTour();
  }, [beginGuidedTour]);

  // players → captain when squad fills *during* the step (not if already full)
  const prevFilled = useRef(filledCount);
  useEffect(() => {
    if (!tourActive || step !== "players" || manualOnlyRef.current) {
      prevFilled.current = filledCount;
      return;
    }
    const wasIncomplete = prevFilled.current < FORMATION.TOTAL;
    prevFilled.current = filledCount;
    if (wasIncomplete && filledCount >= FORMATION.TOTAL) setStep("captain");
  }, [tourActive, filledCount, step]);

  // captain → scoring once captain set *during* the step
  const prevHasCaptain = useRef(hasCaptain);
  useEffect(() => {
    if (!tourActive || step !== "captain" || manualOnlyRef.current) {
      prevHasCaptain.current = hasCaptain;
      return;
    }
    const wasMissing = !prevHasCaptain.current;
    prevHasCaptain.current = hasCaptain;
    if (wasMissing && hasCaptain) setStep("scoring");
  }, [tourActive, hasCaptain, step]);

  return {
    welcomeOpen,
    tourActive,
    step,
    dismissWelcome,
    skipTour,
    goNext,
    completeTour,
    replay,
    beginGuidedTour,
  };
}
