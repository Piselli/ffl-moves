"use client";

import Link from "next/link";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { SeasonRulesDetails } from "./SeasonCampaignBrief";
import { SeasonRailPanel } from "./SeasonRailPanel";
import {
  buildChaseLines,
  computeNextEventId,
  computeNextGwUpside,
  REGISTER_CTA_CLASS,
} from "./seasonActionShared";
import type { SeasonLeaderboardPayload } from "@/lib/seasonPoints";
import type { SeasonEntry } from "./seasonStandingsShared";

type PanelLayout = "strip" | "rail";

/** Earn / chase / rules — strip below table or sidebar rail. */
export function SeasonActionPanel({
  data,
  myEntry,
  connected,
  layout = "strip",
}: {
  data: SeasonLeaderboardPayload;
  myEntry: SeasonEntry | null;
  connected: boolean;
  layout?: PanelLayout;
}) {
  const m = useSiteMessages().pages.seasonLeaderboard;

  if (layout === "rail") {
    return (
      <SeasonRailPanel
        data={data}
        myEntry={myEntry}
        connected={connected}
      />
    );
  }

  const nextGw = computeNextEventId(data);
  const upside = computeNextGwUpside(myEntry);
  const chaseLines = buildChaseLines(data.entries, myEntry, m);
  const canRegister = data.status === "live" && nextGw != null;

  const statItems = [
    { value: `+${upside.reg}`, label: m.actionUpsideReg },
    {
      value: upside.streakBonus > 0 ? `+${upside.streakBonus}` : "—",
      label:
        upside.streakBonus > 0
          ? m.actionUpsideStreak(upside.nextStreak)
          : m.actionUpsideStreakOff,
    },
    { value: `+${upside.top10Max}`, label: m.actionUpsideTop10 },
    { value: `+${upside.claim}`, label: m.actionUpsideClaim },
  ];

  return (
    <GlassPanel className="!rounded-2xl">
      {canRegister ? (
        <div className="flex flex-col gap-4 border-b border-white/[0.08] px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 sm:py-4">
          <div className="min-w-0 flex-1">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/35">
              {m.actionThisGw(nextGw!)}
            </p>
            <p className="mt-1 text-sm leading-snug text-white/70">
              {connected ? m.actionRegisterHook : m.actionConnectHook}
            </p>
            <p className="mt-1 text-[11px] text-white/40">
              {m.actionUpsideRange(upside.min, upside.max)}
            </p>
          </div>
          <Link href="/" className={`shrink-0 self-start sm:self-center ${REGISTER_CTA_CLASS}`}>
            {m.actionRegisterCta}
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>
      ) : data.status === "ended" ? (
        <div className="border-b border-white/[0.08] px-4 py-3 sm:px-5">
          <p className="text-[11px] text-white/40">{m.seasonEndedHint}</p>
        </div>
      ) : null}

      <div className="flex flex-wrap divide-x divide-white/[0.08] border-b border-white/[0.08]">
        {statItems.map((item) => (
          <div key={item.label} className="min-w-[25%] flex-1 px-3 py-3 sm:px-4">
            <p className="font-display text-xl font-black tabular-nums leading-none text-white/90 sm:text-2xl">
              {item.value}
            </p>
            <p className="mt-1 text-[9px] font-bold uppercase tracking-[0.1em] text-white/35">
              {item.label}
            </p>
          </div>
        ))}
      </div>

      {chaseLines.length > 0 ? (
        <ul className="space-y-1 px-4 py-3 sm:px-5">
          {chaseLines.slice(0, 2).map((line) => (
            <li key={line} className="flex items-start gap-2 text-[11px] text-white/45">
              <span className="mt-[5px] h-1 w-1 shrink-0 rounded-full bg-white/30" aria-hidden />
              <span>{line}</span>
            </li>
          ))}
        </ul>
      ) : null}

      <SeasonRulesDetails data={data} />
    </GlassPanel>
  );
}
