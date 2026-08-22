"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { AnimatePresence, motion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import {
  DEFAULT_PITCH_STYLE,
  loadPitchStyleId,
  savePitchStyleId,
  type PitchStyleId,
} from "@/components/design-lab/locker-hero/pitchStyles";
import {
  getCtaStyle,
} from "@/components/design-lab/locker-hero/ctaStyles";
import {
  getLockerPalette,
  paletteToCssVars,
} from "@/components/design-lab/locker-hero/lockerPalettes";
import {
  getTypeface,
  typefaceToCssVars,
} from "@/components/design-lab/locker-hero/lockerTypefaces";
import { Form8Mark } from "@/components/Form8Mark";
import { cn } from "@/lib/utils";
import { CounterUp } from "./concepts/vibeKit";
import {
  DEFAULT_RESULTS_CHROME,
  getResultsChrome,
  type ResultsChromeId,
} from "./resultsChromeVariants";
import {
  resultsScrollbarCss,
} from "./resultsScrollbars";
import {
  ClaimFascia,
  TeamSheetPitch,
  TeamSheetTable,
  useTeamSheetSelection,
} from "./TeamSheetPieces";
import { YouResultHero, YouXiPanel } from "./YouXiPanel";
import {
  DEFAULT_YOU_XI_VARIANT,
  isYouResultPlate,
  type YouXiVariantId,
} from "./youXiVariants";
import type { useResultsRoomData } from "./useResultsRoomData";

type RoomData = ReturnType<typeof useResultsRoomData>;
type TabId = "board" | "you";

const DISPLAY: CSSProperties = {
  fontFamily: "var(--lt-font-display)",
  letterSpacing: "var(--lt-display-tracking)",
};

function GwStepper({
  room,
  displayGw,
}: {
  room: RoomData;
  displayGw: number;
}) {
  const gws = room.pickerGws;
  const gw = room.selectedGw > 0 ? room.selectedGw : displayGw;
  const idx = gws.indexOf(gw);
  const canPrev = idx > 0;
  const canNext = idx >= 0 && idx < gws.length - 1;

  const step = (delta: -1 | 1) => {
    if (gws.length === 0) return;
    const at = idx >= 0 ? idx : gws.length - 1;
    const next = gws[at + delta];
    if (next != null && next !== gw) room.setGameweek(next);
  };

  return (
    <div
      className="flex shrink-0 items-center rounded-[10px] p-0.5"
      style={{
        background: "#0a0a0a",
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.19), inset 0 1px 0 rgba(255,255,255,0.11)",
      }}
      role="group"
      aria-label="Select gameweek"
    >
      <button
        type="button"
        aria-label="Previous gameweek"
        disabled={!canPrev}
        onClick={() => step(-1)}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-[18px] leading-none text-white transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
          canPrev
            ? "hover:bg-white/10 active:scale-95"
            : "cursor-default text-white/25",
        )}
      >
        ‹
      </button>
      <div
        className={cn(
          "min-w-[3.4rem] px-1.5 text-center text-[12px] font-black tabular-nums tracking-wide text-white",
          room.loading && "opacity-55",
        )}
        style={DISPLAY}
        aria-live="polite"
      >
        GW {gw || "—"}
      </div>
      <button
        type="button"
        aria-label="Next gameweek"
        disabled={!canNext}
        onClick={() => step(1)}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-[18px] leading-none text-white transition",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50",
          canNext
            ? "hover:bg-white/10 active:scale-95"
            : "cursor-default text-white/25",
        )}
      >
        ›
      </button>
    </div>
  );
}

function useLocalWheelScroll() {
  const rootRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onWheel = (e: WheelEvent) => {
      const t = e.target;
      if (!(t instanceof Element)) return;
      const port = t.closest("[data-lt-scroll]");
      if (!(port instanceof HTMLElement) || !root.contains(port)) return;
      if (port.clientHeight < 8) return;
      if (port.scrollHeight <= port.clientHeight + 1) return;
      e.stopPropagation();
      port.scrollTop += e.deltaY;
      e.preventDefault();
    };
    root.addEventListener("wheel", onWheel, { passive: false, capture: true });
    return () => root.removeEventListener("wheel", onWheel, true);
  }, []);
  return rootRef;
}

