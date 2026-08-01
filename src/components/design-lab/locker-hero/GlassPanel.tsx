"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Props = {
  children: ReactNode;
  className?: string;
  as?: "div" | "section";
};

/** Panel shell — frosted glass (locked production material). */
export function GlassPanel({
  children,
  className,
  as: Tag = "div",
}: Props) {
  return (
    <Tag
      className={cn(
        "relative flex min-h-0 flex-col overflow-hidden rounded-2xl",
        "bg-black/75 backdrop-blur-xl",
        "ring-1 ring-white/20",
        "shadow-[inset_0_1px_0_rgba(255,255,255,0.22),inset_0_-12px_28px_rgba(0,0,0,0.55),0_10px_28px_rgba(0,0,0,0.45)]",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 rounded-[inherit] bg-[linear-gradient(180deg,rgba(255,255,255,0.08)_0%,transparent_28%)]"
      />
      {/* Inner flex column: panel chrome stays clipped; children can flex-1 + scroll */}
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </Tag>
  );
}
