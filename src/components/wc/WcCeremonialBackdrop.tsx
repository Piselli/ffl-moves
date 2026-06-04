"use client";

import { useMemo } from "react";
import { useReducedMotion } from "framer-motion";

const PARTICLE_COUNT = 34;
const RIBBON_COUNT = 10;

function seededOffset(i: number, salt: number) {
  const x = Math.sin(i * 12.9898 + salt) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Ceremonial gold-on-black atmosphere (mock variant B): dark sky, gold
 * spotlights, falling confetti ribbons + gold dust, and a dotted gold globe
 * anchored to the right — no stadium photography.
 */
export function WcCeremonialBackdrop() {
  const reduceMotion = useReducedMotion();

  const particles = useMemo(
    () =>
      Array.from({ length: PARTICLE_COUNT }, (_, i) => ({
        left: `${5 + seededOffset(i, 1) * 90}%`,
        top: `${4 + seededOffset(i, 2) * 72}%`,
        size: 1.2 + seededOffset(i, 3) * 3,
        delay: seededOffset(i, 4) * 10,
        duration: 5 + seededOffset(i, 5) * 9,
        opacity: 0.25 + seededOffset(i, 6) * 0.55,
      })),
    [],
  );

  // Light metallic flakes drifting diagonally.
  const ribbons = useMemo(
    () =>
      Array.from({ length: RIBBON_COUNT }, (_, i) => {
        const warm = seededOffset(i, 24) > 0.5;
        return {
          left: `${seededOffset(i, 20) * 100}%`,
          width: 1.4 + seededOffset(i, 21) * 2.4,
          height: 8 + seededOffset(i, 22) * 14,
          rotate: -35 + seededOffset(i, 23) * 70,
          delay: -seededOffset(i, 25) * 14,
          duration: 9 + seededOffset(i, 26) * 10,
          drift: (seededOffset(i, 27) - 0.5) * 52,
          opacity: 0.2 + seededOffset(i, 28) * 0.24,
          from: warm ? "#FFE9A8" : "#FFD24D",
          to: warm ? "#C9A227" : "#9A6B12",
        };
      }),
    [],
  );

  // Dotted globe: visible arcs and dots on right side.
  const globeDots = useMemo(() => {
    const dots: { cx: number; cy: number; r: number; o: number }[] = [];
    const R = 190;
    for (let latDeg = -75; latDeg <= 75; latDeg += 11) {
      const lat = (latDeg * Math.PI) / 180;
      const ring = Math.cos(lat);
      const lonStep = Math.max(14, 30 / Math.max(ring, 0.25));
      for (let lonDeg = -90; lonDeg <= 90; lonDeg += lonStep) {
        const lon = (lonDeg * Math.PI) / 180;
        const z = ring * Math.cos(lon);
        const x = 200 + R * ring * Math.sin(lon);
        const y = 200 + R * Math.sin(lat);
        const depth = (z + 1) / 2;
        dots.push({
          cx: x,
          cy: y,
          r: 0.7 + depth * 1.5,
          o: 0.12 + depth * 0.5,
        });
      }
    }
    return dots;
  }, []);

  const cityLights = useMemo(() => {
    const pts: { x: number; y: number; r: number; a: number }[] = [];
    for (let i = 0; i < 60; i++) {
      pts.push({
        x: seededOffset(i, 10) * 100,
        y: 78 + seededOffset(i, 11) * 20,
        r: 0.4 + seededOffset(i, 12) * 1.6,
        a: 0.12 + seededOffset(i, 13) * 0.45,
      });
    }
    return pts;
  }, []);

  const globeArcs = useMemo(() => {
    const arcs: { d: string; o: number }[] = [];
    for (let i = 0; i < 10; i++) {
      const y = 74 + i * 28;
      arcs.push({
        d: `M 26 ${y} Q 200 ${y - 42 + (i % 2) * 10} 374 ${y}`,
        o: 0.08 + i * 0.017,
      });
    }
    return arcs;
  }, []);

  return (
    <div className="wc-ceremonial-backdrop pointer-events-none absolute inset-0 overflow-hidden bg-[#040303]" aria-hidden>
      <div className="absolute inset-0 bg-gradient-to-b from-[#040404] from-0% via-[#060504] via-[46%] to-[#0b0805] to-100%" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_78%_62%_at_46%_10%,rgba(132,96,32,0.12)_0%,transparent_64%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_84%_50%,rgba(255,214,128,0.06)_0%,transparent_36%)]" />

      <svg className="absolute inset-0 h-full w-full" preserveAspectRatio="none" viewBox="0 0 1440 900" fill="none">
        <defs>
          <filter id="wcBeamBlur" x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="34" />
          </filter>
          <linearGradient id="wcBeamL" x1="0%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,235,170,0.34)" />
            <stop offset="55%" stopColor="rgba(255,200,80,0.1)" />
            <stop offset="100%" stopColor="rgba(255,200,80,0)" />
          </linearGradient>
          <linearGradient id="wcBeamC" x1="50%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,245,200,0.28)" />
            <stop offset="50%" stopColor="rgba(255,215,0,0.08)" />
            <stop offset="100%" stopColor="rgba(255,215,0,0)" />
          </linearGradient>
          <linearGradient id="wcBeamR" x1="100%" y1="0%" x2="50%" y2="100%">
            <stop offset="0%" stopColor="rgba(255,235,170,0.26)" />
            <stop offset="55%" stopColor="rgba(255,200,80,0.08)" />
            <stop offset="100%" stopColor="rgba(255,200,80,0)" />
          </linearGradient>
        </defs>
        <g filter="url(#wcBeamBlur)">
          <path d="M0,0 L300,0 L410,620 L60,690 Z" fill="url(#wcBeamL)" opacity="0.3" />
          <path d="M520,0 L940,0 L785,640 L610,690 Z" fill="url(#wcBeamC)" opacity="0.24" />
          <path d="M1120,0 L1440,0 L1360,680 L980,640 Z" fill="url(#wcBeamR)" opacity="0.3" />
        </g>
      </svg>

      <div className="absolute inset-x-0 top-0 h-[38%] bg-[radial-gradient(ellipse_90%_80%_at_50%_0%,rgba(255,220,140,0.09)_0%,transparent_70%)]" />

      <svg
        className="absolute right-[-11%] top-1/2 h-[min(90vw,760px)] w-[min(90vw,760px)] -translate-y-1/2 opacity-75 lg:right-[-5%]"
        viewBox="0 0 400 400"
        fill="none"
      >
        <defs>
          <radialGradient id="wcGlobeFade" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="white" stopOpacity="1" />
            <stop offset="62%" stopColor="white" stopOpacity="0.85" />
            <stop offset="100%" stopColor="white" stopOpacity="0.15" />
          </radialGradient>
          <mask id="wcGlobeMask">
            <rect width="400" height="400" fill="url(#wcGlobeFade)" />
          </mask>
        </defs>
        <g mask="url(#wcGlobeMask)">
          <circle cx="200" cy="200" r="191" stroke="rgba(255,205,90,0.24)" strokeWidth="0.8" fill="none" />
          {globeArcs.map((arc, i) => (
            <path key={`arc-${i}`} d={arc.d} stroke="rgba(255,208,112,0.35)" strokeWidth="0.7" opacity={arc.o} />
          ))}
          {globeDots.map((d, i) => (
            <circle key={i} cx={d.cx} cy={d.cy} r={d.r} fill="#FFCE6A" opacity={d.o} />
          ))}
        </g>
      </svg>

      {ribbons.map((rb, i) => (
        <span
          key={`rb-${i}`}
          className="absolute top-[-8%] rounded-[1px]"
          style={{
            left: rb.left,
            width: rb.width,
            height: rb.height,
            opacity: rb.opacity,
            background: `linear-gradient(180deg, ${rb.from}, ${rb.to})`,
            ["--wc-drift" as string]: `${rb.drift}px`,
            animation: reduceMotion
              ? undefined
              : `wcConfettiFall ${rb.duration}s linear ${rb.delay}s infinite`,
            transform: `rotate(${rb.rotate}deg)`,
          }}
        />
      ))}

      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute rounded-full bg-[#FFE08A]"
          style={{
            left: p.left,
            top: p.top,
            width: p.size,
            height: p.size,
            opacity: p.opacity,
            boxShadow: `0 0 ${Math.max(p.size * 4, 4)}px rgba(255, 210, 100, 0.65)`,
            animation: reduceMotion ? undefined : `wcGoldDrift ${p.duration}s ease-in-out ${p.delay}s infinite alternate`,
          }}
        />
      ))}

      <div className="absolute inset-x-[-8%] bottom-[-10%] h-[44%]">
        <div className="absolute inset-x-[6%] bottom-[14%] h-[34%] rounded-[100%] bg-[radial-gradient(ellipse_at_50%_100%,rgba(255,200,120,0.16)_0%,rgba(255,150,40,0.04)_38%,transparent_70%)] blur-2xl" />
        {cityLights.map((pt, i) => (
          <span
            key={i}
            className="absolute rounded-full bg-[#FFD080]"
            style={{
              left: `${pt.x}%`,
              top: `${pt.y}%`,
              width: pt.r,
              height: pt.r,
              opacity: pt.a,
              boxShadow: `0 0 ${pt.r * 4}px rgba(255, 200, 120, 0.5)`,
            }}
          />
        ))}
      </div>

      <div className="absolute inset-0 bg-gradient-to-r from-transparent from-0% via-[#040303]/16 via-[34%] to-[#040303]/5 to-100%" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_78%_62%_at_70%_42%,rgba(4,3,3,0.45)_0%,transparent_70%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(4,3,3,0.38)_72%,rgba(4,3,3,0.88)_100%)]" />
      <div className="absolute inset-0 bg-gradient-to-t from-[#040303] from-0% via-[#040303]/36 via-[22%] to-transparent to-[55%]" />
      <div className="absolute inset-0 bg-[linear-gradient(112deg,transparent_48%,rgba(255,218,128,0.03)_62%,transparent_74%)] mix-blend-screen" />

      <style>{`
        @keyframes wcGoldDrift {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(8px, -18px) scale(1.2); }
        }
        @keyframes wcConfettiFall {
          0% { transform: translate(0, -10%) rotate(0deg); }
          100% { transform: translate(var(--wc-drift, 0px), 108vh) rotate(360deg); }
        }
        @media (prefers-reduced-motion: reduce) {
          .wc-ceremonial-backdrop * { animation: none !important; }
        }
      `}</style>
    </div>
  );
}
