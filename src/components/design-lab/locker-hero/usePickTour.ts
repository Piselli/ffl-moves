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
 * Action-triggered guided pick tour. Welcome is owned by the tablet;
 * this hook starts after welcome dismiss (or immediately if welcome already seen).
 */
export function usePickTour({ enabled, filledCount, hasCaptain }: Opts) {
  const forceRef = useRef(false);
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [tourActive, setTourActive] = useState(false);
  const [step, setStep] = useState<PickTourStepId | null>(null);

  useEffect(() => {
    if (!enabled) return;
    const { forceTour } = consumeTourQueryFlags();
    forceRef.current = forceTour;
    if (shouldShowPickWelcome(forceTour)) {
      setWelcomeOpen(true);
    } else if (shouldStartPickTour(forceTour)) {
      setStep(resolveStartStep(filledCount, hasCaptain));
      setTourActive(true);
    }
    // Intentionally once on mount for this surface.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled]);

  const dismissWelcome = useCallback(() => {
    markPickWelcomeSeen();
    setWelcomeOpen(false);
    if (shouldStartPickTour(forceRef.current)) {
      setStep(resolveStartStep(filledCount, hasCaptain));
      setTourActive(true);
    }
  }, [filledCount, hasCaptain]);

  const completeTour = useCallback(() => {
    markPickTourDone();
    forceRef.current = false;
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
    preparePickTourReplay();
    clearPickTourDone();
    forceRef.current = true;
    setTourActive(false);
    setStep(null);
    setWelcomeOpen(true);
  }, []);

  // players → captain when squad is full
  useEffect(() => {
    if (!tourActive || step !== "players") return;
    if (filledCount >= FORMATION.TOTAL) setStep("captain");
  }, [tourActive, filledCount, step]);

  // captain → scoring once captain set
  useEffect(() => {
    if (!tourActive || step !== "captain") return;
    if (hasCaptain) setStep("scoring");
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
  };
}
