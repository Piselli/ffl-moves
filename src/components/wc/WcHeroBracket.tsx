"use client";

import { cn } from "@/lib/utils";
import { BRACKET_ROUNDS, type BracketNode } from "@/components/wc/wcBracket";
import { WcFlagChip } from "@/components/wc/WcGroupCard";
import type { HeroMatchDisplay } from "@/lib/wcHeroDisplay";

/**
 * Compact broadcast knockout bracket for the hero. Built recursively: every node
 * is a flex item that splits its vertical space evenly, so the two feeders of any
 * tie always sit at the 25% / 75% marks and the winner box centres between them.
 * That keeps the elbow connectors geometrically correct at any depth without JS.
 *
 * The right pathway reuses the same renderer mirrored with `scaleX(-1)`; box text
 * is flipped back so match numbers stay readable.
 */

const LINE = "border-white/20";
const BOX_W = "w-[66px]"; // column stride is BOX_W + ELBOW_W (20px) = 86px
const ELBOW_W = "w-[20px]";

function BoxContent({
  node,
  display,
  mirror,
}: {
  node: BracketNode;
  display?: HeroMatchDisplay;
  mirror?: boolean;
}) {
  const flip = mirror ? "[transform:scaleX(-1)]" : undefined;

  if (display?.winner) {
    return (
      <span className={cn("flex items-center justify-center", flip)}>
        <WcFlagChip code={display.winner.code} name={display.winner.name} className="h-3.5 w-[22px]" />
      </span>
    );
  }

  const home = display?.home ?? null;
  const away = display?.away ?? null;

  if (home && away) {
    return (
      <span className={cn("flex items-center justify-center gap-0.5 px-0.5", flip)}>
        <WcFlagChip code={home.code} name={home.name} className="h-3 w-[18px]" />
        <WcFlagChip code={away.code} name={away.name} className="h-3 w-[18px]" />
      </span>
    );
  }

  if (home) {
    return (
      <span className={cn("flex items-center justify-center", flip)}>
        <WcFlagChip code={home.code} name={home.name} className="h-3 w-[18px]" />
      </span>
    );
  }

  if (away) {
    return (
      <span className={cn("flex items-center justify-center", flip)}>
        <WcFlagChip code={away.code} name={away.name} className="h-3 w-[18px]" />
      </span>
    );
  }

  return (
    <span className={cn("tabular-nums", flip)}>{node.code}</span>
  );
}

function Box({
  node,
  mirror,
  display,
}: {
  node: BracketNode;
  mirror?: boolean;
  display?: HeroMatchDisplay;
}) {
  const isLeaf = node.round === "R32";
  const hasTeams = Boolean(display?.winner || display?.home || display?.away);

  return (
    <div
      title={hasTeams ? node.code : (node.seeds ?? node.code)}
      className={cn(
        BOX_W,
        "flex h-[26px] items-center justify-center rounded-[5px] border font-wc-hero text-[11px] font-bold leading-none tracking-wide",
        isLeaf
          ? "border-white/12 bg-white/[0.035] text-white/60"
          : "border-[#00f948]/30 bg-[#00f948]/[0.07] text-[#00f948] shadow-[0_0_14px_-6px_rgba(0,249,72,0.6)]",
      )}
    >
      <BoxContent node={node} display={display} mirror={mirror} />
    </div>
  );
}

/** ⊐-shaped merge: two inputs (left, at 25%/75%) into one output (right, at 50%). */
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

function Node({
  node,
  mirror,
  displays,
}: {
  node: BracketNode;
  mirror?: boolean;
  displays?: Map<string, HeroMatchDisplay>;
}) {
  if (!node.feeders) {
    return (
      <div className="flex flex-1 items-center justify-end">
        <Box node={node} mirror={mirror} display={displays?.get(node.code)} />
      </div>
    );
  }
  return (
    <div className="flex flex-1 items-stretch">
      <div className="flex flex-col">
        <Node node={node.feeders[0]} mirror={mirror} displays={displays} />
        <Node node={node.feeders[1]} mirror={mirror} displays={displays} />
      </div>
      <Elbow />
      <div className="flex items-center">
        <Box node={node} mirror={mirror} display={displays?.get(node.code)} />
      </div>
    </div>
  );
}

/** Round labels aligned to each box column (stride = BOX_W + 16px gap). */
function RoundLabels({ rounds }: { rounds: readonly string[] }) {
  return (
    <div className="mb-3 flex gap-[20px]">
      {rounds.map((r) => (
        <span
          key={r}
          className={cn(
            BOX_W,
            "flex flex-col items-center gap-1 font-wc-hero text-[10px] font-bold uppercase tracking-[0.16em] text-white/55",
          )}
        >
          {r}
          <span className="h-px w-5 bg-white/15" aria-hidden />
        </span>
      ))}
    </div>
  );
}

export function WcHeroBracket({
  root,
  side,
  height,
  displays,
}: {
  root: BracketNode;
  side: "left" | "right";
  height: number;
  displays?: Map<string, HeroMatchDisplay>;
}) {
  const mirror = side === "right";
  // Left reads R32→SF; right reads SF→R32 so labels stay outer→centre after the flip.
  const labels = mirror ? [...BRACKET_ROUNDS].reverse() : BRACKET_ROUNDS;
  return (
    <div className="flex flex-col">
      <RoundLabels rounds={labels} />
      <div
        className={cn("flex items-stretch", mirror && "[transform:scaleX(-1)]")}
        style={{ height }}
        aria-hidden
      >
        <Node node={root} mirror={mirror} displays={displays} />
      </div>
    </div>
  );
}
