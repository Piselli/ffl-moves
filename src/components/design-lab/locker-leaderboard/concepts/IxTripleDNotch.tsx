"use client";

import { useState } from "react";
import {
  AnimatePresence,
  MotionConfig,
  motion,
} from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useResultsRoomData } from "../useResultsRoomData";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import { cn } from "@/lib/utils";
import { ClaimDialog, CounterUp } from "./vibeKit";
import {
  GhostBtn,
  WhiteCta,
  XiStrip,
  scrollOwnerIntoView,
  useRtSurfaceStyle,
} from "./rtKit";

/**
 * Port of TripleD `NativeProfileNotch` spring expand + dense board.
 * Notch morphs 160×60 → 320×380 with staggered width/height springs.
 */
export function IxTripleDNotch() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useRtSurfaceStyle();
  const [open, setOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);
  const you = s.you;

  return (
    <div className="relative min-h-[100dvh] bg-black text-white" style={style}>
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]"
      />
      <ResultsPlaceNav />

      <div className="relative z-10 mx-auto max-w-3xl px-4 pb-32 pt-28 sm:px-6">
        <p className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
          TripleD notch · ported
        </p>
        <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight">
          You island
        </h1>
        <p className="mt-1 text-[12px] text-white/45">
          Native Profile Notch spring morph — tap the island.
        </p>

        <div className="mt-8 flex justify-center">
          <MotionConfig reducedMotion="user">
            <motion.div
              layout
              role={!open ? "button" : undefined}
              tabIndex={!open ? 0 : -1}
              aria-expanded={open}
              className={cn(
                "overflow-hidden border border-white/20 bg-black/85 text-white shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl outline-none",
                open ? "rounded-3xl" : "cursor-pointer rounded-full",
              )}
              initial={false}
              animate={{
                width: open ? 320 : 168,
                height: open ? 360 : 56,
              }}
              transition={{
                width: {
                  delay: open ? 0 : 0.25,
                  type: "spring",
                  stiffness: 260,
                  damping: 30,
                },
                height: {
                  delay: open ? 0.15 : 0,
                  type: "spring",
                  stiffness: 260,
                  damping: 30,
                },
              }}
              onClick={() => !open && setOpen(true)}
              onKeyDown={(e) => {
                if (!open && (e.key === "Enter" || e.key === " ")) {
                  e.preventDefault();
                  setOpen(true);
                }
                if (open && e.key === "Escape") setOpen(false);
              }}
            >
              <AnimatePresence mode="wait">
                {!open ? (
                  <motion.div
                    key="collapsed"
                    className="flex h-full w-full items-center gap-3 px-4"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/15 text-[10px] font-black">
                      {you ? you.nickname.slice(0, 2) : "—"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold">
                        {you ? you.nickname : "Not connected"}
                      </p>
                      <p className="truncate text-[10px] text-white/40">
                        {you ? `#${you.rank}` : "Connect wallet"}
                      </p>
                    </div>
                    <span className="text-white/35">›</span>
                  </motion.div>
                ) : (
                  <motion.div
                    key="expanded"
                    className="relative flex h-full flex-col p-5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <button
                      type="button"
                      aria-label="Close"
                      className="absolute right-3 top-3 rounded-full bg-white/10 p-1.5 text-xs text-white/60 hover:bg-white/15"
                      onClick={(e) => {
                        e.stopPropagation();
                        setOpen(false);
                      }}
                    >
                      ✕
                    </button>
                    <div className="mt-2 flex flex-col items-center">
                      <div className="mb-3 flex h-20 w-20 items-center justify-center rounded-full border border-white/20 bg-white/10 font-display text-xl font-black">
                        {you ? you.nickname.slice(0, 2) : "—"}
                      </div>
                      <p className="font-display text-xl font-black uppercase">
                        {you?.nickname ?? "You"}
                      </p>
                      <p className="text-sm text-white/45">
                        {you ? (
                          <>
                            #{you.rank} ·{" "}
                            <CounterUp value={you.finalPoints} /> pts
                          </>
                        ) : (
                          "Not in field"
                        )}
                      </p>
                    </div>
                    {you ? (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="mt-4 flex-1"
                      >
                        <XiStrip players={you.xi ?? you.squad} />
                        <div className="mt-4 flex flex-wrap gap-2">
                          <GhostBtn
                            onClick={() => {
                              s.select(you.owner);
                              setExpanded(you.owner);
                              scrollOwnerIntoView(you.owner);
                              setOpen(false);
                            }}
                          >
                            Find on board
                          </GhostBtn>
                          {canClaim ? (
                            <WhiteCta onClick={() => setClaimOpen(true)}>
                              Claim
                            </WhiteCta>
                          ) : null}
                        </div>
                      </motion.div>
                    ) : null}
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </MotionConfig>
        </div>

        <div className="mt-10 overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {s.data.rows.map((row) => {
            const on = expanded === row.owner;
            return (
              <div key={row.owner} id={`rt-row-${row.owner}`}>
                <button
                  type="button"
                  onClick={() => {
                    s.select(row.owner);
                    setExpanded((v) => (v === row.owner ? null : row.owner));
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 border-b border-white/[0.05] px-4 py-3 text-left transition hover:bg-white/[0.03]",
                    on && "bg-white/[0.05]",
                  )}
                >
                  <span className="w-8 font-display text-sm font-black tabular-nums text-white/40">
                    {row.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-sm font-black uppercase">
                    {row.nickname}
                  </span>
                  <span className="font-display text-base font-black tabular-nums">
                    {row.finalPoints}
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {on ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-b border-white/[0.05] bg-black/40 px-4 py-3 pl-14"
                    >
                      <XiStrip players={row.xi ?? row.squad} />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <ClaimDialog
        open={claimOpen}
        title="Claim prize"
        body="Confirm from your island."
        confirmLabel="Claim"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={async () => {
          await room.claimPrize();
          setClaimOpen(false);
        }}
      />
    </div>
  );
}
