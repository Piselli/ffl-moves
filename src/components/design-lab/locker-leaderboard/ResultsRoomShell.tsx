"use client";

import { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { useReducedMotion } from "framer-motion";
import { LockerRoomBackground } from "@/components/design-lab/locker-hero/LockerRoomBackground";
import { cn } from "@/lib/utils";
import { ResultsPlaceNav } from "./ResultsPlaceChrome";
import { ResultsTablet } from "./ResultsTablet";
import { WallBroadcast, useWallCycle } from "./WallBroadcast";
import { useResultsRoomData } from "./useResultsRoomData";
import type { LabLeaderboardRow, LabSquadPlayer } from "./mockData";

/** Keep in sync with TABLET_MOTION_MS in TabletScene.tsx */
const TABLET_MOTION_MS = 520;

const TabletScene = dynamic(
  () =>
    import("@/components/design-lab/locker-hero/TabletScene").then(
      (m) => m.TabletScene,
    ),
  { ssr: false },
);

const LOUNGE = {
  place: "Supporters’ lounge",
  src: "/design-lab/locker-leaderboard/concepts/lb-room-lounge.png",
  screen: { top: "11%", left: "22%", width: "56%" },
} as const;

/**
 * Shipping results room — same device language as homepage (3D iPad + raise/lower
 * + Obsidian Glass), lounge plate instead of locker, wall TV passive.
 */
export function ResultsRoomShell({
  loungeVariantId = "current",
}: {
  loungeVariantId?: import("./loungeVariants").LoungeVariantId;
}) {
  const room = useResultsRoomData();
  const reduceMotion = useReducedMotion();
  const [tabletRaised, setTabletRaised] = useState(true);
  const [tabletSettledDown, setTabletSettledDown] = useState(false);
  const [pointerInTablet, setPointerInTablet] = useState(false);
  const [roomReady, setRoomReady] = useState(false);
  const [tabletReady, setTabletReady] = useState(false);
  const { mode } = useWallCycle(tabletRaised);

  const onRoomLoad = useCallback(() => setRoomReady(true), []);
  const onRoomError = useCallback(() => setRoomReady(true), []);
  const onTabletReady = useCallback(() => setTabletReady(true), []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setRoomReady(true);
      setTabletReady(true);
    }, 12_000);
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

  void roomReady;
  void tabletReady;

  return (
    <div className="fixed inset-0 z-[45] overflow-hidden bg-[#0a0908] text-white">
      <LockerRoomBackground
        src={LOUNGE.src}
        onImageLoad={onRoomLoad}
        onImageError={onRoomError}
      />

      {/* Wall TV — denser when tablet is down */}
      <div
        className={cn(
          "pointer-events-none absolute z-[15] transition-all ease-[cubic-bezier(0.22,1,0.36,1)]",
          tabletRaised ? "opacity-70" : "opacity-100",
        )}
        style={{
          top: LOUNGE.screen.top,
          left: LOUNGE.screen.left,
          width: LOUNGE.screen.width,
          transitionDuration: reduceMotion ? "0ms" : `${TABLET_MOTION_MS}ms`,
          transform: tabletRaised ? "scale(1)" : "scale(1.04)",
        }}
      >
        <WallBroadcast
          mode={mode}
          prevBoard={room.wallPrev}
          seasonHighlights={room.seasonHighlights}
          loungeVariantId={loungeVariantId}
          className="shadow-[0_20px_60px_rgba(0,0,0,0.55)]"
        />
      </div>

      {!tabletRaised && tabletSettledDown ? (
        <div className="pointer-events-none absolute inset-x-0 bottom-24 z-[18] px-5 sm:bottom-28">
          <div className="mx-auto max-w-3xl">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/50 drop-shadow">
              {LOUNGE.place}
            </p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight drop-shadow sm:text-4xl">
              Results lounge
            </h1>
          </div>
        </div>
      ) : null}

      {!tabletRaised && tabletSettledDown ? (
        <button
          type="button"
          onClick={() => setTabletRaised(true)}
          className="absolute bottom-5 left-4 z-[70] rounded-full border border-white/20 bg-black/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70 backdrop-blur-md transition hover:border-white/40 hover:text-white sm:left-6"
        >
          ↑ Show tablet
        </button>
      ) : null}

      {tabletRaised ? (
        <p className="pointer-events-none absolute bottom-2 left-1/2 z-20 hidden -translate-x-1/2 text-[10px] text-white/25 sm:block">
          Scroll outside tablet to explore the lounge
        </p>
      ) : null}

      <ResultsPlaceNav />

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
          <ResultsTablet room={room} />
        </TabletScene>
      </div>
    </div>
  );
}

/** @deprecated Lounge is locked — kept for type imports in old experiments. */
export type ResultsRoomId = "lounge";

export const RESULTS_ROOM_LIST = [
  { id: "lounge" as const, label: "Lounge", place: LOUNGE.place },
];

export type { LabLeaderboardRow, LabSquadPlayer };
