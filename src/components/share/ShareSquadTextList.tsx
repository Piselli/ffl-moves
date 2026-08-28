"use client";

import {
  shareClubFooterColors,
  shareClubShort,
  sharePlayerSurname,
} from "@/components/share/sharePitchKit";
import { getTypeface } from "@/components/design-lab/locker-hero/lockerTypefaces";
import {
  DEFAULT_FORMATION,
  formationLanes,
  inferFormationFromPositions,
  type FormationId,
} from "@/lib/formation";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";

const LANE_LABEL: Record<string, string> = {
  fwd: "FWD",
  mid: "MID",
  def: "DEF",
  gk: "GK",
};

function TextRow({
  player,
  dense = false,
}: {
  player: Player;
  dense?: boolean;
}) {
  const teamId = player.teamId ?? 0;
  const kit = teamId ? shareClubFooterColors(teamId) : { bg: "#333", fg: "#fff" };
  const surname = sharePlayerSurname(player);
  const club = shareClubShort(player);

  return (
    <div className={cn("flex min-w-0 items-center gap-2", dense ? "py-[3px]" : "py-[5px]")}>
      <span
        className="h-3 w-[3px] shrink-0 rounded-full"
        style={{ background: kit.bg }}
        aria-hidden
      />
      <span
        className={cn(
          "min-w-0 flex-1 truncate font-semibold uppercase tracking-[0.04em] text-white/92",
          dense ? "text-[11px]" : "text-[13px]",
        )}
      >
        {surname}
      </span>
      <span
        className={cn(
          "shrink-0 font-bold uppercase tracking-[0.12em] text-white/38",
          dense ? "text-[8px]" : "text-[9px]",
        )}
      >
        {club}
      </span>
    </div>
  );
}

/** Grouped team sheet — FWD → GK lines, readable at export size. */
export function ShareSquadTextListGrouped({
  starters,
  formationId: formationIdProp,
  className,
  dense = false,
}: {
  starters: Player[];
  formationId?: FormationId;
  className?: string;
  dense?: boolean;
}) {
  const formationId =
    formationIdProp ??
    inferFormationFromPositions(starters.map((p) => p.positionId));
  const lanes = formationLanes(formationId);
  const display = getTypeface().display;

  return (
    <div className={cn("min-w-0", className)}>
      {lanes.map(({ key, slice }) => {
        const line = starters.slice(slice[0], slice[1]);
        if (!line.length) return null;
        return (
          <div key={key} className={dense ? "mb-2" : "mb-3.5"}>
            <p
              className="mb-1 text-[8px] font-bold uppercase tracking-[0.24em] text-white/28"
              style={{ fontFamily: display }}
            >
              {LANE_LABEL[key] ?? key}
            </p>
            {line.map((player, i) => (
              <TextRow key={`${key}-${i}`} player={player} dense={dense} />
            ))}
          </div>
        );
      })}
    </div>
  );
}

/** Single-line broadcast crawl — surnames separated by middots. */
export function ShareSquadTextCrawl({
  starters,
  formationId: formationIdProp,
  className,
}: {
  starters: Player[];
  formationId?: FormationId;
  className?: string;
}) {
  const formationId =
    formationIdProp ??
    inferFormationFromPositions(starters.map((p) => p.positionId));
  const lanes = formationLanes(formationId);
  const ordered = [...lanes]
    .reverse()
    .flatMap(({ slice }) => starters.slice(slice[0], slice[1]));

  return (
    <p
      className={cn(
        "truncate text-center text-[12px] font-semibold uppercase tracking-[0.06em] text-white/78",
        className,
      )}
    >
      {ordered.map((player, i) => {
        const surname = sharePlayerSurname(player);
        const club = shareClubShort(player);
        return (
          <span key={`${player.id}-${i}`}>
            {i > 0 ? (
              <span className="mx-2 font-normal text-white/22">·</span>
            ) : null}
            <span>{surname}</span>
            <span className="ml-1 text-[9px] font-bold tracking-[0.14em] text-white/32">
              {club}
            </span>
          </span>
        );
      })}
    </p>
  );
}

/** Two-column compact grid — all 11 in formation order. */
export function ShareSquadTextGrid({
  starters,
  className,
}: {
  starters: Player[];
  className?: string;
}) {
  const left = starters.slice(0, 6);
  const right = starters.slice(6, 11);

  return (
    <div className={cn("grid grid-cols-2 gap-x-6", className)}>
      <div>
        {left.map((player, i) => (
          <TextRow key={i} player={player} dense />
        ))}
      </div>
      <div>
        {right.map((player, i) => (
          <TextRow key={i + 6} player={player} dense />
        ))}
      </div>
    </div>
  );
}

export function shareFormationLabel(formationId?: FormationId): string {
  return formationId && formationId !== DEFAULT_FORMATION
    ? formationId
    : DEFAULT_FORMATION;
}
