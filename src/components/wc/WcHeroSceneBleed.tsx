"use client";

/** Deep black hero base — matches section, no colored glows */
const PAGE_BG = "#050608";

/** Ambient hero fill only — flags are in WcHeroFlagsPanel (grid column). */
export function WcHeroSceneBleed() {
  return (
    <div className="pointer-events-none absolute inset-0 z-0 bg-[#050608]" aria-hidden>
      <div
        className="absolute inset-x-0 bottom-0 h-[24%] min-h-[140px]"
        style={{ background: `linear-gradient(180deg, transparent 0%, ${PAGE_BG} 92%)` }}
      />
      <div className="absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#050608] to-transparent sm:h-20" />
    </div>
  );
}
