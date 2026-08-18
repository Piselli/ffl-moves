"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useResultsRoomData } from "../useResultsRoomData";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import { cn } from "@/lib/utils";
import { ClaimDialog, CounterUp } from "./vibeKit";
import {
  ConceptChrome,
  CursorSpotlight,
  GhostBtn,
  WhiteCta,
  XiStrip,
  useRtSurfaceStyle,
} from "./rtKit";

/**
 * E · Pass Ticket Rail
 * Refero: Athletics media-in-objects + Active Theory void.
 * TripleD: Conference Ticket / Hover Expand / Wall light.
 */
export function ConceptTicketRail() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useRtSurfaceStyle();
  const [openId, setOpenId] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [stampYou, setStampYou] = useState(false);
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  const ordered = useMemo(() => {
    const rows = [...s.data.rows];
    if (!s.you) return rows;
    // Find me: pull you toward center of visible rail
    const idx = rows.findIndex((r) => r.isYou);
    if (idx < 0) return rows;
    return rows;
  }, [s.data.rows, s.you]);

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-black text-white"
      style={style}
    >
      <CursorSpotlight color="rgba(255,255,255,0.12)" size={480} />
      <ResultsPlaceNav />
      <ConceptChrome
        title="E · Pass Ticket Rail"
        hook="Each manager is a frosted ticket. Click opens XI inside the object."
      >
        <div className="pointer-events-auto mt-3 flex flex-wrap gap-2">
          <GhostBtn
            onClick={() => {
              if (!s.you) return;
              s.select(s.you.owner);
              setOpenId(s.you.owner);
              document
                .getElementById(`rt-ticket-${s.you.owner}`)
                ?.scrollIntoView({ behavior: "smooth", block: "center" });
            }}
          >
            Find me
          </GhostBtn>
          {canClaim ? (
            <WhiteCta onClick={() => setClaimOpen(true)}>Claim</WhiteCta>
          ) : null}
        </div>
      </ConceptChrome>

      <div className="relative z-10 mx-auto flex max-w-xl flex-col gap-4 px-4 pb-28 pt-48 sm:px-6">
        {ordered.map((row, i) => {
          const open = openId === row.owner;
          const focused = s.openOwner === row.owner || row.isYou;
          return (
            <motion.button
              key={row.owner}
              id={`rt-ticket-${row.owner}`}
              type="button"
              initial={{ opacity: 0, y: 16 }}
              animate={{
                opacity: 1,
                y: 0,
                scale: open ? 1.02 : 1,
              }}
              transition={{ delay: i * 0.04, type: "spring", stiffness: 320, damping: 28 }}
              whileHover={{ y: -4 }}
              onClick={() => {
                s.select(row.owner);
                setOpenId((v) => (v === row.owner ? null : row.owner));
              }}
              className={cn(
                "relative w-full overflow-hidden rounded-2xl border text-left backdrop-blur-xl transition",
                focused
                  ? "border-white/35 shadow-[0_0_40px_rgba(255,255,255,0.08)]"
                  : "border-white/12",
                "bg-gradient-to-br from-white/[0.09] via-white/[0.03] to-transparent",
              )}
            >
              {/* holographic edge */}
              <div
                aria-hidden
                className="pointer-events-none absolute inset-y-0 left-0 w-1.5 bg-gradient-to-b from-white/50 via-white/10 to-white/40"
              />
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-40"
                style={{
                  background:
                    "linear-gradient(125deg, transparent 40%, rgba(255,255,255,0.12) 50%, transparent 60%)",
                }}
              />

              <div className="relative flex items-stretch gap-0 pl-3">
                {/* stub */}
                <div className="flex w-16 shrink-0 flex-col items-center justify-center border-r border-dashed border-white/20 py-4">
                  <p className="text-[8px] font-bold uppercase tracking-[0.16em] text-white/35">
                    Rank
                  </p>
                  <p className="font-display text-2xl font-black tabular-nums">
                    {row.rank}
                  </p>
                </div>
                <div className="min-w-0 flex-1 px-4 py-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="font-display text-lg font-black uppercase tracking-tight">
                        {row.nickname}
                      </p>
                      <p className="mt-0.5 text-[10px] uppercase tracking-[0.14em] text-white/40">
                        GW {s.data.gameweek} pass
                        {row.isYou ? " · YOU" : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-xl font-black tabular-nums">
                        <CounterUp value={row.finalPoints} />
                      </p>
                      <p className="text-[9px] uppercase tracking-[0.12em] text-white/35">
                        pts
                      </p>
                    </div>
                  </div>

                  {(row.claimed || (stampYou && row.isYou)) && (
                    <p className="mt-2 inline-block rotate-[-6deg] border border-white/40 px-2 py-0.5 text-[9px] font-black uppercase tracking-[0.18em] text-white/70">
                      Claimed · perforated
                    </p>
                  )}

                  <AnimatePresence initial={false}>
                    {open ? (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-3 border-t border-dashed border-white/15 pt-3">
                          <p className="mb-2 text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
                            Inside pass · XI
                          </p>
                          <XiStrip players={row.xi ?? row.squad} />
                          {row.prizeAmount > 0 ? (
                            <p className="mt-3 text-[11px] text-white/50">
                              Stub value{" "}
                              <span className="tabular-nums text-white">
                                {row.prizeAmount}
                              </span>{" "}
                              {s.data.prizeSymbol}
                            </p>
                          ) : null}
                        </div>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      <ClaimDialog
        open={claimOpen}
        title="Stamp your pass"
        body="Claim stamps a perforation mark on your ticket."
        confirmLabel="Claim"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={async () => {
          await room.claimPrize();
          setClaimOpen(false);
          setStampYou(true);
          if (s.you) {
            setOpenId(s.you.owner);
            s.select(s.you.owner);
          }
        }}
      />
    </div>
  );
}
