"use client";

import React, { useEffect, useRef, useState } from "react";
import { useInView, useMotionValue, useSpring, animate } from "framer-motion";

interface ScoreCounterProps {
  to: number;
  duration?: number;
  className?: string;
  prefix?: string;
  suffix?: string;
  decimals?: number;
}

export function ScoreCounter({
  to,
  duration = 1.8,
  className = "",
  prefix = "",
  suffix = "",
  decimals = 0,
}: ScoreCounterProps) {
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-40px" });
  const [display, setDisplay] = useState("0");

  useEffect(() => {
    if (!inView) return;
    const controls = animate(0, to, {
      duration,
      ease: [0.22, 1, 0.36, 1],
      onUpdate(value) {
        setDisplay(value.toFixed(decimals).replace(/\B(?=(\d{3})+(?!\d))/g, ","));
      },
    });
    return () => controls.stop();
  }, [inView, to, duration, decimals]);

  return (
    <span ref={ref} className={className}>
      {prefix}{display}{suffix}
    </span>
  );
}
