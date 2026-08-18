"use client";

import { useMemo, useState } from "react";
import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
  animate,
} from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useResultsRoomData } from "../useResultsRoomData";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import { cn } from "@/lib/utils";
import { ClaimDialog, CounterUp } from "./vibeKit";
import {
  ConceptChrome,
  GhostBtn,
  WhiteCta,
  XiStrip,
  useRtSurfaceStyle,
} from "./rtKit";

const LOWERED = 270;

/**
 * 1 · Lower the Board
 * Drag the frost board down → hang wall wakes. Board select lights a plate;
 * plate click hangs XI under it. Homepage raise/lower DNA, different object.
 */
export function IxLowerBoard() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useRtSurfaceStyle();
  const [claimOpen, setClaimOpen] = useState(false);
  const [wallOwner, setWallOwner] = useState<string | null>(null);
  const [lowered, setLowered] = useState(false);

  const y = useMotionValue(0);
  const wallClarity = useTransform(y, [0, 90, LOWERED], [0.2, 0.65, 1]);
  const hintOpacity = useTransform(y, [0, 80, 160], [1, 0.4, 0]);
  const boardLift = useTransform(y, [0, LOWERED], [0, LOWERED * 0.92]);

  const plates = useMemo(() => s.data.rows.slice(0, 8), [s.data.rows]);
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  const snap = (toLower: boolean) => {
    setLowered(toLower);
    animate(y, toLower ? LOWERED : 0, {
      type: "spring",
      stiffness: 300,
      damping: 30,
    });
  };

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-[#0c0b0a] text-white"
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse 70% 50% at 50% 28%, rgba(42,38,34,0.95), transparent 58%), linear-gradient(180deg,#1a1816,#080706)",
        }}
      />

      {/* HANG WALL */}
      <motion.div
        className="absolute inset-0 z-[5] flex flex-col px-3 pb-44 pt-28 sm:px-8"
        style={{ opacity: wallClarity }}
      >
        <p className="mb-5 text-center font-display text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
          Hang wall · {lowered ? "live" : "behind the board"}
        </p>
        <div
          className={cn(
            "mx-auto grid w-full max-w-4xl grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4",
            !lowered && "pointer-events-none",
          )}
        >
          {plates.map((row, i) => {
            const lit = (wallOwner ?? s.openOwner) === row.owner;
            const open = wallOwner === row.owner;
            return (
              <div key={row.owner} className="relative flex flex-col items-center">
                <div
                  aria-hidden
                  className="mb-1 h-3 w-3 rounded-full border border-white/30 bg-white/10"
                />
                <div aria-hidden className="mb-1 h-4 w-px bg-white/25" />
                <motion.button
                  type="button"
                  onClick={() => {
                    if (!lowered) snap(true);
                    s.select(row.owner);
                    setWallOwner(row.owner);
                  }}
                  animate={
                    lit
                      ? { rotate: [-1.2, 1.2, -0.8], y: [0, 3, 0] }
                      : { rotate: ((i % 5) - 2) * 0.7, y: 0 }
                  }
                  transition={
                    lit
                      ? { repeat: Infinity, duration: 2.6, ease: "easeInOut" }
                      : { duration: 0.35 }
                  }
                  className={cn(
                    "w-full rounded-lg border px-2 py-3 text-center shadow-[0_14px_32px_rgba(0,0,0,0.5)] backdrop-blur-md",
                    lit
                      ? "border-white/55 bg-white/15 ring-1 ring-white/40"
                      : "border-white/15 bg-black/55 hover:border-white/35",
                    row.isYou && "outline outline-1 outline-offset-2 outline-white/30",
                  )}
                  style={{ transformOrigin: "50% 0%" }}
                >
                  <p className="font-display text-[9px] font-bold tabular-nums text-white/40">
                    #{row.rank}
                  </p>
                  <p className="mt-0.5 truncate font-display text-xs font-black uppercase">
                    {row.nickname}
                  </p>
                  <p className="mt-1 font-display text-sm font-black tabular-nums">
                    {row.finalPoints}
                  </p>
                </motion.button>
                <AnimatePresence>
                  {open ? (
                    <motion.div
                      initial={{ opacity: 0, y: -10, height: 0 }}
                      animate={{ opacity: 1, y: 0, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-2 w-full overflow-hidden rounded-lg border border-white/12 bg-black/70 p-2"
                    >
                      <p className="mb-1 text-[8px] font-bold uppercase tracking-[0.16em] text-white/35">
                        Hung XI
                      </p>
                      <XiStrip players={row.xi ?? row.squad} />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </motion.div>

      <ResultsPlaceNav />
      <ConceptChrome
        title="1 · Lower the Board"
        hook="Drag the board down — wall plates wake. Click a plate to hang its XI."
      />

      <motion.p
        className="pointer-events-none fixed bottom-[8.5rem] left-1/2 z-30 -translate-x-1/2 font-display text-[10px] uppercase tracking-[0.22em] text-white/45"
        style={{ opacity: hintOpacity }}
      >
        Pull board ↓
      </motion.p>

      {/* BOARD */}
      <motion.div
        className="absolute inset-x-0 bottom-0 z-20 flex justify-center px-3 pb-28 sm:px-6"
        style={{ y: boardLift }}
      >
        <div className="w-full max-w-xl overflow-hidden rounded-t-3xl border border-white/15 bg-black/88 shadow-[0_-28px_90px_rgba(0,0,0,0.7)] backdrop-blur-2xl">
          <motion.button
            type="button"
            aria-label="Drag or tap to lower board"
            className="flex w-full cursor-grab flex-col items-center py-3 active:cursor-grabbing"
            style={{ touchAction: "none" }}
            onPointerDown={(e) => {
              const startY = e.clientY;
              const start = y.get();
              const move = (ev: PointerEvent) => {
                const next = Math.max(
                  0,
                  Math.min(LOWERED, start + (ev.clientY - startY)),
                );
                y.set(next);
                setLowered(next > 110);
              };
              const up = (ev: PointerEvent) => {
                window.removeEventListener("pointermove", move);
                window.removeEventListener("pointerup", up);
                const end = y.get();
                const dy = ev.clientY - startY;
                snap(end > 120 || dy > 80);
              };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
            onClick={() => {
              // tap toggles if almost idle
              if (Math.abs(y.get()) < 8 || y.get() > LOWERED - 8) {
                snap(!lowered);
              }
            }}
          >
            <div className="h-1.5 w-12 rounded-full bg-white/35" />
            <p className="mt-2 font-display text-[9px] font-bold uppercase tracking-[0.2em] text-white/40">
              {lowered ? "Drag up to close · tap" : "Drag down to open wall · tap"}
            </p>
          </motion.button>

          <div className="flex flex-wrap items-center gap-2 px-4 pb-2">
            <GhostBtn onClick={() => snap(!lowered)}>
              {lowered ? "Raise board" : "Lower board"}
            </GhostBtn>
            <GhostBtn
              onClick={() => {
                if (!s.you) return;
                snap(true);
                s.select(s.you.owner);
                setWallOwner(s.you.owner);
              }}
            >
              Find me
            </GhostBtn>
            {canClaim ? (
              <WhiteCta onClick={() => setClaimOpen(true)}>Claim</WhiteCta>
            ) : null}
          </div>

          <div className="max-h-[36vh] overflow-y-auto px-2 pb-4">
            {s.data.rows.map((row) => {
              const on = s.openOwner === row.owner;
              return (
                <button
                  key={row.owner}
                  type="button"
                  onClick={() => {
                    s.select(row.owner);
                    setWallOwner(row.owner);
                    if (!lowered) snap(true);
                  }}
                  className={cn(
                    "mb-1 flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition",
                    on
                      ? "bg-white/12 ring-1 ring-white/30"
                      : "hover:bg-white/[0.04]",
                  )}
                >
                  <span className="w-8 font-display text-sm font-black tabular-nums text-white/40">
                    {row.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-xs font-black uppercase">
                    {row.nickname}
                  </span>
                  <span className="font-display text-sm font-black tabular-nums">
                    <CounterUp value={row.finalPoints} />
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </motion.div>

      <ClaimDialog
        open={claimOpen}
        title="Claim prize"
        body="Claim stamps your hung plate on the wall."
        confirmLabel="Claim"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={async () => {
          await room.claimPrize();
          setClaimOpen(false);
          if (s.you) {
            snap(true);
            setWallOwner(s.you.owner);
          }
        }}
      />
    </div>
  );
}
