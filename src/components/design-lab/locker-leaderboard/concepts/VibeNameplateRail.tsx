"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { TeamSheetPitch, useTeamSheetSelection } from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import { cn } from "@/lib/utils";
import {
  ClaimDialog,
  CounterUp,
  StatusBadge,
  WarmSlateVoid,
  useObsidianSurfaceStyle,
} from "./vibeKit";

/**
 * B · Nameplate Rail — hung plaques (kit sibling). Flip open = Hover Card expand.
 */
export function VibeNameplateRail() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useObsidianSurfaceStyle();
  const [claimOpen, setClaimOpen] = useState(false);
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  return (
    <WarmSlateVoid>
      <div style={style}>
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-[8%] top-[6.6rem] z-[5] h-2 rounded-full bg-[linear-gradient(90deg,#2a2622,#5a534c,#2a2622)] shadow-[0_8px_20px_rgba(0,0,0,0.45)]"
        />
        <ResultsPlaceNav />

        <div className="relative mx-auto max-w-5xl px-4 pb-44 pt-24 sm:px-6 sm:pt-28">
          <div className="mb-8 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                Nameplate rail · GW {s.data.gameweek}
              </p>
              <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight">
                Finishes
              </h1>
              <p className="mt-2 max-w-md text-sm text-white/40">
                Tap a plate to flip it open — XI + claim. Same hung-object
                language as the locker kits.
              </p>
            </div>
            <StatusBadge tone={room.source === "live" ? "live" : "quiet"}>
              {s.data.entries} entries
            </StatusBadge>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 sm:gap-4">
            {s.data.rows.map((row) => {
              const open = s.openOwner === row.owner;
              return (
                <motion.button
                  key={row.owner}
                  type="button"
                  layout
                  onClick={() => s.select(row.owner)}
                  whileHover={{ y: -6 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 380, damping: 28 }}
                  className={cn(
                    "relative flex aspect-[3/4] flex-col overflow-hidden rounded-[2px] border text-left",
                    open
                      ? "border-[color:var(--lt-accent)]/50 shadow-[0_18px_40px_rgba(0,0,0,0.55)]"
                      : row.isYou
                        ? "border-[color:var(--lt-accent)]/30"
                        : "border-white/12",
                  )}
                  style={{
                    background:
                      "linear-gradient(165deg, #2a2622 0%, #1a1714 55%, #12100e 100%)",
                  }}
                >
                  <div className="flex items-start justify-between p-3">
                    <span
                      className={cn(
                        "font-display text-2xl font-black tabular-nums",
                        open || row.isYou
                          ? "text-[color:var(--lt-accent)]"
                          : "text-white/35",
                      )}
                    >
                      {row.rank}
                    </span>
                    {row.isYou ? (
                      <span className="rounded-full border border-[color:var(--lt-accent)]/40 px-1.5 py-0.5 text-[8px] font-bold uppercase tracking-wider text-[color:var(--lt-accent)]">
                        you
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-auto p-3">
                    <p className="font-display text-[11px] font-bold uppercase leading-tight tracking-wide">
                      {row.nickname}
                    </p>
                    <p className="mt-1 font-display text-lg font-black tabular-nums">
                      <CounterUp value={row.finalPoints} />
                    </p>
                  </div>

                  <AnimatePresence>
                    {open ? (
                      <motion.div
                        initial={{ opacity: 0, y: 16 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        className="absolute inset-0 flex flex-col bg-black/85 p-2 backdrop-blur-md"
                      >
                        <TeamSheetPitch
                          manager={s.open}
                          landKey={s.landKey}
                          loadingXi={s.loadingXi}
                          className="min-h-0 flex-1 !pt-1"
                        />
                        {row.isYou && canClaim ? (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setClaimOpen(true);
                            }}
                            className="mt-1 rounded-lg bg-[color:var(--lt-accent)] py-2 text-[10px] font-black uppercase tracking-wide text-black"
                          >
                            Claim {row.prizeAmount}
                          </button>
                        ) : null}
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </motion.button>
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
    </WarmSlateVoid>
  );
}