type Props = {
  room: RoomData;
  /** Visual chrome only — layout stays board left · pitch right */
  chromeId?: ResultsChromeId;
  /** YOU tab XI layout (no pitch) */
  youXiVariantId?: YouXiVariantId;
};

/**
 * Results iPad — fixed composition (table left, XI right).
 * Chrome variants change materials / motion / claim details (TripleD).
 */
export function ResultsTablet({
  room,
  chromeId = DEFAULT_RESULTS_CHROME,
  youXiVariantId = DEFAULT_YOU_XI_VARIANT,
}: Props) {
  const chrome = getResultsChrome(chromeId);
  const palette = getLockerPalette(chrome.paletteId);
  const cta = getCtaStyle(chrome.ctaId);
  const s = useTeamSheetSelection(room.tablet, {
    onClaim: room.claimPrize,
    loadXi: room.loadXiForOwner,
    claiming: room.claiming,
  });
  const typeface = getTypeface();
  const tabletRootRef = useLocalWheelScroll();
  const [tab, setTab] = useState<TabId>("board");
  const [clock, setClock] = useState("");
  const [claimOpen, setClaimOpen] = useState(false);
  const [pitchStyleId, setPitchStyleId] =
    useState<PitchStyleId>(DEFAULT_PITCH_STYLE);

  useEffect(() => {
    setPitchStyleId(loadPitchStyleId());
  }, []);

  useEffect(() => {
    const tick = () => {
      setClock(
        new Date().toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
        }),
      );
    };
    tick();
    const id = window.setInterval(tick, 30_000);
    return () => window.clearInterval(id);
  }, []);

  const canClaim =
    !!s.you && s.you.prizeAmount > 0 && !s.you.claimed && !room.claiming;

  const onClaimConfirm = () => {
    setClaimOpen(false);
    s.pulseClaim();
  };

  const onPitchStyleChange = (id: PitchStyleId) => {
    setPitchStyleId(id);
    savePitchStyleId(id);
  };

  const d = chrome.details;
  const namingSheet = d.softPlate;
  /** Match homepage Crystal / plates chrome — same corner on both tablet pages. */
  const plateRadius = "!rounded-[22px]";
  const plateRadiusClass = "rounded-[22px]";

  const crystalVars: CSSProperties = d.crystalGlass
    ? {
        // Max frost — brighter sheen, deeper blur, clearer edge than Plates+
        ["--lt-glass-bg" as string]: "rgba(8,10,14,0.42)",
        ["--lt-glass-blur" as string]: "48px",
        ["--lt-glass-ring" as string]: "rgba(255,255,255,0.38)",
        ["--lt-glass-shadow" as string]:
          "inset 0 1px 0 rgba(255,255,255,0.55), inset 0 -20px 40px rgba(0,0,0,0.5), 0 18px 56px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.08)",
        ["--lt-glass-sheen" as string]:
          "linear-gradient(145deg, rgba(255,255,255,0.28) 0%, rgba(255,255,255,0.08) 18%, transparent 42%), linear-gradient(320deg, rgba(120,180,255,0.08) 0%, transparent 35%)",
        ["--lt-panel" as string]: "rgba(8,10,14,0.38)",
        ["--lt-hairline" as string]: "rgba(255,255,255,0.32)",
      }
    : {};

  /** Exact tokens from tmp/naming-table.html — do not drift via glass vars */
  const namingSheetStyle: CSSProperties = {
    background: "#0a0a0a",
    boxShadow:
      "0 0 0 1px rgba(255,255,255,0.19), inset 0 1px 0 rgba(255,255,255,0.11), 0 14px 40px rgba(0,0,0,0.55)",
  };

  return (
    <div
      ref={tabletRootRef}
      data-rt-chrome={chromeId}
      className="relative flex h-full w-full flex-col overflow-hidden"
      style={
        {
          color: "var(--lt-ink)",
          background: namingSheet ? "#000000" : "var(--lt-canvas)",
          fontFamily: "var(--lt-font-ui)",
          WebkitFontSmoothing: "antialiased",
          MozOsxFontSmoothing: "grayscale",
          textRendering: "optimizeLegibility",
          ...paletteToCssVars(palette),
          ...typefaceToCssVars(typeface),
          ...crystalVars,
        } as CSSProperties
      }
    >
      <style>{resultsScrollbarCss()}</style>

      <div className="relative flex h-6 shrink-0 items-center justify-between px-4 text-[10px] font-semibold tabular-nums text-[color:var(--lt-ink)]/70">
        <span>{clock}</span>
        <span className="tracking-[0.08em]">Wi-Fi&nbsp;&nbsp;100%</span>
      </div>

      {/* py-2 matches tabs pt-2 so the hairline sits midway between GW plate and Board/You */}
      <header className="relative flex shrink-0 items-center justify-between border-b border-[var(--lt-hairline)] bg-black px-4 py-2">
        <div className="flex min-w-0 items-center gap-2.5 sm:gap-3">
          <Form8Mark className="h-9" />
          <p
            className="truncate text-[13px] font-bold uppercase tracking-tight text-white sm:text-[14px]"
            style={DISPLAY}
          >
            Team sheet
          </p>
        </div>

        {/* Native <select> fails inside drei Html (transform + overflow) —
            stepper walks resolved EPL GWs on the shipping tablet. */}
        <GwStepper room={room} displayGw={s.data.gameweek} />
      </header>

      {d.topMarquee ? (
        <div className="shrink-0 overflow-hidden border-b border-white/10 bg-white/[0.03] py-1.5">
          <div className="flex w-max animate-[rt-marquee_18s_linear_infinite] gap-8 px-4 text-[10px] font-bold uppercase tracking-[0.14em] text-white/45">
            {[...s.data.rows.slice(0, 5), ...s.data.rows.slice(0, 5)].map(
              (r, i) => (
                <span key={`${r.owner}-${i}`}>
                  #{r.rank} {r.nickname}
                  <span className="ml-1.5 text-[color:var(--lt-accent)]">
                    {r.finalPoints}
                  </span>
                </span>
              ),
            )}
          </div>
          <style>{`@keyframes rt-marquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}`}</style>
        </div>
      ) : null}

      {/* TripleD tabs — CSS pill (not layoutId): drei Html rescale on raise/lower
          was making the framer layout pill slide. */}
      <div className="shrink-0 px-3 pt-2">
        <div className="relative flex rounded-full bg-white/[0.06] p-1">
          <span
            aria-hidden
            className="pointer-events-none absolute inset-y-1 left-1 w-[calc(50%-0.25rem)] rounded-full bg-white transition-transform duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]"
            style={{
              transform:
                tab === "board" ? "translateX(0)" : "translateX(100%)",
            }}
          />
          {(
            [
              ["board", "Board"],
              ["you", "You"],
            ] as const
          ).map(([id, label]) => {
            const on = tab === id;
            return (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setTab(id);
                  if (id === "you") s.findMe();
                }}
                className={cn(
                  "relative z-10 flex-1 rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.12em] transition-colors",
                  on ? "text-black" : "text-white/55 hover:text-white/80",
                )}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Fixed composition: table left · pitch right */}
      <div className="relative mt-2 min-h-0 flex-1 px-3">
        {namingSheet ? (
          tab === "board" ? (
            <div className="grid h-full min-h-0 gap-2 lg:grid-cols-2">
              <div
                className={cn(
                  "relative flex h-full min-h-0 flex-col overflow-hidden",
                  plateRadius,
                )}
                style={namingSheetStyle}
              >
                <div
                  aria-hidden
                  className="pointer-events-none absolute inset-0 rounded-[inherit]"
                  style={{
                    background:
                      "linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 16%)",
                  }}
                />
                <div className="relative z-10 flex h-full min-h-0 flex-col">
                  <TeamSheetTable
                    key={`${s.data.gameweek}-${chromeId}-stagger`}
                    rows={s.data.rows}
                    openOwner={s.openOwner}
                    onSelect={s.select}
                    sectionLabel="This gameweek"
                    dense={d.denseTable}
                    condensed={d.condensedBoard}
                    scrollToYou={d.scrollToYou}
                    stagger={d.staggerRows}
                    selectPulse={d.selectPulse}
                    layoutSelect={d.layoutSelect}
                    className="min-h-0 flex-1 px-0"
                  />
                </div>
              </div>
              <TeamSheetPitch
                manager={s.open}
                landKey={s.landKey}
                loadingXi={s.loadingXi}
                pitchStyleId={pitchStyleId}
                onPitchStyleChange={onPitchStyleChange}
                fillPlate
                plateClassName={plateRadiusClass}
                showHeader={false}
                className="h-full min-h-0"
              />
            </div>
          ) : (
            <div className="flex h-full min-h-0 flex-col overflow-hidden">
              {s.you ? (
                <>
                  {!isYouResultPlate(youXiVariantId) ? (
                    <YouResultHero
                      manager={s.you}
                      gameweek={s.data.gameweek}
                    />
                  ) : null}
                  <YouXiPanel
                    manager={s.open?.owner === s.you.owner ? s.open : s.you}
                    landKey={s.landKey}
                    loadingXi={s.loadingXi}
                    variantId={youXiVariantId}
                    gameweek={s.data.gameweek}
                    className="min-h-0 flex-1"
                  />
                </>
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                  <p className="text-[15px] text-white/45">
                    Connect a wallet that entered this gameweek to see your
                    result.
                  </p>
                </div>
              )}
            </div>
          )
        ) : tab === "board" ? (
          <div className="grid h-full min-h-0 gap-2 lg:grid-cols-2">
            <SpotlightShell enabled={d.spotlight}>
              <GlassPanel
                interactive={d.interactivePanels}
                crystal={d.crystalGlass}
                className={cn("h-full min-h-0", plateRadius)}
              >
                <TeamSheetTable
                  key={`${s.data.gameweek}-${chromeId}-stagger`}
                  rows={s.data.rows}
                  openOwner={s.openOwner}
                  onSelect={s.select}
                  sectionLabel="This gameweek"
                  dense={d.denseTable}
                  condensed={d.condensedBoard}
                  scrollToYou={d.scrollToYou}
                  stagger={d.staggerRows}
                  selectPulse={d.selectPulse}
                  layoutSelect={d.layoutSelect}
                  className="min-h-0 flex-1 px-0"
                />
              </GlassPanel>
            </SpotlightShell>
            <SpotlightShell enabled={d.spotlight}>
              <TeamSheetPitch
                manager={s.open}
                landKey={s.landKey}
                loadingXi={s.loadingXi}
                pitchStyleId={pitchStyleId}
                onPitchStyleChange={onPitchStyleChange}
                fillPlate
                plateClassName={plateRadiusClass}
                showHeader={false}
                className="h-full min-h-0"
              />
            </SpotlightShell>
          </div>
        ) : (
          <div className="flex h-full min-h-0 flex-col overflow-hidden">
            {s.you ? (
              <>
                {!isYouResultPlate(youXiVariantId) ? (
                  <YouResultHero
                    manager={s.you}
                    gameweek={s.data.gameweek}
                    counter={d.counterPts}
                    Counter={CounterUp}
                  />
                ) : null}
                <YouXiPanel
                  manager={s.open?.owner === s.you.owner ? s.open : s.you}
                  landKey={s.landKey}
                  loadingXi={s.loadingXi}
                  variantId={youXiVariantId}
                  gameweek={s.data.gameweek}
                  className="min-h-0 flex-1"
                />
              </>
            ) : (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <p className="text-[15px] text-white/45">
                  Connect a wallet that entered this gameweek to see your
                  result.
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="relative mt-1.5 shrink-0 px-3 pb-2.5">
        <ClaimFascia
          data={s.data}
          you={s.you}
          claimPulse={s.claimPulse}
          wallet={d.walletFascia}
          whiteClaim={d.whiteClaim}
          counterPts={d.counterPts}
          pressClaim={d.pressClaim}
          claimStyle={d.whiteClaim ? undefined : cta.style}
          onClaim={
            s.you && s.you.prizeAmount > 0 && !s.you.claimed
              ? () => setClaimOpen(true)
              : undefined
          }
          onFindMe={() => {
            setTab("you");
            s.findMe();
          }}
          claiming={room.claiming}
          claimError={room.claimError}
          className={
            d.walletFascia
              ? undefined
              : cn(
                  plateRadius,
                  namingSheet
                    ? undefined
                    : "border-[var(--lt-glass-ring)] !bg-[var(--lt-glass-bg)] shadow-[var(--lt-glass-shadow)] backdrop-blur-[var(--lt-glass-blur)]",
                )
          }
          style={namingSheet ? namingSheetStyle : undefined}
        />
      </div>

      <AnimatePresence>
        {claimOpen && canClaim && s.you ? (
          <motion.div
            key="claim-sheet-root"
            className="absolute inset-0 z-40 flex items-end justify-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
          >
            <motion.button
              type="button"
              aria-label="Close claim"
              className="absolute inset-0 bg-black/55 backdrop-blur-sm"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setClaimOpen(false)}
            />
            <motion.div
              className="relative z-10 w-full max-w-sm px-4 pb-4"
              initial={{ y: "110%" }}
              animate={{ y: 0 }}
              exit={{ y: "110%" }}
              transition={{ type: "spring", stiffness: 380, damping: 34 }}
            >
              <GlassPanel
                crystal={d.crystalGlass}
                matte={namingSheet}
                className="w-full !rounded-2xl p-5"
                style={namingSheet ? namingSheetStyle : undefined}
              >
                <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-white/25" />
                <p
                  className="text-lg font-black uppercase tracking-tight text-white"
                  style={DISPLAY}
                >
                  Claim prize
                </p>
                <p className="mt-2 text-sm text-white/55">
                  Rank #{s.you.rank} · {s.you.prizeAmount} {s.data.prizeSymbol}.
                  Sign with your wallet to claim on-chain.
                </p>
                <div className="mt-5 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setClaimOpen(false)}
                    className="flex-1 rounded-xl border border-white/20 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 transition hover:border-white/35 active:scale-[0.98]"
                  >
                    Cancel
                  </button>
                  <motion.button
                    type="button"
                    onClick={onClaimConfirm}
                    disabled={room.claiming}
                    whileTap={{ scale: 0.94 }}
                    style={d.whiteClaim ? undefined : cta.style}
                    className={cn(
                      "flex-1 rounded-xl py-3 text-[11px] font-bold uppercase tracking-[0.12em] transition hover:brightness-110 disabled:opacity-50",
                      d.whiteClaim
                        ? "bg-white text-black shadow-[0_0_28px_rgba(255,255,255,0.28)]"
                        : !cta.style && "bg-[color:var(--lt-accent)] text-black",
                    )}
                  >
                    {room.claiming ? "Claiming…" : "Confirm"}
                  </motion.button>
                </div>
              </GlassPanel>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

/** TripleD Dynamic Spotlight — soft radial follows pointer over a panel. */
function SpotlightShell({
  enabled,
  children,
}: {
  enabled: boolean;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 40 });

  if (!enabled) return <>{children}</>;

  return (
    <div
      ref={ref}
      className="relative h-full min-h-0"
      onPointerMove={(e) => {
        const el = ref.current;
        if (!el) return;
        const r = el.getBoundingClientRect();
        setPos({
          x: ((e.clientX - r.left) / r.width) * 100,
          y: ((e.clientY - r.top) / r.height) * 100,
        });
      }}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 z-20 rounded-[inherit] mix-blend-soft-light"
        style={{
          background: `radial-gradient(420px circle at ${pos.x}% ${pos.y}%, rgba(255,255,255,0.16), transparent 55%)`,
        }}
      />
      <div className="relative z-10 h-full min-h-0">{children}</div>
    </div>
  );
}
