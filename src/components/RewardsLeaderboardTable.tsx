"use client";

type RewardsRow = {
  rank: number;
  name: string;
  sharePct: number;
  badge?: "crown" | "silver" | "bronze";
};

const ROWS: RewardsRow[] = [
  { rank: 1, name: "FPL_KING", sharePct: 40, badge: "crown" },
  { rank: 2, name: "GoalMachine", sharePct: 20, badge: "silver" },
  { rank: 3, name: "MoveMaster", sharePct: 10, badge: "bronze" },
  { rank: 4, name: "TacticalAce", sharePct: 8 },
  { rank: 5, name: "CleanSheetHero", sharePct: 7 },
  { rank: 6, name: "AssistAgent", sharePct: 6 },
  { rank: 7, name: "MidfieldMind", sharePct: 5 },
  { rank: 8, name: "DefenderDynamo", sharePct: 5 },
  { rank: 9, name: "BenchBoss", sharePct: 4 },
  { rank: 10, name: "SubChamp", sharePct: 5 },
];

function GoldCrownIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path
        d="M3 8l4.2 4.2L12 6l4.8 6.2L21 8v11.5a1.5 1.5 0 01-1.5 1.5h-15A1.5 1.5 0 013 19.5V8z"
        fill="#FBBF24"
        opacity="0.95"
      />
      <path
        d="M3 8l4.2 4.2L12 6l4.8 6.2L21 8"
        fill="none"
        stroke="#FDE68A"
        strokeWidth="1.2"
        strokeLinejoin="round"
        opacity="0.9"
      />
      <circle cx="12" cy="10" r="1.35" fill="#FDE68A" opacity="0.95" />
    </svg>
  );
}

function MedalIcon({ tone, className }: { tone: "silver" | "bronze"; className?: string }) {
  const fill = tone === "silver" ? "#C0C0C0" : "#CD7F32";
  const stroke = tone === "silver" ? "#E5E7EB" : "#FDE3C7";
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
      <path d="M7 2h10l-2.4 5H9.4L7 2z" fill={stroke} opacity="0.8" />
      <circle cx="12" cy="14" r="6.5" fill={fill} opacity="0.95" />
      <circle cx="12" cy="14" r="4.2" fill="rgba(0,0,0,0.18)" />
      <path d="M10.6 14.1l.9.9 1.9-2.3" fill="none" stroke={stroke} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function RowRankCell({ row }: { row: RewardsRow }) {
  if (row.rank === 1) return <GoldCrownIcon className="w-5 h-5" />;
  if (row.rank === 2) return <MedalIcon tone="silver" className="w-5 h-5" />;
  if (row.rank === 3) return <MedalIcon tone="bronze" className="w-5 h-5" />;
  return <span className="text-white/60 text-xs font-black tabular-nums">{row.rank}</span>;
}

export function RewardsLeaderboardTable() {
  return (
    <div className="relative h-full">
      {/* Ambient cyan glow behind the card */}
      <div className="absolute -inset-10 -z-10 bg-[radial-gradient(circle,rgba(0,243,255,0.13)_0%,transparent_60%)] blur-[70px] pointer-events-none" />

      <div className="h-full rounded-[12px] bg-[#0a0a0a]/80 backdrop-blur-[15px] border border-white/[0.05] overflow-hidden shadow-[0_30px_80px_rgba(0,0,0,0.55)]">
        {/* Title */}
        <div className="px-4 sm:px-5 pt-4 pb-3 border-b border-white/[0.05] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <GoldCrownIcon className="w-4 h-4 drop-shadow-[0_0_10px_rgba(251,191,36,0.25)]" />
            <span className="text-white font-black tracking-tight">ТОП-10 ПЕРЕМОЖЦІВ</span>
          </div>
        </div>

        {/* Header */}
        <div className="px-4 sm:px-5 py-2.5 grid grid-cols-[54px_1fr_150px] items-center text-[10px] uppercase tracking-[0.22em] font-bold text-white/50 border-b border-white/[0.05]">
          <div>МІСЦЕ</div>
          <div>МЕНЕДЖЕР</div>
          <div className="text-right">ЧАСТКА ПУЛУ</div>
        </div>

        {/* Rows */}
        <div className="px-2 sm:px-3">
          {ROWS.map((row) => {
            const isTop1 = row.rank === 1;
            const pct = Math.max(0, Math.min(100, row.sharePct));

            return (
              <div
                key={row.rank}
                className={[
                  "grid grid-cols-[54px_1fr_150px] items-center",
                  "px-2 sm:px-2.5 py-2.5",
                  "border-b border-white/[0.05] last:border-b-0",
                  isTop1 ? "bg-gradient-to-r from-[#00F3FF]/[0.16] to-transparent shadow-[inset_0_0_0_1px_rgba(0,243,255,0.10)]" : "bg-transparent",
                ].join(" ")}
              >
                {/* Rank */}
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-white/[0.02] border border-white/10 flex items-center justify-center">
                    <RowRankCell row={row} />
                  </div>
                </div>

                {/* Manager */}
                <div className="min-w-0">
                  <div className="text-white text-[13px] sm:text-[14px] font-medium truncate">{row.name}</div>
                </div>

                {/* Share bar + pct */}
                <div className="flex items-center justify-end gap-3">
                  <div className="w-[110px] h-2 rounded-full bg-[#00F3FF]/20 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[#00F3FF] shadow-[0_0_16px_rgba(0,243,255,0.45)]"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="text-white font-black tabular-nums text-[12px] w-[40px] text-right">{row.sharePct}%</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

