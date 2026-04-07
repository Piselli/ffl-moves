"use client";

import { motion } from "framer-motion";

/* ── Floating particles around chest ────────────────────────────────────── */
const PARTICLES = Array.from({ length: 10 }, (_, i) => ({
  id: i,
  size: 2 + Math.random() * 2.5,
  x: 20 + Math.random() * 60,
  delay: Math.random() * 5,
  duration: 4 + Math.random() * 3,
  opacity: 0.2 + Math.random() * 0.35,
}));

export function TreasureChest() {
  return (
    <div className="relative w-full flex items-end justify-center select-none py-4">

      {/* ── Floating particles ───────────────────────────────────────── */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          className="absolute rounded-full pointer-events-none"
          style={{
            width: p.size,
            height: p.size,
            left: `${p.x}%`,
            bottom: "25%",
            background: `rgba(0,196,106,${p.opacity * 0.7})`,
            boxShadow: `0 0 ${p.size * 2}px rgba(0,196,106,${p.opacity * 0.4})`,
          }}
          animate={{
            y: [0, -(50 + Math.random() * 70), -(110 + Math.random() * 50)],
            opacity: [0, p.opacity, 0],
            scale: [0.4, 1, 0.2],
          }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            repeat: Infinity,
            ease: "easeOut",
          }}
        />
      ))}

      {/* ── Chest image with floating animation ──────────────────────── */}
      <motion.div
        className="relative w-full max-w-[560px] z-10"
        animate={{ y: [0, -10, 0] }}
        transition={{
          duration: 4.5,
          repeat: Infinity,
          ease: "easeInOut",
        }}
      >
        {/* The chest image — clean rendering, subtle shadow only */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/chest.png"
          alt="MOVE Treasure Chest"
          className="w-full h-auto object-contain relative z-10"
          style={{
            filter: "drop-shadow(0 8px 24px rgba(0,0,0,0.5))",
          }}
        />
      </motion.div>

      {/* ── Gold sparkles near coins ─────────────────────────────────── */}
      <style>{`
        @keyframes sparkle {
          0%, 100% { opacity: 0; transform: scale(0.3) rotate(0deg); }
          50% { opacity: 1; transform: scale(1) rotate(180deg); }
        }
      `}</style>
      {[
        { top: "18%", left: "30%", delay: "0s", size: 3 },
        { top: "22%", right: "35%", delay: "1.8s", size: 2.5 },
        { top: "12%", right: "25%", delay: "2.5s", size: 3.5 },
        { top: "28%", left: "50%", delay: "1.2s", size: 2 },
      ].map((spark, i) => (
        <div
          key={`spark-${i}`}
          className="absolute rounded-full pointer-events-none z-20"
          style={{
            ...spark,
            width: spark.size,
            height: spark.size,
            background: "#FFD700",
            boxShadow: "0 0 6px 1px rgba(255,215,0,0.5)",
            animation: `sparkle 3.5s ${spark.delay} infinite ease-in-out`,
          }}
        />
      ))}
    </div>
  );
}
