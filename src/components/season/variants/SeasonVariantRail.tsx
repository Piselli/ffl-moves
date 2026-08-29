"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import {
  SeasonLeaderboardTable,
  pageForRank,
} from "@/components/SeasonLeaderboardTable";
import { SeasonActionPanel } from "@/components/season/SeasonActionPanel";
import { REGISTER_CTA_CLASS } from "@/components/season/seasonActionShared";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { FaqIconLink, type SeasonStandingsContext } from "../seasonStandingsShared";
import { PRODUCT_PAGE_TOP } from "@/components/SiteBackHome";
import { cn } from "@/lib/utils";

const RAIL_PAGE_SIZE = 15;

/** Season standings — two panels, fixed 15-row table. */
export function SeasonVariantRail({
  ctx,
  connected,
}: {
  ctx: SeasonStandingsContext;
  connected: boolean;
}) {
  const m = useSiteMessages().pages.seasonLeaderboard;
  const { data, wallet, focusOwner, pulseYou, myEntry, onFindMe } = ctx;

  const [page, setPage] = useState(() =>
    myEntry ? pageForRank(myEntry.rank, RAIL_PAGE_SIZE) : 0,
  );

  useEffect(() => {
    if (!focusOwner || !myEntry) return;
    if (focusOwner.toLowerCase() === myEntry.owner.toLowerCase()) {
      setPage(pageForRank(myEntry.rank, RAIL_PAGE_SIZE));
    }
  }, [focusOwner, myEntry]);

  const handleFindMe = () => {
    if (myEntry) setPage(pageForRank(myEntry.rank, RAIL_PAGE_SIZE));
    onFindMe();
  };

  return (
    <div className={cn("pb-10", PRODUCT_PAGE_TOP)}>
      <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
            {m.seasonTag(m.seasonDisplayLabel)} · {m.seasonLeague}
          </p>
          <h1 className="mt-0.5 font-display text-3xl font-black uppercase tracking-tight text-white sm:text-[2rem]">
            {m.pageTitle}
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <FaqIconLink />
          {myEntry ? (
            <button
              type="button"
              onClick={handleFindMe}
              className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:border-white/30 hover:text-white"
            >
              {m.findMe}
            </button>
          ) : null}
          <Link
            href="/"
            className={`xl:hidden ${REGISTER_CTA_CLASS} !px-4 !py-2 !text-[10px]`}
          >
            {m.actionRegisterCta}
          </Link>
        </div>
      </header>

      <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1fr)_17rem]">
        <GlassPanel matte className="flex min-h-0 flex-col !rounded-xl px-3 pb-0 pt-2.5 sm:px-4 sm:pt-3">
          <SeasonLeaderboardTable
            entries={data.entries}
            currentUser={wallet}
            showBreakdown
            focusOwner={focusOwner}
            pulseYou={pulseYou}
            variant="board"
            page={page}
            pageSize={RAIL_PAGE_SIZE}
            onPageChange={setPage}
          />
        </GlassPanel>

        <div className="hidden xl:block">
          <SeasonActionPanel
            data={data}
            myEntry={myEntry}
            connected={connected}
            layout="rail"
          />
        </div>
      </div>

      <div className="mt-4 xl:hidden">
        <SeasonActionPanel
          data={data}
          myEntry={myEntry}
          connected={connected}
          layout="rail"
        />
      </div>
    </div>
  );
}
