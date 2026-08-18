"use client";

import { useEffect, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import {
  TeamSheetPitch,
  TeamSheetTable,
  useTeamSheetSelection,
} from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import {
  ClaimDialog,
  SlidingTabs,
  StatusBadge,
  WalletStrip,
  WarmSlateVoid,
  useObsidianSurfaceStyle,
} from "./vibeKit";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";

const SHEET_MS = 520;
const EASE = [0.22, 1, 0.36, 1] as const;

type Tab = "board" | "xi";

/**
 * C · Raise Sheet — homepage raise/lower DNA on a TripleD bottom glass sheet.
 */
export function VibeRaiseSheet() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useObsidianSurfaceStyle();
  const reduce = useReducedMotion();
  const [raised, setRaised] = useState(true);
  const [tab, setTab] = useState<Tab>("board");
  const [claimOpen, setClaimOpen] = useState(false);
  const [pointerIn, setPointerIn] = useState(false);
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);

  useEffect(() => {
    const onWheel = (e: WheelEvent) => {
      if (pointerIn) return;
      if (Math.abs(e.deltaY) < 6) return;
      if (e.deltaY > 0) setRaised(false);
      else setRaised(true);
    };
    window.addEventListener("wheel", onWheel, { passive: true });
    return () => window.removeEventListener("wheel", onWheel);
  }, [pointerIn]);

  return (
    <WarmSlateVoid>
      <div style={style}>
        <ResultsPlaceNav />

        {/* Atmosphere when sheet is down */}
        <div className="pointer-events-none absolute inset-x-0 top-[28%] z-[5] px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-white/35">
            Results hall
          </p>
          <h1 className="mt-2 font-display text-4xl font-black uppercase tracking-tight text-white/80 sm:text-5xl">
            Scroll up · raise sheet
          </h1>
        </div>

        {!raised ? (
          <button
            type="button"
            onClick={() => setRaised(true)}
            className="fixed bottom-40 left-1/2 z-40 -translate-x-1/2 rounded-full border border-white/20 bg-black/70 px-4 py-2 text-[10px] font-bold uppercase tracking-[0.16em] text-white/70 backdrop-blur-md hover:border-white/40 hover:text-white"
          >
            ↑ Show results
          </button>
        ) : (
          <p className="pointer-events-none fixed bottom-40 left-1/2 z-30 hidden -translate-x-1/2 text-[10px] text-white/25 sm:block">
            Scroll outside sheet to lower
          </p>
        )}

        <motion.div
          className="fixed inset-x-0 bottom-28 z-30 px-3 sm:px-6"
          animate={{
            y: raised ? 0 : "78%",
          }}
          transition={
            reduce
              ? { duration: 0 }
              : { duration: SHEET_MS / 1000, ease: EASE }
          }
          onPointerEnter={() => setPointerIn(true)}
          onPointerLeave={() => setPointerIn(false)}
        >
          <div className="mx-auto max-w-3xl">
            <GlassPanel className="max-h-[min(70vh,40rem)] !rounded-[1.25rem]">
              <div className="flex justify-center py-2">
                <button
                  type="button"
                  aria-label="Drag sheet"
                  onClick={() => setRaised((v) => !v)}
                  className="h-1.5 w-12 rounded-full bg-white/25"
                />
              </div>
              <div className="flex items-center justify-between gap-3 px-4 pb-2">
                <div className="flex items-center gap-2">
                  <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
                    Results sheet · GW {s.data.gameweek}
                  </p>
                  <StatusBadge tone={room.source === "live" ? "live" : "warn"}>
                    {room.source === "live" ? "Live" : "Preview"}
                  </StatusBadge>
                </div>
                {room.pickerMaxGw > 0 ? (
                  <select
                    value={s.data.gameweek}
                    onChange={(e) => room.setGameweek(Number(e.target.value))}
                    className="rounded border border-white/20 bg-black/50 px-2 py-1 text-[10px] font-bold tabular-nums focus:outline-none"
                  >
                    {Array.from(
                      {
                        length: Math.max(
                          1,
                          room.pickerMaxGw - room.pickerMinGw + 1,
                        ),
                      },
                      (_, i) => room.pickerMinGw + i,
                    ).map((gw) => (
                      <option key={gw} value={gw} className="bg-black">
                        {gw}
                      </option>
                    ))}
                  </select>
                ) : null}
              </div>
              <div className="px-4 pb-2">
                <SlidingTabs
                  tabs={[
                    { id: "board", label: "Board" },
                    { id: "xi", label: "XI" },
                  ]}
                  value={tab}
                  onChange={setTab}
                />
              </div>
              <div className="min-h-0 flex-1 overflow-hidden px-2 pb-2">
                {tab === "board" ? (
                  <TeamSheetTable
                    rows={s.data.rows}
                    openOwner={s.openOwner}
                    onSelect={(owner) => {
                      s.select(owner);
                      setTab("xi");
                    }}
                    className="max-h-[min(36vh,18rem)]"
                  />
                ) : (
                  <TeamSheetPitch
                    manager={s.open}
                    landKey={s.landKey}
                    loadingXi={s.loadingXi}
                    className="max-h-[min(36vh,18rem)] pt-1"
                  />
                )}
              </div>
              <div className="px-3 pb-3">
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
        </motion.div>

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
