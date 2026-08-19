"use client";

import Image from "next/image";
import { LabChromeNav } from "./LabChromeNav";
import { LockerLeaderboardBoard } from "./LockerLeaderboardBoard";

/**
 * A · Wall board — soft locker wash + brand neon (baseline).
 */
export function WallBoardShell() {
  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#161412] text-white">
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        <Image
          src="/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.webp"
          alt=""
          fill
          unoptimized
          priority
          sizes="100vw"
          className="scale-110 object-cover object-[50%_42%] opacity-[0.22] blur-[2px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_70%_55%_at_50%_18%,rgba(26,24,22,0.15)_0%,rgba(14,12,11,0.88)_58%,#0c0b0a_100%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(0,0,0,0.55)_0%,transparent_18%,transparent_72%,rgba(0,0,0,0.5)_100%)]" />
      </div>

      <LabChromeNav theme="neon" />

      <div className="relative z-10 mx-auto max-w-5xl px-4 pb-44 pt-24 sm:px-6 sm:pb-48 sm:pt-28">
        <LockerLeaderboardBoard theme="neon" density="comfortable" />
      </div>
    </div>
  );
}
