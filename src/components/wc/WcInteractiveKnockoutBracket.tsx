"use client";

import { useMemo } from "react";
import { BRACKET_LEFT, BRACKET_RIGHT, BRACKET_ROUNDS, type BracketNode } from "@/components/wc/wcBracket";
import { WcFlagChip } from "@/components/wc/WcGroupCard";
import { resolveBracketMatches, setMatchWinner } from "@/lib/wcBracketResolve";
import {
  knockoutMatchIndex,
  needsFinalKnockoutPicks,
  WC_TEAMS,
  type BracketPrediction,
} from "@/lib/wcBracketPrediction";
import { cn } from "@/lib/utils";

const LINE = "border-white/20";
const BOX_W = "w-[108px]";
const ELBOW_W = "w-[18px]";
const BRACKET_HEIGHT = 520;

function TeamPick({
  teamIdx,
  selected,
  disabled,
  onPick,
  compact,
}: {
  teamIdx: number | null;
  selected: boolean;
  disabled: boolean;
  onPick: () => void;
  compact?: boolean;
}) {
  if (teamIdx == null) {
    return (
      <span className={cn("truncate text-[9px] font-semibold text-white/25", compact ? "px-1 py-0.5" : "px-1.5 py-1")}>
        TBD
      </span>
    );
  }
  const team = WC_TEAMS[teamIdx]!;
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onPick}
      className={cn(
        "flex w-full items-center gap-1 rounded-[4px] border text-left transition-colors",
        compact ? "px-1 py-0.5" : "px-1.5 py-1",
        selected
          ? "border-[#00f948]/50 bg-[#00f948]/15 ring-1 ring-[#00f948]/30"
          : disabled
            ? "cursor-default border-transparent opacity-60"
            : "border-transparent hover:border-white/15 hover:bg-white/[0.06]",
      )}
    >
      <WcFlagChip code={team.code} name={team.name} className="h-2.5 w-[18px] shrink-0" />
      <span className="min-w-0 truncate text-[9px] font-bold uppercase tracking-wide text-white/85">{team.name}</span>
    </button>
  );
}

function MatchBox({
  matchId,
  round,
  participants,
  winnerIdx,
  readOnly,
  onPick,
  mirror,
  highlight,
}: {
  matchId: string;
  round: string;
  participants: { home: number | null; away: number | null };
  winnerIdx: number | null;
  readOnly: boolean;
  onPick: (teamIdx: number) => void;
  mirror?: boolean;
  highlight?: boolean;
}) {
  const isLeaf = round === "R32";
  const canPick = !readOnly && participants.home != null && participants.away != null;
  const unpicked = canPick && winnerIdx == null;

  return (
    <div
      className={cn(
        BOX_W,
        "flex flex-col justify-center rounded-[6px] border px-0.5 py-1 transition-shadow",
        isLeaf
          ? "border-white/12 bg-white/[0.035]"
          : "border-[#00f948]/25 bg-[#00f948]/[0.06]",
        highlight && unpicked && "animate-pulse ring-2 ring-amber-400/70 ring-offset-1 ring-offset-[#050608]",
      )}
      title={matchId}
    >
      <span
        className={cn(
          "mb-0.5 text-center font-wc-hero text-[8px] font-bold tabular-nums tracking-wide",
          isLeaf ? "text-white/40" : "text-[#00f948]/80",
          mirror && "[transform:scaleX(-1)]",
        )}
      >
        {matchId}
      </span>
      <div className={mirror ? "[transform:scaleX(-1)]" : undefined}>
        <TeamPick
          teamIdx={participants.home}
          selected={winnerIdx != null && participants.home === winnerIdx}
          disabled={!canPick}
          onPick={() => participants.home != null && onPick(participants.home)}
        />
        <TeamPick
          teamIdx={participants.away}
          selected={winnerIdx != null && participants.away === winnerIdx}
          disabled={!canPick}
          onPick={() => participants.away != null && onPick(participants.away)}
        />
      </div>
    </div>
  );
}

