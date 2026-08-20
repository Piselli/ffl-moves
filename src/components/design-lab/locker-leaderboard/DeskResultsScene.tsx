"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useReducedMotion } from "framer-motion";
import { LockerLabNav } from "@/components/design-lab/locker-hero/LockerLabNav";
import { LockerRoomBackground } from "@/components/design-lab/locker-hero/LockerRoomBackground";
import { FPL_SPRITE_URL } from "@/lib/fpl-photo-atlas";
import { cn } from "@/lib/utils";
import { BoardBroadcast } from "./BoardBroadcast";
import { ResultsTablet } from "./ResultsTablet";
import {
  DEFAULT_RESULTS_CHROME,
  loadResultsChromeId,
  RESULTS_CHROME_VARIANTS,
  saveResultsChromeId,
  SHIPPING_RESULTS_CHROME,
  type ResultsChromeId,
} from "./resultsChromeVariants";
import { SCROLLBAR_DEMOS } from "./resultsScrollbars";
import { useWallCycle } from "./WallBroadcast";
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

const SCENE = {
  src: "/design-lab/locker-leaderboard/concepts/lb-locker-table-whiteboard.png",
  board: { top: "12.3%", left: "27.4%", width: "45.2%", height: "32.8%" },
} as const;

type Props = {
  /**
   * `false` (default) — shipping `/leaderboard`: Crystal Glass only.
   * `true` — design lab: all chrome variants + Design rail.
   */
  lab?: boolean;
};

export function DeskResultsScene({ lab = false }: Props) {
  const room = useResultsRoomData();
  const reduceMotion = useReducedMotion();
  const [tabletRaised, setTabletRaised] = useState(true);
  const [pointerInTablet, setPointerInTablet] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  /** Fade in 3D iPad only after model + camera settle — skip oversized CSS fallback. */
  const [tabletShown, setTabletShown] = useState(false);
  const [chromeId, setChromeId] = useState<ResultsChromeId>(
    lab ? DEFAULT_RESULTS_CHROME : SHIPPING_RESULTS_CHROME,
  );
  const { mode } = useWallCycle(tabletRaised);

  useEffect(() => {
    if (!lab) {
      setChromeId(SHIPPING_RESULTS_CHROME);
      return;
    }
    setChromeId(loadResultsChromeId());
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
    const onWheel = (e: WheelEvent) => {
      if (pointerInTablet) return;
      if (Math.abs(e.deltaY) < 6) return;
      if (e.deltaY > 0) setTabletRaised(false);
      else setTabletRaised(true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [pointerInTablet]);

  void roomReady;

  const tabletScreen = (
    <ResultsTablet room={room} chromeId={chromeId} />
  );

  return (
    <div className="fixed inset-0 z-[45] overflow-hidden bg-[#1a1816] text-white">
      <LockerRoomBackground
        src={SCENE.src}
        objectClassName="object-[center_62%]"
        onImageLoad={onRoomLoad}
        onImageError={onRoomError}
      />

      <div
        className={cn(
          "pointer-events-none absolute z-[15] overflow-hidden transition-opacity ease-[cubic-bezier(0.22,1,0.36,1)]",
          tabletRaised ? "opacity-70" : "opacity-95",
        )}
        style={{
          top: SCENE.board.top,
          left: SCENE.board.left,
          width: SCENE.board.width,
          height: SCENE.board.height,
          transitionDuration: reduceMotion ? "0ms" : `${TABLET_MOTION_MS}ms`,
        }}
      >
        <BoardBroadcast
          mode={mode}
          prevBoard={room.wallPrev}
          seasonHighlights={room.seasonHighlights}
          className="h-full"
        />
      </div>

      <LockerLabNav liveLinks={!lab} />

      {lab ? (
        <aside className="pointer-events-none absolute bottom-4 right-3 top-20 z-[75] flex w-[9.5rem] flex-col sm:right-5 sm:w-[11.5rem]">
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
              Shipping = Crystal. Archive lives here.
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
    </div>
  );
}
