"use client";

import { DEFAULT_PRIZE_TIERS } from "@/lib/prize-distribution";
import { cn } from "@/lib/utils";

export type HowToArtId = "squad" | "points" | "entry" | "split";

type Props = {
  id: HowToArtId;
  className?: string;
};

/**
 * Hand-drawn howto tiles — readable at ~64–76px, FORM8 matte, no neon glow.
 */
export function HowToStepArt({ id, className }: Props) {
  return (
    <div
      className={cn(
        "relative h-[64px] w-[64px] shrink-0 overflow-hidden rounded-lg bg-[#0a0c10] ring-1 ring-white/[0.1]",
        className,
      )}
      aria-hidden
    >
      {id === "squad" ? <ArtSquad /> : null}
      {id === "points" ? <ArtPoints /> : null}
      {id === "entry" ? <ArtEntry /> : null}
      {id === "split" ? <ArtSplit /> : null}
    </div>
  );
}

/**
 * Product 4-3-3 — attack at top, flat rows (same Y per line), small dots.
 */
function ArtSquad() {
  const pitch = { x: 8, y: 3, w: 48, h: 46 };
  const r = 2.35;
  // Flat rows — one Y per line (product pitch orientation).
  const rows: Array<{ y: number; xs: number[] }> = [
    { y: pitch.y + pitch.h * 0.16, xs: [0.22, 0.5, 0.78] }, // FWD
    { y: pitch.y + pitch.h * 0.4, xs: [0.26, 0.5, 0.74] }, // MID
    { y: pitch.y + pitch.h * 0.66, xs: [0.14, 0.38, 0.62, 0.86] }, // DEF
    { y: pitch.y + pitch.h * 0.9, xs: [0.5] }, // GK
  ];
  const captain = {
    x: pitch.x + pitch.w * 0.5,
    y: pitch.y + pitch.h * 0.4, // central MID
  };

  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className="block h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" fill="#0c1210" />
      <rect
        x={pitch.x}
        y={pitch.y}
        width={pitch.w}
        height={pitch.h}
        rx="2.5"
        fill="#14281c"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
      />
      <line
        x1={pitch.x}
        y1={pitch.y + pitch.h / 2}
        x2={pitch.x + pitch.w}
        y2={pitch.y + pitch.h / 2}
        stroke="rgba(255,255,255,0.18)"
        strokeWidth="1"
      />
      <circle
        cx={pitch.x + pitch.w / 2}
        cy={pitch.y + pitch.h / 2}
        r={4.5}
        fill="none"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1"
      />
      {rows.flatMap((row, ri) =>
        row.xs.map((xp, i) => {
          const x = pitch.x + pitch.w * xp;
          const isCaptain = ri === 1 && i === 1; // central MID
          return (
            <circle
              key={`${ri}-${i}`}
              cx={x}
              cy={row.y}
              r={isCaptain ? r + 0.4 : r}
              fill={isCaptain ? "#e8f5ea" : "#e4ebe6"}
            />
          );
        }),
      )}
      <text
        x={captain.x}
        y={captain.y + 1}
        textAnchor="middle"
        fontSize="4.2"
        fontWeight="800"
        fill="#0a1210"
        fontFamily="system-ui,sans-serif"
      >
        C
      </text>
      {/* Bench under pitch */}
      <rect
        x="14"
        y="52"
        width="36"
        height="7"
        rx="1.5"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.12)"
        strokeWidth="1"
      />
      <circle cx="23" cy="55.5" r="1.6" fill="rgba(255,255,255,0.4)" />
      <circle cx="32" cy="55.5" r="1.6" fill="rgba(255,255,255,0.4)" />
      <circle cx="41" cy="55.5" r="1.6" fill="rgba(255,255,255,0.4)" />
    </svg>
  );
}

