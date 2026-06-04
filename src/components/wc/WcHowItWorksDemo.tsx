"use client";

import { FormationGrid } from "@/components/FormationGrid";
import { PlayerCard } from "@/components/PlayerCard";
import { FORMATION } from "@/lib/constants";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";
import { useSiteMessages } from "@/i18n/LocaleProvider";

function demoPlayer(
  id: number,
  name: string,
  team: string,
  position: Player["position"],
  webName?: string,
): Player {
  const positionId = position === "GK" ? 1 : position === "DEF" ? 2 : position === "MID" ? 3 : 4;
  return {
    id,
    name,
    webName: webName ?? name.split(" ").pop() ?? name,
    team,
    teamId: id,
    position,
    positionId,
  };
}

const DEMO_STARTERS: Player[] = [
  demoPlayer(1, "Thibaut Courtois", "BEL", "GK", "Courtois"),
  demoPlayer(2, "Achraf Hakimi", "MAR", "DEF", "Hakimi"),
  demoPlayer(3, "Virgil van Dijk", "NED", "DEF", "Van Dijk"),
  demoPlayer(4, "Marquinhos", "BRA", "DEF"),
  demoPlayer(5, "Min-jae Kim", "KOR", "DEF", "Kim"),
  demoPlayer(6, "Jude Bellingham", "ENG", "MID", "Bellingham"),
  demoPlayer(7, "Rodri", "ESP", "MID"),
  demoPlayer(8, "Vitinha", "POR", "MID"),
  demoPlayer(9, "Kylian Mbappé", "FRA", "FWD", "Mbappé"),
  demoPlayer(10, "Lionel Messi", "ARG", "FWD", "Messi"),
  demoPlayer(11, "Harry Kane", "ENG", "FWD", "Kane"),
];

const DEMO_BENCH: Player[] = [
  demoPlayer(12, "Heung-min Son", "KOR", "FWD", "Son"),
  demoPlayer(13, "Antoine Griezmann", "FRA", "MID", "Griezmann"),
  demoPlayer(14, "Hugo Lloris", "FRA", "GK", "Lloris"),
];

const DEMO_POOL: { player: Player; selected: boolean }[] = [
  { player: DEMO_STARTERS[8]!, selected: true },
  { player: DEMO_STARTERS[5]!, selected: true },
  { player: DEMO_STARTERS[2]!, selected: true },
  { player: DEMO_STARTERS[0]!, selected: true },
  { player: demoPlayer(15, "Raphinha", "BRA", "FWD"), selected: false },
  { player: demoPlayer(16, "Pedri", "ESP", "MID"), selected: false },
];

export function WcHowItWorksDemo() {
  const m = useSiteMessages();
  const wc = m.pages.worldCup;
  const g = m.pages.gameweek;

  return (
    <div className="pointer-events-none mt-8 select-none">
      <div className="overflow-hidden rounded-2xl border border-white/[0.07] bg-[#0a0c0f] shadow-[inset_3px_0_0_rgba(0,249,72,0.35)]">
        <div className="grid lg:grid-cols-2 lg:items-stretch">
          {/* Left — same stack as /world-cup/squad */}
          <div className="flex flex-col gap-0 border-b border-white/[0.06] p-4 lg:border-b-0 lg:border-r lg:border-white/[0.06]">
            <FormationGrid starters={DEMO_STARTERS} readOnly />

            <div className="mt-4 rounded-xl border border-white/[0.07] bg-[#0D0F12]/60 p-4">
              <h3 className="mb-3 text-[10px] font-bold uppercase tracking-widest text-white/30">
                {g.benchTitle(FORMATION.BENCH, FORMATION.BENCH)}
              </h3>
              <div className="grid grid-cols-3 gap-2">
                {DEMO_BENCH.map((player) => (
                  <div
                    key={player.id}
                    className="flex items-center gap-2 rounded-xl border border-white/[0.12] bg-white/[0.05] px-3 py-2.5 text-left"
                  >
                    <span className="shrink-0 rounded bg-white/10 px-1.5 py-0.5 text-[9px] font-bold uppercase text-white/50">
                      {player.position}
                    </span>
                    <span className="truncate text-xs font-medium text-white">{player.webName || player.name}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-3 rounded-xl border border-white/[0.07] bg-[#0D0F12]/60 px-4 py-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-emerald-400">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_6px_#34d399]" />
                {g.playersProgress(FORMATION.TOTAL, FORMATION.TOTAL, 11, FORMATION.BENCH)}
              </span>
            </div>
          </div>

          {/* Right — player pool (squad page styling, static) */}
          <div className="flex min-h-0 flex-col p-4">
            <div className="mb-3 shrink-0 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-white/35">{wc.howDemoPoolTitle}</p>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[9px] font-bold uppercase tracking-wider text-white/30">
                  4-3-3
                </span>
              </div>
              <div className="rounded-xl border border-white/[0.08] bg-white/[0.04] px-4 py-3 text-sm text-white/25">
                {g.searchPlaceholder}
              </div>
              <div className="flex flex-wrap gap-2">
                {(["ALL", "GK", "DEF", "MID", "FWD"] as const).map((pos) => (
                  <span
                    key={pos}
                    className={cn(
                      "rounded-lg px-4 py-2 text-sm font-medium",
                      pos === "ALL"
                        ? "border border-[#00f948]/30 bg-[#00f948]/15 text-[#00f948]"
                        : "border border-white/[0.08] bg-white/[0.04] text-white/50",
                    )}
                  >
                    {pos}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col justify-center gap-2">
              {DEMO_POOL.map(({ player, selected }) => (
                <div key={player.id} className={cn(!selected && "opacity-60")}>
                  <PlayerCard player={player} selected={selected} />
                </div>
              ))}
            </div>

            <p className="mt-3 shrink-0 text-center text-[10px] font-semibold uppercase tracking-wider text-white/25">
              {wc.howDemoPoolMore}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
