"use client";

import { useCallback, useEffect } from "react";
import { WC_GROUPS } from "@/components/wc/wcGroups";
import { WcFlagChip } from "@/components/wc/WcGroupCard";
import { WcSectionEyebrow } from "@/components/wc/WcSectionEyebrow";
import { WcDragRankList, DragGrip } from "@/components/wc/WcDragRankList";
import { WcInteractiveKnockoutBracket } from "@/components/wc/WcInteractiveKnockoutBracket";
import {
  WC_KNOCKOUT_MATCH_COUNT,
  WC_TEAMS,
  type BracketPrediction,
  defaultThirdPlaceOrder,
  isValidGroupRanks,
  isValidThirdPlaceOrder,
  isValidKnockoutWinners,
  thirdPlaceTeamIndices,
  type GroupRanks,
  type ThirdPlaceOrder,
} from "@/lib/wcBracketPrediction";
import { cn } from "@/lib/utils";

export type BracketStep = "groups" | "thirds" | "knockout";

function ranksFromGroupOrder(groupIndex: number, order: number[]): GroupRanks {
  const ranks = Array(48).fill(0);
  order.forEach((teamSlot, rankIdx) => {
    ranks[groupIndex * 4 + teamSlot] = rankIdx + 1;
  });
  return ranks;
}

function groupOrderFromRanks(groupIndex: number, ranks: GroupRanks): number[] {
  return [0, 1, 2, 3].sort((a, b) => ranks[groupIndex * 4 + a]! - ranks[groupIndex * 4 + b]!);
}

function GroupRankEditor({
  groupIndex,
  ranks,
  onChange,
  readOnly,
}: {
  groupIndex: number;
  ranks: GroupRanks;
  onChange: (next: GroupRanks) => void;
  readOnly?: boolean;
}) {
  const group = WC_GROUPS[groupIndex]!;
  const order = groupOrderFromRanks(groupIndex, ranks);

  const items = order.map((slot) => ({
    slot,
    team: group.teams[slot]!,
    teamIdx: groupIndex * 4 + slot,
  }));

  const applyOrder = (nextOrder: typeof items) => {
    const slots = nextOrder.map((x) => x.slot);
    const merged = [...ranks];
    const partial = ranksFromGroupOrder(groupIndex, slots);
    for (let s = 0; s < 4; s++) merged[groupIndex * 4 + s] = partial[groupIndex * 4 + s]!;
    onChange(merged);
  };

  return (
    <div
      className="overflow-hidden rounded-xl border border-white/[0.08] bg-[#0a0c0f]/80"
      style={{ boxShadow: `inset 3px 0 0 ${group.accent}` }}
    >
      <div className="flex items-center gap-2 border-b border-white/[0.06] px-3 py-2">
        <span
          className="flex h-7 w-7 items-center justify-center font-wc-display text-sm text-black/85"
          style={{ backgroundColor: group.accent }}
        >
          {group.letter}
        </span>
      </div>
      <WcDragRankList
        readOnly={readOnly}
        items={items}
        getKey={(it) => String(it.teamIdx)}
        onReorder={applyOrder}
        className="divide-y divide-white/[0.05] space-y-0 p-0"
        renderItem={(it, rank, dragProps) => (
          <div className="flex items-center gap-2 px-3 py-2">
            {!readOnly ? <DragGrip {...dragProps} /> : null}
            <span className="w-5 font-display text-sm font-black tabular-nums text-[#00f948]">{rank}</span>
            <WcFlagChip code={it.team.code} name={it.team.name} className="h-4 w-6" />
            <span className="min-w-0 flex-1 truncate text-xs font-semibold text-white/80">{it.team.name}</span>
          </div>
        )}
      />
    </div>
  );
}

function ThirdPlaceEditor({
  ranks,
  thirdOrder,
  onChange,
  readOnly,
  labels,
}: {
  ranks: GroupRanks;
  thirdOrder: ThirdPlaceOrder;
  onChange: (next: ThirdPlaceOrder) => void;
  readOnly?: boolean;
  labels: { hint: string; advanceNote: string };
}) {
  const thirds = thirdPlaceTeamIndices(ranks);

  const items = thirds
    .map((teamIdx, groupIdx) => ({
      teamIdx,
      groupIdx,
      order: thirdOrder[groupIdx] ?? 0,
    }))
    .sort((a, b) => a.order - b.order);

  const applySorted = (sorted: typeof items) => {
    const next = [...thirdOrder];
    sorted.forEach((it, displayIdx) => {
      next[it.groupIdx] = displayIdx + 1;
    });
    onChange(next);
  };

  return (
    <div>
      <p className="mb-4 max-w-2xl text-sm text-white/50">{labels.hint}</p>
      <WcDragRankList
        readOnly={readOnly}
        items={items}
        getKey={(it) => String(it.teamIdx)}
        onReorder={applySorted}
        renderItem={(it, rank, dragProps) => {
          const team = WC_TEAMS[it.teamIdx]!;
          const advances = rank <= 8;
          return (
            <div
              className={cn(
                "flex items-center gap-3 rounded-xl border px-3 py-2.5",
                advances ? "border-[#00f948]/25 bg-[#00f948]/[0.04]" : "border-white/[0.08] bg-[#0a0c0f]/60",
              )}
            >
              {!readOnly ? <DragGrip {...dragProps} /> : null}
              <span className="w-6 font-display text-sm font-black tabular-nums text-white/60">{rank}</span>
              <WcFlagChip code={team.code} name={team.name} className="h-4 w-6" />
              <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white/85">
                {team.name}
                <span className="ml-2 text-[10px] font-bold uppercase text-white/30">3rd · {team.group}</span>
              </span>
              {advances ? (
                <span className="text-[9px] font-bold uppercase tracking-wider text-[#00f948]">{labels.advanceNote}</span>
              ) : null}
            </div>
          );
        }}
      />
    </div>
  );
}

