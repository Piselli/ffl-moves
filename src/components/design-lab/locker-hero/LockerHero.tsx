"use client";

import { useCallback, useEffect, useState } from "react";
import { useReducedMotion } from "framer-motion";
import dynamic from "next/dynamic";
import Link from "next/link";
import type { Player } from "@/lib/types";
import { usePrizeAsset } from "@/components/PrizeAssetProvider";
import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";
import { LockerRoomBackground } from "./LockerRoomBackground";
import { LockerHeroBoot } from "./LockerHeroBoot";
import { LockerTablet } from "./LockerTablet";
import { LockerKits } from "./LockerKits";
import {
  DEFAULT_PITCH_STYLE,
  loadPitchStyleId,
  savePitchStyleId,
  type PitchStyleId,
} from "./pitchStyles";
import { LockerLabNav } from "./LockerLabNav";
import { useLockerHeroData } from "./useLockerHeroData";
import { useSquadPick } from "./useSquadPick";
import { ACTIVE_NAMEPLATE_GLOW } from "./nameplateGlows";
import { cn } from "@/lib/utils";
import {
  getTabletVariant,
  HOMEPAGE_COMPARE_VARIANTS,
  loadHomepageLookId,
  saveHomepageLookId,
  SHIPPING_TABLET_VARIANT,
  type TabletVariantId,
} from "./tabletVariants";

const TabletScene = dynamic(
  () => import("./TabletScene").then((module) => module.TabletScene),
  { ssr: false },
);

/** Keep in sync with TABLET_MOTION_MS in TabletScene.tsx */
const TABLET_MOTION_MS = 520;

/** Locked production kit room — v25 hangers (no logos). */
const ROOM_BACKGROUND = {
  id: "v25",
  src: "/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.png",
} as const;

type LockerHeroVariant = "lab" | "site";

type LockerHeroProps = {
  /**
   * `lab` — design-lab mixer (controls, calibrator links).
   * `site` — production homepage (locked nameplates + no lab chrome).
   */
  variant?: LockerHeroVariant;
};

/**
 * Close-cropped iPad: the live screen fills most of the viewport.
 * Scroll outside the tablet lowers it so the room becomes interactive.
 */
