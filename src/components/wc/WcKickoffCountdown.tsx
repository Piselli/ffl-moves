"use client";

import { useEffect, useState } from "react";

function pad(n: number) {
  return String(n).padStart(2, "0");
}

export function WcKickoffCountdown({
  targetTime,
  label,
  meta,
  d,
  h,
  m,
  s,
}: {
  targetTime: string;
  label: string;
  meta: string;
  d: string;
  h: string;
  m: string;
  s: string;
}) {
  const kickoffMs = Date.parse(targetTime);
  const [left, setLeft] = useState<{ d: number; h: number; m: number; s: number } | null>(null);

  useEffect(() => {
    if (!Number.isFinite(kickoffMs)) return;
    function tick() {
      const diff = kickoffMs - Date.now();
      const safe = Math.max(0, diff);
      setLeft({
        d: Math.floor(safe / 86400000),
        h: Math.floor((safe % 86400000) / 3600000),
        m: Math.floor((safe % 3600000) / 60000),
        s: Math.floor((safe % 60000) / 1000),
      });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [kickoffMs]);

  const seg = (value: number | null, suffix: string) => (
    <span className="flex flex-col items-center">
      <span className="font-wc-hero text-[26px] font-black tabular-nums leading-none text-white sm:text-[30px]">
        {value == null ? "--" : pad(value)}
      </span>
      <span className="mt-1.5 text-[8px] font-bold uppercase tracking-[0.18em] text-white/35">{suffix}</span>
    </span>
  );

  const dot = (
    <span className="pb-3.5 text-[20px] font-black leading-none text-white/20" aria-hidden>
      :
    </span>
  );

  return (
    <div className="inline-flex flex-col items-center rounded-2xl border border-white/10 bg-black/45 px-5 py-3.5 backdrop-blur-md">
      <span className="flex items-center gap-2 text-[9px] font-bold uppercase tracking-[0.24em] text-[#00f948]/85">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[#00f948]" aria-hidden />
        {label}
      </span>
      <div className="mt-2.5 flex items-end gap-2">
        {seg(left?.d ?? null, d)}
        {dot}
        {seg(left?.h ?? null, h)}
        {dot}
        {seg(left?.m ?? null, m)}
        {dot}
        {seg(left?.s ?? null, s)}
      </div>
      <span className="mt-2.5 text-[9.5px] font-semibold uppercase tracking-[0.16em] text-white/40">{meta}</span>
    </div>
  );
}
