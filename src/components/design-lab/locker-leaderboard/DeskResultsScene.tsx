"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { LocaleBridge, useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { SurfaceTipSheet } from "@/components/design-lab/locker-hero/SurfaceTipSheet";
import {
  loadHomepageLookId,
  saveHomepageLookId,
  SHIPPING_TABLET_VARIANT,
  type TabletVariantId,
} from "@/components/design-lab/locker-hero/tabletVariants";
import { LockerRoomBackground } from "@/components/design-lab/locker-hero/LockerRoomBackground";
import {
  objectCoverRect,
  type CoverRect,
} from "@/components/design-lab/locker-hero/nameplateQuads";
import { FPL_SPRITE_URL } from "@/lib/fpl-photo-atlas";
import { cn } from "@/lib/utils";
import { BoardBroadcast } from "./BoardBroadcast";
import { ResultsTablet } from "./ResultsTablet";
import {
  DEFAULT_RESULTS_CHROME,
  loadResultsChromeId,
  resultsChromeFromHomepageLook,
  RESULTS_CHROME_VARIANTS,
  saveResultsChromeId,
  SHIPPING_RESULTS_CHROME,
  type ResultsChromeId,
} from "./resultsChromeVariants";
import {
  DEFAULT_YOU_XI_VARIANT,
  loadYouXiVariantId,
  saveYouXiVariantId,
  SHIPPING_YOU_XI_VARIANT,
  YOU_XI_VARIANTS,
  type YouXiVariantId,
} from "./youXiVariants";
import { SCROLLBAR_DEMOS } from "./resultsScrollbars";
import { useResultsRoomData } from "./useResultsRoomData";

/** Keep in sync with TABLET_MOTION_MS in TabletScene.tsx */
const TABLET_MOTION_MS = 520;

const TabletScene = dynamic(
  () =>
    import("@/components/design-lab/locker-hero/TabletScene").then(
      (m) => m.TabletScene,
    ),
  { ssr: false },
);

/**
 * Desk plate + whiteboard writing surface.
 * Board % are plate-relative (bright writing face), then mapped through
 * object-cover + object-center so the overlay tracks the photo crop.
 */
const SCENE = {
  src: "/design-lab/locker-leaderboard/concepts/lb-locker-table-whiteboard.png",
  media: { w: 1536, h: 1024 },
  /** Matches LockerRoomBackground object-center. */
  objectPosition: { x: 0.5, y: 0.5 },
  /**
   * Bright writing face on the 1536×1024 plate (inside frame + top bevel).
   * Calibrated from source luminance, not the full metal bezel.
   */
  /**
   * Writing face — nudged down so the title clears the site nav,
   * still inside the physical whiteboard frame.
   */
  board: { top: 18.4, left: 30.2, width: 39.6, height: 26.4 },
} as const;

function useDeskPlateCover() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [cover, setCover] = useState<CoverRect>({ x: 0, y: 0, w: 0, h: 0 });

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const measure = () => {
      const r = host.getBoundingClientRect();
      setCover(
        objectCoverRect(
          r.width,
          r.height,
          SCENE.media.w,
          SCENE.media.h,
          SCENE.objectPosition.x,
          SCENE.objectPosition.y,
        ),
      );
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(host);
    return () => ro.disconnect();
  }, []);

  return { hostRef, cover };
}

type Props = {
  /**
   * `false` (default) — shipping `/leaderboard`: follows homepage tablet look.
   * `true` — design lab: all chrome variants + Design rail.
   */
  lab?: boolean;
};

