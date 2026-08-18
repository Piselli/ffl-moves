"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useResultsRoomData } from "../useResultsRoomData";
import { TeamSheetPitch, useTeamSheetSelection } from "../TeamSheetPieces";
import { cn } from "@/lib/utils";
import { ClaimDialog, CounterUp } from "./vibeKit";
import {
  ConceptChrome,
  GhostBtn,
  WhiteCta,
  XiStrip,
  scrollOwnerIntoView,
  useRtSurfaceStyle,
} from "./rtKit";

/**
 * C · Island Dock Board
 * Refero: Active Theory ghost chrome + Authkit blur sheet.
 * TripleD: Profile Notch / Bottom Modal raise-lower DNA (no twin iPad).
 */
export function ConceptIslandDock() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useRtSurfaceStyle();
  const [notchOpen, setNotchOpen] = useState(false);
  const [docked, setDocked] = useState(false);
  const [claimOpen, setClaimOpen] = useState(false);
  const [hoverOwner, setHoverOwner] = useState<string | null>(null);
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);
  const sheetOpen = notchOpen || docked;
  const hoverRow = s.data.rows.find((r) => r.owner === hoverOwner);

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-black text-white"
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_55%_40%_at_50%_0%,rgba(255,255,255,0.06),transparent_55%)]"
      />
      <ResultsPlaceNav />
      <ConceptChrome
        title="C · Island Dock Board"
        hook="Top notch = you. Tap expands your sheet; board soft-blurs."
      />

      {/* Profile Notch */}
      <div className="fixed inset-x-0 top-[4.6rem] z-[70] flex justify-center px-4">
        <motion.div
          layout
          drag="y"
          dragConstraints={{ top: 0, bottom: 120 }}
          dragElastic={0.12}
          onDragEnd={(_, info) => {
            if (info.offset.y > 64) {
              setDocked(true);
              setNotchOpen(false);
            } else if (info.offset.y < -20) {
              setDocked(false);
            }
          }}
          className={cn(
            "overflow-hidden border border-white/15 bg-black/80 shadow-[0_16px_48px_rgba(0,0,0,0.55)] backdrop-blur-xl",
            notchOpen ? "rounded-2xl" : "rounded-full",
          )}
          style={{ width: notchOpen ? "min(22rem, 92vw)" : "auto" }}
          transition={{ type: "spring", stiffness: 380, damping: 32 }}
        >
          <button
            type="button"
            onClick={() => {
              setDocked(false);
              setNotchOpen((v) => !v);
            }}
            className="flex w-full items-center gap-3 px-4 py-2.5 text-left"
          >
            <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_12px_rgba(255,255,255,0.45)]" />
            <span className="font-display text-[11px] font-bold uppercase tracking-[0.14em]">
              {s.you ? `You · #${s.you.rank}` : "Not connected"}
            </span>
            {s.you ? (
              <span className="ml-auto font-display text-sm font-black tabular-nums">
                <CounterUp value={s.you.finalPoints} />
              </span>
            ) : null}
          </button>
          <AnimatePresence>
            {notchOpen && s.you ? (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="border-t border-white/10 px-4 py-3"
              >
                <div className="flex flex-wrap gap-2">
                  <GhostBtn
                    onClick={() => {
                      s.select(s.you!.owner);
                      scrollOwnerIntoView(s.you!.owner);
                      setNotchOpen(false);
                    }}
                  >
                    Find me
                  </GhostBtn>
                  {canClaim ? (
                    <WhiteCta onClick={() => setClaimOpen(true)}>Claim</WhiteCta>
                  ) : (
                    <span className="rounded-xl border border-white/10 px-3 py-2.5 text-[10px] uppercase tracking-[0.12em] text-white/30">
                      {s.you.claimed ? "Claimed" : "No claim"}
                    </span>
                  )}
                  <GhostBtn onClick={() => { setDocked(true); setNotchOpen(false); }}>
                    Dock sheet
                  </GhostBtn>
                </div>
                <div className="mt-3">
                  <XiStrip players={s.you.xi ?? s.you.squad} />
                </div>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </motion.div>
      </div>

      <div
        className={cn(
          "relative z-10 mx-auto max-w-3xl px-4 pb-36 pt-52 transition duration-300 sm:px-6",
          sheetOpen && "blur-[2px] brightness-75",
        )}
      >
        <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/50 backdrop-blur-xl">
          {s.data.rows.map((row) => {
            const on = row.owner === s.openOwner;
            const peek = hoverOwner === row.owner;
            return (
              <div
                key={row.owner}
                id={`rt-row-${row.owner}`}
                className="relative border-b border-white/[0.05]"
                onMouseEnter={() => setHoverOwner(row.owner)}
                onMouseLeave={() => setHoverOwner(null)}
              >
                <button
                  type="button"
                  onClick={() => s.select(row.owner)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-3.5 text-left transition",
                    on ? "bg-white/[0.08]" : "hover:bg-white/[0.03]",
                  )}
                >
                  <span className="w-8 font-display text-sm font-black tabular-nums text-white/40">
                    {row.rank}
                  </span>
                  <span className="min-w-0 flex-1 truncate font-display text-sm font-black uppercase">
                    {row.nickname}
                    {row.isYou ? (
                      <span className="ml-2 text-[9px] tracking-[0.14em] text-white/45">
                        YOU
                      </span>
                    ) : null}
                  </span>
                  <span className="font-display text-base font-black tabular-nums">
                    {row.finalPoints}
                  </span>
                </button>
                <AnimatePresence>
                  {peek && !row.isYou ? (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="pointer-events-none absolute right-3 top-1/2 z-20 hidden -translate-y-1/2 rounded-xl border border-white/15 bg-black/90 px-3 py-2 shadow-2xl backdrop-blur-xl sm:block"
                    >
                      <p className="text-[9px] uppercase tracking-[0.14em] text-white/40">
                        Peek XI
                      </p>
                      <p className="mt-1 max-w-[14rem] text-[10px] leading-relaxed text-white/70">
                        {(hoverRow?.squad ?? []).slice(0, 6).join(" · ")}
                        …
                      </p>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

        {s.open ? (
          <div className="mt-4 rounded-2xl border border-white/10 bg-black/40 p-2 backdrop-blur-xl">
            <TeamSheetPitch
              manager={s.open}
              landKey={s.landKey}
              loadingXi={s.loadingXi}
            />
          </div>
        ) : null}
      </div>

      {/* Bottom dock sheet */}
      <AnimatePresence>
        {docked && s.you ? (
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
            className="fixed inset-x-0 bottom-0 z-[80] rounded-t-3xl border border-white/15 bg-black/90 p-5 pb-28 backdrop-blur-2xl"
          >
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-white/25" />
            <p className="font-display text-lg font-black uppercase">
              You · #{s.you.rank}
            </p>
            <p className="mt-1 text-sm text-white/45">
              <CounterUp value={s.you.finalPoints} /> pts · drag notch down to
              dock
            </p>
            <div className="mt-4 flex flex-wrap gap-2">
              <GhostBtn
                onClick={() => {
                  scrollOwnerIntoView(s.you!.owner);
                  setDocked(false);
                }}
              >
                Find me
              </GhostBtn>
              {canClaim ? (
                <WhiteCta onClick={() => setClaimOpen(true)}>Claim</WhiteCta>
              ) : null}
              <GhostBtn onClick={() => setDocked(false)}>Close</GhostBtn>
            </div>
            <div className="mt-4">
              <XiStrip players={s.you.xi ?? s.you.squad} />
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ClaimDialog
        open={claimOpen}
        title="Claim prize"
        body="Confirm claim from your island."
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
