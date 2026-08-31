"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeposit } from "@/components/DepositProvider";
import { useLogin } from "@/components/LoginProvider";
import { useWallet } from "@/hooks/useSolanaWallet";
import {
  buildRegisterTeam,
  getConfig,
  hasRegisteredTeam,
} from "@/lib/chainClient";
import {
  isInsufficientFundsError,
  isWalletUserRejection,
  shouldOpenDepositBeforeRegister,
} from "@/lib/registerPayment";
import { FORMATION } from "@/lib/constants";
import { formatFeeLabel } from "@/lib/entryFee";
import { getErrorMessage } from "@/lib/utils";
import { trackReferralConversion } from "@/lib/referralClient";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import type { Player } from "@/lib/types";

export function useLockerRegister(opts: {
  starters: (Player | null)[];
  bench: (Player | null)[];
  gameweekId: number | null;
  captainIndex: number | null;
}) {
  const { starters, bench, gameweekId, captainIndex } = opts;
  const { connected, account, signAndSubmit, hasExternalWallet } = useWallet();
  const { openDeposit, refreshBalance } = useDeposit();
  const { openLogin } = useLogin();
  const g = useSiteMessages().pages.gameweek;

  const [entryFeeRaw, setEntryFeeRaw] = useState<bigint>(5_000_000n);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const filledCount = useMemo(
    () => starters.filter(Boolean).length + bench.filter(Boolean).length,
    [starters, bench],
  );
  const isComplete = filledCount === FORMATION.TOTAL;
  const hasCaptain = captainIndex != null && starters[captainIndex] != null;
  const isReadyToRegister = isComplete && hasCaptain;
  const feeLabel = formatFeeLabel(entryFeeRaw);

  const registeredStarters = useMemo(
    () => starters.filter((p): p is Player => p != null),
    [starters],
  );
  const registeredBench = useMemo(
    () => bench.filter((p): p is Player => p != null),
    [bench],
  );

  useEffect(() => {
    if (gameweekId != null) {
      setHint(null);
      return;
    }
    setHint(g.unavailableIntro);
  }, [gameweekId, g.unavailableIntro]);

  useEffect(() => {
    let cancelled = false;
    getConfig()
      .then((cfg) => {
        if (!cancelled && cfg?.entryFee != null) setEntryFeeRaw(cfg.entryFee);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const addr = account?.address;
    if (!connected || !addr || gameweekId == null) {
      setAlreadyRegistered(false);
      return;
    }
    let cancelled = false;
    hasRegisteredTeam(addr, gameweekId)
      .then((yes) => {
        if (!cancelled) setAlreadyRegistered(yes);
      })
      .catch(() => {
        if (!cancelled) setAlreadyRegistered(false);
      });
    return () => {
      cancelled = true;
    };
  }, [account?.address, connected, gameweekId]);

  const ctaLabel = alreadyRegistered
    ? g.submitRegistered
    : submitting
      ? g.submitRegistering
      : !isComplete
        ? g.submitNeedPlayers(filledCount, FORMATION.TOTAL)
        : !hasCaptain
          ? g.submitNeedCaptain
          : !connected
            ? g.submitRegister
            : g.submitConfirm(feeLabel);
  const ctaProgress =
    alreadyRegistered || submitting || isReadyToRegister
      ? null
      : g.submitNeedProgress(filledCount, FORMATION.TOTAL);

  const register = useCallback(async () => {
    setHint(null);

    if (!connected || !account) {
      openLogin();
      return;
    }
    if (alreadyRegistered || submitting || gameweekId == null) return;
    if (!isReadyToRegister) return;

    if (
      await shouldOpenDepositBeforeRegister(
        account.address.toString(),
        entryFeeRaw,
        hasExternalWallet,
      )
    ) {
      setInsufficientOpen(true);
      return;
    }

    setSubmitting(true);
    let registeredOk = false;
    try {
      const allPlayers = [...starters, ...bench] as Player[];
      await signAndSubmit(
        await buildRegisterTeam(account.address, gameweekId, {
          playerIds: allPlayers.map((p) => p.id),
          positions: allPlayers.map((p) => p.positionId),
          playerPositions: allPlayers.map((p) => p.positionId),
          clubs: allPlayers.map((p) => p.teamId),
          captainIndex: captainIndex!,
        }),
      );
      registeredOk = true;
      setAlreadyRegistered(true);
      trackReferralConversion(account.address.toString());
      refreshBalance();
    } catch (error: unknown) {
      if (isInsufficientFundsError(error)) {
        setInsufficientOpen(true);
      } else if (!isWalletUserRejection(error)) {
        setHint(`${g.registerErrorPrefix} ${getErrorMessage(error)}`);
      }
    } finally {
      setSubmitting(false);
      if (registeredOk) {
        // Wait for wallet UI to dismiss, then open the same share modal as the CTA.
        window.setTimeout(() => setShareOpen(true), 400);
      }
    }
  }, [
    account,
    alreadyRegistered,
    bench,
    connected,
    entryFeeRaw,
    filledCount,
    captainIndex,
    g,
    hasExternalWallet,
    gameweekId,
    isReadyToRegister,
    openLogin,
    refreshBalance,
    signAndSubmit,
    starters,
    submitting,
  ]);

  return {
    ctaLabel,
    ctaProgress,
    needsLogin: !connected && isReadyToRegister,
    register,
    submitting,
    alreadyRegistered,
    hint,
    feeLabel,
    insufficientOpen,
    setInsufficientOpen,
    openDeposit,
    shareOpen,
    setShareOpen,
    registeredStarters,
    registeredBench,
    gameweekId,
  };
}
