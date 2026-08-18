"use client";

import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useResultsRoomData } from "../useResultsRoomData";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import { cn } from "@/lib/utils";
import { ClaimDialog } from "./vibeKit";
import {
  ConceptChrome,
  CursorSpotlight,
  GhostBtn,
  RankRowMeta,
  WhiteCta,
  scrollOwnerIntoView,
  useRtSurfaceStyle,
} from "./rtKit";

/**
 * A · Cursor Light Ladder
 * Refero: Active Theory scene shouts + Athletics mono chrome.
 * TripleD: Dynamic Spotlight / Wall light.
 */
export function ConceptCursorLight() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useRtSurfaceStyle();
  const [claimOpen, setClaimOpen] = useState(false);
  const [wallPulse, setWallPulse] = useState(0);
  const selected = useMemo(
    () => s.data.rows.find((r) => r.owner === s.openOwner) ?? null,
    [s.data.rows, s.openOwner],
  );
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);
  const etchNames =
    selected?.xi?.map((p) => p.name) ?? selected?.squad ?? [];

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-black text-white"
      style={style}
    >
      {/* Rank lattice wall */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.18]"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          maskImage:
            "radial-gradient(ellipse 70% 60% at 50% 40%, black 20%, transparent 75%)",
        }}
      />
      <CursorSpotlight
        color={
          selected
            ? "rgba(255,255,255,0.18)"
            : "rgba(255,255,255,0.11)"
        }
        size={selected ? 520 : 380}
      />
      <motion.div
        aria-hidden
        key={wallPulse}
        className="pointer-events-none absolute inset-0 z-[2]"
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.35, 0] }}
        transition={{ duration: 0.9 }}
        style={{
          background:
            "radial-gradient(circle at 50% 55%, rgba(255,255,255,0.25), transparent 50%)",
        }}
      />

      {/* Diegetic etch zone */}
      <div className="pointer-events-none absolute inset-x-0 top-[28%] z-[3] flex justify-center px-6">
        <AnimatePresence mode="wait">
          {selected ? (
            <motion.div
              key={selected.owner}
              initial={{ opacity: 0, y: 12, filter: "blur(8px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -8, filter: "blur(6px)" }}
              transition={{ type: "spring", stiffness: 320, damping: 28 }}
              className="max-w-2xl text-center"
            >
              <p className="font-display text-[11px] font-bold uppercase tracking-[0.28em] text-white/35">
                Wall etch · #{selected.rank}
              </p>
              <p className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-white/90 sm:text-5xl">
                {selected.nickname}
              </p>
              <div className="mx-auto mt-4 flex max-w-xl flex-wrap justify-center gap-2">
                {etchNames.slice(0, 11).map((n, i) => (
                  <motion.span
                    key={n}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 0.7, y: 0 }}
                    transition={{ delay: 0.04 * i }}
                    className="font-display text-[11px] font-bold uppercase tracking-[0.14em] text-white/55"
                  >
                    {n}
                  </motion.span>
                ))}
              </div>
            </motion.div>
          ) : (
            <motion.p
              key="idle"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="font-display text-sm uppercase tracking-[0.2em] text-white/25"
            >
              Move light · pick a manager
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <ResultsPlaceNav />
      <ConceptChrome
        title="A · Cursor Light Ladder"
        hook="Cursor lights the void. Select etches a name + XI on the wall."
      />

      <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-3xl flex-col justify-end px-4 pb-28 pt-40 sm:px-6">
        <div className="mb-3 flex flex-wrap gap-2">
          <GhostBtn
            onClick={() => {
              if (!s.you) return;
              s.select(s.you.owner);
              scrollOwnerIntoView(s.you.owner);
            }}
          >
            Find me
          </GhostBtn>
          {canClaim ? (
            <WhiteCta onClick={() => setClaimOpen(true)}>Claim</WhiteCta>
          ) : null}
        </div>

        <div className="max-h-[42vh] overflow-y-auto rounded-2xl border border-white/10 bg-black/45 p-2 backdrop-blur-xl sm:max-h-[46vh]">
          {s.data.rows.map((row) => {
            const on = row.owner === s.openOwner;
            return (
              <button
                key={row.owner}
                id={`rt-row-${row.owner}`}
                type="button"
                onClick={() => s.select(row.owner)}
                className={cn(
                  "mb-1 w-full rounded-xl px-3 py-3 text-left transition",
                  on
                    ? "bg-white/12 ring-1 ring-white/35"
                    : "hover:bg-white/[0.05]",
                  row.isYou && "ring-1 ring-white/20",
                )}
              >
                <RankRowMeta row={row} pts />
                {row.gwDelta != null && row.gwDelta !== 0 ? (
                  <p className="mt-1 pl-11 text-[10px] text-white/35">
                    {row.gwDelta > 0 ? "+" : ""}
                    {row.gwDelta} ranks this GW
                  </p>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      <ClaimDialog
        open={claimOpen}
        title="Claim prize"
        body="Confirm claim. On success the wall flashes from your rank."
        confirmLabel="Claim"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={async () => {
          await room.claimPrize();
          setClaimOpen(false);
          setWallPulse((n) => n + 1);
        }}
      />
    </div>
  );
}
