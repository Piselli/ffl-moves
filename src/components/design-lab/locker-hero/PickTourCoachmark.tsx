"use client";

import {
  useCallback,
  useLayoutEffect,
  useState,
  type CSSProperties,
  type RefObject,
} from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { LOCKER_CTA } from "@/components/design-lab/locker-hero/ctaStyles";
import type { SiteMessages } from "@/i18n/messages";
import { modalPanelMotion } from "@/lib/uiMotion";
import { cn } from "@/lib/utils";
import { PICK_TOUR_STEPS, type PickTourStepId } from "./onboardingStorage";

const DISPLAY = { fontFamily: "var(--lt-font-display), sans-serif" } as const;
const BACKPLATE = "rounded-2xl bg-[#080a0e]";
const PAD = 6;
const HOLE_RADIUS = 14;
const DIM = "rgba(0,0,0,0.72)";
const TIP_EST_H = 220;

type Hole = {
  top: number;
  left: number;
  width: number;
  height: number;
};

type Props = {
  step: PickTourStepId | null;
  open: boolean;
  onNext: () => void;
  onSkip: () => void;
  messages: SiteMessages;
  containerRef: RefObject<HTMLElement | null>;
  /** When Scoring plaque is open, spotlight that instead of the header link. */
  scoringOpen?: boolean;
};

type TipCopy = { title: string; lines: string[] };

function tipFor(
  step: PickTourStepId,
  pick: SiteMessages["pages"]["lockerPick"],
): TipCopy {
  return pick.tourTips[step];
}

function visibleAnchors(
  root: HTMLElement,
  step: PickTourStepId,
  scoringOpen: boolean,
): HTMLElement[] {
  const keys =
    step === "scoring" && scoringOpen
      ? (["scoring-panel", "scoring"] as const)
      : ([step] as const);

  const nodes: HTMLElement[] = [];
  for (const key of keys) {
    root.querySelectorAll(`[data-tour-anchor="${key}"]`).forEach((n) => {
      if (n instanceof HTMLElement) nodes.push(n);
    });
  }
  return nodes
    .filter((node) => {
      const r = node.getBoundingClientRect();
      return r.width >= 4 && r.height >= 4;
    })
    .sort((a, b) => {
      // Register: prefer the lower CTA (mobile footer over desktop column).
      if (step === "register") {
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        if (Math.abs(rb.bottom - ra.bottom) > 4) return rb.bottom - ra.bottom;
      }
      const ra = a.getBoundingClientRect();
      const rb = b.getBoundingClientRect();
      return rb.width * rb.height - ra.width * ra.height;
    });
}

function padFor(step: PickTourStepId, scoringOpen: boolean): number {
  if (step === "scoring" && !scoringOpen) return 10;
  if (step === "register") return 8;
  return PAD;
}

function localOffsetRect(
  root: HTMLElement,
  el: HTMLElement,
): { top: number; left: number; width: number; height: number } | null {
  // Prefer layout offsets inside the tablet. getBoundingClientRect drifts under
  // the drei Html / CSS 3D parent, which misplaces the spotlight hole.
  if (!root.contains(el)) return null;
  let top = 0;
  let left = 0;
  let node: HTMLElement | null = el;
  while (node && node !== root) {
    top += node.offsetTop;
    left += node.offsetLeft;
    const parent: Element | null = node.offsetParent;
    if (!(parent instanceof HTMLElement)) return null;
    if (parent === root) break;
    if (!root.contains(parent)) return null;
    node = parent;
  }
  if (el.offsetWidth < 4 || el.offsetHeight < 4) return null;
  return {
    top,
    left,
    width: el.offsetWidth,
    height: el.offsetHeight,
  };
}

