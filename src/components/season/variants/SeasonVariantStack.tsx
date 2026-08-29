"use client";

import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { SeasonLeaderboardTable } from "@/components/SeasonLeaderboardTable";
import { SeasonActionPanel } from "@/components/season/SeasonActionPanel";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import {
  DemoBanner,
  FaqIconLink,
  type SeasonStandingsContext,
} from "../seasonStandingsShared";
import { SeasonPageHeader } from "../seasonPageChrome";

/** A · Stack — glass table, earn strip below (warm slate). */
export function SeasonVariantStack({
  ctx,
  connected,
  metaBits,
}: {
  ctx: SeasonStandingsContext;
  connected: boolean;
  metaBits: string[];
}) {
  const m = useSiteMessages().pages.seasonLeaderboard;
  const { data, wallet, focusOwner, pulseYou } = ctx;

  return (
    <>
      {ctx.isDemo ? <DemoBanner /> : null}

      <SeasonPageHeader
        data={data}
        metaBits={metaBits}
        myEntry={ctx.myEntry}
        onFindMe={ctx.onFindMe}
      />

      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="font-display text-sm font-black uppercase tracking-wide text-white/80">
          {m.standingsTab}
        </h2>
        <FaqIconLink />
      </div>

      <GlassPanel matte className="mb-8 !rounded-2xl px-3 py-2 sm:px-4 sm:py-3">
        <SeasonLeaderboardTable
          entries={data.entries}
          currentUser={wallet}
          showBreakdown
          focusOwner={focusOwner}
          pulseYou={pulseYou}
        />
      </GlassPanel>

      <SeasonActionPanel
        data={data}
        myEntry={ctx.myEntry}
        connected={connected}
        layout="strip"
      />
    </>
  );
}
