"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useWallet } from "@aptos-labs/wallet-adapter-react";
import {
  WcBracketPredictor,
  isGroupsStepReady,
  isThirdsStepReady,
  type BracketStep,
} from "@/components/wc/WcBracketPredictor";
import { WcBracketResultsPanel } from "@/components/wc/WcBracketResultsPanel";
import { ConnectWalletCTA } from "@/components/ConnectWalletCTA";
import { WcSectionEyebrow } from "@/components/wc/WcSectionEyebrow";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { useWcBracketState } from "@/hooks/useWcBracketState";
import {
  client,
  hasBracketPrediction,
  hasRegisteredTeam,
  hasRegisterBracketPredictionOnChain,
  moduleFunction,
  getBracketChallengeStatus,
  getBracketChallengeEntries,
  getBracketPrediction,
} from "@/lib/movement";
import {
  WC_BRACKET_DEADLINE_ISO,
  WC_BRACKET_ELIGIBILITY_TOUR_ID,
  WC_BRACKET_ADVERTISED_POOL_USDCX,
  WC_BRACKET_PERFECT_BONUS_USDCX,
  WC_BRACKET_PERFECT_SCORE,
  WC_BRACKET_PRIZES_USDCX,
  countDecidedPlaces,
  decodeBracketPrediction,
  defaultGroupRanks,
  defaultThirdPlaceOrder,
  emptyBracketPrediction,
  encodeGroupRanks,
  encodeKnockoutWinners,
  encodeThirdPlaceOrder,
  isCompletePrediction,
  isOfficialBracketComplete,
  knockoutPicksRemaining,
  needsFinalKnockoutPicks,
  scoreBracketPrediction,
  type BracketPrediction,
} from "@/lib/wcBracketPrediction";
import { hasPublishedState } from "@/lib/wcBracketState";
import { getErrorMessage, cn } from "@/lib/utils";

const PRIZE_LABELS = WC_BRACKET_PRIZES_USDCX.map((u) => `$${u / 1_000_000}`);

function usdcxUsd(micro: number) {
  return `$${micro / 1_000_000}`;
}

type DraftMeta = {
  step: BracketStep;
  groupsLocked: boolean;
  thirdsLocked: boolean;
};

type DraftPayload = BracketPrediction & DraftMeta;

function draftKey(addr: string) {
  return `wc_bracket_draft_v2_${addr}`;
}

