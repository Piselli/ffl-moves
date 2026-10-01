"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useDeposit } from "@/components/DepositProvider";
import { useLogin } from "@/components/LoginProvider";
import { useWallet } from "@/hooks/useSolanaWallet";
import {
  buildRegisterTeam,
  getConfig,
  getUserTeam,
  hasRegisteredTeam,
  NO_CAPTAIN_INDEX,
} from "@/lib/chainClient";
import {
  isInsufficientFundsError,
  isWalletUserRejection,
  shouldOpenDepositBeforeRegister,
} from "@/lib/registerPayment";
import { FORMATION } from "@/lib/constants";
import { formatFeeLabel, formatFeeLabelShort } from "@/lib/entryFee";
import { formatTxError, getErrorMessage } from "@/lib/utils";
import { trackReferralConversion } from "@/lib/referralClient";
import { claimInviteConversion } from "@/lib/inviteClient";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import type { Player } from "@/lib/types";
import { useLegalAttestation } from "@/hooks/useLegalAttestation";
import { squadPlayersFromChain } from "@/lib/fplSquadResolve";
import { mergeFplCatalogForChainIds } from "@/lib/fplResolveMissing";

export type RegisteredSquadSnapshot = {
  starters: Player[];
  bench: Player[];
  captainIndex: number | null;
};

function registeredSnapshotKey(gwId: number, addr: string) {
  return `ffl_team_v2_gw${gwId}_${addr}`;
}

function isCompleteRegisteredSnapshot(
  t: { starters?: Player[]; bench?: Player[] } | null | undefined,
): t is RegisteredSquadSnapshot {
  if (!t || !Array.isArray(t.starters) || !Array.isArray(t.bench)) return false;
  return t.starters.length === 11 && t.bench.length === FORMATION.BENCH;
}

function normalizeStoredCaptain(
  captainIndex: unknown,
  starters: Player[],
): number | null {
  if (typeof captainIndex !== "number" || !Number.isInteger(captainIndex)) {
    return null;
  }
  if (captainIndex < 0 || captainIndex > 10) return null;
  return starters[captainIndex] ? captainIndex : null;
}

function readStoredSnapshot(key: string): RegisteredSquadSnapshot | null {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as {
      starters?: Player[];
      bench?: Player[];
      captainIndex?: number | null;
    };
    if (!isCompleteRegisteredSnapshot(parsed)) return null;
    return {
      starters: parsed.starters,
      bench: parsed.bench,
      captainIndex: normalizeStoredCaptain(parsed.captainIndex, parsed.starters),
    };
  } catch {
    return null;
  }
}

function writeStoredSnapshot(
  key: string,
  snapshot: RegisteredSquadSnapshot,
): void {
  try {
    localStorage.setItem(key, JSON.stringify(snapshot));
  } catch {
    /* ignore quota / private mode */
  }
}

