"use client";

import { useMemo, useState } from "react";
import { useReducedMotion } from "framer-motion";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { SurfaceTipSheet } from "@/components/design-lab/locker-hero/SurfaceTipSheet";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { useWallet } from "@/hooks/useSolanaWallet";
import { tourOwnersMatch } from "@/lib/tourClaimHistory";
import { useSeasonStandingsData } from "./useSeasonStandingsData";
import { type SeasonStandingsContext } from "./seasonStandingsShared";
import { SeasonPageWash } from "./seasonPageChrome";
import { PRODUCT_PAGE_TOP } from "@/components/SiteBackHome";
import { cn } from "@/lib/utils";
import { SeasonVariantRail } from "./variants/SeasonVariantRail";

export function SeasonStandingsShell() {
  const { account } = useWallet();
  const pages = useSiteMessages().pages;
  const m = pages.seasonLeaderboard;
  const tips = pages.surfaceTips;
  const reduceMotion = useReducedMotion();
  const { data, isLoading, error, wallet, myEntry: liveMyEntry } = useSeasonStandingsData();
  const [focusOwner, setFocusOwner] = useState<string | null>(null);
  const [pulseYou, setPulseYou] = useState(false);

  const myEntry = useMemo(() => {
    if (!wallet || !data) return liveMyEntry;
    return data.entries.find((e) => tourOwnersMatch(e.owner, wallet)) ?? liveMyEntry;
  }, [data, wallet, liveMyEntry]);

  const onFindMe = () => {
    if (!myEntry) return;
    setFocusOwner(myEntry.owner);
    document.getElementById("season-you")?.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "center",
    });
    if (!reduceMotion) {
      setPulseYou(true);
      window.setTimeout(() => setPulseYou(false), 700);
    }
  };

  const showContent = !isLoading && !error && !!data && data.status !== "inactive";

  const ctx: SeasonStandingsContext | null =
    showContent && data
      ? {
          data,
          wallet,
          myEntry,
          focusOwner,
          pulseYou,
          onFindMe,
          isDemo: false,
        }
      : null;

  return (
    <div className="relative min-h-screen bg-[#0D0F12] text-white">
      <SeasonPageWash warm={false} />
      <LockerLabNav liveLinks />

      {ctx ? (
        <div className="relative mx-auto max-w-7xl px-5 sm:px-8">
          <SeasonVariantRail ctx={ctx} connected={!!account} />
        </div>
      ) : (
        <main className={cn("relative mx-auto max-w-4xl px-5 pb-28 sm:px-6", PRODUCT_PAGE_TOP)}>
          {isLoading ? (
            <p className="py-12 text-sm text-white/35">{m.loading}</p>
          ) : null}

          {!isLoading && error ? (
            <p className="py-12 text-sm text-amber-200/70">{m.loadError(error)}</p>
          ) : null}

          {!isLoading && !error && (data?.status === "inactive" || !data) ? (
            <p className="py-12 text-sm text-white/40">{m.inactiveHint}</p>
          ) : null}
        </main>
      )}

      <SurfaceTipSheet
        tipId="season"
        title={tips.seasonTitle}
        body={tips.seasonBody}
        cta={tips.seasonCta}
      />
    </div>
  );
}