function Elbow() {
  return (
    <div className={cn(ELBOW_W, "relative shrink-0 self-stretch")}>
      <span className={cn("absolute left-1/2 top-1/4 bottom-1/4 border-l", LINE)} aria-hidden />
      <span className={cn("absolute left-0 right-1/2 top-1/4 border-t", LINE)} aria-hidden />
      <span className={cn("absolute left-0 right-1/2 bottom-1/4 border-t", LINE)} aria-hidden />
      <span className={cn("absolute left-1/2 right-0 top-1/2 border-t", LINE)} aria-hidden />
    </div>
  );
}

function BracketTreeNode({
  node,
  participantMap,
  winners,
  readOnly,
  onPick,
  mirror,
}: {
  node: BracketNode;
  participantMap: Map<string, { home: number | null; away: number | null; round: string }>;
  winners: number[];
  readOnly: boolean;
  onPick: (matchId: string, teamIdx: number) => void;
  mirror?: boolean;
}) {
  const parts = participantMap.get(node.code) ?? { home: null, away: null, round: node.round };
  const koIdx = knockoutMatchIndex(node.code);
  const winnerIdx = koIdx >= 0 && winners[koIdx] != null && winners[koIdx]! >= 0 ? winners[koIdx]! : null;

  if (!node.feeders) {
    return (
      <div className="flex flex-1 items-center justify-end">
        <MatchBox
          matchId={node.code}
          round={node.round}
          participants={parts}
          winnerIdx={winnerIdx}
          readOnly={readOnly}
          onPick={(t) => onPick(node.code, t)}
          mirror={mirror}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-1 items-stretch">
      <div className="flex flex-col">
        <BracketTreeNode
          node={node.feeders[0]}
          participantMap={participantMap}
          winners={winners}
          readOnly={readOnly}
          onPick={onPick}
          mirror={mirror}
        />
        <BracketTreeNode
          node={node.feeders[1]}
          participantMap={participantMap}
          winners={winners}
          readOnly={readOnly}
          onPick={onPick}
          mirror={mirror}
        />
      </div>
      <Elbow />
      <div className="flex items-center">
        <MatchBox
          matchId={node.code}
          round={node.round}
          participants={parts}
          winnerIdx={winnerIdx}
          readOnly={readOnly}
          onPick={(t) => onPick(node.code, t)}
          mirror={mirror}
        />
      </div>
    </div>
  );
}

function SideBracket({
  root,
  side,
  participantMap,
  winners,
  readOnly,
  onPick,
}: {
  root: BracketNode;
  side: "left" | "right";
  participantMap: Map<string, { home: number | null; away: number | null; round: string }>;
  winners: number[];
  readOnly: boolean;
  onPick: (matchId: string, teamIdx: number) => void;
}) {
  const mirror = side === "right";
  const labels = mirror ? [...BRACKET_ROUNDS].reverse() : BRACKET_ROUNDS;

  return (
    <div className="flex flex-col">
      <div className="mb-2 flex gap-[18px]">
        {labels.map((r) => (
          <span
            key={r}
            className={cn(
              BOX_W,
              "text-center font-wc-hero text-[9px] font-bold uppercase tracking-[0.14em] text-white/45",
            )}
          >
            {r}
          </span>
        ))}
      </div>
      <div
        className={cn("flex items-stretch", mirror && "[transform:scaleX(-1)]")}
        style={{ height: BRACKET_HEIGHT }}
      >
        <BracketTreeNode
          node={root}
          participantMap={participantMap}
          winners={winners}
          readOnly={readOnly}
          onPick={onPick}
          mirror={mirror}
        />
      </div>
    </div>
  );
}

function CenterFinals({
  participantMap,
  winners,
  readOnly,
  onPick,
  copy,
}: {
  participantMap: Map<string, { home: number | null; away: number | null; round: string }>;
  winners: number[];
  readOnly: boolean;
  onPick: (matchId: string, teamIdx: number) => void;
  copy: { final: string; thirdPlace: string };
}) {
  const finalParts = participantMap.get("M104") ?? { home: null, away: null, round: "Final" };
  const thirdParts = participantMap.get("M103") ?? { home: null, away: null, round: "3rd" };
  const finalWinner = winners[knockoutMatchIndex("M104")] ?? -1;
  const thirdWinner = winners[knockoutMatchIndex("M103")] ?? -1;
  const highlightFinals = needsFinalKnockoutPicks(winners);

  return (
    <div className="flex shrink-0 flex-col items-center gap-4 px-2">
      <div className="w-[120px]">
        <p className="mb-1 text-center font-wc-hero text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
          {copy.thirdPlace}
        </p>
        <MatchBox
          matchId="M103"
          round="3rd"
          participants={thirdParts}
          winnerIdx={thirdWinner >= 0 ? thirdWinner : null}
          readOnly={readOnly}
          onPick={(t) => onPick("M103", t)}
          highlight={highlightFinals}
        />
      </div>
      <div className="w-[120px]">
        <p className="mb-1 text-center font-wc-hero text-[10px] font-bold uppercase tracking-[0.28em] text-[#00f948]/80">
          {copy.final}
        </p>
        <MatchBox
          matchId="M104"
          round="Final"
          participants={finalParts}
          winnerIdx={finalWinner >= 0 ? finalWinner : null}
          readOnly={readOnly}
          onPick={(t) => onPick("M104", t)}
          highlight={highlightFinals}
        />
      </div>
    </div>
  );
}

export function WcInteractiveKnockoutBracket({
  prediction,
  onChange,
  readOnly = false,
  copy,
}: {
  prediction: BracketPrediction;
  onChange: (next: BracketPrediction) => void;
  readOnly?: boolean;
  copy: { final: string; thirdPlace: string; tapHint: string };
}) {
  const participantMap = useMemo(() => resolveBracketMatches(prediction), [prediction]);
  const highlightFinals = needsFinalKnockoutPicks(prediction.knockoutWinners);

  const handlePick = (matchId: string, teamIdx: number) => {
    if (readOnly) return;
    onChange(setMatchWinner(prediction, matchId, teamIdx));
  };

  return (
    <div>
      <p className="mb-4 text-sm text-white/45">{copy.tapHint}</p>

      {/* Desktop bracket */}
      <div className="hidden items-center justify-center gap-2 overflow-x-auto pb-4 lg:flex xl:gap-3">
        <SideBracket
          root={BRACKET_LEFT}
          side="left"
          participantMap={participantMap}
          winners={prediction.knockoutWinners}
          readOnly={readOnly}
          onPick={handlePick}
        />
        <CenterFinals
          participantMap={participantMap}
          winners={prediction.knockoutWinners}
          readOnly={readOnly}
          onPick={handlePick}
          copy={copy}
        />
        <SideBracket
          root={BRACKET_RIGHT}
          side="right"
          participantMap={participantMap}
          winners={prediction.knockoutWinners}
          readOnly={readOnly}
          onPick={handlePick}
        />
      </div>

      {/* Mobile: vertical list of playable ties */}
      <div className="space-y-2 lg:hidden">
        {["M73", "M74", "M75", "M76", "M77", "M78", "M79", "M80", "M81", "M82", "M83", "M84", "M85", "M86", "M87", "M88",
          "M89", "M90", "M91", "M92", "M93", "M94", "M95", "M96",
          "M97", "M98", "M99", "M100", "M101", "M102", "M103", "M104"].map((id) => {
          const p = participantMap.get(id);
          if (!p) return null;
          const koIdx = knockoutMatchIndex(id);
          const w = koIdx >= 0 ? prediction.knockoutWinners[koIdx] : -1;
          const highlight = highlightFinals && (id === "M103" || id === "M104");
          return (
            <div
              key={id}
              className={cn(
                "rounded-xl border bg-[#0a0c0f]/70 p-3",
                highlight && w < 0
                  ? "animate-pulse border-amber-400/50 ring-1 ring-amber-400/40"
                  : "border-white/[0.08]",
              )}
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-display text-xs font-black text-white/60">{id}</span>
                <span className="text-[9px] font-bold uppercase text-white/30">{p.round}</span>
              </div>
              <div className="space-y-1">
                <TeamPick
                  teamIdx={p.home}
                  selected={w != null && w >= 0 && p.home === w}
                  disabled={readOnly || p.home == null || p.away == null}
                  onPick={() => p.home != null && handlePick(id, p.home)}
                />
                <TeamPick
                  teamIdx={p.away}
                  selected={w != null && w >= 0 && p.away === w}
                  disabled={readOnly || p.home == null || p.away == null}
                  onPick={() => p.away != null && handlePick(id, p.away)}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
