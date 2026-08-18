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
  SlidingTabs,
  StatusBadge,
  WalletStrip,
  WarmSlateVoid,
  useObsidianSurfaceStyle,
} from "./vibeKit";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";

type Tab = "board" | "you";

/**
 * A · Glass Desk — Obsidian Glass product surface + TripleD tabs / hover expand / dialog.
 */
export function VibeGlassDesk() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useObsidianSurfaceStyle();
  const [tab, setTab] = useState<Tab>("board");
  const [claimOpen, setClaimOpen] = useState(false);
  const [hovered, setHovered] = useState<string | null>(null);

  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  return (
    <WarmSlateVoid>
      <div style={style}>
        <ResultsPlaceNav />
        <div className="mx-auto flex min-h-[100dvh] max-w-5xl flex-col gap-4 px-4 pb-44 pt-20 sm:px-6 sm:pt-24">
          <header className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="text-[10px] font-bold uppercase tracking-[0.22em] text-white/40">
                Glass desk · GW {s.data.gameweek}
              </p>
              <h1 className="mt-1 font-display text-4xl font-black uppercase tracking-tight">
                Results
              </h1>
            </div>
            <StatusBadge tone={room.source === "live" ? "live" : "warn"}>
              {room.loading ? "Loading" : room.source === "live" ? "Live" : "Preview"}
            </StatusBadge>
          </header>

          <SlidingTabs
            tabs={[
              { id: "board", label: "Board" },
              { id: "you", label: "You" },
            ]}
            value={tab}
            onChange={(id) => {
              setTab(id);
              if (id === "you") s.findMe();
            }}
          />

          <GlassPanel className="min-h-0 flex-1 !rounded-2xl">
            {tab === "board" ? (
              <div className="grid min-h-[28rem] lg:grid-cols-[1.15fr_1fr]">
                <div className="min-h-0 overflow-y-auto border-b border-white/10 lg:border-b-0 lg:border-r">
                  {s.data.rows.map((row) => {
                    const on = s.openOwner === row.owner;
                    const peek = hovered === row.owner;
                    return (
                      <motion.button
                        key={row.owner}
                        type="button"
                        layout
                        onMouseEnter={() => setHovered(row.owner)}
                        onMouseLeave={() => setHovered(null)}
                        onClick={() => s.select(row.owner)}
                        whileTap={{ scale: 0.995 }}
                        className={cn(
                          "grid w-full grid-cols-[2.75rem_1fr_3.5rem] items-center gap-2 border-b border-white/[0.06] px-4 py-3 text-left transition",
                          on && "bg-[color:var(--lt-accent)]/12",
                          !on && peek && "bg-white/[0.05]",
                          !on && row.isYou && "bg-white/[0.03]",
                        )}
                      >
                        <span
                          className={cn(
                            "font-display text-sm font-black tabular-nums",
                            on || row.isYou
                              ? "text-[color:var(--lt-accent)]"
                              : "text-white/40",
                          )}
                        >
                          {row.rank}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate font-display text-xs font-bold uppercase tracking-[0.08em]">
                            {row.nickname}
                          </span>
                          <AnimatePresence>
                            {peek || on ? (
                              <motion.span
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="mt-0.5 block text-[10px] text-white/40"
                              >
                                {row.prizeAmount > 0
                                  ? `Prize ${row.prizeAmount} ${s.data.prizeSymbol}`
                                  : "Tap to open XI"}
                              </motion.span>
                            ) : null}
                          </AnimatePresence>
                        </span>
                        <span className="text-right font-display text-sm font-black">
                          <CounterUp value={on ? row.finalPoints : row.finalPoints} />
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
                <TeamSheetPitch
                  manager={s.open}
                  landKey={s.landKey}
                  loadingXi={s.loadingXi}
                  className="min-h-[16rem] pt-2"
                />
              </div>
            ) : (
              <div className="flex min-h-[28rem] flex-col">
                {s.you ? (
                  <>
                    <div className="border-b border-white/10 px-4 py-4">
                      <p className="text-[9px] font-bold uppercase tracking-[0.16em] text-white/40">
                        Your result
                      </p>
                      <p className="mt-1 font-display text-4xl font-black tabular-nums text-[color:var(--lt-accent)]">
                        #{s.you.rank}{" "}
                        <span className="text-white">
                          <CounterUp value={s.you.finalPoints} />
                        </span>
                      </p>
                    </div>
                    <TeamSheetPitch
                      manager={
                        s.open?.owner === s.you.owner ? s.open : s.you
                      }
                      landKey={s.landKey}
                      loadingXi={s.loadingXi}
                      className="flex-1 pt-2"
                    />
                  </>
                ) : (
                  <div className="flex flex-1 items-center justify-center px-6 text-center text-sm text-white/45">
                    Connect a wallet that entered this GW.
                  </div>
                )}
              </div>
            )}
          </GlassPanel>

          <WalletStrip
            poolLabel={s.data.prizePoolLabel}
            symbol={s.data.prizeSymbol}
            youRank={s.you?.rank}
            youPts={s.you?.finalPoints}
            canClaim={canClaim}
            claimed={s.you?.claimed}
            onFindMe={() => {
              setTab("you");
              s.findMe();
            }}
            onClaim={() => setClaimOpen(true)}
            claiming={room.claiming}
          />
        </div>

        <ClaimDialog
          open={claimOpen && canClaim}
          title="Claim prize"
          body={
            s.you
              ? `Rank #${s.you.rank} · ${s.you.prizeAmount} ${s.data.prizeSymbol}. Sign to claim on-chain.`
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
