"use client";

import {
  useEffect,
  useRef,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { ResultsPlaceNav } from "./ResultsPlaceChrome";
import { useTeamSheetSelection } from "./TeamSheetPieces";
import { useResultsRoomData } from "./useResultsRoomData";
import { NameplateFace } from "@/components/design-lab/locker-hero/NameplateFace";
import {
  LOCKER_PALETTE,
  paletteToCssVars,
} from "@/components/design-lab/locker-hero/lockerPalettes";
import { ACTIVE_NAMEPLATE_GLOW } from "@/components/design-lab/locker-hero/nameplateGlows";
import type { LabSquadPlayer } from "./mockData";
import { cn } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * Formation hang slots — % of the stall stage.
 * Order matches XI: GK → DEF×3 → MID×4 → FWD×3.
 * Manager plate sits above as the stall identity.
 */
const XI_SLOTS: { left: string; top: string; rot: number }[] = [
  { left: "50%", top: "78%", rot: 0.4 }, // GK
  { left: "28%", top: "62%", rot: -2.2 }, // DEF
  { left: "50%", top: "64%", rot: 1.1 },
  { left: "72%", top: "62%", rot: 2.0 },
  { left: "18%", top: "44%", rot: -2.8 }, // MID
  { left: "38%", top: "42%", rot: -0.8 },
  { left: "62%", top: "42%", rot: 1.4 },
  { left: "82%", top: "44%", rot: 2.6 },
  { left: "28%", top: "26%", rot: -1.6 }, // FWD
  { left: "50%", top: "24%", rot: 0.6 },
  { left: "72%", top: "26%", rot: 1.8 },
];

/**
 * Selected Stall — room = current manager.
 * Switch manager → hang set rebuilds. Chrome whispers.
 */
export function SelectedStall() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const reduce = useReducedMotion();
  const scrubRef = useRef<HTMLDivElement>(null);
  const youChipRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const chip = youChipRef.current;
    const rail = scrubRef.current;
    if (!chip || !rail) return;
    const left =
      chip.offsetLeft - rail.clientWidth / 2 + chip.clientWidth / 2;
    rail.scrollTo({ left: Math.max(0, left), behavior: "smooth" });
  }, [s.openOwner, s.landKey]);

  const xi = s.open?.xi ?? [];
  const canClaim =
    Boolean(s.open?.isYou) &&
    Boolean(s.open) &&
    !s.open!.claimed &&
    s.open!.prizeAmount > 0;

  return (
    <div
      className="relative min-h-[100dvh] overflow-hidden bg-[#1a1816] text-white"
      style={paletteToCssVars(LOCKER_PALETTE) as CSSProperties}
    >
      <StallAtmosphere pulse={s.claimPulse} you={Boolean(s.open?.isYou)} />
      <ResultsPlaceNav />

      {/* Stall stage */}
      <div className="absolute inset-0 z-10 flex flex-col pt-20 pb-[9.5rem] sm:pb-[10.5rem]">
        <div className="relative mx-auto h-full w-full max-w-3xl px-3 sm:px-6">
          <AnimatePresence mode="wait">
            {s.open ? (
              <motion.div
                key={s.openOwner}
                className="absolute inset-0"
                initial={reduce ? false : { opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={reduce ? undefined : { opacity: 0, transition: { duration: 0.18 } }}
                transition={{ duration: 0.35, ease: EASE }}
              >
                {/* Manager identity — hero hang */}
                <div className="absolute left-1/2 top-[2%] z-20 -translate-x-1/2">
                  <HungPlate
                    delay={0}
                    rot={-0.6}
                    pulse={s.claimPulse}
                    you={Boolean(s.open.isYou)}
                    cordHeight={28}
                    faceScale={0.92}
                  >
                    <NameplateFace
                      styleId="everton-card"
                      name={s.open.nickname.toUpperCase()}
                      number={String(s.open.rank)}
                      glowId={ACTIVE_NAMEPLATE_GLOW}
                    />
                  </HungPlate>
                  <div className="pointer-events-none mt-3 flex items-baseline justify-center gap-2 whitespace-nowrap">
                    <span className="font-display text-2xl font-black tabular-nums tracking-tight text-white sm:text-3xl">
                      {s.open.finalPoints}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-[0.18em] text-white/35">
                      pts
                    </span>
                    {s.open.prizeAmount > 0 ? (
                      <span
                        className={cn(
                          "ml-1 text-[10px] font-semibold tabular-nums tracking-wide",
                          s.open.isYou ? "text-[#00f948]/90" : "text-white/40",
                        )}
                      >
                        · {s.open.prizeAmount} {s.data.prizeSymbol}
                      </span>
                    ) : null}
                  </div>
                </div>

                {/* XI hang formation */}
                {XI_SLOTS.map((slot, i) => {
                  const player = xi[i];
                  if (!player && !s.loadingXi) {
                    return (
                      <EmptyHook
                        key={`empty-${i}`}
                        left={slot.left}
                        top={slot.top}
                        delay={0.08 + i * 0.03}
                      />
                    );
                  }
                  if (!player) return null;
                  return (
                    <HungPlate
                      key={`${s.openOwner}-${player.name}-${i}`}
                      className="absolute z-10 -translate-x-1/2"
                      style={{ left: slot.left, top: slot.top }}
                      delay={0.06 + i * 0.038}
                      rot={slot.rot}
                      pulse={s.claimPulse}
                      cordHeight={18}
                      faceScale={0.38}
                    >
                      <PlayerPlate player={player} />
                    </HungPlate>
                  );
                })}

                {s.loadingXi && xi.length === 0 ? (
                  <p className="pointer-events-none absolute inset-x-0 top-[48%] text-center text-[10px] font-semibold uppercase tracking-[0.2em] text-white/30">
                    Hanging XI…
                  </p>
                ) : null}
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </div>

      {/* Whisper chrome — scrubber + actions */}
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40">
        <div
          aria-hidden
          className="absolute inset-x-0 bottom-0 h-44 bg-[linear-gradient(0deg,rgba(10,9,8,0.94)_0%,rgba(10,9,8,0.55)_55%,transparent_100%)]"
        />
        <div className="pointer-events-auto relative mx-auto max-w-3xl px-3 pb-5 pt-2 sm:px-6">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-white/35">
                GW {s.data.gameweek}
                {room.loading ? " · …" : ""}
                {room.source === "mock" ? " · preview" : ""}
              </p>
              <p className="mt-0.5 truncate font-[family-name:var(--font-onest),system-ui,sans-serif] text-[12px] text-white/55">
                {s.open
                  ? s.open.isYou
                    ? "Your stall"
                    : `${s.open.nickname} · stall`
                  : "Pick a manager"}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {s.you ? (
                <GhostButton
                  onClick={() => s.findMe()}
                  active={Boolean(s.open?.isYou)}
                >
                  Find me
                </GhostButton>
              ) : null}
              {canClaim ? (
                <GhostButton
                  onClick={() => s.pulseClaim()}
                  accent
                  disabled={room.claiming}
                >
                  {room.claiming ? "Claiming…" : "Claim"}
                </GhostButton>
              ) : null}
            </div>
          </div>

          <div
            ref={scrubRef}
            className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            role="listbox"
            aria-label="Managers"
          >
            {s.data.rows.map((row) => {
              const on = s.openOwner === row.owner;
              return (
                <button
                  key={row.owner}
                  ref={row.isYou ? youChipRef : undefined}
                  type="button"
                  role="option"
                  aria-selected={on}
                  onClick={() => s.select(row.owner)}
                  className={cn(
                    "relative shrink-0 rounded-full border px-3 py-2 transition",
                    on
                      ? "border-white/35 bg-white/[0.1] text-white"
                      : "border-white/[0.08] bg-white/[0.03] text-white/45 hover:border-white/18 hover:text-white/70",
                    row.isYou && !on && "border-[#00f948]/25",
                  )}
                >
                  <span className="flex items-center gap-2">
                    <span
                      className={cn(
                        "font-display text-[11px] font-black tabular-nums",
                        on || row.isYou ? "text-[#00f948]" : "text-white/40",
                      )}
                    >
                      {row.rank}
                    </span>
                    <span className="font-display text-[10px] font-bold uppercase tracking-wide">
                      {row.nickname}
                    </span>
                    <span className="font-display text-[10px] font-black tabular-nums text-white/35">
                      {row.finalPoints}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>

          {room.claimError ? (
            <p className="mt-2 text-[11px] text-red-400/90">{room.claimError}</p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function StallAtmosphere({
  pulse,
  you,
}: {
  pulse: boolean;
  you: boolean;
}) {
  return (
    <div className="pointer-events-none absolute inset-0" aria-hidden>
      <div className="absolute inset-0 bg-[#0c0b0a]" />
      <div
        className={cn(
          "absolute left-1/2 top-[18%] h-[55%] w-[70%] -translate-x-1/2 rounded-[100%] blur-[80px] transition-colors duration-700",
          pulse
            ? "bg-[#00f948]/18"
            : you
              ? "bg-[rgba(255,252,248,0.07)]"
              : "bg-[rgba(255,252,248,0.045)]",
        )}
      />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_70%_at_50%_35%,transparent_0%,rgba(8,7,6,0.55)_70%,rgba(8,7,6,0.95)_100%)]" />
      {/* Soft floor shadow under hang */}
      <div className="absolute bottom-[22%] left-1/2 h-16 w-[55%] -translate-x-1/2 rounded-[100%] bg-black/50 blur-2xl" />
    </div>
  );
}

function HungPlate({
  children,
  className,
  style,
  delay,
  rot,
  pulse,
  you,
  cordHeight,
  faceScale = 1,
}: {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  delay: number;
  rot: number;
  pulse?: boolean;
  you?: boolean;
  cordHeight: number;
  /** Scales the locked 280×90 nameplate face into the hang slot. */
  faceScale?: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className={cn("origin-top", className)}
      style={style}
      initial={reduce ? false : { opacity: 0, y: -28, rotate: rot - 4 }}
      animate={{
        opacity: 1,
        y: 0,
        rotate: pulse ? [rot, rot + 1.2, rot - 0.8, rot] : rot,
        filter: pulse
          ? ["brightness(1)", "brightness(1.35)", "brightness(1)"]
          : "brightness(1)",
      }}
      transition={
        pulse
          ? { duration: 0.75, ease: "easeOut" }
          : reduce
            ? { duration: 0 }
            : {
                delay,
                type: "spring",
                stiffness: 260,
                damping: 22,
              }
      }
    >
      <div
        className="absolute left-1/2 w-px -translate-x-1/2 bg-gradient-to-b from-white/25 to-white/5"
        style={{ top: -cordHeight, height: cordHeight }}
        aria-hidden
      />
      <div
        className={cn(
          "absolute left-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-white/40",
          you && "bg-[#00f948]/80 shadow-[0_0_10px_rgba(0,249,72,0.45)]",
        )}
        style={{ top: -cordHeight }}
        aria-hidden
      />
      <div
        className={cn(
          "overflow-hidden rounded-[2px] shadow-[0_14px_32px_rgba(0,0,0,0.55)]",
          you && "ring-1 ring-[#00f948]/50",
        )}
        style={{
          width: 280 * faceScale,
          height: 90 * faceScale,
        }}
      >
        <div
          className="origin-top-left"
          style={{
            width: 280,
            height: 90,
            transform: `scale(${faceScale})`,
          }}
        >
          {children}
        </div>
      </div>
    </motion.div>
  );
}

function EmptyHook({
  left,
  top,
  delay,
}: {
  left: string;
  top: string;
  delay: number;
}) {
  const reduce = useReducedMotion();
  return (
    <motion.div
      className="absolute -translate-x-1/2"
      style={{ left, top }}
      initial={reduce ? false : { opacity: 0 }}
      animate={{ opacity: 0.35 }}
      transition={{ delay, duration: 0.4, ease: EASE }}
      aria-hidden
    >
      <div className="mx-auto h-4 w-px bg-white/15" />
      <div className="mx-auto size-1 rounded-full bg-white/25" />
    </motion.div>
  );
}

function PlayerPlate({ player }: { player: LabSquadPlayer }) {
  const surname = player.name.trim().toUpperCase();
  return (
    <NameplateFace
      styleId="everton-card"
      name={surname}
      number={String(player.pts)}
      glowId={ACTIVE_NAMEPLATE_GLOW}
    />
  );
}

function GhostButton({
  children,
  onClick,
  active,
  accent,
  disabled,
}: {
  children: ReactNode;
  onClick: () => void;
  active?: boolean;
  accent?: boolean;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={cn(
        "rounded-full border px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] transition disabled:opacity-40",
        accent
          ? "border-[#00f948]/45 bg-[#00f948]/15 text-[#00f948] hover:bg-[#00f948]/25"
          : active
            ? "border-white/30 bg-white/10 text-white"
            : "border-white/15 bg-white/[0.04] text-white/60 hover:border-white/25 hover:text-white/85",
      )}
    >
      {children}
    </button>
  );
}
