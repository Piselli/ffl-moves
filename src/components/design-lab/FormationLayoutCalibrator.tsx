"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  DEFAULT_FORMATION,
  FORMATION_OPTIONS,
  PITCH_SLOT_LAYOUTS,
  slotPosition,
  type FormationId,
  type PitchSlotAnchor,
  type PositionKey,
} from "@/lib/formation";
import { homeTeamDraftKey, readRestoredTeamDraft } from "@/lib/teamDraftStorage";
import type { Player } from "@/lib/types";
import { cn } from "@/lib/utils";
import { clubKitFor } from "@/components/design-lab/locker-hero/clubKitColors";
import { pl2627HomeKit } from "@/components/design-lab/locker-hero/pl2627HomeKits";
import { PitchChipCutout } from "@/components/design-lab/locker-hero/PitchChipCutout";
import { getPitchChipFont } from "@/components/design-lab/locker-hero/pitchChipFonts";
import { fitPitchName } from "@/components/design-lab/locker-hero/pitchChipName";
import { getPitchStyle } from "@/components/design-lab/locker-hero/pitchStyles";

type DragState = {
  formationIndex: number;
  pointerId: number;
};

const STORAGE_KEY = "ffl:design-lab:formation-layout:v6";

/**
 * Match homepage tablet/desktop pitch chips (non-compact) — cutout 56, plate 76.
 * Mobile compact+0.78 made calibrator chips ~half the UX size, so wings
 * couldn't be judged. Pitch ~450×550 ≈ homepage center-column feel.
 */
const PHONE_PITCH_W = 450;
const PHONE_PITCH_H = 550;
const CHIP_H = 100; // ≈ clamp(88px, 27vw, 108px) mid
const CHIP_W = 72; // ≈ clamp(60px, 20vw, 82px) mid
const CUTOUT = 56;
const PLATE_W = 76;
const TEXT_W = 70;
const FONT_SIZE = 10.5;
const FRINGE_H = 32; // md:pb-8

function cloneLayout(id: FormationId): PitchSlotAnchor[] {
  return PITCH_SLOT_LAYOUTS[id].map((s) => ({ ...s }));
}

function round1(n: number) {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function layoutToTs(id: FormationId, slots: PitchSlotAnchor[]): string {
  const lines = slots
    .map(
      (s) =>
        `    { formationIndex: ${s.formationIndex}, leftPct: ${round1(s.leftPct)}, topPct: ${round1(s.topPct)} },`,
    )
    .join("\n");
  return `  "${id}": [\n${lines}\n  ],`;
}

/** Outer slots of a flat 5-across line (for optional drag-filter). */
function wingIndices(id: FormationId): Set<number> {
  if (id === "5-3-2") return new Set([1, 5]);
  if (id === "3-5-2") return new Set([4, 8]);
  return new Set();
}

function clubShort(player: Player): string {
  const kit = pl2627HomeKit(player.teamId);
  if (kit?.short) return kit.short;
  const t = player.team.trim();
  return t.length <= 3 ? t.toUpperCase() : t.slice(0, 3).toUpperCase();
}

function clubFooterColors(teamId: number): { bg: string; fg: string } {
  const colors = clubKitFor(teamId);
  const primary = colors.primary;
  const n = primary.replace("#", "");
  const lum = (() => {
    if (n.length !== 6) return 0.4;
    const r = parseInt(n.slice(0, 2), 16);
    const g = parseInt(n.slice(2, 4), 16);
    const b = parseInt(n.slice(4, 6), 16);
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  })();
  if (lum > 0.72) {
    return { bg: colors.secondary, fg: "#111111" };
  }
  return { bg: primary, fg: "#FFFFFF" };
}

function RealChip({ player }: { player: Player }) {
  const name = player.webName ?? player.name;
  const club = clubShort(player);
  const footer = clubFooterColors(player.teamId);
  const font = getPitchChipFont();
  const { label } = fitPitchName(name, {
    widthPx: TEXT_W,
    fontFamily: font.family,
    weight: font.weight,
    letterSpacing: font.tracking,
    fixedSize: FONT_SIZE,
    allowAbbreviate: false,
  });

  return (
    <span className="pointer-events-none flex flex-col items-center">
      <PitchChipCutout player={player} name={name} size={CUTOUT} />
      <span
        className="flex flex-col overflow-hidden rounded-[3px]"
        style={{
          width: PLATE_W,
          background: footer.bg,
          boxShadow: "0 2px 6px rgba(0,0,0,0.45)",
        }}
      >
        <span
          className="flex h-[18px] items-center justify-center bg-white px-[3px]"
          style={{ marginBottom: -1 }}
        >
          <span
            className="block text-center"
            style={{
              width: TEXT_W,
              fontSize: FONT_SIZE,
              lineHeight: 1.2,
              fontFamily: font.family,
              fontWeight: font.weight,
              letterSpacing: font.tracking,
              color: "#0a0a0a",
              whiteSpace: "nowrap",
            }}
          >
            {label}
          </span>
        </span>
        <span
          className="flex h-[12px] items-center justify-center px-[3px] text-[8px] font-bold uppercase"
          style={{
            background: footer.bg,
            color: footer.fg,
            fontFamily: font.family,
            letterSpacing: "0.08em",
          }}
        >
          {club}
        </span>
      </span>
    </span>
  );
}

function EmptyChip({ pos }: { pos: PositionKey }) {
  return (
    <span className="pointer-events-none flex flex-col items-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-white/90 bg-black/40 text-[12px] font-bold text-white">
        +
      </span>
      <span className="mt-0.5 rounded bg-white px-2 py-0.5 text-[10px] font-bold uppercase text-black">
        {pos} pick
      </span>
    </span>
  );
}

function pickSampleStarters(
  catalog: Player[],
  formationId: FormationId,
): (Player | null)[] {
  const byPos: Record<PositionKey, Player[]> = {
    GK: [],
    DEF: [],
    MID: [],
    FWD: [],
  };
  for (const p of catalog) {
    if (p.status != null && p.status !== "a" && p.status !== "d") continue;
    byPos[p.position]?.push(p);
  }
  for (const key of Object.keys(byPos) as PositionKey[]) {
    byPos[key].sort(
      (a, b) => (b.selectedByPercent ?? 0) - (a.selectedByPercent ?? 0),
    );
  }
  const used = new Set<number>();
  const out: (Player | null)[] = Array(11).fill(null);
  for (let i = 0; i < 11; i++) {
    const pos = slotPosition(i, formationId);
    const pick = byPos[pos].find((p) => !used.has(p.id));
    if (pick) {
      used.add(pick.id);
      out[i] = pick;
    }
  }
  return out;
}

function loadStoredLayouts(): Record<FormationId, PitchSlotAnchor[]> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, PitchSlotAnchor[]>;
    const out = {} as Record<FormationId, PitchSlotAnchor[]>;
    for (const id of FORMATION_OPTIONS) {
      out[id] = Array.isArray(parsed[id]) ? parsed[id]! : cloneLayout(id);
    }
    return out;
  } catch {
    return null;
  }
}

