"use client";

import { useEffect, useRef } from "react";
import { hasStoredNickname } from "@/hooks/useNickname";
import {
  dismissInviteWelcome,
  getStoredInviteCode,
  isInviteWelcomeDismissed,
} from "@/lib/inviteClient";
import { consumeLoginIntent } from "@/lib/loginIntent";

/**
 * Auto-open welcome ONLY after the user explicitly opened Login and then
 * connected — never on session restore / refresh / navigation.
 */
export function useWelcomeModalAutoOpen({
  connected,
  connecting = false,
  authReady = true,
  address,
  enabled = true,
  onOpen,
}: {
  connected: boolean;
  connecting?: boolean;
  /** Helius (and similar) finished loading cached session. */
  authReady?: boolean;
  address: string | null | undefined;
  /** @deprecated ignored */
  hasNickname?: (addr: string) => boolean;
  enabled?: boolean;
  onOpen: () => void;
}) {
  const onOpenRef = useRef(onOpen);
  onOpenRef.current = onOpen;

  /** null = no baseline yet */
  const baselineRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (!enabled || !authReady || connecting) return;

    const prev = baselineRef.current;

    if (prev === null) {
      baselineRef.current = connected;
      return;
    }

    const justLoggedIn = prev === false && connected === true && Boolean(address);
    baselineRef.current = connected;

    if (!justLoggedIn || !address) return;

    // Session restore also goes false→true on slow prod hydrations.
    // Only continue if this connect followed an explicit Login open.
    if (!consumeLoginIntent()) return;

    const needsNick = !hasStoredNickname(address);
    const hasInvite = Boolean(getStoredInviteCode());
    const inviteDismissed = isInviteWelcomeDismissed(address);

    if (!needsNick && (hasInvite || inviteDismissed)) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const openSoon = () => {
      if (cancelled) return;
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
  }, [enabled, authReady, connecting, connected, address]);
}
