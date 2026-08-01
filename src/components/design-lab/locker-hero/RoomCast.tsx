"use client";

import { useMemo } from "react";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";
import { ROOM_CAST, ROOM_SLOTS, type CastMember } from "./roomSlots";

function teamShort(team: string): string {
  const t = team.trim();
  if (t.length <= 3) return t.toUpperCase();
  return t.slice(0, 3).toUpperCase();
}

function norm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function resolveCastPlayer(players: Player[], member: CastMember): Player | null {
  if (players.length === 0) return null;
  const needles = member.match.map(norm);

  const scored = players
    .map((p) => {
      const web = norm(p.webName ?? "");
      const name = norm(p.name ?? "");
      let score = 0;
      for (const n of needles) {
        if (!n) continue;
        if (web === n) score += 100;
        else if (web.includes(n) || name.includes(n)) score += 40;
      }
      if (score === 0) return null;
      if (p.position === member.position) score += 15;
      if (norm(p.team).includes(norm(member.teamHint).slice(0, 4))) score += 25;
      score += (p.selectedByPercent ?? 0) * 0.01;
      return { p, score };
    })
    .filter(Boolean) as { p: Player; score: number }[];

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.p ?? null;
}

function fallbackPlayer(member: CastMember, slotIndex: number): Player {
  return {
    id: -2000 - slotIndex,
    name: member.label,
    webName: member.label,
    team: member.teamHint,
    teamId: slotIndex + 1,
    position: member.position,
    positionId: { GK: 0, DEF: 1, MID: 2, FWD: 3 }[member.position],
  };
}

type Props = {
  players: Player[];
  selectedIds: Set<number>;
  interactive: boolean;
  layer: "back" | "front";
  hoveredId: number | null;
  onHover: (id: number | null) => void;
  onPick: (player: Player) => void;
};

/**
 * Invisible seat hotspots over the baked plate.
 * Hover = local spotlight (player already sits organically in the photo).
 */
export function RoomCast({
  players,
  selectedIds,
  interactive,
  layer,
  hoveredId,
  onHover,
  onPick,
}: Props) {
  const cast = useMemo(() => {
    return ROOM_CAST.map((member, i) => {
      const resolved = resolveCastPlayer(players, member);
      return {
        member,
        player: resolved ?? fallbackPlayer(member, i),
      };
    });
  }, [players]);

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0",
        layer === "front" ? "z-40" : "z-10",
      )}
      aria-hidden={!interactive}
    >
      {ROOM_SLOTS.map((slot, i) => {
        const entry = cast[i];
        if (!entry) return null;
        const { player } = entry;
        const isHovered = hoveredId === player.id;
        const inSquad = selectedIds.has(player.id);
        const canPick = interactive && player.id > 0;

        return (
          <button
            key={slot.id}
            type="button"
            disabled={!canPick}
            onMouseEnter={() => interactive && onHover(player.id)}
            onMouseLeave={() => onHover(null)}
            onFocus={() => interactive && onHover(player.id)}
            onBlur={() => onHover(null)}
            onClick={() => canPick && onPick(player)}
            style={{
              left: `${slot.left}%`,
              top: `${slot.top}%`,
              width: `${slot.w}%`,
              height: `${slot.h}%`,
              zIndex: isHovered ? 50 : slot.z,
              transform: "translate(-50%, -50%)",
            }}
            className={cn(
              "absolute outline-none",
              canPick ? "pointer-events-auto cursor-pointer" : interactive ? "pointer-events-auto cursor-default" : "pointer-events-none",
            )}
            aria-label={`${player.webName ?? player.name}, ${player.position}, ${player.team}`}
          >
            {/* local spotlight — brightens the baked player under the cursor */}
            <span
              aria-hidden
              className={cn(
                "pointer-events-none absolute inset-[-10%] rounded-[40%] transition-opacity duration-200",
                isHovered ? "opacity-100" : "opacity-0",
              )}
              style={{
                background:
                  "radial-gradient(ellipse at 50% 40%, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.06) 42%, transparent 70%)",
                mixBlendMode: "screen",
              }}
            />
            {inSquad && (
              <span
                aria-hidden
                className="pointer-events-none absolute bottom-[8%] left-1/2 h-1 w-1/3 -translate-x-1/2 rounded-full bg-[#E8C98B]/85 shadow-[0_0_12px_rgba(232,201,139,0.55)]"
              />
            )}

            {isHovered && (
              <div className="absolute left-1/2 top-[4%] z-50 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full bg-black/92 px-2.5 py-1 text-[10px] font-semibold tracking-wide text-white shadow-lg ring-1 ring-white/20">
                {player.position} · {teamShort(player.team)} ·{" "}
                {(player.webName ?? player.name).toUpperCase()}
              </div>
            )}
          </button>
        );
      })}
    </div>
  );
}
