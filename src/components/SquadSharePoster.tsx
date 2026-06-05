"use client";

import { hueFromString, initialsFromDisplayName } from "@/lib/avatar-fallback";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

const PITCH_SLOT_LAYOUT: readonly { formationIndex: number; leftPct: number; topPct: number }[] = [
  { formationIndex: 8, leftPct: 22, topPct: 18 },
  { formationIndex: 9, leftPct: 50, topPct: 18 },
  { formationIndex: 10, leftPct: 78, topPct: 18 },
  { formationIndex: 5, leftPct: 26, topPct: 43 },
  { formationIndex: 6, leftPct: 50, topPct: 43 },
  { formationIndex: 7, leftPct: 74, topPct: 43 },
  { formationIndex: 1, leftPct: 12, topPct: 67 },
  { formationIndex: 2, leftPct: 37, topPct: 67 },
  { formationIndex: 3, leftPct: 63, topPct: 67 },
  { formationIndex: 4, leftPct: 88, topPct: 67 },
  { formationIndex: 0, leftPct: 50, topPct: 90 },
] as const;

function PosterAvatar({ player, size }: { player: Player; size: number }) {
  const initials = initialsFromDisplayName(player.webName || player.name);
  const hue = hueFromString(player.team || player.name);
  return (
    <div
      className="flex items-center justify-center rounded-lg border border-[#00f948]/40 font-display font-black text-white"
      style={{
        width: size,
        height: size,
        fontSize: size * 0.34,
        background: `linear-gradient(145deg, hsl(${hue} 48% 34%) 0%, hsl(${hue} 42% 22%) 100%)`,
      }}
    >
      {initials}
    </div>
  );
}

function PitchTexture() {
  return (
    <div className="absolute inset-0 overflow-hidden rounded-[inherit]">
      <div className="absolute inset-0 bg-gradient-to-b from-[#256d42] via-[#1d5736] to-[#163628]" />
      <div
        className="absolute inset-0 opacity-[0.26]"
        style={{
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(255,255,255,0.065) 0px, rgba(255,255,255,0.065) 28px, transparent 28px, transparent 56px)",
        }}
      />
      <svg className="absolute inset-0 h-full w-full opacity-[0.22]" viewBox="0 0 68 105" preserveAspectRatio="xMidYMid meet">
        <g fill="none" stroke="rgba(255,255,255,0.58)" strokeWidth="0.55">
          <rect x="1.25" y="1.25" width="65.5" height="102.5" rx="0.6" />
          <line x1="1.25" y1="52.5" x2="66.75" y2="52.5" />
          <circle cx="34" cy="52.5" r="9.5" />
          <rect x="14.5" y="88" width="39" height="16.25" />
          <rect x="24.5" y="98.5" width="19" height="5.25" />
          <rect x="14.5" y="0.75" width="39" height="16.25" />
          <rect x="24.5" y="1.25" width="19" height="5.25" />
        </g>
      </svg>
    </div>
  );
}

export function SquadSharePoster({
  starters,
  bench,
  tourLabel,
  brandLabel,
  startersLabel,
  benchLabel,
  ctaLine,
}: {
  starters: Player[];
  bench: Player[];
  tourLabel: string;
  brandLabel: string;
  startersLabel: string;
  benchLabel: string;
  ctaLine: string;
}) {
  return (
    <div
      className="relative overflow-hidden bg-[#0D0F12] text-white"
      style={{ width: 1080, height: 1350, fontFamily: "var(--font-display), system-ui, sans-serif" }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_50%_0%,rgba(0,249,72,0.12)_0%,transparent_55%)]" />

      <div className="relative flex h-full flex-col px-10 pt-10 pb-8">
        <div className="mb-6 flex items-start justify-between gap-6">
          <div>
            <p className="text-[22px] font-black uppercase tracking-[0.22em] text-[#00f948]">{brandLabel}</p>
            <h1 className="mt-2 text-[52px] font-black uppercase leading-none tracking-tight text-white">{tourLabel}</h1>
          </div>
          <div className="rounded-2xl border border-[#00f948]/30 bg-[#00f948]/10 px-5 py-3 text-right">
            <p className="text-[13px] font-bold uppercase tracking-[0.18em] text-white/45">{startersLabel}</p>
            <p className="mt-1 text-[34px] font-black tabular-nums text-[#00f948]">11</p>
          </div>
        </div>

        <div className="relative mx-auto w-full max-w-[620px] flex-1">
          <div className="relative aspect-[68/105] w-full overflow-hidden rounded-2xl border border-white/15 shadow-inner">
            <PitchTexture />
            {PITCH_SLOT_LAYOUT.map(({ formationIndex, leftPct, topPct }) => {
              const player = starters[formationIndex];
              if (!player) return null;
              return (
                <div
                  key={formationIndex}
                  className="absolute z-[2] flex -translate-x-1/2 -translate-y-1/2 flex-col items-center"
                  style={{ left: `${leftPct}%`, top: `${topPct}%` }}
                >
                  <PosterAvatar player={player} size={78} />
                  <p className="mt-1 max-w-[92px] truncate text-center text-[13px] font-semibold text-white/85">
                    {player.webName || player.name.split(" ").pop()}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {bench.length > 0 ? (
          <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] px-5 py-4">
            <p className="text-[12px] font-bold uppercase tracking-[0.18em] text-white/35">{benchLabel}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-4">
              {bench.map((player) => (
                <div key={player.id} className="flex flex-col items-center gap-1">
                  <PosterAvatar player={player} size={54} />
                  <p className="max-w-[72px] truncate text-[11px] font-semibold text-white/70">
                    {player.webName || player.name.split(" ").pop()}
                  </p>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 border-t border-white/10 pt-5 text-center">
          <p className={cn("text-[24px] font-black uppercase tracking-wide text-white/88")}>{ctaLine}</p>
          <p className="mt-2 text-[16px] font-semibold text-[#00f948]/80">movematch.xyz</p>
        </div>
      </div>
    </div>
  );
}
