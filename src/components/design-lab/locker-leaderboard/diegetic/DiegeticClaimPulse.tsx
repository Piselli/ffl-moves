"use client";

import { useState } from "react";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import { useResultsRoomData } from "../useResultsRoomData";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import {
  ClaimPrizeOrb,
  DiegeticRoomWash,
  PLAQUE_SLOTS,
  RankPlaque,
} from "./DiegeticBits";
import {
  ClaimDialog,
} from "../concepts/vibeKit";
import { cn } from "@/lib/utils";

/**
 * 3 · Claim → physical pulse
 * Claim is not only a modal — the winning plaque + prize orb react in the room.
 */
export function DiegeticClaimPulse() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const [claimOpen, setClaimOpen] = useState(false);
  const [pulseOwner, setPulseOwner] = useState<string | null>(null);
  const [orb, setOrb] = useState(false);

  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);
  const plaques = s.data.rows.slice(0, PLAQUE_SLOTS.length);

  const fireClaim = () => {
    setClaimOpen(false);
    if (s.you) {
      setPulseOwner(s.you.owner);
      setOrb(true);
      window.setTimeout(() => setPulseOwner(null), 900);
      window.setTimeout(() => setOrb(false), 2200);
    }
    s.pulseClaim();
  };

  return (
    <div className="relative min-h-[100dvh] overflow-hidden bg-[#1a1816] text-white">
      <DiegeticRoomWash />
      <ResultsPlaceNav />

      <div className="absolute inset-0 z-[20]">
        {plaques.map((row, i) => (
          <RankPlaque
            key={row.owner}
            row={row}
            slot={PLAQUE_SLOTS[i]}
            lit
            selected={s.openOwner === row.owner}
            pulsing={pulseOwner === row.owner}
            onSelect={() => s.select(row.owner)}
          />
        ))}
      </div>

      <ClaimPrizeOrb
        active={orb}
        amount={s.you?.prizeAmount}
        symbol={s.data.prizeSymbol}
      />

      <div className="fixed inset-x-0 bottom-28 z-40 px-3 sm:px-6">
        <div className="mx-auto max-w-xl">
          <GlassPanel className="!rounded-2xl border border-white/15 bg-black/80 p-4 backdrop-blur-xl">
            <p className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-white/45">
              Claim pulse · GW {s.data.gameweek}
            </p>
            <p className="mt-1 text-sm text-white/45">
              Confirm claim — your plaque flashes and a prize orb blooms in the
              room.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-3">
              {s.you ? (
                <p className="font-display text-xl font-black tabular-nums text-[#00f948]">
                  #{s.you.rank} · {s.you.prizeAmount} {s.data.prizeSymbol}
                </p>
              ) : (
                <p className="text-sm text-white/40">
                  Connect a wallet in prizes to demo claim pulse.
                </p>
              )}
              <button
                type="button"
                disabled={!canClaim && !s.you}
                onClick={() => {
                  if (canClaim) setClaimOpen(true);
                  else if (s.you) {
                    // Demo pulse even if already claimed / no prize
                    setPulseOwner(s.you.owner);
                    setOrb(true);
                    window.setTimeout(() => setPulseOwner(null), 900);
                    window.setTimeout(() => setOrb(false), 2200);
                  }
                }}
                className={cn(
                  "ml-auto rounded-xl px-4 py-3 text-[11px] font-black uppercase tracking-[0.1em] transition active:scale-[0.98]",
                  canClaim || s.you
                    ? "bg-[#00f948] text-black shadow-[0_0_28px_rgba(0,249,72,0.35)]"
                    : "border border-white/15 text-white/30",
                )}
              >
                {canClaim ? "Claim · pulse room" : s.you ? "Demo pulse" : "No claim"}
              </button>
            </div>
          </GlassPanel>
        </div>
      </div>

      <ClaimDialog
        open={claimOpen && canClaim}
        title="Claim prize"
        body={
          s.you
            ? `Rank #${s.you.rank} · ${s.you.prizeAmount} ${s.data.prizeSymbol}. The room will react.`
            : ""
        }
        confirmLabel="Confirm"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={fireClaim}
      />
    </div>
  );
}
