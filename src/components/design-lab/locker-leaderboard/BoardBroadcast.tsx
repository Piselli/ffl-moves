"use client";

import type { CSSProperties } from "react";
import { Permanent_Marker } from "next/font/google";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";
import type { HonorBoardRow } from "./mockData";

/** Classic dry-erase / Sharpie look. Latin only — title stays Latin caps. */
const markerFont = Permanent_Marker({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
});

const INK = "#000000";

/**
 * Passive honor board — all-time top-10 USDC earners, marker on whiteboard.
 */
export function BoardBroadcast({
  rows,
  prizeSymbol = "USDC",
  className,
}: {
  rows: readonly HonorBoardRow[];
  prizeSymbol?: string;
  className?: string;
}) {
  const lb = useSiteMessages().pages.leaderboard;
  const list = rows.slice(0, 10);
  const title = lb.wallBoardHonorTitle;

  return (
    <div
      className={cn(
        markerFont.className,
        "pointer-events-none flex h-full select-none flex-col px-[3.5%] py-[3%]",
        className,
      )}
      style={{ color: INK } as CSSProperties}
      role="status"
      aria-live="polite"
      aria-atomic="true"
      aria-label={title}
    >
      <header className="shrink-0 pb-1">
        <p className="text-[16px] leading-none tracking-wide sm:text-[18px]">
          {title}
        </p>
        <span
          aria-hidden
          className="mt-1.5 block h-[2.5px] w-[70%] origin-left rounded-sm bg-black"
          style={{ transform: "rotate(-0.5deg)", opacity: 0.85 }}
        />
      </header>

      <ul className="mt-2 grid min-h-0 flex-1 grid-rows-10">
        {list.map((row) => (
          <li
            key={`${row.rank}-${row.owner}`}
            className="grid min-h-0 grid-cols-[1.6rem_minmax(0,1fr)_auto] items-center gap-1.5 sm:grid-cols-[1.9rem_minmax(0,1fr)_auto] sm:gap-2"
          >
            <span className="text-[13px] leading-none tabular-nums sm:text-[14px]">
              {row.rank}
            </span>
            <span className="truncate text-[14px] leading-none tracking-wide sm:text-[15px]">
              {row.nickname}
              {row.isYou && row.nickname.toUpperCase() !== "YOU" ? (
                <span className="ml-1 text-[10px]">you</span>
              ) : null}
            </span>
            <span className="text-[15px] leading-none tracking-wide tabular-nums sm:text-[17px]">
              {row.earnedLabel}{" "}
              <span className="text-[12px] sm:text-[13px]">{prizeSymbol}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