export function WcBracketPredictor({
  value,
  onChange,
  readOnly = false,
  step,
  onStepChange,
  groupsLocked = false,
  thirdsLocked = false,
  copy,
}: {
  value: BracketPrediction;
  onChange: (next: BracketPrediction) => void;
  readOnly?: boolean;
  step: BracketStep;
  onStepChange: (s: BracketStep) => void;
  groupsLocked?: boolean;
  thirdsLocked?: boolean;
  copy: {
    stepGroups: string;
    stepThirds: string;
    stepKnockout: string;
    thirdsTitle: string;
    thirdsHint: string;
    thirdsAdvance: string;
    koTitle: string;
    progress: (done: number, total: number) => string;
    final: string;
    thirdPlace: string;
    tapHint: string;
  };
}) {
  const syncThirdOrder = useCallback(
    (ranks: GroupRanks, prevThird: ThirdPlaceOrder): ThirdPlaceOrder => {
      if (thirdPlaceTeamIndices(ranks).length === 12 && prevThird.every((v) => v >= 1 && v <= 12)) {
        return prevThird;
      }
      return defaultThirdPlaceOrder();
    },
    [],
  );

  const setGroupRanks = (ranks: GroupRanks) => {
    onChange({
      ...value,
      groupRanks: ranks,
      thirdPlaceOrder: syncThirdOrder(ranks, value.thirdPlaceOrder),
      knockoutWinners: value.knockoutWinners.map(() => -1),
    });
  };

  const koFilled = value.knockoutWinners.filter((w) => w >= 0).length;

  const steps: { id: BracketStep; label: string; done: boolean }[] = [
    { id: "groups", label: copy.stepGroups, done: groupsLocked },
    { id: "thirds", label: copy.stepThirds, done: thirdsLocked },
    { id: "knockout", label: copy.stepKnockout, done: isValidKnockoutWinners(value.knockoutWinners) },
  ];

  useEffect(() => {
    if (readOnly) return;
    if (step === "thirds" && !groupsLocked) onStepChange("groups");
    if (step === "knockout" && !thirdsLocked) onStepChange(groupsLocked ? "thirds" : "groups");
  }, [step, groupsLocked, thirdsLocked, readOnly, onStepChange]);

  return (
    <div className="space-y-6">
      {/* Step rail */}
      <div className="flex flex-wrap items-center gap-2">
        {steps.map((s, i) => {
          const active = step === s.id;
          const reachable =
            s.id === "groups" ||
            (s.id === "thirds" && groupsLocked) ||
            (s.id === "knockout" && thirdsLocked);
          return (
            <div key={s.id} className="flex items-center gap-2">
              {i > 0 ? <span className="text-white/15">→</span> : null}
              <button
                type="button"
                disabled={!readOnly && !reachable}
                onClick={() => {
                  if (!readOnly && !reachable) return;
                  if (readOnly && !reachable) return;
                  onStepChange(s.id);
                }}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 font-wc-hero text-xs font-bold uppercase tracking-wider transition-colors",
                  active
                    ? "border-[#00f948]/40 bg-[#00f948]/10 text-[#00f948]"
                    : s.done
                      ? "border-[#00f948]/20 bg-[#00f948]/[0.04] text-[#00f948]/70"
                      : "border-white/10 bg-white/[0.03] text-white/50",
                  !reachable && !active && "cursor-not-allowed opacity-40",
                )}
              >
                {s.done ? (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#00f948] text-[10px] text-black">✓</span>
                ) : (
                  <span className="text-[10px] tabular-nums text-white/30">{i + 1}</span>
                )}
                {s.label}
              </button>
            </div>
          );
        })}
        {step === "knockout" ? (
          <span className="ml-auto text-[10px] font-bold uppercase tracking-widest text-white/30">
            {copy.progress(koFilled, WC_KNOCKOUT_MATCH_COUNT)}
          </span>
        ) : null}
      </div>

      {step === "groups" && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {WC_GROUPS.map((_, gi) => (
            <GroupRankEditor
              key={gi}
              groupIndex={gi}
              ranks={value.groupRanks}
              onChange={setGroupRanks}
              readOnly={readOnly}
            />
          ))}
        </div>
      )}

      {step === "thirds" && (
        <div>
          <WcSectionEyebrow>{copy.thirdsTitle}</WcSectionEyebrow>
          <ThirdPlaceEditor
            ranks={value.groupRanks}
            thirdOrder={value.thirdPlaceOrder}
            onChange={(thirdPlaceOrder) =>
              onChange({ ...value, thirdPlaceOrder, knockoutWinners: value.knockoutWinners.map(() => -1) })
            }
            readOnly={readOnly}
            labels={{ hint: copy.thirdsHint, advanceNote: copy.thirdsAdvance }}
          />
        </div>
      )}

      {step === "knockout" && (
        <div>
          <WcSectionEyebrow>{copy.koTitle}</WcSectionEyebrow>
          <div className="mt-4 overflow-hidden rounded-2xl border border-white/[0.07] bg-[#050608]/80 p-4 sm:p-6">
            <WcInteractiveKnockoutBracket
              prediction={value}
              onChange={onChange}
              readOnly={readOnly}
              copy={{ final: copy.final, thirdPlace: copy.thirdPlace, tapHint: copy.tapHint }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export function isGroupsStepReady(ranks: GroupRanks): boolean {
  return isValidGroupRanks(ranks);
}

export function isThirdsStepReady(order: ThirdPlaceOrder, ranks: GroupRanks): boolean {
  return isValidThirdPlaceOrder(order, ranks);
}
