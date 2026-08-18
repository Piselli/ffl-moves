"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
} from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
} from "framer-motion";
import { ResultsPlaceNav } from "../ResultsPlaceChrome";
import { useResultsRoomData } from "../useResultsRoomData";
import { useTeamSheetSelection } from "../TeamSheetPieces";
import type { LabLeaderboardRow } from "../mockData";
import { cn } from "@/lib/utils";
import { ClaimDialog, CounterUp } from "./vibeKit";
import { GhostBtn, WhiteCta, XiStrip, useRtSurfaceStyle } from "./rtKit";

type Glyph = {
  row: LabLeaderboardRow;
  x: number;
  y: number;
};

/**
 * Port of TripleD `HolographicWall` + `DynamicSpotlightCTA` mechanics.
 * Glyphs = managers. Cursor proximity lights ranks (spring). Click locks + opens XI.
 * Refero Active Theory: chrome whispers; the lit wall is the scene.
 */
export function IxTripleDWall() {
  const room = useResultsRoomData();
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const style = useRtSurfaceStyle();
  const reduce = useReducedMotion();
  const stageRef = useRef<HTMLDivElement>(null);

  const [mouse, setMouse] = useState<{ x: number; y: number } | null>(null);
  const [glyphs, setGlyphs] = useState<Glyph[]>([]);
  const [locked, setLocked] = useState<Set<string>>(() => new Set());
  const [focus, setFocus] = useState<string | null>(null);
  const [claimOpen, setClaimOpen] = useState(false);
  const [hunting, setHunting] = useState(false);

  const radius = 210;
  const intensity = 0.9;
  const canClaim = !!(s.you && s.you.prizeAmount > 0 && !s.you.claimed);
  const focused = s.data.rows.find((r) => r.owner === focus) ?? null;

  // Lay managers across the wall (TripleD letter grid → rank glyphs)
  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const layout = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      const rows = s.data.rows;
      const cols = Math.min(4, Math.max(2, Math.floor(w / 180)));
      const cellW = w / cols;
      const cellH = Math.max(88, h / Math.ceil(rows.length / cols));
      setGlyphs(
        rows.map((row, i) => {
          const col = i % cols;
          const r = Math.floor(i / cols);
          const jitterX = ((i * 17) % 13) - 6;
          const jitterY = ((i * 29) % 11) - 5;
          return {
            row,
            x: col * cellW + cellW * 0.5 + jitterX,
            y: 56 + r * cellH + jitterY,
          };
        }),
      );
    };
    layout();
    const ro = new ResizeObserver(layout);
    ro.observe(el);
    return () => ro.disconnect();
  }, [s.data.rows]);

  const onMove = (e: ReactMouseEvent<HTMLDivElement>) => {
    if (reduce || hunting) return;
    const rect = e.currentTarget.getBoundingClientRect();
    setMouse({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  };

  const findMe = () => {
    const you = glyphs.find((g) => g.row.isYou);
    if (!you || !stageRef.current) return;
    setHunting(true);
    const start = mouse ?? {
      x: stageRef.current.clientWidth / 2,
      y: stageRef.current.clientHeight / 2,
    };
    const t0 = performance.now();
    const dur = 700;
    const tick = (now: number) => {
      const p = Math.min(1, (now - t0) / dur);
      const e = 1 - Math.pow(1 - p, 3);
      setMouse({
        x: start.x + (you.x - start.x) * e,
        y: start.y + (you.y - start.y) * e,
      });
      if (p < 1) requestAnimationFrame(tick);
      else {
        setHunting(false);
        setFocus(you.row.owner);
        setLocked((prev) => new Set(prev).add(you.row.owner));
        s.select(you.row.owner);
      }
    };
    requestAnimationFrame(tick);
  };

  const particles = useMemo(
    () =>
      Array.from({ length: 16 }).map((_, i) => ({
        left: `${(i * 37) % 100}%`,
        top: `${(i * 53) % 100}%`,
        size: 2 + (i % 4),
        travel: ((i % 7) - 3) * 12,
        duration: 2.2 + (i % 5) * 0.4,
        delay: (i % 6) * 0.25,
      })),
    [],
  );

  return (
    <div className="relative min-h-[100dvh] bg-black text-white" style={style}>
      <ResultsPlaceNav />

      <div className="pointer-events-none absolute inset-x-0 top-[4.6rem] z-30 px-4 sm:px-6">
        <div className="mx-auto flex max-w-5xl flex-wrap items-end justify-between gap-3">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.28em] text-white/35">
              TripleD wall · ported
            </p>
            <h1 className="mt-1 font-display text-2xl font-black uppercase tracking-tight sm:text-3xl">
              Sweep the dark
            </h1>
            <p className="mt-1 max-w-md text-[12px] text-white/45">
              Cursor lights ranks (Holographic Wall code). Click to lock. Find me
              hunts your glyph.
            </p>
          </div>
          <div className="pointer-events-auto flex flex-wrap gap-2">
            <GhostBtn onClick={findMe}>Find me</GhostBtn>
            {canClaim ? (
              <WhiteCta onClick={() => setClaimOpen(true)}>Claim</WhiteCta>
            ) : null}
            <GhostBtn
              onClick={() => {
                setLocked(new Set());
                setFocus(null);
              }}
            >
              Reset light
            </GhostBtn>
          </div>
        </div>
      </div>

      {/* STAGE — TripleD wall */}
      <div
        ref={stageRef}
        onMouseMove={onMove}
        onMouseLeave={() => !hunting && setMouse(null)}
        className="relative h-[100dvh] w-full overflow-hidden bg-black"
      >
        {/* ambient orbs (from Dynamic Spotlight) */}
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <motion.div
            className="absolute -top-28 left-1/2 h-72 w-72 -translate-x-1/2 rounded-full bg-white/10 blur-[160px]"
            animate={
              reduce
                ? undefined
                : { opacity: [0.2, 0.45, 0.2], scale: [0.92, 1.06, 0.96] }
            }
            transition={
              reduce
                ? undefined
                : { duration: 9, repeat: Infinity, ease: "easeInOut" }
            }
          />
          <motion.div
            className="absolute bottom-[-20%] right-[-10%] h-80 w-80 rounded-full bg-white/5 blur-[180px]"
            animate={
              reduce ? undefined : { opacity: [0.15, 0.35, 0.15], rotate: [0, 10, 0] }
            }
            transition={
              reduce
                ? undefined
                : { duration: 12, repeat: Infinity, ease: "linear" }
            }
          />
        </div>

        {/* glyphs */}
        <div className="absolute inset-0 pt-36 pb-40">
          {glyphs.map((g) => {
            const dist = mouse
              ? Math.hypot(g.x - mouse.x, g.y - mouse.y)
              : Infinity;
            const near = mouse != null && dist < radius;
            const lit = locked.has(g.row.owner) || focus === g.row.owner;
            const local =
              lit
                ? intensity
                : near
                  ? Math.max(0, 1 - dist / radius) * intensity
                  : 0;
            const opacity = lit ? 0.95 : 0.08 + local * 0.92;
            const scale = lit ? 1.08 : near ? 1 + local * 0.35 : 1;
            const glow = lit || near ? local : 0;

            return (
              <motion.button
                key={g.row.owner}
                type="button"
                initial={false}
                animate={{
                  opacity,
                  scale,
                  color: lit || near
                    ? `rgba(255,255,255,${0.55 + local * 0.45})`
                    : "rgba(200,200,200,0.12)",
                }}
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
                onClick={() => {
                  setFocus(g.row.owner);
                  setLocked((prev) => new Set(prev).add(g.row.owner));
                  s.select(g.row.owner);
                }}
                className={cn(
                  "absolute -translate-x-1/2 -translate-y-1/2 select-none rounded-xl border px-3 py-2 text-left backdrop-blur-sm",
                  lit
                    ? "border-white/40 bg-white/10"
                    : near
                      ? "border-white/20 bg-white/[0.04]"
                      : "border-transparent bg-transparent",
                  g.row.isYou && "outline outline-1 outline-offset-2 outline-white/30",
                )}
                style={{
                  left: g.x,
                  top: g.y,
                  textShadow:
                    glow > 0.05
                      ? `0 0 ${glow * 28}px rgba(255,255,255,${glow})`
                      : "none",
                  pointerEvents: lit || near || reduce ? "auto" : "none",
                }}
              >
                <p className="font-display text-[9px] font-bold tabular-nums tracking-[0.14em] text-inherit opacity-70">
                  #{g.row.rank}
                </p>
                <p className="font-display text-sm font-black uppercase tracking-wide text-inherit sm:text-base">
                  {g.row.nickname}
                </p>
                <p className="font-display text-xs font-black tabular-nums text-inherit opacity-80">
                  {g.row.finalPoints}
                </p>
              </motion.button>
            );
          })}
        </div>

        {/* cursor spotlight (Dynamic Spotlight CTA) */}
        <AnimatePresence>
          {!reduce && mouse ? (
            <motion.div
              key="spot"
              initial={{ opacity: 0 }}
              animate={{ opacity: intensity }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="pointer-events-none absolute inset-0 mix-blend-screen"
              style={{
                background: `radial-gradient(circle ${radius}px at ${mouse.x}px ${mouse.y}px,
                  rgba(255,255,255,0.42) 0%,
                  rgba(255,255,255,0.16) 42%,
                  rgba(255,255,255,0) 72%)`,
              }}
            >
              <motion.div
                animate={{
                  background: [
                    "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)",
                    "radial-gradient(circle, rgba(255,255,255,0.38) 0%, transparent 70%)",
                    "radial-gradient(circle, rgba(255,255,255,0.22) 0%, transparent 70%)",
                  ],
                }}
                transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                className="absolute"
                style={{
                  left: mouse.x,
                  top: mouse.y,
                  width: radius * 1.6,
                  height: radius * 1.6,
                  transform: "translate(-50%, -50%)",
                  filter: "blur(32px)",
                }}
              />
            </motion.div>
          ) : null}
        </AnimatePresence>

        {/* particles */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          {particles.map((p, i) => (
            <motion.span
              key={i}
              className="absolute rounded-full bg-white/25"
              style={{
                left: p.left,
                top: p.top,
                width: p.size,
                height: p.size,
              }}
              animate={
                reduce
                  ? undefined
                  : { y: [0, p.travel, 0], opacity: [0.08, 0.4, 0.08] }
              }
              transition={
                reduce
                  ? { duration: 0 }
                  : {
                      duration: p.duration,
                      repeat: Infinity,
                      delay: p.delay,
                    }
              }
            />
          ))}
        </div>

        {/* frame hairlines */}
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent" />
        </div>

        {!mouse && !reduce ? (
          <p className="pointer-events-none absolute bottom-36 left-1/2 z-10 -translate-x-1/2 font-display text-[11px] uppercase tracking-[0.24em] text-white/35">
            Move cursor · light the wall
          </p>
        ) : null}
      </div>

      {/* locked detail sheet — TripleD spring dialog grammar */}
      <AnimatePresence>
        {focused ? (
          <motion.div
            initial={{ opacity: 0, y: 24, filter: "blur(8px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 16, filter: "blur(6px)" }}
            transition={{ type: "spring", stiffness: 380, damping: 28 }}
            className="fixed inset-x-0 bottom-0 z-40 px-3 pb-28 sm:px-6"
          >
            <div className="mx-auto max-w-xl overflow-hidden rounded-2xl border border-white/15 bg-black/80 p-4 shadow-[0_-20px_60px_rgba(0,0,0,0.55)] backdrop-blur-xl sm:p-5">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[9px] font-bold uppercase tracking-[0.18em] text-white/40">
                    Locked · #{focused.rank}
                    {focused.isYou ? " · YOU" : ""}
                  </p>
                  <p className="font-display text-2xl font-black uppercase">
                    {focused.nickname}
                  </p>
                </div>
                <p className="font-display text-3xl font-black tabular-nums">
                  <CounterUp value={focused.finalPoints} />
                </p>
              </div>
              <div className="mt-3">
                <XiStrip players={focused.xi ?? focused.squad} />
              </div>
              {focused.prizeAmount > 0 ? (
                <p className="mt-3 text-[11px] text-white/45">
                  Share{" "}
                  <span className="tabular-nums text-white">
                    {focused.prizeAmount}
                  </span>{" "}
                  {s.data.prizeSymbol}
                </p>
              ) : null}
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <ClaimDialog
        open={claimOpen}
        title="Claim prize"
        body="Confirm claim — your glyph stays lit on the wall."
        confirmLabel="Claim"
        busy={room.claiming}
        error={room.claimError}
        onClose={() => setClaimOpen(false)}
        onConfirm={async () => {
          await room.claimPrize();
          setClaimOpen(false);
          findMe();
        }}
      />
    </div>
  );
}
