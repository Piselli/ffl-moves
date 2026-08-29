"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { useWallet } from "@/hooks/useSolanaWallet";
import { tourOwnersMatch } from "@/lib/tourClaimHistory";
import { useSeasonStandingsData } from "./useSeasonStandingsData";
import { type SeasonStandingsContext } from "./seasonStandingsShared";
import { resolveDemoWallet, resolveSeasonPayload } from "./seasonStandingsMockData";
import { SeasonPageWash } from "./seasonPageChrome";
import { SeasonVariantRail } from "./variants/SeasonVariantRail";

export function SeasonStandingsShell() {
  const { account } = useWallet();
  const m = useSiteMessages().pages.seasonLeaderboard;
  const reduceMotion = useReducedMotion();
  const { data, isLoading, error, wallet, myEntry: liveMyEntry } = useSeasonStandingsData();
  const [focusOwner, setFocusOwner] = useState<string | null>(null);
  const [pulseYou, setPulseYou] = useState(false);

  const { payload, isDemo } = useMemo(() => resolveSeasonPayload(data), [data]);

  const effectiveWallet = resolveDemoWallet(wallet, isDemo);
  const myEntry = useMemo(() => {
    if (!effectiveWallet) return null;
    return payload.entries.find((e) => tourOwnersMatch(e.owner, effectiveWallet)) ?? null;
  }, [payload.entries, effectiveWallet]);

  const onFindMe = () => {
    const target = isDemo ? myEntry : liveMyEntry ?? myEntry;
    if (!target) return;
    setFocusOwner(target.owner);
    document.getElementById("season-you")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    if (!reduceMotion) {
      setPulseYou(true);
      window.setTimeout(() => setPulseYou(false), 700);
    }
  };

  const showContent = !isLoading && (!error || isDemo);

  const ctx: SeasonStandingsContext = {
    data: payload,
    wallet: effectiveWallet,
    myEntry,
    focusOwner,
    pulseYou,
    onFindMe,
    isDemo,
  };

  return (
    <div className="relative min-h-screen bg-[#0D0F12] text-white">
      <SeasonPageWash warm={false} />
      <LockerLabNav liveLinks />

      {showContent ? (
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <SeasonVariantRail ctx={ctx} connected={!!account} />
        </div>
      ) : (
        <main className="relative mx-auto max-w-4xl px-5 pb-28 pt-24 sm:px-6">
          {isLoading ? (
            <p className="py-12 text-sm text-white/35">{m.loading}</p>
          ) : null}

          {!isLoading && error && !isDemo ? (
            <p className="py-12 text-sm text-amber-200/70">{m.loadError(error)}</p>
          ) : null}

          {!isLoading && !error && data?.status === "inactive" && !isDemo ? (
            <p className="py-12 text-sm text-white/40">{m.inactiveHint}</p>
          ) : null}
        </main>
      )}
    </div>
  );
}
