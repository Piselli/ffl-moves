"use client";

import { useMemo, useState, type DragEvent } from "react";
import { AnimatePresence, LayoutGroup, motion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useResultsRoomData } from "../useResultsRoomData";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import type { LabLeaderboardRow } from "../mockData";
import { cn } from "@/lib/utils";
import { ClaimDialog, CounterUp } from "./vibeKit";
import {
  ConceptChrome,
  GhostBtn,
  WhiteCta,
  XiStrip,
  useRtSurfaceStyle,
} from "./rtKit";

const HOOK_COUNT = 5;

/**
 * 2 · Hang your rivals
 * Empty wall of hooks. Drag managers from the dock onto hooks —
 * they physically hang. Compare = hung objects, not expand-rows.
 */
export function IxHangRivals() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useRtSurfaceStyle();
  const [hooks, setHooks] = useState<(string | null)[]>(
    () => Array.from({ length: HOOK_COUNT }, () => null),
  );
  const [openHook, setOpenHook] = useState<number | null>(null);
  const [dragging, setDragging] = useState<string | null>(null);
  const [overHook, setOverHook] = useState<number | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [stamp, setStamp] = useState(false);

  const byOwner = useMemo(() => {
    const m = new Map<string, LabLeaderboardRow>();
    s.data.rows.forEach((r) => m.set(r.owner, r));
    return m;
  }, [s.data.rows]);

  const hungOwners = useMemo(
    () => new Set(hooks.filter(Boolean) as string[]),
    [hooks],
  );
  const dock = useMemo(
    () => s.data.rows.filter((r) => !hungOwners.has(r.owner)),
    [s.data.rows, hungOwners],
  );
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  const hang = (hookIndex: number, owner: string) => {
    setHooks((prev) => {
      const next = prev.map((o) => (o === owner ? null : o));
      next[hookIndex] = owner;
      return next;
    });
    s.select(owner);
    setOpenHook(hookIndex);
  };

  const unhang = (hookIndex: number) => {
    setHooks((prev) => {
      const next = [...prev];
      next[hookIndex] = null;
      return next;
    });
    if (openHook === hookIndex) setOpenHook(null);
  };

  const onDockDragStart = (owner: string) => (e: DragEvent) => {
    setDragging(owner);
    e.dataTransfer.setData("text/plain", owner);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-black text-white"
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "linear-gradient(180deg,#141210 0%,#0a0908 45%,#050505 100%), repeating-linear-gradient(90deg, transparent 0 64px, rgba(255,255,255,0.015) 64px 65px)",
        }}
      />
      {/* rail */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-[6%] top-[32%] h-2 rounded-full bg-gradient-to-r from-transparent via-white/20 to-transparent shadow-[0_8px_24px_rgba(0,0,0,0.6)]"
      />

      <ResultsPlaceNav />
      <ConceptChrome
        title="2 · Hang your rivals"
        hook="Drag managers from the dock onto hooks. Comparison lives on the wall."
      />

      <LayoutGroup>
        <div className="relative z-10 mx-auto grid max-w-5xl grid-cols-5 gap-2 px-3 pb-56 pt-36 sm:gap-4 sm:px-8">
          {hooks.map((owner, i) => {
            const row = owner ? byOwner.get(owner) : null;
            const open = openHook === i;
            const hot = overHook === i;
            return (
              <div
                key={`hook-${i}`}
                className="flex min-h-[14rem] flex-col items-center"
                onDragOver={(e) => {
                  e.preventDefault();
                  setOverHook(i);
                }}
                onDragLeave={() => setOverHook((v) => (v === i ? null : v))}
                onDrop={(e) => {
                  e.preventDefault();
                  const id = e.dataTransfer.getData("text/plain") || dragging;
                  setOverHook(null);
                  setDragging(null);
                  if (id) hang(i, id);
                }}
              >
                <motion.div
                  layout
                  className={cn(
                    "mb-2 flex h-8 w-8 items-center justify-center rounded-full border text-[10px] font-bold text-white/40 transition",
                    hot
                      ? "scale-110 border-white bg-white/20 text-white"
                      : "border-white/25 bg-black/40",
                  )}
                >
                  {i + 1}
                </motion.div>
                <div aria-hidden className="mb-2 h-5 w-px bg-white/30" />

                <AnimatePresence mode="popLayout">
                  {row ? (
                    <motion.button
                      key={row.owner}
                      type="button"
                      layout
                      initial={{ opacity: 0, y: -40, rotate: -8 }}
                      animate={{
                        opacity: 1,
                        y: 0,
                        rotate: (i % 3) - 1,
                      }}
                      exit={{ opacity: 0, y: -24, scale: 0.9 }}
                      transition={{ type: "spring", stiffness: 360, damping: 22 }}
                      onClick={() => {
                        s.select(row.owner);
                        setOpenHook((v) => (v === i ? null : i));
                      }}
                      className={cn(
                        "w-full rounded-xl border px-2 py-3 text-center shadow-[0_16px_36px_rgba(0,0,0,0.55)] backdrop-blur-md",
                        open
                          ? "border-white/50 bg-white/15"
                          : "border-white/20 bg-black/60",
                        row.isYou && stamp && "ring-2 ring-white/50",
                      )}
                      style={{ transformOrigin: "50% 0%" }}
                    >
                      <p className="font-display text-[9px] tabular-nums text-white/40">
                        #{row.rank}
                      </p>
                      <p className="truncate font-display text-[11px] font-black uppercase">
                        {row.nickname}
                      </p>
                      <p className="mt-1 font-display text-lg font-black tabular-nums">
                        <CounterUp value={row.finalPoints} />
                      </p>
                      {row.isYou && stamp ? (
                        <p className="mt-2 text-[8px] font-black uppercase tracking-[0.16em] text-white/60">
                          Claimed
                        </p>
                      ) : null}
                      <AnimatePresence>
                        {open ? (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="mt-2 overflow-hidden border-t border-white/10 pt-2 text-left"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <XiStrip players={row.xi ?? row.squad} />
                            <button
                              type="button"
                              onClick={() => unhang(i)}
                              className="mt-2 text-[9px] uppercase tracking-[0.14em] text-white/40 hover:text-white/70"
                            >
                              Unhang
                            </button>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </motion.button>
                  ) : (
                    <motion.div
                      key={`empty-${i}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className={cn(
                        "flex h-28 w-full items-center justify-center rounded-xl border border-dashed text-[9px] uppercase tracking-[0.14em]",
                        hot
                          ? "border-white/50 bg-white/10 text-white/70"
                          : "border-white/15 text-white/25",
                      )}
                    >
                      Drop here
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </LayoutGroup>

      {/* DOCK */}
      <div className="fixed inset-x-0 bottom-0 z-30 px-3 pb-28 sm:px-6">
        <div className="mx-auto max-w-5xl rounded-2xl border border-white/15 bg-black/85 p-3 shadow-[0_-16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-white/40">
              Dock · drag onto hooks
            </p>
            <GhostBtn
              onClick={() => {
                if (!s.you) return;
                const empty = hooks.findIndex((h) => h == null);
                const idx = empty >= 0 ? empty : 0;
                hang(idx, s.you.owner);
              }}
            >
              Find me → hang
            </GhostBtn>
            {canClaim ? (
              <WhiteCta onClick={() => setClaimOpen(true)}>Claim</WhiteCta>
            ) : null}
            <GhostBtn
              onClick={() => {
                setHooks(Array.from({ length: HOOK_COUNT }, () => null));
                setOpenHook(null);
              }}
            >
              Clear wall
            </GhostBtn>
          </div>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {dock.map((row) => (
              <button
                key={row.owner}
                type="button"
                draggable
                onDragStart={onDockDragStart(row.owner)}
                onDragEnd={() => setDragging(null)}
                className={cn(
                  "shrink-0 rounded-xl border border-white/15 bg-white/[0.04] px-3 py-2 text-left transition active:scale-[0.97]",
                  dragging === row.owner && "opacity-40",
                  row.isYou && "border-white/35",
                )}
              >
                <p className="font-display text-[9px] text-white/40">#{row.rank}</p>
                <p className="font-display text-[11px] font-black uppercase">
                  {row.nickname}
                </p>
                <p className="text-[11px] tabular-nums text-white/70">
                  {row.finalPoints}
                </p>
              </button>
            ))}
            {!dock.length ? (
              <p className="px-2 py-3 text-[11px] text-white/35">
                Wall full — unhang someone or clear.
              </p>
            ) : null}
          </div>
        </div>
      </div>

      <ClaimDialog
        open={claimOpen}
        title="Stamp your hook"
        body="Claim marks your hung plate."
        confirmLabel="Claim"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={async () => {
          await room.claimPrize();
          setClaimOpen(false);
          setStamp(true);
          if (s.you) {
            const empty = hooks.findIndex((h) => h == null);
            const existing = hooks.findIndex((h) => h === s.you!.owner);
            hang(existing >= 0 ? existing : empty >= 0 ? empty : 0, s.you.owner);
          }
        }}
      />
    </div>
  );
}
