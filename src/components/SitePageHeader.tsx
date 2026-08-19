"use client";

import type { ReactNode } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  eyebrow?: string;
  title: string;
  subtitle?: ReactNode;
  trailing?: ReactNode;
  className?: string;
};

/** Shared page hero — matches locker product typography. */
export function SitePageHeader({
  eyebrow,
  title,
  subtitle,
  trailing,
  className,
}: Props) {
  return (
    <motion.header
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      className={cn("mb-10 sm:mb-12", className)}
    >
      <div className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? (
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#00f948]/25 bg-[#00f948]/[0.08] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-[#00f948]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#00f948] shadow-[0_0_6px_rgba(0,249,72,0.75)]" />
              {eyebrow}
            </div>
          ) : null}
          <h1 className="font-display text-4xl font-black uppercase leading-[1.05] tracking-tight text-white sm:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <div className="mt-3 max-w-2xl text-base leading-relaxed text-white/50 sm:text-[17px]">
              {subtitle}
            </div>
          ) : null}
        </div>
        {trailing ? <div className="shrink-0">{trailing}</div> : null}
      </div>
    </motion.header>
  );
}
