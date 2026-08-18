"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
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
  scrollOwnerIntoView,
  useRtSurfaceStyle,
} from "./rtKit";

const FLIPS = ["GW live", "Top scorer", "Prize open", "Claim window"];

/**
 * D · Glass Prize Stage
 * Refero: Authkit/Dimension frost hero + Athletics warmth-in-object.
 * TripleD: Glass Wallet morph + Dialog + Animated List.
 */
export function ConceptPrizeStage() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useRtSurfaceStyle();
  const [claimOpen, setClaimOpen] = useState(false);
  const [sheen, setSheen] = useState(0);
  const [flipIdx, setFlipIdx] = useState(0);
  const selected = useMemo(
    () => s.data.rows.find((r) => r.owner === s.openOwner) ?? null,
    [s.data.rows, s.openOwner],
  );
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  useEffect(() => {
    const t = setInterval(() => setFlipIdx((i) => (i + 1) % FLIPS.length), 2800);
    return () => clearInterval(t);
  }, []);

  const walletTitle = selected
    ? selected.isYou
      ? "Your share"
      : `${selected.nickname} share`
    : "Prize pool";
  const walletValue = selected
    ? selected.prizeAmount
    : Number(String(s.data.prizePoolLabel).replace(/,/g, "")) || 0;
  const trend =
    selected?.gwDelta != null && selected.gwDelta !== 0
      ? `${selected.gwDelta > 0 ? "+" : ""}${selected.gwDelta} ranks`
      : selected
        ? `${selected.finalPoints} pts`
        : "GW pool";

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-[#0a0a0a] text-white"
      style={style}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[55%] bg-[radial-gradient(ellipse_60%_70%_at_50%_20%,rgba(255,255,255,0.08),transparent_65%)]"
      />
      <ResultsPlaceNav />
      <ConceptChrome
        title="D · Glass Prize Stage"
        hook="Wallet plate is the stage. Select a manager → the plate morphs."
      />

      <div className="relative z-10 mx-auto max-w-2xl px-4 pb-28 pt-40 sm:px-6">
        <GlassPanel className="!rounded-3xl overflow-hidden">
          <div className="relative p-5 sm:p-6">
            <motion.div
              key={sheen}
              aria-hidden
              className="pointer-events-none absolute inset-0"
              initial={{ x: "-120%", opacity: 0 }}
              animate={{ x: "120%", opacity: [0, 0.5, 0] }}
              transition={{ duration: 0.85 }}
              style={{
                background:
                  "linear-gradient(105deg, transparent 30%, rgba(255,255,255,0.25) 50%, transparent 70%)",
              }}
            />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
                  {walletTitle}
                </p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={`${walletTitle}-${walletValue}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    className="mt-1 font-display text-3xl font-black tabular-nums sm:text-4xl"
                  >
                    <CounterUp value={walletValue} />
                    <span className="ml-2 text-sm text-white/35">
                      {s.data.prizeSymbol}
                    </span>
                  </motion.p>
                </AnimatePresence>
              </div>
              <span className="rounded-full border border-white/20 bg-white/[0.06] px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/70">
                {trend}
              </span>
            </div>
            <div className="mt-4 flex items-end justify-between gap-3">
              <div>
                <p className="text-[10px] text-white/35">
                  {selected
                    ? `Rank #${selected.rank} · ${selected.nickname}`
                    : `GW ${s.data.gameweek} · ${s.data.entries} entries`}
                </p>
                <AnimatePresence mode="wait">
                  <motion.p
                    key={flipIdx}
                    initial={{ opacity: 0, filter: "blur(4px)" }}
                    animate={{ opacity: 1, filter: "blur(0px)" }}
                    exit={{ opacity: 0 }}
                    className="mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/55"
                  >
                    {FLIPS[flipIdx]}
                  </motion.p>
                </AnimatePresence>
              </div>
              <div className="flex gap-2">
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
            </div>
            {selected ? (
              <div className="mt-4 border-t border-white/10 pt-4">
                <XiStrip players={selected.xi ?? selected.squad} />
              </div>
            ) : null}
          </div>
        </GlassPanel>

        <div className="mt-6 space-y-1.5">
          {s.data.rows.map((row, i) => {
            const on = row.owner === s.openOwner;
            return (
              <motion.button
                key={row.owner}
                id={`rt-row-${row.owner}`}
                type="button"
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                onClick={() => s.select(row.owner)}
                className={cn(
                  "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                  on
                    ? "border-white/30 bg-white/[0.08]"
                    : "border-white/[0.06] bg-white/[0.02] hover:border-white/15",
                  row.claimed && "opacity-70",
                )}
              >
                <span className="w-8 font-display text-sm font-black tabular-nums text-white/40">
                  {row.rank}
                </span>
                <span className="min-w-0 flex-1 truncate font-display text-sm font-black uppercase">
                  {row.nickname}
                  {row.claimed ? (
                    <span className="ml-2 text-[9px] tracking-[0.12em] text-white/35">
                      STAMPED
                    </span>
                  ) : null}
                </span>
                <span className="font-display text-base font-black tabular-nums">
                  {row.finalPoints}
                </span>
              </motion.button>
            );
          })}
        </div>
      </div>

      <ClaimDialog
        open={claimOpen}
        title="Claim prize"
        body="Confirm claim — wallet sheen marks success."
        confirmLabel="Claim"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={async () => {
          await room.claimPrize();
          setClaimOpen(false);
          setSheen((n) => n + 1);
        }}
      />
    </div>
  );
}