function scrollToPredictor() {
  document.getElementById("wc-bracket-predictor")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initialPrediction(): BracketPrediction {
  return {
    ...emptyBracketPrediction(),
    groupRanks: defaultGroupRanks(),
    thirdPlaceOrder: defaultThirdPlaceOrder(),
  };
}

export default function WorldCupBracketPage() {
  const { connected, account, signTransaction } = useWallet();
  const m = useSiteMessages();
  const bc = m.pages.worldCup.bracket;
  const g = m.pages.gameweek;
  const { state: officialState, loading: officialLoading } = useWcBracketState();

  const [prediction, setPrediction] = useState<BracketPrediction>(initialPrediction);
  const [step, setStep] = useState<BracketStep>("groups");
  const [groupsLocked, setGroupsLocked] = useState(false);
  const [thirdsLocked, setThirdsLocked] = useState(false);

  const [eligible, setEligible] = useState<boolean | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [chainLive, setChainLive] = useState(false);
  const [status, setStatus] = useState<number | null>(null);
  const [entries, setEntries] = useState<number | null>(null);
  const [metaLoading, setMetaLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const addr = account?.address?.toString();
  const complete = isCompletePrediction(prediction);
  const koRemaining = knockoutPicksRemaining(prediction.knockoutWinners);
  const pastDeadline = Date.now() >= new Date(WC_BRACKET_DEADLINE_ISO).getTime();
  const registrationClosed = status === 1 || status === 2 || pastDeadline;

  const officialReady = Boolean(officialState && hasPublishedState(officialState));
  const tournamentComplete = officialReady && officialState
    ? isOfficialBracketComplete(officialState)
    : false;
  const decidedPlaces = officialReady && officialState
    ? countDecidedPlaces(officialState).total
    : 0;
  const userScore = useMemo(() => {
    if (!submitted || !officialReady || !officialState) return null;
    return scoreBracketPrediction(prediction, officialState);
  }, [submitted, officialReady, officialState, prediction]);

  const resultsCopy = useMemo(
    () => ({
      resultsEyebrow: bc.resultsEyebrow,
      resultsTitle: bc.resultsTitle,
      resultsScoringLive: bc.resultsScoringLive,
      resultsScoringComplete: bc.resultsScoringComplete,
      resultsPrizesPendingTitle: bc.resultsPrizesPendingTitle,
      resultsPrizesPendingBody: bc.resultsPrizesPendingBody,
      resultsYourScore: bc.resultsYourScore,
      resultsNoEntry: bc.resultsNoEntry,
      resultsConnectHint: bc.resultsConnectHint,
      resultsWaitingOfficial: bc.resultsWaitingOfficial,
      resultsLoading: bc.resultsLoading,
      resultsGroups: bc.resultsGroups,
      resultsThirds: bc.resultsThirds,
      resultsKnockout: bc.resultsKnockout,
      resultsOfMax: bc.resultsOfMax,
      resultsDecided: bc.resultsDecided,
      resultsPerfectHit: bc.resultsPerfectHit,
      resultsViewPrediction: bc.resultsViewPrediction,
    }),
    [bc],
  );

  const submitBlockHint = useMemo(() => {
    if (submitting) return null;
    if (pastDeadline) return bc.submitDeadlinePassed;
    if (!complete) {
      if (needsFinalKnockoutPicks(prediction.knockoutWinners)) return bc.submitPickFinals;
      return bc.submitPickRemaining(koRemaining);
    }
    if (!chainLive) return bc.contractPending;
    if (status !== 0) return bc.submitStatusNotOpen;
    return null;
  }, [submitting, pastDeadline, complete, prediction.knockoutWinners, koRemaining, chainLive, status, bc]);

  const predictorCopy = useMemo(
    () => ({
      ...bc.predictor,
      final: bc.koFinal,
      thirdPlace: bc.koThirdPlace,
      tapHint: bc.koTapHint,
    }),
    [bc],
  );

  const goToStep = useCallback((next: BracketStep) => {
    if (next === "groups" && groupsLocked) {
      setGroupsLocked(false);
      setThirdsLocked(false);
    }
    if (next === "thirds" && thirdsLocked) {
      setThirdsLocked(false);
    }
    setStep(next);
    requestAnimationFrame(scrollToPredictor);
  }, [groupsLocked, thirdsLocked]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMetaLoading(true);
      try {
        const [live, st, ent] = await Promise.all([
          hasRegisterBracketPredictionOnChain(),
          getBracketChallengeStatus(),
          getBracketChallengeEntries(),
        ]);
        if (cancelled) return;
        setChainLive(live);
        setStatus(st);
        setEntries(ent);
      } finally {
        if (!cancelled) setMetaLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!addr) {
      setEligible(null);
      setSubmitted(false);
      setWalletLoading(false);
      return;
    }
    let cancelled = false;
    (async () => {
      setWalletLoading(true);
      try {
        const [reg, pred] = await Promise.all([
          hasRegisteredTeam(addr, WC_BRACKET_ELIGIBILITY_TOUR_ID),
          hasBracketPrediction(addr),
        ]);
        if (cancelled) return;
        setEligible(reg);
        setSubmitted(pred);

        if (pred) {
          const onChain = await getBracketPrediction(addr);
          if (cancelled) return;
          if (onChain) {
            setPrediction(decodeBracketPrediction(
              onChain.groupRanks,
              onChain.thirdPlaceOrder,
              onChain.knockoutWinners,
            ));
            setStep("knockout");
            setGroupsLocked(true);
            setThirdsLocked(true);
          }
        } else if (!registrationClosed && typeof window !== "undefined") {
          try {
            const raw = window.localStorage.getItem(draftKey(addr));
            if (raw) {
              const parsed = JSON.parse(raw) as DraftPayload;
              if (parsed.groupRanks?.length === 48) {
                setPrediction(parsed);
                setStep(parsed.step ?? "groups");
                setGroupsLocked(Boolean(parsed.groupsLocked));
                setThirdsLocked(Boolean(parsed.thirdsLocked));
              }
            }
          } catch {
            /* ignore */
          }
        }
      } finally {
        if (!cancelled) setWalletLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [addr, registrationClosed]);

  useEffect(() => {
    if (!addr || submitted || registrationClosed) return;
    const payload: DraftPayload = {
      ...prediction,
      step,
      groupsLocked,
      thirdsLocked,
    };
    try {
      localStorage.setItem(draftKey(addr), JSON.stringify(payload));
    } catch {
      /* ignore */
    }
  }, [prediction, step, groupsLocked, thirdsLocked, addr, submitted, registrationClosed]);

  const statusLabel =
    status === 0
      ? bc.statusOpen
      : status === 1
        ? bc.statusClosed
        : status === 2
          ? bc.statusResolved
          : metaLoading
            ? "…"
            : bc.statusUpcoming;

  const closedNoEntryHint = eligible
    ? bc.registrationClosedMissedHint
    : bc.registrationClosedNotEligibleHint;

  const handleConfirmGroups = () => {
    if (!isGroupsStepReady(prediction.groupRanks)) return;
    setGroupsLocked(true);
    goToStep("thirds");
  };

  const handleConfirmThirds = () => {
    if (!isThirdsStepReady(prediction.thirdPlaceOrder, prediction.groupRanks)) return;
    setThirdsLocked(true);
    goToStep("knockout");
  };

  const handleSubmit = async () => {
    if (!connected || !account || !complete || !eligible || submitted) return;
    setSubmitting(true);
    try {
      const transaction = await client.transaction.build.simple({
        sender: account.address.toString(),
        data: {
          function: moduleFunction("register_bracket_prediction"),
          typeArguments: [],
          functionArguments: [
            encodeGroupRanks(prediction.groupRanks),
            encodeThirdPlaceOrder(prediction.thirdPlaceOrder),
            encodeKnockoutWinners(prediction.knockoutWinners),
          ],
        },
        options: { expireTimestamp: Math.floor(Date.now() / 1000) + 120 },
      });

      const signResult = await signTransaction({ transactionOrPayload: transaction });
      const pending = await client.transaction.submit.simple({
        transaction,
        senderAuthenticator: signResult.authenticator,
      });
      await client.waitForTransaction({
        transactionHash: pending.hash,
        options: { timeoutSecs: 30, checkSuccess: true },
      });
      setSubmitted(true);
      setGroupsLocked(true);
      setThirdsLocked(true);
      setStep("knockout");
      if (addr) {
        try {
          localStorage.removeItem(draftKey(addr));
        } catch {
          /* ignore */
        }
      }
    } catch (error: unknown) {
      const msg = getErrorMessage(error);
      const msgLower = msg.toLowerCase();
      const isUserRejection =
        msgLower.includes("user rejected") ||
        msgLower.includes("denied") ||
        msgLower.includes("cancelled") ||
        msgLower.includes("canceled");
      if (!isUserRejection) window.alert(`${g.registerErrorPrefix} ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-7xl px-4 pb-16 pt-28 sm:px-6">
      <Link href="/world-cup" className="text-xs font-bold uppercase tracking-widest text-[#00f948]/70 hover:text-[#00f948]">
        {m.pages.worldCup.backToHub}
      </Link>

      <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <WcSectionEyebrow>{bc.badge}</WcSectionEyebrow>
          <h1 className="mt-3 font-wc-display text-3xl uppercase leading-[0.95] tracking-tight text-white sm:text-4xl">
            {bc.title}
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-white/50">{bc.subtitle}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <span
            className={cn(
              "rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-wider",
              status === 0
                ? "border-[#00f948]/30 bg-[#00f948]/10 text-[#00f948]"
                : status === 1 || status === 2
                  ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
                  : "border-white/10 bg-white/[0.04] text-white/40",
            )}
          >
            {statusLabel}
          </span>
          {entries != null ? (
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-white/40">
              {bc.entriesLabel(entries)}
            </span>
          ) : null}
        </div>
      </div>

      {registrationClosed ? (
        <WcBracketResultsPanel
          className="mt-8"
          loading={officialLoading || (connected && walletLoading)}
          connected={connected}
          officialReady={officialReady}
          tournamentComplete={tournamentComplete}
          decidedPlaces={decidedPlaces}
          hasEntry={submitted}
          score={userScore}
          copy={resultsCopy}
          onViewPrediction={submitted ? scrollToPredictor : undefined}
        />
      ) : null}

      <div className="mt-8 overflow-hidden rounded-2xl border border-white/[0.08] bg-[#0a0c0f]">
        <div className="border-b border-white/[0.06] bg-[#00f948]/[0.05] px-5 py-4 sm:px-6">
          <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-white/35">{bc.prizePoolLabel}</p>
          <p className="mt-1 font-display text-3xl font-black tabular-nums text-white sm:text-4xl">
            {usdcxUsd(WC_BRACKET_ADVERTISED_POOL_USDCX)}
            <span className="ml-2 text-base font-bold text-white/40">USDCx</span>
          </p>
          {registrationClosed ? (
            <p className="mt-2 text-xs leading-relaxed text-white/40">{bc.prizePayoutsPendingNote}</p>
          ) : null}
        </div>

        <div className="p-5 sm:p-6">
          <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">{bc.prizeTopFiveLabel}</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {WC_BRACKET_PRIZES_USDCX.map((_, i) => (
              <div key={i} className="rounded-xl border border-white/[0.08] bg-[#0D0F12]/80 px-3 py-3 text-center">
                <p className="text-[9px] font-bold uppercase tracking-widest text-white/30">{bc.prizeRank(i + 1)}</p>
                <p className="mt-1 font-display text-xl font-black tabular-nums text-white">{PRIZE_LABELS[i]}</p>
                <p className="text-[10px] text-white/35">USDCx</p>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-xl border border-[#FFD700]/25 bg-gradient-to-r from-[#FFD700]/[0.08] to-transparent px-4 py-3.5 sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="font-wc-hero text-xs font-bold uppercase tracking-wider text-[#FFD700]">
                {bc.prizePerfectBonusTitle}
              </p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/55">
                {bc.prizePerfectBonusDesc(
                  WC_BRACKET_PERFECT_SCORE,
                  String(WC_BRACKET_PERFECT_BONUS_USDCX / 1_000_000),
                )}
              </p>
            </div>
            <p className="mt-3 shrink-0 font-display text-2xl font-black tabular-nums text-[#FFD700] sm:mt-0">
              +{usdcxUsd(WC_BRACKET_PERFECT_BONUS_USDCX)}
            </p>
          </div>
        </div>
      </div>

      <div className="mt-6 rounded-xl border border-white/[0.08] bg-[#0a0c0f]/60 px-4 py-3">
        <p className="text-sm text-white/55">{bc.rulesLine}</p>
        {!registrationClosed ? (
          <p className="mt-2 text-xs text-white/35">{bc.deadlineNote}</p>
        ) : null}
      </div>

      {registrationClosed && !submitted ? (
        <div className="mt-6 rounded-xl border border-amber-500/25 bg-amber-500/[0.07] px-4 py-3.5">
          <p className="text-sm font-semibold text-amber-200">{bc.registrationClosedTitle}</p>
          <p className="mt-1.5 text-xs leading-relaxed text-white/50">{bc.registrationClosedBanner}</p>
        </div>
      ) : null}

      {!connected ? (
        <div className="mt-10 rounded-2xl border border-white/[0.08] bg-white/[0.03] p-10 text-center">
          {registrationClosed ? (
            <p className="mx-auto mb-6 max-w-md text-sm text-white/50">{bc.registrationClosedConnectHint}</p>
          ) : null}
          <ConnectWalletCTA className="mx-auto max-w-md text-left" />
        </div>
      ) : walletLoading ? (
        <div className="mt-16 flex justify-center">
          <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/10 border-t-white/60" />
        </div>
      ) : submitted ? (
        <div id="wc-bracket-predictor" className="mt-10 scroll-mt-28">
          <div className="mb-6 rounded-xl border border-[#00f948]/25 bg-[#00f948]/[0.06] px-4 py-3">
            <p className="text-sm font-semibold text-[#00f948]">{bc.submittedTitle}</p>
            <p className="mt-1 text-xs text-white/45">
              {registrationClosed ? bc.submittedHintClosed : bc.submittedHint}
            </p>
          </div>
          <WcBracketPredictor
            value={prediction}
            onChange={() => {}}
            readOnly
            step={step}
            onStepChange={(next) => {
              setStep(next);
              requestAnimationFrame(scrollToPredictor);
            }}
            groupsLocked
            thirdsLocked
            copy={predictorCopy}
          />
        </div>
      ) : registrationClosed ? (
        <div className="mt-10 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-8 text-center">
          <h2 className="font-display text-lg font-black uppercase text-amber-300">{bc.registrationClosedTitle}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/50">{closedNoEntryHint}</p>
        </div>
      ) : !eligible ? (
        <div className="mt-10 rounded-2xl border border-amber-500/20 bg-amber-500/[0.06] p-8 text-center">
          <h2 className="font-display text-lg font-black uppercase text-amber-300">{bc.notEligibleTitle}</h2>
          <p className="mx-auto mt-3 max-w-md text-sm text-white/50">{bc.notEligibleHint}</p>
          <Link
            href="/world-cup/squad"
            className="mt-6 inline-flex rounded-full bg-[#00f948] px-6 py-2.5 font-wc-hero text-sm font-extrabold uppercase text-black"
          >
            {m.pages.worldCup.playCta}
          </Link>
        </div>
      ) : (
        <>
          {!chainLive ? (
            <p className="mt-6 rounded-lg border border-amber-500/20 bg-amber-500/[0.06] px-4 py-3 text-xs text-amber-200/90">
              {bc.contractPending}
            </p>
          ) : null}

          <div id="wc-bracket-predictor" className="mt-8 scroll-mt-28">
            <WcBracketPredictor
              value={prediction}
              onChange={(next) => {
                setPrediction(next);
                if (groupsLocked && step === "groups") {
                  setGroupsLocked(false);
                  setThirdsLocked(false);
                }
                if (thirdsLocked && step === "thirds") {
                  setThirdsLocked(false);
                }
              }}
              step={step}
              onStepChange={goToStep}
              groupsLocked={groupsLocked}
              thirdsLocked={thirdsLocked}
              copy={predictorCopy}
            />
          </div>

          <div className="mt-8 flex flex-col items-center gap-3">
            {step === "groups" && !groupsLocked ? (
              <button
                type="button"
                disabled={!isGroupsStepReady(prediction.groupRanks)}
                onClick={handleConfirmGroups}
                className={cn(
                  "inline-flex rounded-full px-8 py-3 font-wc-hero text-sm font-extrabold uppercase tracking-wide transition-all active:scale-[0.98]",
                  isGroupsStepReady(prediction.groupRanks)
                    ? "bg-[#00f948] text-black hover:brightness-105"
                    : "cursor-not-allowed bg-white/10 text-white/30",
                )}
              >
                {bc.confirmGroups}
              </button>
            ) : null}

            {step === "thirds" && !thirdsLocked ? (
              <button
                type="button"
                disabled={!isThirdsStepReady(prediction.thirdPlaceOrder, prediction.groupRanks)}
                onClick={handleConfirmThirds}
                className={cn(
                  "inline-flex rounded-full px-8 py-3 font-wc-hero text-sm font-extrabold uppercase tracking-wide transition-all active:scale-[0.98]",
                  isThirdsStepReady(prediction.thirdPlaceOrder, prediction.groupRanks)
                    ? "bg-[#00f948] text-black hover:brightness-105"
                    : "cursor-not-allowed bg-white/10 text-white/30",
                )}
              >
                {bc.confirmThirds}
              </button>
            ) : null}

            {step === "knockout" && thirdsLocked ? (
              <>
                <button
                  type="button"
                  disabled={!complete || submitting || pastDeadline || status !== 0 || !chainLive}
                  onClick={handleSubmit}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-full px-8 py-3 font-wc-hero text-sm font-extrabold uppercase tracking-wide transition-all active:scale-[0.98]",
                    complete && !pastDeadline && status === 0 && chainLive
                      ? "bg-[#00f948] text-black hover:brightness-105"
                      : "cursor-not-allowed bg-white/10 text-white/30",
                  )}
                >
                  {submitting ? bc.submitting : bc.submitCta}
                </button>
                {submitBlockHint ? (
                  <p
                    className={cn(
                      "max-w-md text-center text-xs leading-relaxed",
                      !chainLive && complete ? "text-amber-200/90" : "text-[#00f948]/80",
                    )}
                  >
                    {submitBlockHint}
                  </p>
                ) : null}
                <p className="text-center text-[11px] text-white/35">{bc.gasNote}</p>
              </>
            ) : null}
          </div>
        </>
      )}
    </div>
  );
}
