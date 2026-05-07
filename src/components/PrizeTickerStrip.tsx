"use client";

import { useEffect, useState } from "react";
import { formatMOVE, shortenAddress } from "@/lib/utils";

export type TickerWinner = {
  address: string;
  rank: number;
  prizeAmount: number;
};

type Props = {
  data: { gwId: number; winners: TickerWinner[] } | null;
};

const RANK_COLORS: Record<number, string> = {
  1: "#00f948",
  2: "#a3e635",
  3: "#86efac",
};

export function PrizeTickerStrip({ data }: Props) {
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("fflmove_nicknames") ?? "{}");
      setNicknames(stored);
    } catch {
      // localStorage unavailable
    }
  }, []);

  const displayName = (address: string) =>
    nicknames[address.toLowerCase()] ?? shortenAddress(address);

  const keyframes = `@keyframes prize-ticker { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`;

  // Always render the 36px strip for stable layout
  if (!data || !data.winners.length) {
    return (
      <div className="fixed top-0 left-0 right-0 h-9 z-40 bg-[#0D0F12] border-b border-white/[0.05]" />
    );
  }

  // Double the list for seamless infinite scroll
  const items = [...data.winners, ...data.winners];

  return (
    <div className="fixed top-0 left-0 right-0 h-9 z-40 bg-[#0D0F12] border-b border-white/[0.08] flex items-center overflow-hidden">
      <style>{keyframes}</style>
      {/* Label badge */}
      <div className="flex items-center gap-1.5 px-3 h-full border-r border-white/[0.08] shrink-0 bg-[#0D0F12] z-10">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00f948] shadow-[0_0_4px_rgba(0,249,72,0.8)] animate-pulse" />
        <span className="text-[10px] font-black uppercase tracking-[0.1em] text-white/50 whitespace-nowrap font-display">
          GW {data.gwId} prizes
        </span>
      </div>

      {/* Left fade */}
      <div className="absolute left-[108px] top-0 bottom-0 w-5 bg-gradient-to-r from-[#0D0F12] to-transparent pointer-events-none z-[1]" />

      {/* Scrolling track */}
      <div
        className="flex items-center will-change-transform"
        style={{ animation: "prize-ticker 45s linear infinite" }}
      >
        {items.map((w, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 whitespace-nowrap px-4">
            <span
              className="text-[10px] font-black font-display"
              style={{ color: RANK_COLORS[w.rank] ?? "rgba(255,255,255,0.35)" }}
            >
              #{w.rank}
            </span>
            <span className="text-[11px] text-white/65">{displayName(w.address)}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-px rounded"
              style={{
                color: "#00f948",
                background: "rgba(0,249,72,0.08)",
                border: "1px solid rgba(0,249,72,0.2)",
              }}
            >
              {formatMOVE(w.prizeAmount)} MOVE
            </span>
            <span className="text-white/15 text-xs">·</span>
          </span>
        ))}
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-10 bg-gradient-to-l from-[#0D0F12] to-transparent pointer-events-none" />
    </div>
  );
}
