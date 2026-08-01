"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ACTIVE_NAMEPLATE_GLOW, SPOT_SOFT_GLOW } from "./nameplateGlows";
import { NAMEPLATE_BAY_IDS } from "./nameplateQuads";
import { NameplateRoomPreview } from "./NameplateRoomPreview";
import { cn } from "@/lib/utils";

export function NameplateStylePicker() {
  const [showEmptyBays, setShowEmptyBays] = useState(true);
  const [showQuads, setShowQuads] = useState(false);
  const [tweakMode, setTweakMode] = useState(false);
  const [selectedBayId, setSelectedBayId] = useState<string | null>("h1");

  useEffect(() => {
    if (tweakMode) setShowQuads(true);
  }, [tweakMode]);

  return (
    <div className="flex h-dvh flex-col bg-[#0c0d0f] text-white">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b border-white/10 px-4 py-3 sm:px-5">
        <div className="min-w-0 flex-1">
          <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-white/40">
            Design Lab · Nameplate · locked: spot-soft
          </p>
          <h1 className="truncate text-sm font-semibold tracking-tight">
            Number card · Oswald · black ink · spot-soft glow
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 font-mono text-[10px] text-white/50">
            <input
              type="checkbox"
              checked={showEmptyBays}
              onChange={(e) => setShowEmptyBays(e.target.checked)}
            />
            Show empty (before)
          </label>
          <label className="flex items-center gap-1.5 font-mono text-[10px] text-white/50">
            <input
              type="checkbox"
              checked={tweakMode}
              onChange={(e) => setTweakMode(e.target.checked)}
            />
            Tweak bays
          </label>
          <label className="flex items-center gap-1.5 font-mono text-[10px] text-white/50">
            <input
              type="checkbox"
              checked={showQuads}
              onChange={(e) => setShowQuads(e.target.checked)}
              disabled={tweakMode}
            />
            Show quads
          </label>
          <Link
            href="/design-lab/locker-hero?kits=1"
            className="rounded-sm border border-white/15 px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider text-white/55 hover:border-white/30 hover:text-white"
          >
            Locker hero
          </Link>
        </div>
      </header>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        <div className="relative flex min-h-0 flex-1 items-center justify-center bg-[#15171a] p-3 sm:p-5">
          <NameplateRoomPreview
            styleId="everton-card"
            fontId="oswald"
            glowId={ACTIVE_NAMEPLATE_GLOW}
            showEmptyBays={showEmptyBays}
            showQuads={showQuads}
            tweakMode={tweakMode}
            selectedBayId={selectedBayId}
            onSelectBay={setSelectedBayId}
            className="max-h-full rounded-sm shadow-[0_0_0_1px_rgba(255,255,255,0.1)]"
          />
        </div>

        <aside className="flex w-full shrink-0 flex-col border-t border-white/10 lg:w-[320px] lg:border-l lg:border-t-0">
          <div className="border-b border-white/10 px-4 py-3">
            <p className="text-[12px] font-medium text-white/85">
              {SPOT_SOFT_GLOW.name}
            </p>
            <p className="mt-1 text-[11px] leading-relaxed text-white/45">
              {SPOT_SOFT_GLOW.tagline}
            </p>
            <p className="mt-2 font-mono text-[10px] text-emerald-400/80">
              Glow · {SPOT_SOFT_GLOW.id} · locked
            </p>
          </div>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-3">
            {tweakMode && (
              <section>
                <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-rose-300/70">
                  Tweak bay · drag rose handles
                </p>
                <div className="grid grid-cols-4 gap-1">
                  {NAMEPLATE_BAY_IDS.map((id) => {
                    const on = id === selectedBayId;
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => setSelectedBayId(id)}
                        className={cn(
                          "rounded-sm border px-1 py-1.5 font-mono text-[10px] transition",
                          on
                            ? "border-rose-400/50 bg-rose-500/20 text-rose-100"
                            : "border-white/10 text-white/50 hover:border-white/25 hover:text-white/80",
                        )}
                      >
                        {id}
                      </button>
                    );
                  })}
                </div>
              </section>
            )}

            <section>
              <p className="mb-1.5 font-mono text-[9px] uppercase tracking-[0.18em] text-white/35">
                Locked glow
              </p>
              <div className="rounded-sm border border-emerald-400/40 bg-emerald-400/10 px-3 py-2.5">
                <div className="mb-2 h-7 overflow-hidden rounded-[2px] ring-1 ring-black/20">
                  <div
                    className="h-full w-full"
                    style={{
                      background: SPOT_SOFT_GLOW.background,
                      boxShadow: SPOT_SOFT_GLOW.boxShadow,
                      filter: SPOT_SOFT_GLOW.filter,
                    }}
                  />
                </div>
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[13px] font-semibold text-emerald-100">
                    {SPOT_SOFT_GLOW.name}
                  </span>
                  <span className="font-mono text-[9px] text-white/30">
                    {SPOT_SOFT_GLOW.id}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-white/40">
                  {SPOT_SOFT_GLOW.tagline}
                </p>
              </div>
            </section>
          </div>

          <div className="border-t border-white/10 p-3">
            <p className="text-[11px] leading-relaxed text-white/40">
              Production lock: number card · Oswald · black ·{" "}
              <span className="text-white/70">spot-soft</span>. Scene at{" "}
              <Link
                href="/design-lab/locker-hero?kits=1"
                className="text-emerald-300/80 underline-offset-2 hover:underline"
              >
                /design-lab/locker-hero
              </Link>
              .
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
