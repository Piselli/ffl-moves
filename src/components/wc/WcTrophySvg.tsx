"use client";

import { cn } from "@/lib/utils";

/** Stylized World Cup trophy silhouette — geometric, not an official FIFA mark. */
export function WcTrophySvg({ className }: { className?: string }) {
  return (
    <svg
      className={cn("h-full w-full", className)}
      viewBox="0 0 240 320"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id="wcCupBody" x1="120" y1="20" x2="120" y2="280" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFF4C2" />
          <stop offset="35%" stopColor="#E8C547" />
          <stop offset="70%" stopColor="#B8860B" />
          <stop offset="100%" stopColor="#7A5C12" />
        </linearGradient>
        <linearGradient id="wcCupRim" x1="60" y1="0" x2="180" y2="0" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFEEB0" />
          <stop offset="50%" stopColor="#FFD700" />
          <stop offset="100%" stopColor="#C9A227" />
        </linearGradient>
        <linearGradient id="wcCupGlow" x1="120" y1="80" x2="120" y2="200" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.55" />
          <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0" />
        </linearGradient>
        <filter id="wcCupShadow" x="-20%" y="-10%" width="140%" height="130%">
          <feDropShadow dx="0" dy="8" stdDeviation="12" floodColor="#000000" floodOpacity="0.45" />
        </filter>
      </defs>

      <g filter="url(#wcCupShadow)">
        {/* Globe bowl */}
        <ellipse cx="120" cy="118" rx="72" ry="68" fill="url(#wcCupBody)" />
        <ellipse cx="120" cy="108" rx="58" ry="52" fill="url(#wcCupGlow)" />

        {/* Meridian lines on globe */}
        <path
          d="M120 52 C92 72 78 98 78 118 C78 138 92 164 120 184"
          stroke="rgba(90,60,10,0.35)"
          strokeWidth="1.5"
        />
        <path
          d="M120 52 C148 72 162 98 162 118 C162 138 148 164 120 184"
          stroke="rgba(90,60,10,0.35)"
          strokeWidth="1.5"
        />
        <ellipse cx="120" cy="118" rx="72" ry="22" stroke="rgba(90,60,10,0.3)" strokeWidth="1.2" />
        <ellipse cx="120" cy="98" rx="58" ry="16" stroke="rgba(255,255,255,0.25)" strokeWidth="1" />

        {/* Handles */}
        <path
          d="M48 108 C28 88 22 68 38 52 C52 38 68 48 72 68"
          stroke="url(#wcCupRim)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />
        <path
          d="M192 108 C212 88 218 68 202 52 C188 38 172 48 168 68"
          stroke="url(#wcCupRim)"
          strokeWidth="7"
          strokeLinecap="round"
          fill="none"
        />

        {/* Neck + stem */}
        <path d="M88 178 L152 178 L142 218 L98 218 Z" fill="url(#wcCupBody)" />
        <rect x="104" y="218" width="32" height="36" rx="2" fill="url(#wcCupBody)" />

        {/* Base tiers */}
        <path d="M72 254 H168 L160 274 H80 Z" fill="url(#wcCupRim)" />
        <path d="M64 274 H176 L168 296 H72 Z" fill="#B8860B" />
        <rect x="56" y="296" width="128" height="16" rx="2" fill="#8B6914" />
      </g>
    </svg>
  );
}
