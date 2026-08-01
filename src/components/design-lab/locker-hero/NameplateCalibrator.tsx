"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import Link from "next/link";
import Image from "next/image";
import type { Pt } from "./perspectiveWarp";
import { HANG_BAYS } from "./hangBays";
import {
  NAMEPLATE_BAY_IDS,
  NAMEPLATE_CORNER_ORDER,
  NAMEPLATE_PLATE_SRC,
  calibrationToTsModule,
  cssMatrix3dFromQuadPct,
  emptyCalibration,
  isCompleteQuad,
  loadCalibration,
  normalizeCalibration,
  normalizeNameplateQuad,
  saveCalibration,
  type NameplateCalibration,
  type NameplateCornerId,
  type NameplateQuadPct,
} from "./nameplateQuads";
import { cn } from "@/lib/utils";

const SAMPLE_NAMES = [
  "HAALAND",
  "PALMER",
  "SALIBA",
  "SAKA",
  "PICKFORD",
  "SON",
  "ISAK",
  "GABRIEL",
  "WATKINS",
  "SZOBOSZLAI",
  "GUEHI",
  "BRUNO",
  "VAN DIJK",
  "TRENT",
] as const;

function cornerLabel(i: number): NameplateCornerId {
  return NAMEPLATE_CORNER_ORDER[i] ?? "TL";
}

