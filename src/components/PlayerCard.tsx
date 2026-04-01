"use client";

import { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

interface PlayerCardProps {
  player: Player;
  selected?: boolean;
  onClick?: () => void;
  compact?: boolean;
}

const positionColors = {
  GK: "from-amber-400 to-yellow-600",
  DEF: "from-blue-400 to-indigo-600",
  MID: "from-emerald-400 to-green-600",
  FWD: "from-rose-400 to-red-600",
};

const positionBadgeColors = {
  GK: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  DEF: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  MID: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  FWD: "bg-rose-500/20 text-rose-400 border-rose-500/30",
};

/** Availability dot: green = available, amber = doubtful, red = injured */
function StatusDot({ status, chance }: { status?: string; chance?: number | null }) {
  if (!status || status === "a") return null;
  const color =
    status === "i" ? "bg-red-500" : chance === 0 ? "bg-red-500" : "bg-amber-400";
  return (
    <span
      className={cn("w-2 h-2 rounded-full shrink-0", color)}
      title={status === "i" ? "Injured" : "Doubtful"}
    />
  );
}

/** Form badge — avg pts per match last 4 GWs */
function FormBadge({ form }: { form?: number }) {
  if (!form || isNaN(form)) return null;
  const color =
    form >= 7 ? "text-emerald-400 border-emerald-500/50 bg-emerald-500/15 shadow-[0_0_8px_rgba(52,211,153,0.2)]" :
    form >= 5 ? "text-[#00F0FF] border-[#00F0FF]/40 bg-[#00F0FF]/15 shadow-[0_0_8px_rgba(0,240,255,0.15)]" :
    form >= 3 ? "text-amber-400 border-amber-500/50 bg-amber-500/15" :
                "text-white/40 border-white/15 bg-white/5";
  return (
    <div className="relative group/form shrink-0">
      <div className={cn("flex flex-col items-center px-2 py-1 rounded-lg border cursor-default", color)}>
        <span className="text-[8px] font-bold uppercase tracking-wider leading-none opacity-60">форма</span>
        <span className="font-display font-black text-sm leading-none tabular-nums mt-0.5">{form.toFixed(1)}</span>
      </div>
      {/* Tooltip */}
      <div className="absolute bottom-full right-0 mb-2 hidden group-hover/form:block z-50 pointer-events-none w-52">
        <div className="bg-[#1a1d26] border border-white/10 rounded-xl px-3 py-2.5 shadow-2xl">
          <p className="text-white text-xs font-bold mb-1">Форма гравця</p>
          <p className="text-white/50 text-[11px] leading-relaxed">
            Середнє очок за матч у 4 останніх турах. Реальні дані FPL {new Date().getFullYear()}/{String(new Date().getFullYear() + 1).slice(2)}.
          </p>
          <div className="mt-2 pt-2 border-t border-white/5 grid grid-cols-3 gap-1 text-center">
            <div>
              <p className="text-emerald-400 text-[10px] font-black">≥ 7.0</p>
              <p className="text-white/30 text-[9px]">гарячий</p>
            </div>
            <div>
              <p className="text-[#00F0FF] text-[10px] font-black">≥ 5.0</p>
              <p className="text-white/30 text-[9px]">добра</p>
            </div>
            <div>
              <p className="text-amber-400 text-[10px] font-black">≥ 3.0</p>
              <p className="text-white/30 text-[9px]">середня</p>
            </div>
          </div>
        </div>
        {/* Arrow */}
        <div className="absolute top-full right-4 w-0 h-0 border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-[#1a1d26]" />
      </div>
    </div>
  );
}

/** Compact version shown inside the pitch formation */
export function PlayerCard({
  player,
  selected = false,
  onClick,
  compact = false,
}: PlayerCardProps) {
  const photoUrl = player.photo || player.imageUrl;

  if (compact) {
    return (
      <div
        onClick={onClick}
        className={cn(
          "p-2 rounded-xl cursor-pointer transition-all",
          selected
            ? "bg-gradient-to-br from-emerald-500/20 to-green-600/20 border border-emerald-500/50"
            : "bg-secondary/50 hover:bg-secondary/80 border border-transparent",
          "flex flex-col items-center gap-1"
        )}
      >
        {/* Avatar */}
        <div
          className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center text-xs font-bold text-white bg-gradient-to-br shadow-lg overflow-hidden",
            positionColors[player.position]
          )}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={player.name}
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            player.position
          )}
        </div>
        <span className="text-xs font-medium text-center truncate w-full text-foreground">
          {player.webName || player.name.split(" ").pop()}
        </span>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "p-4 rounded-xl cursor-pointer transition-all border-2",
        selected
          ? "border-emerald-500/50 bg-emerald-500/10"
          : "border-transparent bg-secondary/50 hover:border-border hover:bg-secondary/80"
      )}
    >
      <div className="flex items-center gap-3">
        {/* Avatar */}
        <div
          className={cn(
            "w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold bg-gradient-to-br shadow-lg overflow-hidden shrink-0",
            positionColors[player.position]
          )}
        >
          {photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoUrl}
              alt={player.name}
              className="w-full h-full object-cover object-top"
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          ) : (
            player.position
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <p className="font-medium text-foreground truncate">
              {player.webName || player.name}
            </p>
            <StatusDot status={player.status} chance={player.chanceOfPlaying} />
          </div>
          <p className="text-sm text-muted-foreground">{player.team}</p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          {/* Position badge */}
          <div
            className={cn(
              "px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border",
              positionBadgeColors[player.position]
            )}
          >
            {player.position}
          </div>
          {/* Form */}
          <FormBadge form={player.form} />
        </div>
      </div>

    </div>
  );
}