export function LockerHero({ variant = "lab" }: LockerHeroProps) {
  const isSite = variant === "site";
  const isLab = !isSite;
  const reduceMotion = useReducedMotion();
  const data = useLockerHeroData();
  const squad = useSquadPick();
  const prize = usePrizeAsset();
  const { locale } = useSiteLocale();
  const messages = useSiteMessages();

  const [roomImageReady, setRoomImageReady] = useState(!isSite);
  const [tabletReady, setTabletReady] = useState(!isSite);
  const [bootVisible, setBootVisible] = useState(isSite);
  const [bootMounted, setBootMounted] = useState(isSite);
  const sceneReady = roomImageReady && tabletReady;

  const onRoomImageLoad = useCallback(() => setRoomImageReady(true), []);
  const onRoomImageError = useCallback(() => setRoomImageReady(true), []);
  const onTabletReady = useCallback(() => setTabletReady(true), []);

  const [tabletRaised, setTabletRaised] = useState(true);
  const [tabletSettledDown, setTabletSettledDown] = useState(false);
  const [pointerInTablet, setPointerInTablet] = useState(false);
  const [pitchStyleId, setPitchStyleId] =
    useState<PitchStyleId>(DEFAULT_PITCH_STYLE);
  const [homeLookId, setHomeLookId] =
    useState<TabletVariantId>(SHIPPING_TABLET_VARIANT);

  useEffect(() => {
    if (!isSite) return;
    const img = new window.Image();
    img.src = ROOM_BACKGROUND.src;
    img.onload = () => setRoomImageReady(true);
    img.onerror = () => setRoomImageReady(true);
  }, [isSite]);

  useEffect(() => {
    if (!isSite || !sceneReady) return;
    if (reduceMotion) {
      setBootVisible(false);
      setBootMounted(false);
      return;
    }
    setBootVisible(false);
  }, [isSite, reduceMotion, sceneReady]);

  useEffect(() => {
    if (!isSite) return;
    const id = window.setTimeout(() => {
      setRoomImageReady(true);
      setTabletReady(true);
    }, 12_000);
    return () => window.clearTimeout(id);
  }, [isSite]);

  useEffect(() => {
    if (isSite) return;
    setHomeLookId(loadHomepageLookId());
  }, [isSite]);

  useEffect(() => {
    setPitchStyleId(loadPitchStyleId());
  }, []);

  const onPitchStyleChange = useCallback((id: PitchStyleId) => {
    setPitchStyleId(id);
    savePitchStyleId(id);
  }, []);

  const onHomeLookChange = useCallback((id: TabletVariantId) => {
    setHomeLookId(id);
    saveHomepageLookId(id);
  }, []);

  const onPick = useCallback(
    (player: Player) => {
      squad.pickPlayer(player);
    },
    [squad],
  );

  // Lab preview: /design-lab/locker-hero?kits=1 auto-fills a squad so hang positions can be tuned.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!new URLSearchParams(window.location.search).has("kits")) return;
    if (data.playersLoading || data.players.length === 0) return;
    if (squad.filledCount > 0) return;
    squad.randomize(data.players);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- one-shot lab seed
  }, [data.players, data.playersLoading, squad.filledCount, squad.randomize]);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (pointerInTablet) return;
      if (Math.abs(e.deltaY) < 6) return;
      if (e.deltaY > 0) {
        setTabletRaised(false);
      } else {
        setTabletRaised(true);
      }
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [pointerInTablet]);

  useEffect(() => {
    if (tabletRaised) {
      setTabletSettledDown(false);
      return;
    }
    const id = window.setTimeout(
      () => setTabletSettledDown(true),
      reduceMotion ? 0 : TABLET_MOTION_MS,
    );
    return () => window.clearTimeout(id);
  }, [reduceMotion, tabletRaised]);

  return (
    <div className="fixed inset-0 z-[45] overflow-hidden bg-[#1a1816] text-white">
      <LockerRoomBackground
        src={ROOM_BACKGROUND.src}
        onImageLoad={onRoomImageLoad}
        onImageError={onRoomImageError}
      />

      <LockerKits
        starters={squad.starters}
        bench={squad.bench}
        roomBackgroundId={ROOM_BACKGROUND.id}
        roomFocused={!tabletRaised}
        glowId={ACTIVE_NAMEPLATE_GLOW}
        preferBakedQuads
      />

      {isLab ? (
        <div className="pointer-events-none absolute left-4 top-20 z-30 sm:left-6 sm:top-24">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            Design Lab · Locker Hero
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <Link
              href="/design-lab"
              className="pointer-events-auto text-[11px] text-white/50 underline-offset-2 hover:text-white/80 hover:underline"
            >
              ← All directions
            </Link>
            <Link
              href="/design-lab/locker-tablet"
              className="pointer-events-auto text-[11px] text-violet-300/80 underline-offset-2 hover:text-violet-200 hover:underline"
            >
              iPad Refero styles
            </Link>
            <Link
              href="/design-lab/locker-hero/nameplates"
              className="pointer-events-auto text-[11px] text-amber-300/70 underline-offset-2 hover:text-amber-200 hover:underline"
            >
              Nameplate calibrator
            </Link>
            <Link
              href="/design-lab/locker-leaderboard"
              className="pointer-events-auto text-[11px] text-sky-300/70 underline-offset-2 hover:text-sky-200 hover:underline"
            >
              Lounge TV
            </Link>
            <Link
              href="/design-lab/desk-results"
              className="pointer-events-auto text-[11px] text-lime-300/70 underline-offset-2 hover:text-lime-200 hover:underline"
            >
              Desk results archive
            </Link>
            <Link
              href="/design-lab/locker-menu"
              className="pointer-events-auto text-[11px] text-orange-300/70 underline-offset-2 hover:text-orange-200 hover:underline"
            >
              Menu A/B
            </Link>
          </div>
        </div>
      ) : null}

      {!tabletRaised && tabletSettledDown && (
        <button
          type="button"
          onClick={() => setTabletRaised(true)}
          className="absolute bottom-5 left-4 z-[70] rounded-full border border-white/20 bg-black/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70 backdrop-blur-md transition hover:border-white/40 hover:text-white sm:left-6"
        >
          ↑ Show tablet
        </button>
      )}

      {tabletRaised && (
        <p className="pointer-events-none absolute bottom-2 left-1/2 z-20 hidden -translate-x-1/2 text-[10px] text-white/25 sm:block">
          Scroll outside tablet to explore the room
        </p>
      )}

      <LockerLabNav liveLinks={!isLab} />

      {isLab ? (
        <aside className="pointer-events-none absolute bottom-4 right-3 top-20 z-[75] flex w-[9.5rem] flex-col sm:right-5 sm:w-[11rem]">
          <div className="pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-2xl border border-white/12 bg-black/55 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <p className="px-1.5 pb-1 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
              Look archive
            </p>
            <p className="mb-1.5 px-1.5 text-[8px] leading-snug text-white/30">
              Shipping = Crystal. Switch here to compare.
            </p>
            <div className="space-y-1">
              {HOMEPAGE_COMPARE_VARIANTS.map((id) => {
                const v = getTabletVariant(id);
                const on = homeLookId === id;
                const shipping = id === SHIPPING_TABLET_VARIANT;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => onHomeLookChange(id)}
                    className={cn(
                      "w-full rounded-xl px-2 py-2 text-left transition active:scale-[0.98]",
                      on
                        ? "bg-white/15 ring-1 ring-white/35"
                        : "bg-white/[0.03] hover:bg-white/[0.07]",
                    )}
                  >
                    <p
                      className={cn(
                        "font-display text-[10px] font-black uppercase tracking-wide",
                        on ? "text-white" : "text-white/75",
                      )}
                    >
                      {id === "current" ? "Obsidian" : "Crystal"}
                      {shipping ? (
                        <span className="ml-1 text-[8px] font-bold text-[#00f948]/80">
                          LIVE
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[9px] leading-snug text-white/40">
                      {v.hook}
                    </p>
                  </button>
                );
              })}
            </div>
            <Link
              href="/design-lab/locker-tablet"
              className="mt-2 block px-1.5 text-[9px] text-violet-300/70 underline-offset-2 hover:text-violet-200 hover:underline"
            >
              All iPad styles →
            </Link>
          </div>
        </aside>
      ) : null}

      <div
        className={cn(
          "absolute inset-0 z-[60]",
          !tabletRaised && "pointer-events-none",
        )}
      >
        <TabletScene
          raised={tabletRaised}
          reduceMotion={Boolean(reduceMotion)}
          onPointerInsideChange={setPointerInTablet}
          onModelReady={onTabletReady}
        >
          <LockerTablet
            fixtures={data.fixtures}
            prizePoolRaw={data.prizePoolRaw}
            entries={data.entries}
            prize={prize}
            locale={locale}
            messages={messages}
            players={data.players}
            playersLoading={data.playersLoading}
            starters={squad.starters}
            bench={squad.bench}
            activeSlot={squad.activeSlot}
            selectedIds={squad.selectedIds}
            filledCount={squad.filledCount}
            onSlotClick={squad.setActiveSlot}
            onClearSlot={squad.clearSlot}
            onPick={onPick}
            onReset={squad.reset}
            onRandom={() => squad.randomize(data.players)}
            pitchStyleId={pitchStyleId}
            onPitchStyleChange={onPitchStyleChange}
            tabletVariantId={isSite ? SHIPPING_TABLET_VARIANT : homeLookId}
            formationId={squad.formationId}
            onFormationChange={squad.setFormationId}
          />
        </TabletScene>
      </div>

      {bootMounted ? (
        <LockerHeroBoot
          visible={bootVisible}
          reduceMotion={Boolean(reduceMotion)}
          onFadeComplete={() => setBootMounted(false)}
        />
      ) : null}
    </div>
  );
}
