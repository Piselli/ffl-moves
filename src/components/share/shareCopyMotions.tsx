"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import type { ShareModalLayout } from "@/components/ShareSquadOnXModal";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

export type ShareCopyMotionId = ShareModalLayout;

function CheckIcon({ className }: { className?: string }) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <motion.path
        d="M5 13l4 4L19 7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.24, ease: EASE_OUT }}
      />
    </motion.svg>
  );
}

/** 1 · Classic — flash + corner stamp */
function CopyMotionClassic({ label }: { label: string }) {
  const reduce = Boolean(useReducedMotion());
  return (
    <>
      <motion.div
        className="pointer-events-none absolute inset-0 z-[25] rounded-[inherit] bg-white"
        initial={{ opacity: 0 }}
        animate={{ opacity: reduce ? [0, 0.1, 0] : [0, 0.26, 0] }}
        transition={{ duration: reduce ? 0.2 : 0.48, ease: EASE_OUT }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute bottom-4 right-4 z-[26] flex items-center gap-2 rounded-full bg-white/95 py-2 pl-2 pr-3.5 shadow-[0_8px_32px_rgba(0,0,0,0.45)]"
        initial={reduce ? false : { opacity: 0, y: 10, scale: 0.92 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={reduce ? undefined : { opacity: 0, y: 6, scale: 0.96 }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: "spring", stiffness: 480, damping: 30 }
        }
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-black">
          <CheckIcon className="h-4 w-4 text-white" />
        </span>
        <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-black">
          {label}
        </span>
      </motion.div>
    </>
  );
}

/** 4 · Single — center focus check, soft dim */
function CopyMotionSingle({ label }: { label: string }) {
  const reduce = Boolean(useReducedMotion());
  return (
    <>
      <motion.div
        className="pointer-events-none absolute inset-0 z-[25] rounded-[inherit] bg-black/40 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: reduce ? 0.08 : 0.22, ease: EASE_OUT }}
        aria-hidden
      />
      <motion.div
        className="pointer-events-none absolute inset-0 z-[26] flex flex-col items-center justify-center gap-2"
        initial={reduce ? false : { opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={reduce ? undefined : { opacity: 0, scale: 0.94 }}
        transition={
          reduce
            ? { duration: 0 }
            : { type: "spring", stiffness: 440, damping: 28 }
        }
      >
        <span className="flex h-[76px] w-[76px] items-center justify-center rounded-full bg-white shadow-[0_16px_48px_rgba(0,0,0,0.5)]">
          <CheckIcon className="h-9 w-9 text-black" />
        </span>
        <span className="text-[12px] font-bold uppercase tracking-[0.14em] text-white/90">
          {label}
        </span>
      </motion.div>
    </>
  );
}

/** 6 · Sheet — bottom rail slides up */
function CopyMotionSheet({ label }: { label: string }) {
  const reduce = Boolean(useReducedMotion());
  return (
    <motion.div
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[26] flex items-center justify-center gap-2 border-t border-white/10 bg-black/75 py-3 backdrop-blur-md"
      initial={reduce ? false : { y: "100%", opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={reduce ? undefined : { y: "100%", opacity: 0 }}
      transition={
        reduce
          ? { duration: 0 }
          : { type: "spring", stiffness: 520, damping: 34 }
      }
    >
      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-white">
        <CheckIcon className="h-3.5 w-3.5 text-black" />
      </span>
      <span className="text-[11px] font-bold uppercase tracking-[0.14em] text-white/90">
        {label}
      </span>
    </motion.div>
  );
}

export function ShareCopyPosterMotion({
  variant,
  label,
  copied,
}: {
  variant: ShareCopyMotionId;
  label: string;
  copied: boolean;
}) {
  return (
    <AnimatePresence>
      {copied ? (
        <motion.div
          key={`copy-${variant}`}
          className="pointer-events-none absolute inset-0 z-20"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          {variant === "classic" ? (
            <CopyMotionClassic label={label} />
          ) : variant === "single" ? (
            <CopyMotionSingle label={label} />
          ) : (
            <CopyMotionSheet label={label} />
          )}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function shareCopyPosterPulse(
  variant: ShareCopyMotionId,
  copied: boolean,
  reduce: boolean,
) {
  if (!copied || reduce) return { scale: 1, y: 0 };
  if (variant === "single") return { scale: [1, 0.988, 1], y: 0 };
  if (variant === "sheet") return { scale: 1, y: [0, -3, 0] };
  return { scale: [1, 1.008, 1], y: 0 };
}

export const SHARE_COPY_MOTION_LABELS: Record<
  ShareCopyMotionId,
  { id: string; name: string; desc: string }
> = {
  classic: {
    id: "1",
    name: "Stamp",
    desc: "Flash + бейдж знизу справа",
  },
  single: {
    id: "4",
    name: "Focus",
    desc: "Центральний check + dim",
  },
  sheet: {
    id: "6",
    name: "Rail",
    desc: "Смуга знизу постера",
  },
};

export function shareCopyButtonClass(
  variant: ShareCopyMotionId,
  copied: boolean,
): string {
  if (!copied) return "bg-white text-black";
  if (variant === "single") return "bg-black text-white ring-1 ring-white/20";
  if (variant === "sheet") return "bg-white text-black";
  return "bg-white text-black";
}

export function ShareCopyButtonRipple({
  variant,
  copied,
}: {
  variant: ShareCopyMotionId;
  copied: boolean;
}) {
  const reduce = Boolean(useReducedMotion());
  if (variant !== "sheet" || !copied || reduce) return null;
  return (
    <motion.span
      className="pointer-events-none absolute inset-0 rounded-xl ring-2 ring-white/40"
      initial={{ opacity: 0.8, scale: 1 }}
      animate={{ opacity: 0, scale: 1.08 }}
      transition={{ duration: 0.55, ease: EASE_OUT }}
      aria-hidden
    />
  );
}
