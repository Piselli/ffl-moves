"use client";

import { useSiteMessages } from "@/i18n/LocaleProvider";
import type { SeasonLeaderboardPayload } from "@/lib/seasonPoints";
import { seasonLabel, type SeasonEntry } from "./seasonStandingsShared";

export function SeasonPageWash({ warm = true }: { warm?: boolean }) {
  return (
    <div className="pointer-events-none fixed inset-0" aria-hidden>
      <div
        className="absolute inset-0"
        style={{
          background: warm
            ? "radial-gradient(ellipse 80% 55% at 50% -10%, rgba(48,44,40,0.9) 0%, transparent 58%), linear-gradient(180deg, #1a1816 0%, #121110 50%, #0d0c0b 100%)"
            : "radial-gradient(ellipse 70% 45% at 50% 0%, rgba(32,34,38,0.85) 0%, transparent 55%), linear-gradient(180deg, #0D0F12 0%, #0a0b0d 100%)",
        }}
      />
    </div>
  );
}

export function SeasonPageHeader({
  data,
  metaBits,
  myEntry,
  onFindMe,
  compact = false,
}: {
  data: SeasonLeaderboardPayload;
  metaBits: string[];
  myEntry: SeasonEntry | null;
  onFindMe: () => void;
  compact?: boolean;
}) {
  const m = useSiteMessages().pages.seasonLeaderboard;

  return (
    <header className={`flex flex-wrap items-end justify-between gap-3 ${compact ? "mb-5" : "mb-6"}`}>
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-widest text-white/40">
          {seasonLabel(data, m)}
        </p>
        <h1
          className={`mt-0.5 font-display font-black uppercase tracking-tight text-white ${
            compact ? "text-2xl sm:text-3xl" : "text-3xl sm:text-4xl"
          }`}
        >
          {m.pageTitle}
        </h1>
        {metaBits.length > 0 ? (
          <p className="mt-1.5 text-[11px] text-white/35">{metaBits.join(" · ")}</p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {myEntry && !compact ? (
          <p className="hidden text-right text-[11px] tabular-nums text-white/45 sm:block">
            <span className="font-display text-lg font-black text-white">{myEntry.totalPoints}</span>
            <span className="text-white/30"> SP · </span>#{myEntry.rank}
          </p>
        ) : null}

        {myEntry ? (
          <button
            type="button"
            onClick={onFindMe}
            className="rounded-full border border-white/15 bg-white/[0.04] px-4 py-2 text-[10px] font-bold uppercase tracking-[0.14em] text-white/65 transition hover:border-white/30 hover:text-white"
          >
            {m.findMe}
          </button>
        ) : (
          <p className="max-w-[14rem] text-right text-[11px] leading-snug text-white/35">
            {m.connectHint}
          </p>
        )}
      </div>
    </header>
  );
}