export function FormationLayoutCalibrator() {
  const pitch = getPitchStyle("night-turf");
  const [formationId, setFormationId] = useState<FormationId>("5-3-2");
  const [layouts, setLayouts] = useState<Record<FormationId, PitchSlotAnchor[]>>(
    () => {
      const init = {} as Record<FormationId, PitchSlotAnchor[]>;
      for (const id of FORMATION_OPTIONS) init[id] = cloneLayout(id);
      return init;
    },
  );
  const [starters, setStarters] = useState<(Player | null)[]>(Array(11).fill(null));
  const [selected, setSelected] = useState<number | null>(null);
  const [wingsOnly, setWingsOnly] = useState(true);
  const [copied, setCopied] = useState(false);
  const playableRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<DragState | null>(null);

  const slots = layouts[formationId];
  const wings = wingIndices(formationId);

  useEffect(() => {
    const stored = loadStoredLayouts();
    if (stored) setLayouts(stored);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(layouts));
    } catch {
      /* ignore */
    }
  }, [layouts]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/players", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as Player[];
        if (cancelled || !Array.isArray(data)) return;
        const draft = readRestoredTeamDraft(homeTeamDraftKey(), data);
        if (draft && draft.starters.some(Boolean)) {
          setStarters(draft.starters);
        } else {
          setStarters(pickSampleStarters(data, formationId));
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const canDrag = useCallback(
    (formationIndex: number) => {
      if (!wingsOnly) return true;
      if (wings.size === 0) return true;
      return wings.has(formationIndex);
    },
    [wingsOnly, wings],
  );

  const resetCurrent = useCallback(() => {
    setLayouts((prev) => ({
      ...prev,
      [formationId]: cloneLayout(formationId),
    }));
  }, [formationId]);

  const moveSlot = useCallback(
    (formationIndex: number, leftPct: number, topPct: number) => {
      if (!canDrag(formationIndex)) return;
      setLayouts((prev) => ({
        ...prev,
        [formationId]: prev[formationId].map((s) =>
          s.formationIndex === formationIndex
            ? {
                ...s,
                leftPct: round1(clamp(leftPct, 4, 96)),
                topPct: round1(clamp(topPct, 6, 96)),
              }
            : s,
        ),
      }));
    },
    [formationId, canDrag],
  );

  const onPointerDown = (e: React.PointerEvent, formationIndex: number) => {
    if (!canDrag(formationIndex)) return;
    e.preventDefault();
    e.currentTarget.setPointerCapture(e.pointerId);
    dragRef.current = { formationIndex, pointerId: e.pointerId };
    setSelected(formationIndex);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    const playable = playableRef.current;
    if (!playable) return;
    const rect = playable.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;
    moveSlot(
      drag.formationIndex,
      ((e.clientX - rect.left) / rect.width) * 100,
      ((e.clientY - rect.top) / rect.height) * 100,
    );
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag || drag.pointerId !== e.pointerId) return;
    dragRef.current = null;
    try {
      e.currentTarget.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (selected == null || !canDrag(selected)) return;
      const step = e.shiftKey ? 2 : 0.5;
      const slot = layouts[formationId].find((s) => s.formationIndex === selected);
      if (!slot) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        moveSlot(selected, slot.leftPct - step, slot.topPct);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        moveSlot(selected, slot.leftPct + step, slot.topPct);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        moveSlot(selected, slot.leftPct, slot.topPct - step);
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        moveSlot(selected, slot.leftPct, slot.topPct + step);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selected, layouts, formationId, moveSlot, canDrag]);

  const exportText = useMemo(
    () => layoutToTs(formationId, slots),
    [formationId, slots],
  );

  const copyExport = async () => {
    try {
      await navigator.clipboard.writeText(exportText);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      /* ignore */
    }
  };

  const refillSample = async () => {
    try {
      const res = await fetch("/api/players", { cache: "no-store" });
      if (!res.ok) return;
      const data = (await res.json()) as Player[];
      const draft = readRestoredTeamDraft(homeTeamDraftKey(), data);
      if (draft && draft.starters.some(Boolean)) {
        setStarters(draft.starters);
      } else {
        setStarters(pickSampleStarters(data, formationId));
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0c0b] text-white">
      <header className="sticky top-0 z-30 border-b border-white/10 bg-[#0a0c0b]/92 backdrop-blur-md">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-[#00f948]/80">
              Temp · full-size chips · delete after use
            </p>
            <h1 className="text-base font-semibold">Formation layout calibrator</h1>
          </div>
          <Link
            href="/"
            className="rounded-full border border-white/15 px-3 py-1.5 text-[11px] text-white/70 hover:bg-white/5 hover:text-white"
          >
            ← Home
          </Link>
        </div>
      </header>

      <main className="mx-auto grid max-w-5xl gap-4 px-4 py-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <section className="space-y-3">
          <div className="flex flex-wrap gap-1.5">
            {FORMATION_OPTIONS.map((id) => (
              <button
                key={id}
                type="button"
                onClick={() => {
                  setFormationId(id);
                  setSelected(null);
                }}
                className={cn(
                  "rounded-full px-3 py-1.5 text-[11px] font-bold uppercase tracking-wide",
                  id === formationId
                    ? "bg-white text-black"
                    : "border border-white/15 text-white/70 hover:bg-white/5",
                )}
              >
                {id}
              </button>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-full border border-white/15 bg-white/[0.03] px-3 py-1.5">
              <input
                type="checkbox"
                checked={wingsOnly}
                onChange={(e) => setWingsOnly(e.target.checked)}
                className="accent-[#00f948]"
              />
              Drag wings only (center + GK locked)
            </label>
            <button
              type="button"
              onClick={resetCurrent}
              className="rounded-full border border-amber-400/30 px-3 py-1.5 text-amber-200 hover:bg-amber-400/10"
            >
              Reset {formationId}
            </button>
            <button
              type="button"
              onClick={refillSample}
              className="rounded-full border border-white/15 px-3 py-1.5 text-white/70 hover:bg-white/5"
            >
              Reload squad
            </button>
          </div>

          <p className="text-[12px] text-white/50">
            Chips = full homepage size (cutout 56 · plate 76 · no 0.78 shrink).
            Pitch {PHONE_PITCH_W}×{PHONE_PITCH_H}. Coords on selected only.
          </p>

          {/* Exact phone pitch frame */}
          <div
            className={cn(
              "relative mx-auto overflow-hidden rounded-2xl ring-1",
              pitch.ring,
            )}
            style={{
              width: PHONE_PITCH_W,
              height: PHONE_PITCH_H,
              maxWidth: "100%",
              background: pitch.base,
              boxShadow: pitch.shadow,
            }}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerCancel={onPointerUp}
          >
            {pitch.image ? (
              <div
                aria-hidden
                className="pointer-events-none absolute inset-0 scale-[1.02]"
                style={{
                  backgroundImage: `url(${pitch.image})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                  filter: pitch.imageFilter,
                }}
              />
            ) : null}
            {(pitch.overlays ?? []).map((bg, i) => (
              <div
                key={i}
                aria-hidden
                className="pointer-events-none absolute inset-0"
                style={{ background: bg }}
              />
            ))}

            {/* chalk — same as LockerTablet */}
            <div
              className="pointer-events-none absolute inset-[5%] rounded-[2px] border-2"
              style={{ borderColor: pitch.chalk }}
            >
              <div
                className="absolute inset-x-0 top-1/2 h-[1.5px] -translate-y-1/2"
                style={{ background: pitch.chalk }}
              />
              <div
                className="absolute left-1/2 top-1/2 aspect-square w-[26%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2"
                style={{ borderColor: pitch.chalk }}
              />
              <div
                className="absolute left-1/2 top-0 h-[11%] w-[48%] -translate-x-1/2 border-x-2 border-b-2"
                style={{ borderColor: pitch.chalk }}
              />
              <div
                className="absolute bottom-0 left-1/2 h-[11%] w-[48%] -translate-x-1/2 border-x-2 border-t-2"
                style={{ borderColor: pitch.chalk }}
              />
              <div
                className="absolute left-1/2 top-0 h-[6%] w-[22%] -translate-x-1/2 border-x-2 border-b-2"
                style={{ borderColor: pitch.chalk }}
              />
              <div
                className="absolute bottom-0 left-1/2 h-[6%] w-[22%] -translate-x-1/2 border-x-2 border-t-2"
                style={{ borderColor: pitch.chalk }}
              />
            </div>

            {/* Fake fringe strip — same reserved band as homepage pb-7 */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex items-center justify-between px-2"
              style={{ height: FRINGE_H }}
            >
              <span className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black shadow">
                {formationId} ▾
              </span>
              <span className="rounded-full border border-white/20 bg-black/45 px-2 py-0.5 text-[8px] text-white/50">
                fringe
              </span>
            </div>

            {/* Playable green — % coords match homepage after fringe fix */}
            <div
              ref={playableRef}
              className="absolute inset-x-0 top-0 z-10"
              style={{ bottom: FRINGE_H }}
            >
              {slots.map((slot) => {
                const pos = slotPosition(slot.formationIndex, formationId);
                const player = starters[slot.formationIndex];
                const on = selected === slot.formationIndex;
                const draggable = canDrag(slot.formationIndex);
                return (
                  <button
                    key={slot.formationIndex}
                    type="button"
                    onPointerDown={(e) => onPointerDown(e, slot.formationIndex)}
                    onClick={() => setSelected(slot.formationIndex)}
                    className={cn(
                      "absolute flex -translate-x-1/2 -translate-y-1/2 touch-none flex-col items-center justify-center overflow-visible rounded-xl bg-transparent",
                      draggable
                        ? "cursor-grab active:cursor-grabbing"
                        : "cursor-default",
                      on && "z-20",
                      !draggable && "opacity-90",
                    )}
                    style={{
                      left: `${slot.leftPct}%`,
                      top: `${slot.topPct}%`,
                      width: CHIP_W,
                      height: CHIP_H,
                      zIndex: on ? 20 : 10,
                    }}
                    title={`#${slot.formationIndex} ${pos} · ${round1(slot.leftPct)}/${round1(slot.topPct)}${draggable ? "" : " · locked"}`}
                  >
                    <span className="flex flex-col items-center">
                      {player ? (
                        <RealChip player={player} />
                      ) : (
                        <EmptyChip pos={pos} />
                      )}
                    </span>
                    {on ? (
                      <span className="pointer-events-none absolute -bottom-3 rounded bg-[#00f948] px-1 py-px font-mono text-[8px] tabular-nums text-black">
                        {round1(slot.leftPct)}/{round1(slot.topPct)}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <aside className="space-y-3 lg:sticky lg:top-16 lg:self-start">
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3">
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/60">
                Export · {formationId}
              </p>
              <button
                type="button"
                onClick={copyExport}
                className="rounded-full bg-white px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-black"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <pre className="max-h-[45vh] overflow-auto rounded-xl bg-black/50 p-2 font-mono text-[10px] leading-relaxed text-emerald-200/90">
              {exportText}
            </pre>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-3 text-[11px] text-white/60">
            {selected != null ? (
              <>
                Selected #{selected} ({slotPosition(selected, formationId)})
                {!canDrag(selected) ? " · locked" : " · arrows nudge"}
              </>
            ) : (
              <>
                Tip: open this on a wide window; the pitch itself is fixed at{" "}
                {PHONE_PITCH_W}px — same as phone homepage. Default formation{" "}
                {DEFAULT_FORMATION}.
              </>
            )}
          </div>
        </aside>
      </main>
    </div>
  );
}