function measureHole(
  root: HTMLElement,
  step: PickTourStepId,
  scoringOpen: boolean,
): Hole | null {
  const el = visibleAnchors(root, step, scoringOpen)[0] ?? null;
  if (!el) return null;

  const pad = padFor(step, scoringOpen);
  const local = localOffsetRect(root, el);

  let top: number;
  let left: number;
  let width: number;
  let height: number;

  if (local && local.width >= 4 && local.height >= 4) {
    top = local.top - pad;
    left = local.left - pad;
    width = local.width + pad * 2;
    height = local.height + pad * 2;
  } else {
    const rr = root.getBoundingClientRect();
    const er = el.getBoundingClientRect();
    const scaleX = root.offsetWidth > 0 ? rr.width / root.offsetWidth : 1;
    const scaleY = root.offsetHeight > 0 ? rr.height / root.offsetHeight : 1;
    if (scaleX < 0.05 || scaleY < 0.05) return null;
    top = (er.top - rr.top) / scaleY - pad;
    left = (er.left - rr.left) / scaleX - pad;
    width = er.width / scaleX + pad * 2;
    height = er.height / scaleY + pad * 2;
  }

  const maxW = root.offsetWidth;
  const maxH = root.offsetHeight;
  top = Math.max(HOLE_RADIUS, top);
  left = Math.max(HOLE_RADIUS, left);
  width = Math.min(width, maxW - left - HOLE_RADIUS);
  height = Math.min(height, maxH - top - HOLE_RADIUS);
  if (width < 8 || height < 8) return null;

  return { top, left, width, height };
}

function roundedRectPath(
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): string {
  const rr = Math.min(r, w / 2, h / 2);
  return [
    `M ${x + rr} ${y}`,
    `H ${x + w - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + w} ${y + rr}`,
    `V ${y + h - rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + w - rr} ${y + h}`,
    `H ${x + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x} ${y + h - rr}`,
    `V ${y + rr}`,
    `A ${rr} ${rr} 0 0 1 ${x + rr} ${y}`,
    "Z",
  ].join(" ");
}

function tipPlacement(
  step: PickTourStepId,
  hole: Hole | null,
  rootW: number,
  rootH: number,
  scoringOpen: boolean,
): CSSProperties {
  const margin = 12;
  const width = Math.min(340, Math.max(200, rootW - margin * 2));

  if (rootH < 8) {
    return { bottom: margin, left: margin, right: margin, maxWidth: width };
  }

  if (step === "players") {
    // Mobile: tip up top so the player list stays tappable under it.
    if (rootW < 640) {
      return {
        top: margin + 4,
        bottom: "auto",
        left: margin,
        right: margin,
        width: Math.min(width, rootW - margin * 2),
        maxHeight: Math.min(TIP_EST_H, rootH * 0.42),
      };
    }
    // Desktop: sit on the pitch side, clear of the players list on the right.
    const gap = 14;
    const left = hole
      ? Math.max(margin, Math.min(hole.left - width - gap, rootW - width - margin))
      : Math.max(margin, (rootW - width) / 2);
    const top = Math.max(
      margin,
      Math.min((rootH - TIP_EST_H) / 2, rootH - TIP_EST_H - margin),
    );
    return {
      top,
      bottom: "auto",
      left,
      right: "auto",
      width,
      maxHeight: rootH - margin * 2,
    };
  }

  if (step === "formation") {
    // Formation control sits on the pitch fringe (bottom) — tip just above it.
    if (rootW < 640) {
      const tipW = Math.min(width, rootW - margin * 2);
      if (hole) {
        const gap = 10;
        return {
          top: "auto",
          bottom: Math.max(margin + 8, rootH - hole.top + gap),
          left: Math.max(margin, Math.min(hole.left, rootW - tipW - margin)),
          right: "auto",
          width: tipW,
          maxHeight: Math.min(TIP_EST_H, Math.max(120, hole.top - margin - gap)),
        };
      }
      return {
        top: "auto",
        bottom: margin + 56,
        left: margin,
        right: margin,
        width: tipW,
        maxHeight: TIP_EST_H,
      };
    }
    return {
      top: "auto",
      bottom: margin,
      right: margin,
      left: "auto",
      width,
    };
  }

  if (step === "captain") {
    // Below the highlighted player / toward GK — still fully on screen.
    if (rootW < 640) {
      const tipW = Math.min(width, rootW - margin * 2);
      const tipH = Math.min(TIP_EST_H, rootH * 0.36);
      if (hole) {
        const below = hole.top + hole.height + 10;
        const maxTop = rootH - tipH - margin - 64; // clear bottom nav / fringe
        return {
          top: Math.max(margin, Math.min(below, maxTop)),
          bottom: "auto",
          left: margin,
          right: margin,
          width: tipW,
          maxHeight: tipH,
        };
      }
      return {
        top: "auto",
        bottom: margin + 72,
        left: margin,
        right: margin,
        width: tipW,
        maxHeight: tipH,
      };
    }
    return {
      top: "auto",
      bottom: margin,
      right: margin,
      left: "auto",
      width,
    };
  }

  // Scoring tip sits under the Scoring control; when the plaque opens, move aside.
  if (step === "scoring") {
    if (scoringOpen) {
      return {
        top: Math.max(margin, 56),
        bottom: "auto",
        left: "auto",
        right: margin,
        width: Math.min(260, width),
        maxHeight: rootH - margin * 2 - 56,
      };
    }
    const tipW = Math.min(300, width);
    const left = hole
      ? Math.max(
          margin,
          Math.min(
            hole.left + hole.width / 2 - tipW / 2,
            rootW - tipW - margin,
          ),
        )
      : Math.max(margin, (rootW - tipW) / 2);
    const top = hole
      ? Math.min(hole.top + hole.height + 10, rootH - TIP_EST_H - margin)
      : Math.max(margin, 56);
    return {
      top: Math.max(margin, top),
      bottom: "auto",
      left,
      right: "auto",
      width: tipW,
      maxHeight: rootH - margin * 2,
    };
  }

  // Register tip — bottom edge sits just above the CTA (grows upward).
  if (step === "register") {
    const tipW = Math.min(300, width);
    const gap = 12;
    if (hole) {
      const spaceAbove = hole.top - margin;
      const preferAbove = rootW < 640 || spaceAbove >= 140;
      if (preferAbove) {
        return {
          top: "auto",
          bottom: Math.max(margin, rootH - hole.top + gap),
          left: Math.max(
            margin,
            Math.min(
              hole.left + hole.width / 2 - tipW / 2,
              rootW - tipW - margin,
            ),
          ),
          right: "auto",
          width: tipW,
          maxHeight: Math.max(128, spaceAbove - gap),
        };
      }
      return {
        top: "auto",
        bottom: margin,
        left: Math.max(margin, hole.left - tipW - 14),
        right: "auto",
        width: tipW,
        maxHeight: rootH - margin * 2,
      };
    }
    return {
      top: "auto",
      bottom: margin + 72,
      left: Math.max(margin, (rootW - tipW) / 2),
      right: "auto",
      width: tipW,
      maxHeight: rootH - margin * 2,
    };
  }

  void scoringOpen;
  void hole;
  return {
    bottom: margin,
    left: Math.max(margin, (rootW - width) / 2),
    width,
  };
}