export function useLockerRegister(opts: {
  starters: (Player | null)[];
  bench: (Player | null)[];
  gameweekId: number | null;
  captainIndex: number | null;
  /** Catalog for resolving on-chain ids when the registered snapshot is missing. */
  players?: Player[];
  /** While true, `gameweekId` may still be null — don't flash "closed" yet. */
  chainLoading?: boolean;
  /** Refetch prize pool / entries after a successful on-chain register. */
  onRegistered?: () => void;
}) {
  const {
    starters,
    bench,
    gameweekId,
    captainIndex,
    players = [],
    chainLoading = false,
    onRegistered,
  } = opts;
  const { connected, account, signAndSubmit, hasExternalWallet } = useWallet();
  const { openDeposit, refreshBalance } = useDeposit();
  const { openLogin } = useLogin();
  const g = useSiteMessages().pages.gameweek;
  const legal = useLegalAttestation(connected ? account?.address ?? null : null);
  const [attestOpen, setAttestOpen] = useState(false);

  const [entryFeeRaw, setEntryFeeRaw] = useState<bigint>(5_000_000n);
  const [alreadyRegistered, setAlreadyRegistered] = useState(false);
  const [registeredTeam, setRegisteredTeam] =
    useState<RegisteredSquadSnapshot | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [insufficientOpen, setInsufficientOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [errorOpen, setErrorOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  /** Soft CTA subline only (locked / need captain) — never dump tx logs here. */
  const [hint, setHint] = useState<string | null>(null);

  const filledCount = useMemo(
    () => starters.filter(Boolean).length + bench.filter(Boolean).length,
    [starters, bench],
  );
  const isComplete = filledCount === FORMATION.TOTAL;
  const hasCaptain = captainIndex != null && starters[captainIndex] != null;
  const isReadyToRegister = isComplete && hasCaptain;
  const feeLabel = formatFeeLabel(entryFeeRaw);

  const lockedStarters = useMemo((): (Player | null)[] | null => {
    if (!registeredTeam) return null;
    return registeredTeam.starters;
  }, [registeredTeam]);

  const lockedBench = useMemo((): (Player | null)[] | null => {
    if (!registeredTeam) return null;
    return registeredTeam.bench;
  }, [registeredTeam]);

  const registeredStarters = registeredTeam?.starters ?? [];
  const registeredBench = registeredTeam?.bench ?? [];
  const registeredCaptainIndex = registeredTeam?.captainIndex ?? null;

  const showError = useCallback((error: unknown) => {
    setErrorMessage(formatTxError(error) || getErrorMessage(error));
    setErrorOpen(true);
  }, []);

  useEffect(() => {
    if (chainLoading || gameweekId != null) {
      setHint(null);
      return;
    }
    setHint(g.unavailableIntro);
  }, [chainLoading, gameweekId, g.unavailableIntro]);

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
      setRegisteredTeam(null);
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

  // Freeze the on-chain / saved registered XI for display + share.
  useEffect(() => {
    if (!alreadyRegistered || !account?.address || gameweekId == null) return;
    if (isCompleteRegisteredSnapshot(registeredTeam)) return;

    const addr = account.address.toString();
    const key = registeredSnapshotKey(gameweekId, addr);
    const stored = readStoredSnapshot(key);
    if (stored) {
      setRegisteredTeam(stored);
      return;
    }

    let cancelled = false;
    async function loadFromChain() {
      const chainTeam = await getUserTeam(addr, gameweekId!);
      if (cancelled || !chainTeam?.playerIds?.length) return;

      const catalog = new Map(players.map((p) => [p.id, p]));
      await mergeFplCatalogForChainIds(catalog, chainTeam.playerIds);
      const teamPlayers = squadPlayersFromChain(
        {
          playerIds: chainTeam.playerIds,
          playerPositions: chainTeam.playerPositions,
        },
        catalog,
      );
      if (cancelled || teamPlayers.length !== FORMATION.TOTAL) return;

      const captain =
        chainTeam.captainIndex === NO_CAPTAIN_INDEX
          ? null
          : normalizeStoredCaptain(
              chainTeam.captainIndex,
              teamPlayers.slice(0, 11),
            );

      const snapshot: RegisteredSquadSnapshot = {
        starters: teamPlayers.slice(0, 11),
        bench: teamPlayers.slice(11),
        captainIndex: captain,
      };
      setRegisteredTeam(snapshot);
      writeStoredSnapshot(key, snapshot);
    }

    void loadFromChain();
    return () => {
      cancelled = true;
    };
  }, [
    alreadyRegistered,
    account?.address,
    gameweekId,
    players,
    registeredTeam,
  ]);

  const registrationClosed =
    !chainLoading && gameweekId == null && !alreadyRegistered;

  const ctaLabel = alreadyRegistered
    ? g.submitRegistered
    : submitting
      ? g.submitRegistering
      : registrationClosed
        ? g.submitUnavailable
        : !isComplete
          ? g.submitRegister
          : !hasCaptain
            ? g.submitNeedCaptain
            : g.submitRegister;
  /** Fee under the title only when the green CTA will actually take payment. */
  const ctaFeeSubline =
    !alreadyRegistered &&
    !submitting &&
    !registrationClosed &&
    isReadyToRegister &&
    connected
      ? formatFeeLabelShort(entryFeeRaw)
      : null;
  const ctaProgress = registrationClosed
    ? g.unavailableIntro
    : alreadyRegistered || submitting || isReadyToRegister || isComplete
      ? null
      : g.submitNeedProgress(filledCount, FORMATION.TOTAL);

  const register = useCallback(async (opts?: { attested?: boolean }) => {
    setHint(null);
    setErrorOpen(false);

    if (!connected || !account) {
      openLogin();
      return;
    }
    if (alreadyRegistered || submitting) return;
    if (gameweekId == null) {
      setHint(g.unavailableIntro);
      return;
    }
    if (!isReadyToRegister) {
      if (!hasCaptain) setHint(g.submitNeedCaptain);
      return;
    }

    // Wait for Redis check — never let payment race past an unfinished lookup.
    if (legal.loading) return;
    if ((!legal.accepted || legal.needsAttest) && !opts?.attested) {
      setAttestOpen(true);
      return;
    }

    try {
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
    } catch (error: unknown) {
      showError(error);
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
      const snapshot: RegisteredSquadSnapshot = {
        starters: starters.filter((p): p is Player => p != null),
        bench: bench.filter((p): p is Player => p != null),
        captainIndex,
      };
      if (isCompleteRegisteredSnapshot(snapshot)) {
        setRegisteredTeam(snapshot);
        writeStoredSnapshot(
          registeredSnapshotKey(gameweekId, account.address.toString()),
          snapshot,
        );
      }
      setAlreadyRegistered(true);
      trackReferralConversion(account.address.toString());
      claimInviteConversion(account.address.toString());
      // RPC may lag — retry claim once so first-season check sees the Entry.
      window.setTimeout(
        () => claimInviteConversion(account.address.toString()),
        2500,
      );
      refreshBalance();
      onRegistered?.();
      // RPC can lag a beat after confirm — second pass picks up pool/entries.
      window.setTimeout(() => onRegistered?.(), 1200);
    } catch (error: unknown) {
      if (isInsufficientFundsError(error)) {
        setInsufficientOpen(true);
      } else if (!isWalletUserRejection(error)) {
        showError(error);
      }
    } finally {
      setSubmitting(false);
      if (registeredOk) {
        window.setTimeout(() => setShareOpen(true), 400);
      }
    }
  }, [
    account,
    alreadyRegistered,
    bench,
    connected,
    entryFeeRaw,
    captainIndex,
    g,
    hasCaptain,
    hasExternalWallet,
    gameweekId,
    isReadyToRegister,
    legal.accepted,
    legal.loading,
    legal.needsAttest,
    onRegistered,
    openLogin,
    refreshBalance,
    showError,
    signAndSubmit,
    starters,
    submitting,
  ]);

  const confirmAttestation = useCallback(async () => {
    if (!legal.checked) return;
    const ok = await legal.ensureAccepted();
    if (!ok) return;
    setAttestOpen(false);
    await register({ attested: true });
  }, [legal, register]);

  return {
    ctaLabel,
    ctaFeeSubline,
    ctaProgress,
    needsLogin: !connected && isReadyToRegister,
    register,
    submitting:
      submitting ||
      legal.saving ||
      (connected && legal.loading && !legal.accepted),
    alreadyRegistered,
    hint,
    feeLabel,
    insufficientOpen,
    setInsufficientOpen,
    errorOpen,
    errorMessage,
    setErrorOpen,
    openDeposit,
    shareOpen,
    setShareOpen,
    registeredStarters,
    registeredBench,
    registeredCaptainIndex,
    lockedStarters,
    lockedBench,
    gameweekId,
    attestOpen,
    setAttestOpen,
    legalChecked: legal.checked,
    setLegalChecked: legal.setChecked,
    confirmAttestation,
    legalSaving: legal.saving,
  };
}