/** Flashscore-style actions: goal / assist / yellow with points. */
function ArtPoints() {
  const rows = [
    { label: "Goal", pts: "+5", tone: "#b8f5c4" },
    { label: "Assist", pts: "+3", tone: "#b8f5c4" },
    { label: "Yellow", pts: "−1", tone: "#f5c542" },
  ] as const;
  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className="block h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" fill="#0a0c10" />
      {rows.map((row, i) => {
        const y = 8 + i * 17;
        return (
          <g key={row.label}>
            <rect
              x="5"
              y={y}
              width="54"
              height="14"
              rx="2.5"
              fill="rgba(255,255,255,0.05)"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
            <text
              x="9"
              y={y + 10}
              fontSize="7"
              fontWeight="700"
              fill="rgba(255,255,255,0.75)"
              fontFamily="system-ui,sans-serif"
            >
              {row.label}
            </text>
            <text
              x="54"
              y={y + 10}
              textAnchor="end"
              fontSize="8"
              fontWeight="800"
              fill={row.tone}
              fontFamily="system-ui,sans-serif"
            >
              {row.pts}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/**
 * $5 entry split — $4 into the pool, $1 platform fee.
 */
function ArtEntry() {
  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className="block h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" fill="#0a0c10" />
      {/* Entry total */}
      <text
        x="32"
        y="14"
        textAnchor="middle"
        fontSize="11"
        fontWeight="800"
        fill="#f2f4f6"
        fontFamily="system-ui,sans-serif"
      >
        $5
      </text>
      {/* Split fork */}
      <path
        d="M32 18v6M32 24H18M32 24h14M18 24v4M46 24v4"
        fill="none"
        stroke="rgba(255,255,255,0.35)"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      {/* $4 → pool */}
      <rect
        x="5"
        y="30"
        width="26"
        height="28"
        rx="3"
        fill="rgba(255,255,255,0.06)"
        stroke="rgba(255,255,255,0.22)"
        strokeWidth="1"
      />
      <text
        x="18"
        y="44"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fill="#f2f4f6"
        fontFamily="system-ui,sans-serif"
      >
        $4
      </text>
      <text
        x="18"
        y="53"
        textAnchor="middle"
        fontSize="5.5"
        fontWeight="700"
        fill="rgba(255,255,255,0.5)"
        fontFamily="system-ui,sans-serif"
      >
        pool
      </text>
      {/* $1 → platform */}
      <rect
        x="33"
        y="30"
        width="26"
        height="28"
        rx="3"
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.14)"
        strokeWidth="1"
      />
      <text
        x="46"
        y="44"
        textAnchor="middle"
        fontSize="10"
        fontWeight="800"
        fill="rgba(255,255,255,0.55)"
        fontFamily="system-ui,sans-serif"
      >
        $1
      </text>
      <text
        x="46"
        y="53"
        textAnchor="middle"
        fontSize="5.5"
        fontWeight="700"
        fill="rgba(255,255,255,0.35)"
        fontFamily="system-ui,sans-serif"
      >
        fee
      </text>
    </svg>
  );
}

/**
 * Real DEFAULT_PRIZE_TIERS — #1 #2 #3 … #10, flat (no neon podium glow).
 */
function ArtSplit() {
  const t = DEFAULT_PRIZE_TIERS;
  const rows: Array<{ label: string; share: string; dim?: boolean }> = [
    { label: `#${t[0]!.rank}`, share: `${t[0]!.pct}%` },
    { label: `#${t[1]!.rank}`, share: `${t[1]!.pct}%` },
    { label: `#${t[2]!.rank}`, share: `${t[2]!.pct}%` },
    { label: "···", share: "", dim: true },
    { label: `#${t[9]!.rank}`, share: `${t[9]!.pct}%` },
  ];
  return (
    <svg
      viewBox="0 0 64 64"
      width="64"
      height="64"
      className="block h-full w-full"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="64" height="64" fill="#0a0c10" />
      {rows.map((row, i) => {
        const y = 3 + i * 11.5;
        return (
          <g key={`${row.label}-${i}`}>
            <rect
              x="5"
              y={y}
              width="54"
              height="10"
              rx="2"
              fill="rgba(255,255,255,0.04)"
              stroke="rgba(255,255,255,0.1)"
              strokeWidth="1"
            />
            <text
              x="10"
              y={y + 7.2}
              fontSize="6.5"
              fontWeight="700"
              fill={
                row.dim ? "rgba(255,255,255,0.35)" : "rgba(255,255,255,0.7)"
              }
              fontFamily="system-ui,sans-serif"
            >
              {row.label}
            </text>
            {row.share ? (
              <text
                x="54"
                y={y + 7.2}
                textAnchor="end"
                fontSize="6.5"
                fontWeight="700"
                fill="rgba(255,255,255,0.85)"
                fontFamily="system-ui,sans-serif"
              >
                {row.share}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
