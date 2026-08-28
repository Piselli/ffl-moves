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

export type ShareSquadListVariantId =
  | "tracklist"
  | "two-up"
  | "lane-lines"
  | "chip-wrap";

export const SHARE_SQUAD_LIST_VARIANTS: {
  id: ShareSquadListVariantId;
  label: string;
  tagline: string;
}[] = [
  {
    id: "tracklist",
    label: "1 · Tracklist",
    tagline: "Numbered 1–11 · quiet SUBS",
  },
  {
    id: "two-up",
    label: "2 · Two-up",
    tagline: "Two columns · kit ticks · subs row",
  },
  {
    id: "lane-lines",
    label: "3 · Lane lines",
    tagline: "One line per position · FWD/MID/DEF/GK",
  },
  {
    id: "chip-wrap",
    label: "4 · Chip wrap",
    tagline: "Glass name pills · same language as pitch",
  },
];

function resolveFormation(
  starters: Player[],
  formationIdProp?: FormationId,
): FormationId {
  return (
    formationIdProp ??
    inferFormationFromPositions(starters.map((p) => p.positionId))
  );
}

/** 1 · Album-style numbered sheet */
function ListTracklist({
  starters,
  bench,
  formationId,
}: {
  starters: Player[];
  bench: Player[];
  formationId: FormationId;
}) {
  const ordered = [...formationLanes(formationId)]
    .reverse()
    .flatMap(({ slice }) => starters.slice(slice[0], slice[1]));
  const ui = getTypeface().ui;

  return (
    <div style={{ fontFamily: ui }}>
      <ol className="m-0 list-none space-y-0 p-0">
        {ordered.map((player, i) => (
          <li
            key={`${player.id}-${i}`}
            className="flex items-baseline gap-3 py-[5px]"
          >
            <span className="w-4 shrink-0 text-right font-mono text-[10px] tabular-nums text-white/28">
              {i + 1}
            </span>
            <span className="min-w-0 flex-1 truncate text-[13px] font-semibold tracking-[-0.01em] text-white/90">
              {sharePlayerSurname(player)}
            </span>
            <span className="shrink-0 text-[9px] font-bold uppercase tracking-[0.14em] text-white/32">
              {shareClubShort(player)}
            </span>
          </li>
        ))}
      </ol>
      {bench.length > 0 ? (
        <div className="mt-4 border-t border-white/[0.08] pt-3">
          <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.28em] text-white/30">
            Subs
          </p>
          <p className="text-[12px] font-medium leading-relaxed tracking-[-0.01em] text-white/55">
            {bench.map((p, i) => (
              <span key={p.id}>
                {i > 0 ? (
                  <span className="mx-1.5 text-white/20">·</span>
                ) : null}
                {sharePlayerSurname(p)}
              </span>
            ))}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** 2 · Two columns with kit colour ticks */
function ListTwoUp({
  starters,
  bench,
  formationId,
}: {
  starters: Player[];
  bench: Player[];
  formationId: FormationId;
}) {
  const numbered = [...formationLanes(formationId)]
    .reverse()
    .flatMap(({ slice }) => starters.slice(slice[0], slice[1]));
  const left = numbered.slice(0, 6);
  const right = numbered.slice(6);
  const ui = getTypeface().ui;

  const Row = ({ player }: { player: Player }) => {
    const kit = player.teamId
      ? shareClubFooterColors(player.teamId)
      : { bg: "#444" };
    return (
      <div className="flex items-center gap-2 py-[4px]">
        <span
          className="h-2 w-2 shrink-0 rounded-full"
          style={{ background: kit.bg }}
        />
        <span className="min-w-0 flex-1 truncate text-[12px] font-semibold text-white/88">
          {sharePlayerSurname(player)}
        </span>
      </div>
    );
  };

  return (
    <div style={{ fontFamily: ui }}>
      <div className="grid grid-cols-2 gap-x-5">
        <div>
          {left.map((p) => (
            <Row key={p.id} player={p} />
          ))}
        </div>
        <div>
          {right.map((p) => (
            <Row key={p.id} player={p} />
          ))}
        </div>
      </div>
      {bench.length > 0 ? (
        <div className="mt-4 flex items-center gap-2 border-t border-white/[0.08] pt-3">
          <span className="shrink-0 text-[8px] font-bold uppercase tracking-[0.24em] text-white/30">
            Subs
          </span>
          <div className="flex min-w-0 flex-wrap gap-x-2.5 gap-y-1">
            {bench.map((p) => (
              <span
                key={p.id}
                className="text-[11px] font-medium text-white/50"
              >
                {sharePlayerSurname(p)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

/** 3 · One compact line per position lane */
function ListLaneLines({
  starters,
  bench,
  formationId,
}: {
  starters: Player[];
  bench: Player[];
  formationId: FormationId;
}) {
  const lanes = formationLanes(formationId);
  const labels: Record<string, string> = {
    fwd: "FWD",
    mid: "MID",
    def: "DEF",
    gk: "GK",
  };
  const ui = getTypeface().ui;

  return (
    <div className="space-y-3" style={{ fontFamily: ui }}>
      {lanes.map(({ key, slice }) => {
        const line = starters.slice(slice[0], slice[1]);
        if (!line.length) return null;
        return (
          <div key={key} className="min-w-0">
            <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.26em] text-white/28">
              {labels[key] ?? key}
            </p>
            <p className="truncate text-[13px] font-semibold tracking-[-0.01em] text-white/88">
              {line.map((p, i) => (
                <span key={p.id}>
                  {i > 0 ? (
                    <span className="mx-1.5 font-normal text-white/22">·</span>
                  ) : null}
                  {sharePlayerSurname(p)}
                </span>
              ))}
            </p>
          </div>
        );
      })}
      {bench.length > 0 ? (
        <div className="border-t border-white/[0.08] pt-3">
          <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.26em] text-white/28">
            Subs
          </p>
          <p className="truncate text-[12px] font-medium text-white/50">
            {bench.map((p, i) => (
              <span key={p.id}>
                {i > 0 ? (
                  <span className="mx-1.5 text-white/20">·</span>
                ) : null}
                {sharePlayerSurname(p)}
              </span>
            ))}
          </p>
        </div>
      ) : null}
    </div>
  );
}

/** 4 · Frosted name pills matching pitch chips */
function ListChipWrap({
  starters,
  bench,
  formationId,
  captainIndex,
}: {
  starters: Player[];
  bench: Player[];
  formationId: FormationId;
  captainIndex?: number;
}) {
  const numbered = [...formationLanes(formationId)]
    .reverse()
    .flatMap(({ slice }) => starters.slice(slice[0], slice[1]));
  const ui = getTypeface().ui;

  const Pill = ({
    player,
    captain,
  }: {
    player: Player;
    captain?: boolean;
  }) => (
    <span
      className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1"
      style={{
        background: "rgba(255,255,255,0.04)",
        boxShadow: captain
          ? "0 0 0 1px rgba(212,175,55,0.7)"
          : "0 0 0 1px rgba(255,255,255,0.1)",
      }}
    >
      <span className="text-[11px] font-semibold text-white/88">
        {sharePlayerSurname(player)}
      </span>
      <span className="text-[8px] font-bold uppercase tracking-[0.12em] text-white/32">
        {shareClubShort(player)}
      </span>
    </span>
  );

  return (
    <div style={{ fontFamily: ui }}>
      <div className="flex flex-wrap gap-1.5">
        {numbered.map((player, i) => {
          // Map back to formation index for captain — approximate by id match
          const fi = starters.findIndex((s) => s.id === player.id);
          return (
            <Pill
              key={`${player.id}-${i}`}
              player={player}
              captain={captainIndex != null && fi === captainIndex}
            />
          );
        })}
      </div>
      {bench.length > 0 ? (
        <div className="mt-3.5 border-t border-white/[0.08] pt-3">
          <p className="mb-2 text-[8px] font-bold uppercase tracking-[0.26em] text-white/28">
            Subs
          </p>
          <div className="flex flex-wrap gap-1.5">
            {bench.map((p) => (
              <span
                key={p.id}
                className="text-[11px] font-medium text-white/48"
              >
                {sharePlayerSurname(p)}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function ShareSquadListVariant({
  variant,
  starters,
  bench = [],
  formationId: formationIdProp,
  captainIndex,
  className,
}: {
  variant: ShareSquadListVariantId;
  starters: Player[];
  bench?: Player[];
  formationId?: FormationId;
  captainIndex?: number;
  className?: string;
}) {
  const formationId = resolveFormation(starters, formationIdProp);
  const benchThree = bench.slice(0, 3);
  const props = {
    starters,
    bench: benchThree,
    formationId,
  };

  return (
    <div className={cn("min-w-0", className)}>
      {variant === "tracklist" ? <ListTracklist {...props} /> : null}
      {variant === "two-up" ? <ListTwoUp {...props} /> : null}
      {variant === "lane-lines" ? <ListLaneLines {...props} /> : null}
      {variant === "chip-wrap" ? (
        <ListChipWrap {...props} captainIndex={captainIndex} />
      ) : null}
    </div>
  );
}

export function shareFormationLabel(formationId?: FormationId): string {
  return formationId && formationId !== DEFAULT_FORMATION
    ? formationId
    : DEFAULT_FORMATION;
}
