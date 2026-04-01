"use client";

import { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const positionAvatarBorder = {
  GK:  "border-rose-400/40",
  DEF: "border-amber-400/40",
  MID: "border-blue-400/40",
  FWD: "border-emerald-400/40",
};

const positionTextColor = {
  GK:  "text-rose-400",
  DEF: "text-amber-400",
  MID: "text-blue-400",
  FWD: "text-emerald-400",
};

// kept for compact border + fallback text
const positionBadgeColors = {
  GK:  "bg-rose-500/20    text-rose-400    border-rose-500/40",
  DEF: "bg-amber-500/20   text-amber-400   border-amber-500/40",
  MID: "bg-blue-500/20    text-blue-400    border-blue-500/40",
  FWD: "bg-emerald-500/20 text-emerald-400 border-emerald-500/40",
};

/** Availability dot */
function StatusDot({ status, chance }: { status?: string; chance?: number | null }) {
  if (!status || status === "a") return null;
  const color =
    status === "i" ? "bg-red-500" : chance === 0 ? "bg-red-500" : "bg-amber-400";
  return <span className={cn("w-2 h-2 rounded-full shrink-0", color)} />;
}

/** Form badge — avg pts per match last 4 GWs */
function FormBadge({ form }: { form?: number }) {
  if (!form || isNaN(form)) return null;
  const color =
    form >= 7 ? "text-emerald-400 border-emerald-500/50 bg-emerald-500/15 shadow-[0_0_8px_rgba(52,211,153,0.2)]" :
    form >= 5 ? "text-[#00C46A] border-[#00C46A]/40 bg-[#00C46A]/15 shadow-[0_0_8px_rgba(0,196,106,0.15)]" :
    form >= 3 ? "text-amber-400 border-amber-500/50 bg-amber-500/15" :
                "text-white/40 border-white/15 bg-white/5";
  return (
    <div className="relative group/form shrink-0">
      <div className={cn("flex flex-col items-center px-2 py-1 rounded-lg border cursor-default", color)}>
        <span className="text-[8px] font-bold uppercase tracking-wider leading-none opacity-60">форма</span>
        <span className="font-display font-black text-sm leading-none tabular-nums mt-0.5">{form.toFixed(1)}</span>
      </div>
      {/* Tooltip — positioned to the left to avoid container clipping */}
      <div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 hidden group-hover/form:block z-50 pointer-events-none w-52">
        <div className="bg-[#1a1d26] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl">
          <p className="text-white text-xs font-bold mb-1">Форма гравця</p>
          <p className="text-white/50 text-[11px] leading-relaxed mb-2">
            Середнє очок за гру в нашій системі нарахування (сезон 2025/26)
          </p>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-emerald-400 text-[10px] font-black">≥ 7.0</span>
              <span className="text-white/40 text-[10px]">гравець у топ-формі</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[#00C46A] text-[10px] font-black">≥ 5.0</span>
              <span className="text-white/40 text-[10px]">стабільно набирає</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-amber-400 text-[10px] font-black">≥ 3.0</span>
              <span className="text-white/40 text-[10px]">непостійний</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-white/30 text-[10px] font-black">&lt; 3.0</span>
              <span className="text-white/40 text-[10px]">погана форма</span>
            </div>
          </div>
        </div>
        <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-t-[5px] border-b-[5px] border-l-[5px] border-t-transparent border-b-transparent border-l-[#1a1d26]" />
      </div>
    </div>
  );
}

export function PlayerCard({
  player,
  selected = false,
  onClick,
  compact = false,
}: PlayerCardProps) {
  const photoUrl = player.photo || player.imageUrl;

  const positionBorderCompact: Record<string, string> = {
    GK:  "border-rose-400/60",
    DEF: "border-amber-400/60",
    MID: "border-blue-400/60",
    FWD: "border-emerald-400/60",
  };

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "w-full h-full p-1.5 rounded-xl cursor-pointer transition-all flex flex-col items-center justify-between border-2 bg-black/50 backdrop-blur-sm shadow-lg",
          positionBorderCompact[player.position]
        )}
      >
        <div className="w-12 h-12 rounded-lg overflow-hidden bg-black/40 flex items-center justify-center text-xs font-bold shrink-0 relative">
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={player.name}
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                const fallback = img.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <span
            className={cn("text-[11px] font-black items-center justify-center", positionBadgeColors[player.position].split(" ")[1])}
            style={{ display: photoUrl ? "none" : "flex" }}
          >
            {player.position}
          </span>
        </div>
        <span className="text-[10px] font-bold text-center truncate w-full text-white/90 px-0.5 leading-tight">
          {player.webName || player.name.split(" ").pop()}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "group p-3 rounded-2xl cursor-pointer transition-all duration-200 border",
        selected
          ? "border-[#00C46A]/30 bg-[#00C46A]/[0.05] shadow-[0_0_15px_rgba(0,196,106,0.08)]"
          : "border-white/[0.07] bg-white/[0.03] hover:bg-white/[0.07] hover:border-white/[0.12]"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar — colored border, dark bg, photo or position fallback */}
        <div
          className={cn(
            "w-11 h-11 rounded-xl overflow-hidden shrink-0 border-2 bg-white/[0.05] flex items-center justify-center relative",
            positionAvatarBorder[player.position]
          )}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={player.name}
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                const img = e.target as HTMLImageElement;
                img.style.display = "none";
                const fallback = img.nextElementSibling as HTMLElement;
                if (fallback) fallback.style.display = "flex";
              }}
            />
          ) : null}
          <span
            className={cn("text-xs font-black items-center justify-center", positionTextColor[player.position])}
            style={{ display: photoUrl ? "none" : "flex" }}
          >
            {player.position}
          </span>
        </div>

        {/* Info: name + team + position label */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-semibold text-white truncate text-sm leading-tight">
              {player.webName || player.name}
            </p>
            <StatusDot status={player.status} chance={player.chanceOfPlaying} />
          </div>
          <div className="flex items-center gap-1.5 mt-0.5">
            <p className="text-xs text-white/40 truncate">{player.team}</p>
            <span className={cn("text-[10px] font-bold uppercase tracking-wide shrink-0", positionTextColor[player.position])}>
              {player.position}
            </span>
          </div>
        </div>

        {/* Right: only form badge */}
        <FormBadge form={player.form} />
      </div>
    </div>
  );
}