/** `null` until mounted so SSR/hydration never boots the desk scene on a phone. */
function useIsPhone(): boolean | null {
  const [phone, setPhone] = useState<boolean | null>(null);
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const sync = () => setPhone(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return phone;
}

type LayoutMode = "pending" | "flat" | "scene";

function shippingLayoutMode(
  lab: boolean,
  isPhone: boolean | null,
): LayoutMode {
  if (lab) return "scene";
  if (isPhone === null) return "pending";
  return isPhone ? "flat" : "scene";
}

export function DeskResultsScene({ lab = false }: Props) {
  const siteLocale = useSiteLocale();
  const tips = useSiteMessages().pages.surfaceTips;
  const room = useResultsRoomData();
  const reduceMotion = useReducedMotion();
  const isPhone = useIsPhone();
  const layoutMode = shippingLayoutMode(lab, isPhone);
  const flatShell = layoutMode === "flat";
  const useDeskScene = layoutMode === "scene";
  const { hostRef, cover } = useDeskPlateCover();
  const [tabletRaised, setTabletRaised] = useState(true);
  const [pointerInTablet, setPointerInTablet] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  /** Fade in 3D iPad only after model + camera settle — skip oversized CSS fallback. */
  const [tabletShown, setTabletShown] = useState(false);
  const [chromeId, setChromeId] = useState<ResultsChromeId>(
    lab ? DEFAULT_RESULTS_CHROME : "home",
  );
  const [youXiVariantId, setYouXiVariantId] = useState<YouXiVariantId>(
    lab ? DEFAULT_YOU_XI_VARIANT : SHIPPING_YOU_XI_VARIANT,
  );
  const [tabletLookId, setTabletLookId] = useState<TabletVariantId>(
    SHIPPING_TABLET_VARIANT,
  );

  const onTabletLookChange = useCallback(
    (id: TabletVariantId) => {
      saveHomepageLookId(id);
      setTabletLookId(id);
      setChromeId(resultsChromeFromHomepageLook(id));
    },
    [],
  );

  useEffect(() => {
    if (!lab) {
      const look = loadHomepageLookId();
      setTabletLookId(look);
      setChromeId(resultsChromeFromHomepageLook(look));
      setYouXiVariantId(SHIPPING_YOU_XI_VARIANT);
      return;
    }
    setTabletLookId(loadHomepageLookId());
    setChromeId(loadResultsChromeId());
    setYouXiVariantId(loadYouXiVariantId());
  }, [lab]);

  const onRoomLoad = useCallback(() => setRoomReady(true), []);
  const onRoomError = useCallback(() => setRoomReady(true), []);
  const onTabletReady = useCallback(() => {
    // Two frames so ResponsiveCamera + Html screen bounds match final desk scale.
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setTabletShown(true));
    });
  }, []);

  useEffect(() => {
    const preload = document.createElement("link");
    preload.rel = "preload";
    preload.as = "image";
    preload.href = FPL_SPRITE_URL;
    document.head.appendChild(preload);
    return () => preload.remove();
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => setTabletShown(true), 12_000);
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  useEffect(() => {
    if (!useDeskScene) return;
    const onWheel = (e: WheelEvent) => {
      if (pointerInTablet) return;
      if (Math.abs(e.deltaY) < 6) return;
      if (e.deltaY > 0) setTabletRaised(false);
      else setTabletRaised(true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [pointerInTablet, useDeskScene]);

  void roomReady;

  const tabletScreen = (
    <LocaleBridge {...siteLocale}>
      <ResultsTablet
        room={room}
        chromeId={chromeId}
        youXiVariantId={youXiVariantId}
        tabletLookId={tabletLookId}
        onTabletLookChange={onTabletLookChange}
        flatShell={flatShell}
      />
    </LocaleBridge>
  );

  const boardReady = useDeskScene && cover.w > 0 && cover.h > 0;

  if (layoutMode === "pending") {
    return (
      <div className="fixed inset-0 z-[45] overflow-hidden bg-black text-white">
        <LockerLabNav liveLinks={!lab} tabletShell />
      </div>
    );
  }

  if (flatShell) {
    return (
      <div className="fixed inset-0 z-[45] overflow-hidden bg-black text-white">
        <LockerLabNav liveLinks={!lab} tabletShell />
        <div className="absolute inset-0 z-[60] flex flex-col overflow-hidden bg-black pt-14">
          {tabletScreen}
        </div>
        <SurfaceTipSheet
          tipId="leaderboard"
          title={tips.leaderboardTitle}
          body={tips.leaderboardBody}
          cta={tips.leaderboardCta}
          placement="bottom-end"
        />
      </div>
    );
  }

  return (
    <div
      ref={hostRef}
      className="fixed inset-0 z-[45] overflow-hidden bg-[#1a1816] text-white"
    >
      <LockerRoomBackground
        src={SCENE.src}
        objectClassName="object-center"
        onImageLoad={onRoomLoad}
        onImageError={onRoomError}
      />

      {boardReady ? (
        <div
          className="pointer-events-none absolute z-[15]"
          style={{
            left: cover.x,
            top: cover.y,
            width: cover.w,
            height: cover.h,
          }}
        >
          <div
            className={cn(
              "absolute overflow-hidden transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)]",
              tabletRaised ? "opacity-[0.72]" : "opacity-100",
            )}
            style={{
              top: `${SCENE.board.top}%`,
              left: `${SCENE.board.left}%`,
              width: `${SCENE.board.width}%`,
              height: `${SCENE.board.height}%`,
              transitionDuration: reduceMotion
                ? "0ms"
                : `${TABLET_MOTION_MS}ms`,
            }}
          >
            <BoardBroadcast
              rows={room.honorBoard}
              prizeSymbol={room.honorSymbol}
              className="h-full"
            />
          </div>
        </div>
      ) : null}

      <LockerLabNav liveLinks={!lab} />

      {lab ? (
        <aside className="pointer-events-none absolute bottom-4 right-3 top-20 z-[75] flex w-[9.5rem] flex-col gap-2 sm:right-5 sm:w-[11.5rem]">
          <div className="pointer-events-auto flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-white/12 bg-black/55 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <div className="mb-1.5 flex items-center justify-between gap-1 px-1.5">
              <p className="font-display text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
                Design
              </p>
              <Link
                href="/leaderboard"
                className="text-[8px] uppercase tracking-wider text-white/35 hover:text-white/70"
              >
                Live →
              </Link>
            </div>
            <p className="mb-1.5 px-1.5 text-[8px] leading-snug text-white/30">
              Shipping follows homepage look (Obsidian / Crystal on /).
            </p>
            <div className="min-h-0 flex-1 space-y-1 overflow-y-auto pr-0.5">
              {[
                ...RESULTS_CHROME_VARIANTS.filter((v) => v.favorite),
                ...RESULTS_CHROME_VARIANTS.filter((v) => !v.favorite),
              ].map((v) => {
                const on = chromeId === v.id;
                const shipping = v.id === SHIPPING_RESULTS_CHROME;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setChromeId(v.id);
                      saveResultsChromeId(v.id);
                    }}
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
                      {v.name}
                      {shipping ? (
                        <span className="ml-1 text-[8px] font-bold text-[#00f948]/80">
                          LIVE
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[9px] leading-snug text-white/40">
                      {v.tagline}
                    </p>
                    <p className="mt-0.5 text-[8px] uppercase tracking-[0.12em] text-white/25">
                      Scroll · {SCROLLBAR_DEMOS[v.id].label}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>

          {YOU_XI_VARIANTS.length > 1 ? (
          <div className="pointer-events-auto shrink-0 overflow-hidden rounded-2xl border border-white/12 bg-black/55 p-2 shadow-[0_20px_50px_rgba(0,0,0,0.55)] backdrop-blur-xl">
            <p className="mb-1.5 px-1.5 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
              Your XI
            </p>
            <div className="max-h-[14rem] space-y-1 overflow-y-auto pr-0.5">
              {YOU_XI_VARIANTS.map((v) => {
                const on = youXiVariantId === v.id;
                const shipping = v.id === SHIPPING_YOU_XI_VARIANT;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => {
                      setYouXiVariantId(v.id);
                      saveYouXiVariantId(v.id);
                    }}
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
                      {v.label}
                      {shipping ? (
                        <span className="ml-1 text-[8px] font-bold text-[#00f948]/80">
                          LIVE
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-0.5 text-[9px] leading-snug text-white/40">
                      {v.blurb}
                    </p>
                  </button>
                );
              })}
            </div>
          </div>
          ) : null}
        </aside>
      ) : null}

      <div
        className={cn(
          "absolute inset-0 z-[60] transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)]",
          tabletShown ? "opacity-100" : "pointer-events-none opacity-0",
          tabletShown && !tabletRaised && "pointer-events-none",
        )}
        style={{
          transitionDuration: reduceMotion ? "0ms" : "320ms",
        }}
      >
        <TabletScene
          placement="desk"
          raised={tabletRaised}
          reduceMotion={Boolean(reduceMotion)}
          skipDomFallback
          onPointerInsideChange={setPointerInTablet}
          onModelReady={onTabletReady}
        >
          {tabletScreen}
        </TabletScene>
      </div>

      {!lab ? (
        <SurfaceTipSheet
          tipId="leaderboard"
          title={tips.leaderboardTitle}
          body={tips.leaderboardBody}
          cta={tips.leaderboardCta}
          placement="bottom-end"
        />
      ) : null}
    </div>
  );
}
