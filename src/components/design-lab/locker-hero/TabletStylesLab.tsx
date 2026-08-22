"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { LockerTablet } from "./LockerTablet";
import {
  DEFAULT_PITCH_STYLE,
  loadPitchStyleId,
  savePitchStyleId,
  type PitchStyleId,
} from "./pitchStyles";
import {
  DEFAULT_TABLET_VARIANT,
  loadTabletVariantId,
  saveTabletVariantId,
  TABLET_VARIANTS,
  type TabletVariantId,
} from "./tabletVariants";
import { useLockerHeroData } from "./useLockerHeroData";
import { useSquadPick } from "./useSquadPick";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

/**
 * Flat iPad UI lab — Refero A–E without the 3D room overlay.
 * Shipping homepage stays Obsidian Glass.
 */
export function TabletStylesLab() {
  const data = useLockerHeroData();
  const squad = useSquadPick();
  const prize = usePrizeAsset();
  const { locale } = useSiteLocale();
  const messages = useSiteMessages();
  const [pitchStyleId, setPitchStyleId] =
    useState<PitchStyleId>(DEFAULT_PITCH_STYLE);
  const [tabletVariantId, setTabletVariantId] = useState<TabletVariantId>(
    DEFAULT_TABLET_VARIANT,
  );

  useEffect(() => {
    setPitchStyleId(loadPitchStyleId());
    setTabletVariantId(loadTabletVariantId());
  }, []);

  return (
    <div className="min-h-[100dvh] bg-[#050506] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.06] bg-[#050506]/90 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-white/40">
              Design Lab · Refero → iPad
            </p>
            <p className="mt-0.5 text-sm text-white/70">
              Flat tablet compare · room scene stays clean
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/design-lab/locker-hero"
              className="rounded-sm border border-white/15 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-white/60 hover:border-white/30 hover:text-white"
            >
              Locker hero
            </Link>
            <Link
              href="/design-lab/locker-leaderboard"
              className="rounded-sm border border-sky-400/35 bg-sky-400/10 px-3 py-1.5 font-mono text-[11px] uppercase tracking-wider text-sky-300 hover:bg-sky-400/20"
            >
              Lounge TV →
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-6 sm:px-6 lg:flex-row lg:items-start">
        <aside className="w-full shrink-0 lg:sticky lg:top-20 lg:w-56">
          <p className="mb-2 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
            Directions
          </p>
          <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2 lg:grid-cols-1">
            {TABLET_VARIANTS.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setTabletVariantId(v.id);
                  saveTabletVariantId(v.id);
                }}
                className={cn(
                  "rounded-xl px-3 py-2.5 text-left transition active:scale-[0.98]",
                  tabletVariantId === v.id
                    ? "bg-white/15 ring-1 ring-white/35"
                    : "bg-white/[0.04] hover:bg-white/[0.07]",
                )}
              >
                <p
                  className={cn(
                    "font-display text-[11px] font-black uppercase tracking-wide",
                    tabletVariantId === v.id ? "text-white" : "text-white/80",
                  )}
                >
                  {v.label}
                </p>
                <p className="mt-0.5 text-[10px] leading-snug text-white/40">
                  {v.hook}
                </p>
              </button>
            ))}
          </div>
          <p className="mt-3 text-[10px] leading-relaxed text-white/30">
            A = shipping home. Athletics lives on Lounge TV lab.
          </p>
        </aside>

        <div className="min-w-0 flex-1">
          <div className="mx-auto aspect-[4/3] w-full max-w-5xl overflow-hidden rounded-[28px] border border-white/15 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.65)] ring-1 ring-white/10">
            <LockerTablet
              fixtures={data.fixtures}
              prizePoolRaw={data.prizePoolRaw}
              entries={data.entries}
              chainLoading={data.chainLoading}
              fixturesLoading={data.fixturesLoading}
              prize={prize}
              locale={locale}
              messages={messages}
              players={data.players}
              playersLoading={data.playersLoading}
              starters={squad.starters}
              bench={squad.bench}
              activeSlot={squad.activeSlot}
              selectedIds={squad.selectedIds}
              clubCounts={squad.clubCounts}
              filledCount={squad.filledCount}
              onSlotClick={squad.setActiveSlot}
              onClearSlot={squad.clearSlot}
              onPick={(p) => squad.pickPlayer(p)}
              onReset={squad.reset}
              onRandom={() => squad.randomize(data.players)}
              pitchStyleId={pitchStyleId}
              onPitchStyleChange={(id) => {
                setPitchStyleId(id);
                savePitchStyleId(id);
              }}
              tabletVariantId={tabletVariantId}
              formationId={squad.formationId}
              onFormationChange={squad.setFormationId}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
