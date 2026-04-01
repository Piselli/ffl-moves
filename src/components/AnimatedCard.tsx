"use client";

import React, { useRef, useState } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";

interface AnimatedCardProps {
  children: React.ReactNode;
  className?: string;
  glowColor?: "cyan" | "purple" | "green" | "gold";
  delay?: number;
}

const glowMap = {
  cyan:   "rgba(0,196,106,0.15)",
  purple: "rgba(139,92,246,0.15)",
  green:  "rgba(0,255,135,0.15)",
  gold:   "rgba(251,191,36,0.15)",
};

const borderMap = {
  cyan:   "rgba(0,196,106,0.4)",
  purple: "rgba(139,92,246,0.4)",
  green:  "rgba(0,255,135,0.4)",
  gold:   "rgba(251,191,36,0.4)",
};

export function AnimatedCard({
  children,
  className = "",
  glowColor = "cyan",
  delay = 0,
}: AnimatedCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState(false);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });

  // 3D tilt tracking
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const rotateX = useSpring(useTransform(rawY, [-0.5, 0.5], [8, -8]), { stiffness: 300, damping: 30 });
  const rotateY = useSpring(useTransform(rawX, [-0.5, 0.5], [-8, 8]), { stiffness: 300, damping: 30 });
  const scale    = useSpring(hovered ? 1.03 : 1, { stiffness: 300, damping: 25 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const x = (e.clientX - rect.left) / rect.width  - 0.5;
    const y = (e.clientY - rect.top)  / rect.height - 0.5;
    rawX.set(x);
    rawY.set(y);
    // glare position (percentage)
    setGlarePos({
      x: ((e.clientX - rect.left) / rect.width)  * 100,
      y: ((e.clientY - rect.top)  / rect.height) * 100,
    });
  }

  function handleMouseLeave() {
    rawX.set(0);
    rawY.set(0);
    setHovered(false);
  }

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-60px" }}
      transition={{ duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] }}
      onMouseMove={handleMouseMove}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-2xl border backdrop-blur-xl overflow-hidden transition-[border-color,box-shadow] duration-300 ${className}`}
      style={{
        rotateX,
        rotateY,
        scale,
        transformStyle: "preserve-3d" as const,
        perspective: 800,
        borderColor: hovered ? borderMap[glowColor] : "rgba(255,255,255,0.1)",
        boxShadow: hovered ? `0 0 32px ${glowMap[glowColor]}` : "none",
        background: "rgba(255,255,255,0.035)",
      }}
    >
      {/* Glare overlay */}
      {hovered && (
        <div
          className="pointer-events-none absolute inset-0 z-20 transition-opacity duration-200"
          style={{
            background: `radial-gradient(circle at ${glarePos.x}% ${glarePos.y}%, rgba(255,255,255,0.08) 0%, transparent 60%)`,
          }}
        />
      )}

      {/* Content */}
      <div className="relative z-10" style={{ transform: "translateZ(20px)" }}>
        {children}
      </div>
    </motion.div>
  );
}