function downloadText(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

const PREVIEW_SRC = { w: 200, h: 48 } as const;

export function NameplateCalibrator() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<NameplateCalibration>(() =>
    emptyCalibration(),
  );
  const [bayIndex, setBayIndex] = useState(0);
  const [draft, setDraft] = useState<Pt[]>([]);
  const [showGuides, setShowGuides] = useState(true);
  const [showPreview, setShowPreview] = useState(true);
  const [copied, setCopied] = useState<"json" | "ts" | null>(null);
  const [hydrated, setHydrated] = useState(false);
  const [stagePx, setStagePx] = useState({ w: 0, h: 0 });

  const bayId = NAMEPLATE_BAY_IDS[bayIndex] ?? "h1";
  const saved = data.quads[bayId];
  const activeCorners = draft.length > 0 ? draft : saved ?? [];
  const doneCount = NAMEPLATE_BAY_IDS.filter((id) =>
    isCompleteQuad(data.quads[id]),
  ).length;

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.has("fresh")) {
      const empty = emptyCalibration();
      saveCalibration(empty);
      setData(empty);
      setDraft([]);
      setBayIndex(0);
      setHydrated(true);
      // Drop ?fresh from URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("fresh");
      window.history.replaceState({}, "", url.pathname);
      return;
    }
    setData(normalizeCalibration(loadCalibration()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveCalibration(data);
  }, [data, hydrated]);

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

  // Reset draft when switching bays
  useEffect(() => {
    setDraft([]);
  }, [bayIndex]);

  const persistQuad = useCallback(
    (id: string, quad: NameplateQuadPct | null) => {
      setData((prev) => {
        const quads = { ...prev.quads };
        if (quad) quads[id] = quad;
        else delete quads[id];
        return { ...prev, quads, updatedAt: new Date().toISOString() };
      });
    },
    [],
  );

  const advanceAfter = useCallback(
    (justFinishedId: string, nextQuads: Record<string, NameplateQuadPct>) => {
      const nextIncomplete = NAMEPLATE_BAY_IDS.findIndex(
        (id, i) => i > bayIndex && !isCompleteQuad(nextQuads[id]),
      );
      const wrap = NAMEPLATE_BAY_IDS.findIndex(
        (id) => id !== justFinishedId && !isCompleteQuad(nextQuads[id]),
      );
      window.setTimeout(() => {
        if (nextIncomplete >= 0) setBayIndex(nextIncomplete);
        else if (wrap >= 0) setBayIndex(wrap);
      }, 80);
    },
    [bayIndex],
  );

  const onStageClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const el = stageRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const x = ((e.clientX - rect.left) / rect.width) * 100;
      const y = ((e.clientY - rect.top) / rect.height) * 100;
      const pt: Pt = {
        x: Math.max(0, Math.min(100, x)),
        y: Math.max(0, Math.min(100, y)),
      };

      setDraft((prev) => {
        // Fresh click on a completed bay starts a rewrite
        const working =
          prev.length === 0 && isCompleteQuad(saved)
            ? [pt]
            : [...prev, pt];
        if (working.length < 4) return working;
        const quad = normalizeNameplateQuad(working.slice(0, 4));
        setData((prevData) => {
          const quads = { ...prevData.quads, [bayId]: quad };
          const next = {
            ...prevData,
            quads,
            updatedAt: new Date().toISOString(),
          };
          advanceAfter(bayId, quads);
          return next;
        });
        return [];
      });
    },
    [advanceAfter, bayId, saved],
  );

  const undo = useCallback(() => {
    if (draft.length > 0) {
      setDraft((d) => d.slice(0, -1));
      return;
    }
    if (isCompleteQuad(saved)) {
      persistQuad(bayId, null);
      setDraft([]);
    }
  }, [bayId, draft.length, persistQuad, saved]);

  const clearBay = useCallback(() => {
    persistQuad(bayId, null);
    setDraft([]);
  }, [bayId, persistQuad]);

  const clearAll = useCallback(() => {
    if (!window.confirm("Clear all 14 nameplate quads?")) return;
    setData(emptyCalibration());
    setDraft([]);
    setBayIndex(0);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      if (e.key === "z" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === "Backspace" || e.key === "z") {
        e.preventDefault();
        undo();
        return;
      }
      if (e.key === "ArrowRight" || e.key === "Enter") {
        e.preventDefault();
        setBayIndex((i) => Math.min(NAMEPLATE_BAY_IDS.length - 1, i + 1));
        return;
      }
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        setBayIndex((i) => Math.max(0, i - 1));
        return;
      }
      if (e.key === "Escape") {
        setDraft([]);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo]);

  const exportJson = useMemo(() => JSON.stringify(data, null, 2), [data]);
  const exportTs = useMemo(() => calibrationToTsModule(data), [data]);

  const copy = async (kind: "json" | "ts") => {
    const text = kind === "json" ? exportJson : exportTs;
    await navigator.clipboard.writeText(text);
    setCopied(kind);
    window.setTimeout(() => setCopied(null), 1600);
  };

  const nextCorner = cornerLabel(activeCorners.length);

  return (
    <div className="flex h-dvh flex-col bg-[#0c0d0f] text-white">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            Design Lab · Nameplate calibrator
          </p>
          <h1 className="truncate text-sm font-semibold tracking-tight">
            Manual doors · click 4 inner corners (any order — we normalize)
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-sm border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 font-mono text-[11px] text-emerald-300">
            {doneCount}/14 done
          </span>
          <Link
            href="/design-lab/locker-hero/nameplates?fresh=1"
            className="rounded-sm border border-rose-400/30 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-rose-300/90 hover:border-rose-400/50"
          >
            Start fresh
          </Link>
          <Link
            href="/design-lab/locker-hero?kits=1"
            className="rounded-sm border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55 hover:border-white/30 hover:text-white"
          >
            ← Locker hero
          </Link>
          {doneCount === 14 && (
            <Link
              href="/design-lab/locker-hero/nameplates/styles"
              className="rounded-sm border border-emerald-400/40 bg-emerald-400/10 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300 hover:bg-emerald-400/20"
            >
              Preview cards →
            </Link>
          )}
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* Stage */}
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[#15171a] p-3 sm:p-5">
          <div
            ref={stageRef}
            role="application"
            aria-label="Nameplate corner picker"
            onClick={onStageClick}
            className="relative aspect-[16/9] w-full max-h-full cursor-crosshair overflow-hidden rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.12)]"
          >
            <Image
              src={NAMEPLATE_PLATE_SRC}
              alt="Locker plate v25"
              fill
              priority
              unoptimized
              sizes="100vw"
              className="pointer-events-none object-fill"
            />

            {/* Hang guides */}
            {showGuides &&
              HANG_BAYS.map((b, i) => {
                const active = i === bayIndex;
                return (
                  <div key={b.id} className="pointer-events-none absolute inset-0">
                    <div
                      className={cn(
                        "absolute top-0 h-full w-px",
                        active ? "bg-rose-400/80" : "bg-white/10",
                      )}
                      style={{ left: `${b.left}%` }}
                    />
                    {active && (
                      <>
                        {/* Suggested door band from current HangIdentity heuristic */}
                        <div
                          className="absolute border border-dashed border-rose-400/45 bg-rose-400/5"
                          style={{
                            left: `${b.left - b.width * 0.55}%`,
                            top: `${b.top - 14.6}%`,
                            width: `${b.width * 1.1}%`,
                            height: "3.2%",
                          }}
                        />
                        <div
                          className="absolute -translate-x-1/2 -translate-y-full rounded bg-rose-500 px-1.5 py-0.5 font-mono text-[9px] font-bold text-white"
                          style={{ left: `${b.left}%`, top: `${b.top - 14.6}%` }}
                        >
                          {b.id}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}

            {/* Saved + draft quads */}
            <svg
              className="pointer-events-none absolute inset-0 h-full w-full"
              viewBox="0 0 100 100"
              preserveAspectRatio="none"
            >
              {NAMEPLATE_BAY_IDS.map((id, i) => {
                const q = data.quads[id];
                if (!isCompleteQuad(q)) return null;
                const active = id === bayId && draft.length === 0;
                const pts = q.map((p) => `${p.x},${p.y}`).join(" ");
                return (
                  <polygon
                    key={id}
                    points={pts}
                    fill={
                      active
                        ? "rgba(244,63,94,0.18)"
                        : "rgba(52,211,153,0.12)"
                    }
                    stroke={active ? "#fb7185" : "#34d399"}
                    strokeWidth={active ? 0.35 : 0.2}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
              {draft.length >= 2 && (
                <polyline
                  points={draft.map((p) => `${p.x},${p.y}`).join(" ")}
                  fill="none"
                  stroke="#fbbf24"
                  strokeWidth={0.35}
                  vectorEffect="non-scaling-stroke"
                />
              )}
              {draft.map((p, i) => (
                <g key={`d-${i}`}>
                  <circle cx={p.x} cy={p.y} r={0.55} fill="#fbbf24" />
                  <text
                    x={p.x + 0.7}
                    y={p.y - 0.5}
                    fill="#fbbf24"
                    fontSize="1.4"
                    fontFamily="ui-monospace, monospace"
                  >
                    {cornerLabel(i)}
                  </text>
                </g>
              ))}
            </svg>

            {/* Live name preview on completed quads (corner-pin) */}
            {showPreview &&
              stagePx.w > 0 &&
              NAMEPLATE_BAY_IDS.map((id, i) => {
                const q = data.quads[id];
                if (!isCompleteQuad(q)) return null;
                if (id === bayId && draft.length > 0) return null;
                const m = cssMatrix3dFromQuadPct(
                  q,
                  stagePx.w,
                  stagePx.h,
                  PREVIEW_SRC.w,
                  PREVIEW_SRC.h,
                );
                if (!m) return null;
                const name = SAMPLE_NAMES[i % SAMPLE_NAMES.length]!;
                return (
                  <div
                    key={`prev-${id}`}
                    className="pointer-events-none absolute left-0 top-0"
                    style={{
                      width: PREVIEW_SRC.w,
                      height: PREVIEW_SRC.h,
                      transform: m,
                      transformOrigin: "0 0",
                    }}
                  >
                    <div className="flex h-full w-full items-center gap-2 px-2.5">
                      <div className="h-[58%] w-[18%] shrink-0 rounded-[3px] bg-[#0b0c0e]/75 ring-1 ring-white/30" />
                      <span className="min-w-0 truncate text-[22px] font-black uppercase leading-none tracking-[0.06em] text-[#0b0c0e]/90">
                        {name}
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* HUD */}
            <div className="pointer-events-none absolute left-3 top-3 rounded-sm bg-black/65 px-2.5 py-1.5 font-mono text-[11px] text-white/85 backdrop-blur-sm">
              <span className="text-rose-300">{bayId}</span>
              {" · next "}
              <span className="font-bold text-amber-300">{nextCorner}</span>
              {activeCorners.length > 0 && activeCorners.length < 4 && (
                <span className="text-white/45">
                  {" "}
                  ({activeCorners.length}/4)
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Side panel */}
        <aside className="flex w-full shrink-0 flex-col border-t border-white/10 lg:w-[300px] lg:border-l lg:border-t-0">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-[11px] leading-relaxed text-white/50">
              Zoom in the browser if needed. Click the{" "}
              <span className="text-white/80">inner corners</span> of each light
              door panel. Order can be any — we sort to TL/TR/BR/BL. When all 14
              are green: <span className="text-white/75">Copy JSON</span> and
              paste it here.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <label className="flex items-center gap-1.5 font-mono text-[10px] text-white/55">
                <input
                  type="checkbox"
                  checked={showGuides}
                  onChange={(e) => setShowGuides(e.target.checked)}
                />
                Guides
              </label>
              <label className="flex items-center gap-1.5 font-mono text-[10px] text-white/55">
                <input
                  type="checkbox"
                  checked={showPreview}
                  onChange={(e) => setShowPreview(e.target.checked)}
                />
                Name preview
              </label>
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
            <ul className="space-y-0.5">
              {NAMEPLATE_BAY_IDS.map((id, i) => {
                const complete = isCompleteQuad(data.quads[id]);
                const active = i === bayIndex;
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onClick={() => setBayIndex(i)}
                      className={cn(
                        "flex w-full items-center justify-between rounded-sm px-2.5 py-1.5 text-left font-mono text-[11px] transition",
                        active
                          ? "bg-rose-500/20 text-rose-100"
                          : "text-white/60 hover:bg-white/5 hover:text-white/85",
                      )}
                    >
                      <span>
                        {String(i + 1).padStart(2, "0")} · {id}
                        {i < 11 ? " · XI" : " · bench"}
                      </span>
                      <span
                        className={cn(
                          "text-[10px]",
                          complete ? "text-emerald-400" : "text-white/25",
                        )}
                      >
                        {complete ? "●" : "○"}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-2 border-t border-white/10 p-3">
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={undo}
                className="rounded-sm border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/70 hover:border-white/30"
              >
                Undo
              </button>
              <button
                type="button"
                onClick={clearBay}
                className="rounded-sm border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/70 hover:border-white/30"
              >
                Clear bay
              </button>
              <button
                type="button"
                onClick={clearAll}
                className="rounded-sm border border-rose-400/25 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-rose-300/80 hover:border-rose-400/50"
              >
                Clear all
              </button>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => copy("json")}
                className="rounded-sm border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-emerald-300 hover:bg-emerald-400/20"
              >
                {copied === "json" ? "Copied JSON" : "Copy JSON"}
              </button>
              <button
                type="button"
                onClick={() => copy("ts")}
                className="rounded-sm border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/70 hover:border-white/30"
              >
                {copied === "ts" ? "Copied TS" : "Copy TS"}
              </button>
              <button
                type="button"
                onClick={() =>
                  downloadText("nameplate-quads-v25.json", exportJson)
                }
                className="rounded-sm border border-white/15 px-2 py-1 font-mono text-[10px] uppercase tracking-wider text-white/70 hover:border-white/30"
              >
                Download
              </button>
            </div>
            <p className="font-mono text-[9px] leading-relaxed text-white/30">
              ← → bay · Z / ⌫ undo · Esc cancel draft · auto-saves to
              localStorage
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
