"use client";

import { useEffect, useRef, useState } from "react";
import { hasStoredNickname } from "@/hooks/useNickname";
import {
  dismissInviteWelcome,
  getStoredInviteCode,
  isInviteWelcomeDismissed,
} from "@/lib/inviteClient";

/**
 * Auto-open welcome ONLY on a real login (disconnected → connected),
 * never when the session was already restored on page load / navigation.
 */
export function useWelcomeModalAutoOpen({
  connected,
  connecting = false,
  address,
  enabled = true,
  onOpen,
}: {
  connected: boolean;
  /** Wallet adapter / email still resolving — wait before taking a baseline. */
  connecting?: boolean;
  address: string | null | undefined;
  /** @deprecated ignored */
  hasNickname?: (addr: string) => boolean;
  enabled?: boolean;
  onOpen: () => void;
}) {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  /**
   * Auto-connect often starts as connected=false for a frame.
   * Wait out that race before locking a baseline.
   */
  const [bootstrapped, setBootstrapped] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setBootstrapped(true), 900);
    return () => window.clearTimeout(t);
  }, []);

  /** null = no baseline yet; then tracks settled connected flag */
  const baselineRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled || !bootstrapped || connecting) return;

    const prev = baselineRef.current;

    // First settled state after boot — if already in, stay silent forever for this mount cycle.
    if (prev === null) {
      baselineRef.current = connected;
      return;
    }

    const justLoggedIn = prev === false && connected === true && Boolean(address);
    baselineRef.current = connected;

    if (!justLoggedIn || !address) return;

    const needsNick = !hasStoredNickname(address);
    const hasInvite = Boolean(getStoredInviteCode());
    const inviteDismissed = isInviteWelcomeDismissed(address);

    if (!needsNick && (hasInvite || inviteDismissed)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const openSoon = () => {
      if (cancelled) return;
      // Site is already up when the user just clicked login — short beat only.
      timer = setTimeout(() => {
        if (!cancelled) onOpenRef.current();
      }, 450);
    };

    if (needsNick) {
      openSoon();
      return () => {
        cancelled = true;
        if (timer) clearTimeout(timer);
      };
    }

    void fetch(`/api/invite/me?wallet=${encodeURIComponent(address)}`, {
      cache: "no-store",
    })
      .then((r) => r.json())
      .then((body: { ok?: boolean; canEnterInviteCode?: boolean }) => {
        if (cancelled) return;
        if (body?.ok && body.canEnterInviteCode === true) {
          openSoon();
        } else {
          dismissInviteWelcome(address);
        }
      })
      .catch(() => {});

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [enabled, bootstrapped, connecting, connected, address]);
}
