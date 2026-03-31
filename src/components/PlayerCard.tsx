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

        {/* Position badge (no price) */}
        <div
          className={cn(
            "px-2 py-0.5 rounded-md text-[11px] font-bold uppercase border",
            positionBadgeColors[player.position]
          )}
        >
          {player.position}
        </div>
      </div>

    </div>
  );
}
