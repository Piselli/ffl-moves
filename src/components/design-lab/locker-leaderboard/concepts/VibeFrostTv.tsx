"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { TeamSheetPitch, useTeamSheetSelection } from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import { cn } from "@/lib/utils";
import {
  ClaimDialog,
  CounterUp,
  SlidingTabs,
  StatusBadge,
  WalletStrip,
  useObsidianSurfaceStyle,
} from "./vibeKit";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";

type Tab = "board" | "xi";

const HEADLINES = [
  "Top movers this gameweek",
  "Prize pool still live",
  "Claim when resolved",
  "Find your rank · notch energy",
];

/**
 * E · Frost TV — lounge atmosphere + frosted glass screen (not floating iPad).
 * FlipText headlines + docked remote with Tabs / Wallet / Dialog.
 */
export function VibeFrostTv() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useObsidianSurfaceStyle();
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<Tab>("board");
  const [claimOpen, setClaimOpen] = useState(false);
  const [headline, setHeadline] = useState(0);
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  useEffect(() => {
    if (reduce) return;
    const id = window.setInterval(
      () => setHeadline((h) => (h + 1) % HEADLINES.length),
      3200,
    );
    return () => window.clearInterval(id);
  }, [reduce]);

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#0a0908] text-white" style={style}>
      <div className="absolute inset-0" aria-hidden>
        <Image
          src="/design-lab/locker-leaderboard/concepts/lb-room-lounge.png"
          alt=""
          fill
          priority
          className="object-cover object-center opacity-70"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_65%_55%_at_50%_35%,transparent_0%,rgba(8,7,6,0.55)_75%,rgba(5,4,4,0.85)_100%)]" />
      </div>

      <ResultsPlaceNav />

      {/* Frosted glass TV — docked UI, not mid-air device */}
      <div className="absolute left-[10%] top-[11%] z-20 w-[80%] max-w-4xl sm:left-[16%] sm:w-[68%]">
        <GlassPanel className="overflow-hidden !rounded-xl shadow-[0_30px_90px_rgba(0,0,0,0.7)]">
          <div className="flex items-center justify-between border-b border-white/10 px-3 py-2">
            <StatusBadge tone="live">Lounge glass</StatusBadge>
            <div className="relative h-5 min-w-[12rem] overflow-hidden text-right">
              <AnimatePresence mode="wait">
                <motion.p
                  key={headline}
                  initial={{ y: 12, opacity: 0, filter: "blur(6px)" }}
                  animate={{ y: 0, opacity: 1, filter: "blur(0px)" }}
                  exit={{ y: -12, opacity: 0, filter: "blur(6px)" }}
                  transition={{ duration: 0.35 }}
                  className="absolute inset-x-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/55"
                >
                  {HEADLINES[headline]}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          <div className="grid max-h-[min(48vh,26rem)] sm:grid-cols-[1.1fr_1fr]">
            <div className="min-h-0 overflow-y-auto border-b border-white/10 sm:border-b-0 sm:border-r">
              {s.data.rows.map((row) => {
                const on = s.openOwner === row.owner;
                return (
                  <motion.button
                    key={row.owner}
                    type="button"
                    whileTap={{ scale: 0.995 }}
                    onClick={() => {
                      s.select(row.owner);
                      setTab("xi");
                    }}
                    className={cn(
                      "grid w-full grid-cols-[2.5rem_1fr_3rem] items-center gap-2 border-b border-white/[0.06] px-3 py-2 text-left",
                      on && "bg-[color:var(--lt-accent)]/15",
                      !on && "hover:bg-white/[0.04]",
                    )}
                  >
                    <span
                      className={cn(
                        "font-display text-xs font-black tabular-nums",
                        on || row.isYou
                          ? "text-[color:var(--lt-accent)]"
                          : "text-white/40",
                      )}
                    >
                      {row.rank}
                    </span>
                    <span className="truncate font-display text-[11px] font-bold uppercase">
                      {row.nickname}
                    </span>
                    <span className="text-right font-display text-xs font-black">
                      <CounterUp value={row.finalPoints} />
                    </span>
                  </motion.button>
                );
              })}
            </div>
            <TeamSheetPitch
              manager={s.open}
              landKey={s.landKey}
              loadingXi={s.loadingXi}
              className="min-h-[12rem] bg-black/30 pt-1"
            />
          </div>
        </GlassPanel>
      </div>

      {/* Remote docked to bottom of screen — connected, not floating orphan */}
      <div className="fixed inset-x-0 bottom-36 z-30 px-3 sm:bottom-40 sm:px-6">
        <div className="mx-auto max-w-3xl">
          <GlassPanel className="!rounded-2xl">
            <div className="space-y-3 p-3 sm:p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
                  Remote · GW {s.data.gameweek}
                </p>
                <SlidingTabs
                  tabs={[
                    { id: "board", label: "Board" },
                    { id: "xi", label: "XI" },
                  ]}
                  value={tab}
                  onChange={(id) => {
                    setTab(id);
                    if (id === "xi") {
                      /* already selected */
                    }
                  }}
                />
              </div>
              <WalletStrip
                poolLabel={s.data.prizePoolLabel}
                symbol={s.data.prizeSymbol}
                youRank={s.you?.rank}
                youPts={s.you?.finalPoints}
                canClaim={canClaim}
                claimed={s.you?.claimed}
                onFindMe={s.findMe}
                onClaim={() => setClaimOpen(true)}
                claiming={room.claiming}
              />
            </div>
          </GlassPanel>
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