export function PickTourCoachmark({
  step,
  open,
  onNext,
  onSkip,
  messages: m,
  containerRef,
  scoringOpen = false,
}: Props) {
  const reduce = Boolean(useReducedMotion());
  const pick = m.pages.lockerPick;
  const panel = modalPanelMotion(reduce);
  const [hole, setHole] = useState<Hole | null>(null);
  const [rootSize, setRootSize] = useState({ w: 0, h: 0 });

  const sync = useCallback(() => {
    const root = containerRef.current;
    if (!root || !step || !open) {
      setHole(null);
      return;
    }
    setRootSize({ w: root.offsetWidth, h: root.offsetHeight });
    setHole(measureHole(root, step, scoringOpen));
    root.querySelectorAll("[data-tour-active]").forEach((node) => {
      node.removeAttribute("data-tour-active");
    });
    const el = visibleAnchors(root, step, scoringOpen)[0];
    el?.setAttribute("data-tour-active", "1");
  }, [containerRef, open, scoringOpen, step]);

  useLayoutEffect(() => {
    if (!open || !step) {
      setHole(null);
      return;
    }
    sync();
    const root = containerRef.current;
    if (!root) return;
    const ro = new ResizeObserver(() => sync());
    ro.observe(root);
    visibleAnchors(root, step, scoringOpen).forEach((a) => ro.observe(a));
    window.addEventListener("resize", sync);
    window.addEventListener("scroll", sync, true);
    const t1 = window.setTimeout(sync, 50);
    const t2 = window.setTimeout(sync, 180);
    const t3 = window.setTimeout(sync, 400);
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", sync);
      window.removeEventListener("scroll", sync, true);
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.clearTimeout(t3);
      root.querySelectorAll("[data-tour-active]").forEach((node) => {
        node.removeAttribute("data-tour-active");
      });
    };
  }, [containerRef, open, scoringOpen, step, sync]);

  if (!step) return null;
  const tip = tipFor(step, pick);
  const isLast = step === "register";
  const primaryLabel = isLast ? pick.tourDone : pick.tourNext;
  const titleId = `lt-pick-tour-${step}`;
  const stepIndex = PICK_TOUR_STEPS.indexOf(step) + 1;
  const tipStyle = tipPlacement(
    step,
    hole,
    rootSize.w,
    rootSize.h,
    scoringOpen,
  );
  const vbW = Math.max(rootSize.w, 1);
  const vbH = Math.max(rootSize.h, 1);

  // Dim (z-45) and tip (z-55) are siblings so the tip can sit above the
  // Scoring plaque (z-50) without the dim also covering that plaque.
  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          key={`lt-tour-dim-${step}${scoringOpen ? "-open" : ""}`}
          aria-hidden
          className="pointer-events-none absolute inset-0 z-[45] overflow-hidden"
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduce ? undefined : { opacity: 0 }}
          transition={{ duration: reduce ? 0.1 : 0.2 }}
        >
          {hole ? (
            <svg
              className="absolute left-0 top-0"
              width={vbW}
              height={vbH}
              viewBox={`0 0 ${vbW} ${vbH}`}
              preserveAspectRatio="xMinYMin meet"
            >
              <defs>
                <mask
                  id={`lt-tour-mask-${step}${scoringOpen ? "-open" : ""}`}
                  maskUnits="userSpaceOnUse"
                  x={0}
                  y={0}
                  width={vbW}
                  height={vbH}
                >
                  <rect x={0} y={0} width={vbW} height={vbH} fill="white" />
                  <path
                    d={roundedRectPath(
                      hole.left,
                      hole.top,
                      hole.width,
                      hole.height,
                      HOLE_RADIUS,
                    )}
                    fill="black"
                  />
                </mask>
              </defs>
              <rect
                x={0}
                y={0}
                width={vbW}
                height={vbH}
                fill={DIM}
                mask={`url(#lt-tour-mask-${step}${scoringOpen ? "-open" : ""})`}
              />
              {step === "scoring" && !scoringOpen ? (
                <path
                  d={roundedRectPath(
                    hole.left,
                    hole.top,
                    hole.width,
                    hole.height,
                    HOLE_RADIUS,
                  )}
                  fill="none"
                  stroke="rgba(255,255,255,0.55)"
                  strokeWidth={2}
                />
              ) : null}
            </svg>
          ) : (
            <div className="absolute inset-0" style={{ background: DIM }} />
          )}
        </motion.div>
      ) : null}
      {open ? (
        <motion.div
          key={`lt-tour-tip-${step}`}
          role="dialog"
          aria-modal="true"
          aria-labelledby={titleId}
          className={cn(
            "pointer-events-auto absolute z-[55] max-h-[calc(100%-24px)] overflow-y-auto",
          )}
          style={tipStyle}
          initial={panel.initial}
          animate={panel.animate}
          exit={panel.exit}
          transition={panel.transition}
        >
          <div className={BACKPLATE}>
            <GlassPanel crystal className="w-full !rounded-2xl p-4 sm:p-5">
              <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-white/40">
                {pick.tourProgress(stepIndex, PICK_TOUR_STEPS.length)}
              </p>
              <h2
                id={titleId}
                className="mt-1.5 text-[17px] font-black uppercase tracking-[-0.02em] text-white"
                style={DISPLAY}
              >
                {tip.title}
              </h2>
              <div className="mt-2.5 space-y-2">
                {tip.lines.map((line, i) => (
                  <p
                    key={i}
                    className="text-[13px] font-medium leading-snug text-white/80"
                  >
                    {line}
                  </p>
                ))}
              </div>
              <div className="mt-4 flex items-center gap-2">
                <button
                  type="button"
                  onClick={onSkip}
                  className="rounded-xl px-3 py-2.5 text-[11px] font-bold uppercase tracking-[0.08em] text-white/45 transition hover:bg-white/[0.06] hover:text-white/80 active:scale-[0.98]"
                >
                  {pick.tourSkip}
                </button>
                <button
                  type="button"
                  onClick={onNext}
                  className="ml-auto flex-1 rounded-xl px-4 py-2.5 text-[12px] font-black uppercase tracking-[0.06em] transition active:scale-[0.98] sm:flex-none sm:min-w-[7.5rem]"
                  style={LOCKER_CTA.style}
                >
                  {primaryLabel}
                </button>
              </div>
            </GlassPanel>
          </div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
