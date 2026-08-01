"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import {
  NAMEPLATE_BAY_IDS,
  NAMEPLATE_PLATE_SRC,
  cssMatrix3dFromQuadPct,
  isCompleteQuad,
  resolveNameplateQuads,
  upsertBayQuad,
  type NameplateQuadPct,
  type Pt,
} from "./nameplateQuads";
import {
  NAMEPLATE_DEMO_CAST,
  getNameplateStyle,
  type NameplateStyleId,
} from "./nameplateStyles";
import type { NameplateFontId } from "./nameplateFonts";
import type { NameplateGlowId } from "./nameplateGlows";
import { NameplateFace } from "./NameplateFace";
import { cn } from "@/lib/utils";

const CORNER_LABELS = ["TL", "TR", "BR", "BL"] as const;

type Props = {
  styleId: NameplateStyleId;
  fontId?: NameplateFontId;
  glowId?: NameplateGlowId;
  /** Leave odd bays empty so bare doors show (before state) */
  showEmptyBays?: boolean;
  /** Show door-quad outlines */
  showQuads?: boolean;
  /** Drag corners to tweak a selected bay */
  tweakMode?: boolean;
  selectedBayId?: string | null;
  onSelectBay?: (bayId: string) => void;
  onQuadsChange?: (quads: Record<string, NameplateQuadPct>) => void;
  className?: string;
  /** Override quads (defaults to localStorage → baked) */
  quads?: Record<string, NameplateQuadPct>;
};

/**
 * Full locker plate with corner-pinned nameplates for every calibrated bay.
 */
export function NameplateRoomPreview({
  styleId,
  fontId = "oswald",
  glowId = "spot-soft",
  showEmptyBays = false,
  showQuads = false,
  tweakMode = false,
  selectedBayId = null,
  onSelectBay,
  onQuadsChange,
  className,
  quads: quadsProp,
}: Props) {
  const stageRef = useRef<HTMLDivElement>(null);
  const [stagePx, setStagePx] = useState({ w: 0, h: 0 });
  const [quads, setQuads] = useState<Record<string, NameplateQuadPct>>(
    () => quadsProp ?? {},
  );
  const dragRef = useRef<{ bayId: string; corner: number } | null>(null);
  const quadsRef = useRef(quads);
  quadsRef.current = quads;
  const style = getNameplateStyle(styleId);

  useEffect(() => {
    if (quadsProp) {
      setQuads(quadsProp);
      return;
    }
    setQuads(resolveNameplateQuads());
  }, [quadsProp]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      setStagePx({ w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const commitBay = useCallback(
    (bayId: string, quad: NameplateQuadPct) => {
      // Keep corner indices (TL/TR/BR/BL) — don't re-sort while dragging
      const next = upsertBayQuad(bayId, quad, { normalize: false });
      setQuads(next.quads);
      onQuadsChange?.(next.quads);
    },
    [onQuadsChange],
  );

  const clientToPct = useCallback((clientX: number, clientY: number): Pt | null => {
    const el = stageRef.current;
    if (!el) return null;
    const r = el.getBoundingClientRect();
    if (r.width < 1 || r.height < 1) return null;
    return {
      x: Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)),
      y: Math.max(0, Math.min(100, ((clientY - r.top) / r.height) * 100)),
    };
  }, []);

  useEffect(() => {
    if (!tweakMode) return;
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const pt = clientToPct(e.clientX, e.clientY);
      if (!pt) return;
      setQuads((prev) => {
        const cur = prev[drag.bayId];
        if (!isCompleteQuad(cur)) return prev;
        const next = [...cur] as NameplateQuadPct;
        next[drag.corner] = pt;
        return { ...prev, [drag.bayId]: next };
      });
    };
    const onUp = () => {
      const drag = dragRef.current;
      if (!drag) return;
      dragRef.current = null;
      const cur = quadsRef.current[drag.bayId];
      if (isCompleteQuad(cur)) commitBay(drag.bayId, cur);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    return () => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
    };
  }, [tweakMode, clientToPct, commitBay]);

  return (
    <div
      ref={stageRef}
      className={cn(
        "relative aspect-[16/9] w-full overflow-hidden bg-[#15171a]",
        tweakMode ? "cursor-crosshair" : "",
        className,
      )}
    >
      <Image
        src={NAMEPLATE_PLATE_SRC}
        alt=""
        fill
        priority
        unoptimized
        sizes="100vw"
        className="pointer-events-none object-fill"
      />

      {(showQuads || tweakMode) && (
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
        >
          {NAMEPLATE_BAY_IDS.map((id) => {
            const q = quads[id];
            if (!isCompleteQuad(q)) return null;
            const active = id === selectedBayId;
            return (
              <polygon
                key={id}
                points={q.map((p) => `${p.x},${p.y}`).join(" ")}
                fill={
                  active
                    ? "rgba(251,113,133,0.2)"
                    : "rgba(52,211,153,0.08)"
                }
                stroke={active ? "#fb7185" : "rgba(52,211,153,0.55)"}
                strokeWidth={active ? 0.35 : 0.18}
                vectorEffect="non-scaling-stroke"
                className={tweakMode ? "cursor-pointer" : "pointer-events-none"}
                onClick={(e) => {
                  if (!tweakMode) return;
                  e.stopPropagation();
                  onSelectBay?.(id);
                }}
              />
            );
          })}
        </svg>
      )}

      {stagePx.w > 0 &&
        NAMEPLATE_DEMO_CAST.map((player, i) => {
          // Odd indices stay empty → bare door = "before pick"
          if (showEmptyBays && i % 2 === 1) return null;
          const q = quads[player.bayId];
          if (!q) return null;
          const m = cssMatrix3dFromQuadPct(
            q,
            stagePx.w,
            stagePx.h,
            style.faceW,
            style.faceH,
          );
          if (!m) return null;
          const dim =
            tweakMode &&
            selectedBayId &&
            selectedBayId !== player.bayId;
          return (
            <div
              key={player.bayId}
              className="pointer-events-none absolute left-0 top-0"
              style={{
                width: style.faceW,
                height: style.faceH,
                transform: m,
                transformOrigin: "0 0",
                opacity: dim ? 0.35 : 1,
              }}
            >
              <NameplateFace
                styleId={styleId}
                fontId={fontId}
                glowId={glowId}
                name={player.name}
                number={player.number}
                short={player.short}
                badgeCode={player.badgeCode}
              />
            </div>
          );
        })}

      {/* Corner drag handles for selected bay */}
      {tweakMode &&
        selectedBayId &&
        isCompleteQuad(quads[selectedBayId]) &&
        quads[selectedBayId]!.map((p, i) => (
          <button
            key={`${selectedBayId}-${i}`}
            type="button"
            aria-label={`${selectedBayId} ${CORNER_LABELS[i]}`}
            className="absolute z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-rose-500 shadow-md"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
            onPointerDown={(e) => {
              e.preventDefault();
              e.stopPropagation();
              dragRef.current = { bayId: selectedBayId, corner: i };
            }}
          >
            <span className="pointer-events-none absolute left-4 top-[-2px] font-mono text-[9px] font-bold text-rose-200">
              {CORNER_LABELS[i]}
            </span>
          </button>
        ))}
    </div>
  );
}
