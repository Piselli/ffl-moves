"use client";

import { useEffect, useState } from "react";

export function HeroDeadlinePlaque({
  targetTime,
  gwId,
  metaLabel,
  copy,
}: {
  targetTime: string;
  gwId: number;
  metaLabel?: string;
  copy: {
    untilDeadline: string;
    deadlinePassed: string;
    daySuffix: string;
    hourSuffix: string;
    minSuffix: string;
  };
}) {
  const [timeLeft, setTimeLeft] = useState<{ d: number; h: number; m: number } | null>(null);
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    function update() {
      const diff = new Date(targetTime).getTime() - Date.now();
      if (diff <= 0) {
        setExpired(true);
        setTimeLeft({ d: 0, h: 0, m: 0 });
        return;
      }
      setExpired(false);
      setTimeLeft({
        d: Math.floor(diff / 86400000),
        h: Math.floor((diff % 86400000) / 3600000),
        m: Math.floor((diff % 3600000) / 60000),
      });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetTime]);

  return (
    <div className="flex h-full min-h-0 min-w-0 w-full flex-1 flex-col items-start">
      <div className="mb-0.5 min-w-0 w-full shrink-0 space-y-px sm:mb-1 sm:space-y-0.5">
        <p className="text-[7px] font-bold uppercase leading-[1.2] tracking-[0.06em] text-white/40 sm:text-[9px] sm:tracking-[0.12em] md:tracking-[0.2em]">
          {copy.untilDeadline}
        </p>
        <p className="text-[6px] font-bold uppercase tracking-wider text-white/25 sm:text-[8px]">
          {metaLabel ?? `GW${gwId}`}
        </p>
      </div>
      <p className="mt-auto w-full min-w-0 max-w-full text-left whitespace-nowrap font-display text-base font-black tabular-nums text-white min-[380px]:text-lg sm:text-lg md:text-xl leading-none tracking-tight">
        {!timeLeft ? (
          <span className="text-white/20 animate-pulse">—</span>
        ) : expired ? (
          <span className="text-white/50">{copy.deadlinePassed}</span>
        ) : (
          <span className="inline-flex min-w-0 max-w-full flex-nowrap items-baseline justify-start gap-x-px sm:gap-x-0.5">
            <span className="shrink-0 tabular-nums">
              {String(timeLeft.d).padStart(2, "0")}
              {copy.daySuffix}
            </span>
            <span className="shrink-0 text-white/40 text-[0.85em]" aria-hidden>
              :
            </span>
            <span className="shrink-0 tabular-nums">
              {String(timeLeft.h).padStart(2, "0")}
              {copy.hourSuffix}
            </span>
            <span className="shrink-0 text-white/40 text-[0.85em]" aria-hidden>
              :
            </span>
            <span className="shrink-0 tabular-nums">
              {String(timeLeft.m).padStart(2, "0")}
              {copy.minSuffix}
            </span>
          </span>
        )}
      </p>
    </div>
  );
}
