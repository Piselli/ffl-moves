"use client";

import { useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * The 48 nations of the 2026 finals — three confirmed hosts plus the strongest
 * confederation contenders. Real ISO flag artwork (public/flags/4x3), never the
 * warped clipart that used to sit baked into the hero plate.
 *
 * `gb-eng` / `gb-wls` are the proper home-nation files shipped in the flag set.
 */
const WC_NATIONS: { code: string; name: string }[] = [
  // Hosts
  { code: "ca", name: "Canada" },
  { code: "mx", name: "México" },
  { code: "us", name: "USA" },
  // UEFA
  { code: "fr", name: "France" },
  { code: "es", name: "Spain" },
  { code: "gb-eng", name: "England" },
  { code: "pt", name: "Portugal" },
  { code: "de", name: "Germany" },
  { code: "nl", name: "Netherlands" },
  { code: "it", name: "Italy" },
  { code: "be", name: "Belgium" },
  { code: "hr", name: "Croatia" },
  { code: "ch", name: "Switzerland" },
  { code: "dk", name: "Denmark" },
  { code: "rs", name: "Serbia" },
  { code: "pl", name: "Poland" },
  { code: "at", name: "Austria" },
  { code: "ua", name: "Ukraine" },
  { code: "tr", name: "Türkiye" },
  { code: "no", name: "Norway" },
  { code: "gb-wls", name: "Wales" },
  { code: "gb-sct", name: "Scotland" },
  // CONMEBOL
  { code: "br", name: "Brazil" },
  { code: "ar", name: "Argentina" },
  { code: "uy", name: "Uruguay" },
  { code: "co", name: "Colombia" },
  { code: "ec", name: "Ecuador" },
  { code: "cl", name: "Chile" },
  { code: "py", name: "Paraguay" },
  { code: "pe", name: "Peru" },
  // CAF
  { code: "ma", name: "Morocco" },
  { code: "sn", name: "Senegal" },
  { code: "ng", name: "Nigeria" },
  { code: "eg", name: "Egypt" },
  { code: "gh", name: "Ghana" },
  { code: "cm", name: "Cameroon" },
  { code: "ci", name: "Côte d'Ivoire" },
  { code: "dz", name: "Algeria" },
  { code: "tn", name: "Tunisia" },
  // AFC
  { code: "jp", name: "Japan" },
  { code: "kr", name: "South Korea" },
  { code: "ir", name: "Iran" },
  { code: "sa", name: "Saudi Arabia" },
  { code: "au", name: "Australia" },
  { code: "qa", name: "Qatar" },
  // CONCACAF
  { code: "cr", name: "Costa Rica" },
  { code: "pa", name: "Panama" },
  { code: "jm", name: "Jamaica" },
];

function FlagTile({ code, name }: { code: string; name: string }) {
  return (
    <span
      title={name}
      aria-label={name}
      className="group/flag relative block h-[30px] w-[42px] shrink-0 overflow-hidden rounded-[4px] ring-1 ring-white/15 shadow-[0_6px_14px_-4px_rgba(0,0,0,0.7)] sm:h-[34px] sm:w-[48px]"
    >
      <span
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: `url(/flags/4x3/${code}.svg)` }}
      />
      {/* glass gloss — the detail that lifts it above a flat icon */}
      <span className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/25 via-transparent to-black/25" />
      <span className="pointer-events-none absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/20 to-transparent" />
    </span>
  );
}

/**
 * Edge-faded marquee of the 48 finalists. One continuous loop (the list is
 * doubled), paused for `prefers-reduced-motion`. Sits low in the hero as the
 * "real flags" layer the cinematic trophy art no longer has to fake.
 */
export function WcFlagRibbon({ className }: { className?: string }) {
  const reduce = useReducedMotion();
  const loop = [...WC_NATIONS, ...WC_NATIONS];

  return (
    <div className={cn("relative w-full overflow-hidden", className)} aria-hidden>
      <style>{`
        @keyframes wcFlagDrift { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }
      `}</style>
      <div
        className="flex w-max items-center gap-2 sm:gap-2.5"
        style={
          reduce
            ? undefined
            : { animation: "wcFlagDrift 64s linear infinite" }
        }
      >
        {loop.map((n, i) => (
          <FlagTile key={`${n.code}-${i}`} code={n.code} name={n.name} />
        ))}
      </div>
      {/* dissolve both ends so the band reads as endless */}
      <div className="pointer-events-none absolute inset-y-0 left-0 w-16 bg-gradient-to-r from-[#050608] to-transparent sm:w-28" />
      <div className="pointer-events-none absolute inset-y-0 right-0 w-16 bg-gradient-to-l from-[#050608] to-transparent sm:w-28" />
    </div>
  );
}

export const WC_NATION_COUNT = WC_NATIONS.length;
