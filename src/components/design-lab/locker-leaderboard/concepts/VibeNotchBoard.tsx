"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { TeamSheetPitch, useTeamSheetSelection } from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import { cn } from "@/lib/utils";
import {
  ClaimDialog,
  CounterUp,
  StatusBadge,
  useObsidianSurfaceStyle,
} from "./vibeKit";

/**
 * D · Notch Board — Dynamic Island “you” + Linear dense expandable rows.
 */
export function VibeNotchBoard() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useObsidianSurfaceStyle();
  const [notchOpen, setNotchOpen] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const rows = s.data.rows;
      const idx = rows.findIndex((r) => r.owner === s.openOwner);
      if (e.key === "ArrowDown") {
        e.preventDefault();
        const next = rows[Math.min(rows.length - 1, idx + 1)];
        if (next) s.select(next.owner);
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        const prev = rows[Math.max(0, idx - 1)];
        if (prev) s.select(prev.owner);
      }
      if (e.key === "Enter") {
        setExpanded((v) => (v === s.openOwner ? null : s.openOwner));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [s.data.rows, s.openOwner, s.select]);

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-black text-white"
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_40%_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]"
      />
      <ResultsPlaceNav />

      {/* Profile Notch / Dynamic Island */}
      <div className="fixed inset-x-0 top-16 z-[70] flex justify-center px-4">
        <motion.button
          type="button"
          layout
          onClick={() => setNotchOpen((v) => !v)}
          className={cn(
            "overflow-hidden border border-white/15 bg-black/80 text-left shadow-[0_12px_40px_rgba(0,0,0,0.55)] backdrop-blur-xl",
            notchOpen ? "rounded-2xl" : "rounded-full",
          )}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
          style={{ width: notchOpen ? "min(22rem, 92vw)" : "auto" }}
        >
          <div className="flex items-center gap-3 px-4 py-2.5">
            <span className="h-2 w-2 rounded-full bg-[color:var(--lt-accent)] shadow-[0_0_12px_var(--lt-accent-shadow)]" />
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.14em]">
              {s.you
                ? `You · #${s.you.rank}`
                : "Not connected"}
            </span>
            {s.you ? (
              <span className="ml-auto font-display text-sm font-black tabular-nums">
                <CounterUp value={s.you.finalPoints} />
              </span>
            ) : null}
          </div>
          <AnimatePresence>
            {notchOpen && s.you ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/10 px-4 py-3"
              >
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      s.findMe();
                      setExpanded(s.you!.owner);
                    }}
                    className="rounded-full border border-white/20 px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-white/70 hover:text-white"
                  >
                    Find me
                  </button>
                  {canClaim ? (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setClaimOpen(true);
                      }}
                      className="rounded-full bg-[color:var(--lt-accent)] px-3 py-1.5 text-[10px] font-black uppercase tracking-wide text-black"
                    >
                      Claim {s.you.prizeAmount}
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-[10px] text-white/35">
                  ↑↓ navigate · Enter expand XI
                </p>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.button>
      </div>

      <div className="mx-auto max-w-3xl px-4 pb-44 pt-36 sm:px-6">
        <div className="mb-6 flex items-end justify-between gap-3">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/35">
              Notch board · GW {s.data.gameweek}
            </p>
            <h1 className="mt-1 font-display text-3xl font-black uppercase tracking-tight sm:text-4xl">
              Standings
            </h1>
          </div>
          <StatusBadge tone={room.source === "live" ? "live" : "warn"}>
            {room.source === "live" ? "Live" : "Preview"}
          </StatusBadge>
        </div>

        <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02]">
          {s.data.rows.map((row) => {
            const on = s.openOwner === row.owner;
            const openXi = expanded === row.owner;
            return (
              <div
                key={row.owner}
                className={cn(
                  "border-b border-white/[0.06] last:border-0",
                  on && "bg-white/[0.03]",
                )}
              >
                <button
                  type="button"
                  onClick={() => {
                    s.select(row.owner);
                    setExpanded((v) => (v === row.owner ? null : row.owner));
                  }}
                  className="grid w-full grid-cols-[3rem_1fr_4rem] items-center gap-2 px-4 py-3 text-left"
                >
                  <span
                    className={cn(
                      "font-display text-sm font-black tabular-nums",
                      row.isYou || on
                        ? "text-[color:var(--lt-accent)]"
                        : "text-white/35",
                    )}
                  >
                    {row.rank}
                  </span>
                  <span className="truncate font-display text-xs font-bold uppercase tracking-[0.08em]">
                    {row.nickname}
                    {row.isYou ? (
                      <span className="ml-2 text-[9px] text-[color:var(--lt-accent)]">
                        you
                      </span>
                    ) : null}
                  </span>
                  <span className="text-right font-display text-sm font-black">
                    <CounterUp value={row.finalPoints} />
                  </span>
                </button>
                <AnimatePresence initial={false}>
                  {openXi ? (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden border-t border-white/[0.06] bg-black/40"
                    >
                      <TeamSheetPitch
                        manager={s.open}
                        landKey={s.landKey}
                        loadingXi={s.loadingXi}
                        className="max-h-[16rem] pt-1"
                      />
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>

      <ClaimDialog
        open={claimOpen && canClaim}
        title="Claim prize"
        body={
          s.you
            ? `Rank #${s.you.rank} · ${s.you.prizeAmount} ${s.data.prizeSymbol}`
            : ""
        }
        confirmLabel="Confirm"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={() => {
          setClaimOpen(false);
          s.pulseClaim();
        }}
      />
    </div>
  );
}
