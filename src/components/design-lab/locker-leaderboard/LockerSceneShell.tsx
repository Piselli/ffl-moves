"use client";

import { LockerRoomBackground } from "@/components/design-lab/locker-hero/LockerRoomBackground";
import { LabChromeNav } from "./LabChromeNav";
import { LockerLeaderboardBoard } from "./LockerLeaderboardBoard";

/**
 * B · Full locker — room stage + floating plaque + brand neon.
 */
export function LockerSceneShell() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#1a1816] text-white">
      <LockerRoomBackground />

      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-[1]"
        style={{
          background:
            "radial-gradient(ellipse 52% 58% at 50% 46%, rgba(8,7,6,0.78) 0%, rgba(8,7,6,0.55) 42%, rgba(8,7,6,0.28) 68%, transparent 100%)",
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 z-[1] h-28 bg-gradient-to-b from-black/70 to-transparent"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] h-24 bg-gradient-to-t from-black/55 to-transparent"
      />

      <LabChromeNav theme="neon" />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-4xl items-start px-3 pb-44 pt-20 sm:px-5 sm:pb-48 sm:pt-24">
        <div className="w-full rounded-2xl border border-white/15 bg-black/55 px-4 py-5 shadow-[0_24px_80px_rgba(0,0,0,0.55),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-xl sm:px-6 sm:py-6">
          <LockerLeaderboardBoard theme="neon" density="compact" />
        </div>
      </div>
    </div>
  );
}
