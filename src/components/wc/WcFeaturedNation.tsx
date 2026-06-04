"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

const NATIONS: { code: string; name: string }[] = [
  { code: "br", name: "Brasil" },
  { code: "ar", name: "Argentina" },
  { code: "fr", name: "France" },
  { code: "es", name: "España" },
  { code: "gb-eng", name: "England" },
  { code: "de", name: "Deutschland" },
  { code: "pt", name: "Portugal" },
  { code: "nl", name: "Nederland" },
  { code: "mx", name: "México" },
  { code: "us", name: "USA" },
  { code: "ca", name: "Canada" },
  { code: "jp", name: "Japan" },
  { code: "ma", name: "Maroc" },
  { code: "hr", name: "Hrvatska" },
  { code: "uy", name: "Uruguay" },
  { code: "sn", name: "Sénégal" },
  { code: "kr", name: "Korea" },
  { code: "co", name: "Colombia" },
];

/** Auto-rotating spotlight — keeps naming the nations on the flag wall. */
export function WcFeaturedNation({ label }: { label: string }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);

  useEffect(() => {
    if (reduce) return;
    const id = setInterval(() => setI((p) => (p + 1) % NATIONS.length), 2400);
    return () => clearInterval(id);
  }, [reduce]);

  const n = NATIONS[i];

  return (
    <div className="inline-flex items-center gap-3 rounded-full border border-white/10 bg-black/55 py-2 pl-2 pr-4 backdrop-blur-md">
      <span className="relative h-7 w-9 overflow-hidden rounded-[4px] ring-1 ring-white/20">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={n.code}
            initial={reduce ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="absolute inset-0"
            style={{
              backgroundImage: `url(/flags/4x3/${n.code}.svg)`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        </AnimatePresence>
      </span>
      <span className="flex min-w-0 flex-col leading-none">
        <span className="text-[8.5px] font-bold uppercase tracking-[0.2em] text-[#00f948]/80">
          {label}
        </span>
        <span className="mt-1 h-[18px] overflow-hidden">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.span
              key={n.name}
              initial={reduce ? false : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduce ? undefined : { opacity: 0, y: -12 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="block whitespace-nowrap font-wc-hero text-[15px] font-bold uppercase tracking-[0.06em] text-white"
            >
              {n.name}
            </motion.span>
          </AnimatePresence>
        </span>
      </span>
    </div>
  );
}
