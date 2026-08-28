"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SquadLockShareCard } from "@/components/SquadLockShareCard";
import {
  SharePosterExportRoot,
  SharePosterTiltStage,
} from "@/components/share/SharePosterTiltStage";
import { useNickname } from "@/hooks/useNickname";
import { useWallet } from "@/hooks/useSolanaWallet";
import { modalOverlayMotion } from "@/lib/uiMotion";
import {
  copySquadImage,
  downloadSquadImage,
  type SquadShareContext,
} from "@/lib/shareSquadOnX";
import type { Player } from "@/lib/types";
import type { FormationId } from "@/lib/formation";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { cn } from "@/lib/utils";

const EASE_OUT: [number, number, number, number] = [0.23, 1, 0.32, 1];

function ActionButton({
  variant,
  busy,
  done,
  label,
  doneLabel,
  onClick,
  disabled,
}: {
  variant: "primary" | "secondary";
  busy: boolean;
  done: boolean;
  label: string;
  doneLabel: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  const reduce = Boolean(useReducedMotion());
  const text = done ? doneLabel : label;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || busy}
      aria-busy={busy}
      className={cn(
        "relative flex h-12 min-h-12 w-full flex-1 items-center justify-center overflow-hidden rounded-xl px-5 font-display text-sm font-black uppercase tracking-wider transition-[filter,opacity,transform,background-color,color] duration-200 active:scale-[0.98] disabled:cursor-default",
        variant === "primary"
          ? "bg-white text-black hover:brightness-95 disabled:opacity-75"
          : "border border-white/14 bg-white/[0.04] text-white/80 hover:border-white/22 hover:bg-white/[0.07] hover:text-white disabled:opacity-65",
      )}
    >
      {busy ? (
        <motion.span
          className="pointer-events-none absolute inset-x-0 bottom-0 h-[2px] origin-left bg-current opacity-25"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: [0, 0.45, 0.85, 1] }}
          transition={{
            duration: reduce ? 0.3 : 1.1,
            ease: EASE_OUT,
            repeat: reduce ? 0 : Infinity,
            repeatType: "loop",
          }}
          aria-hidden
        />
      ) : null}
      <AnimatePresence mode="wait" initial={false}>
        <motion.span
          key={text}
          className="relative z-[1] flex items-center justify-center gap-2"
          initial={reduce ? false : { opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? undefined : { opacity: 0, y: -4 }}
          transition={{ duration: reduce ? 0 : 0.16, ease: EASE_OUT }}
        >
          {done ? (
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden
            >
              <path d="M5 13l4 4L19 7" />
            </svg>
          ) : null}
          {text}
        </motion.span>
      </AnimatePresence>
    </button>
  );
}

/** @deprecated Lab-only — production modal is the 3D hero layout. */
export type ShareModalLayout = "classic" | "single" | "sheet";

export function ShareSquadOnXModal({
  open,
  onClose,
  starters,
  bench,
  context,
  tourLabel,
  formationId,
  managerLabelOverride,
}: {
  open: boolean;
  onClose: () => void;
  starters: Player[];
  bench: Player[];
  context: SquadShareContext;
  tourLabel: string;
  sitePath?: string;
  formationId?: FormationId;
  managerLabelOverride?: string;
  /** @deprecated ignored — hero 3D layout is always used */
  layout?: ShareModalLayout;
}) {
  const ss = useSiteMessages().pages.squadShare;
  const { account } = useWallet();
  const { getNickname } = useNickname();
  const reduce = Boolean(useReducedMotion());
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [copying, setCopying] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [downloaded, setDownloaded] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);
  const copiedTimerRef = useRef<number | null>(null);
  const downloadedTimerRef = useRef<number | null>(null);

  const managerLabel = useMemo(() => {
    if (managerLabelOverride) return managerLabelOverride;
    const addr = account?.address?.toString();
    if (!addr) return "—";
    return getNickname(addr);
  }, [account?.address, getNickname, managerLabelOverride]);

  const cardProps = {
    starters,
    bench,
    tourLabel,
    managerLabel,
    headline: ss.cardHeadline,
    lockedLabel: ss.cardLocked,
    siteUrl: "form8.app",
    formationId,
  };

  const fileName = `form8-squad-${context}.png`;
  const busy = copying || downloading;

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCopied(false);
    setDownloaded(false);
    for (const ref of [copiedTimerRef, downloadedTimerRef]) {
      if (ref.current != null) {
        window.clearTimeout(ref.current);
        ref.current = null;
      }
    }
  }, [open]);

  useEffect(() => {
    return () => {
      for (const ref of [copiedTimerRef, downloadedTimerRef]) {
        if (ref.current != null) window.clearTimeout(ref.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !busy) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose, busy]);

  if (!portalRoot) return null;

  const getExportEl = () => exportRef.current;

  const flashDone = (
    setter: (v: boolean) => void,
    timerRef: React.MutableRefObject<number | null>,
  ) => {
    setter(true);
    if (timerRef.current != null) window.clearTimeout(timerRef.current);
    timerRef.current = window.setTimeout(() => {
      setter(false);
      timerRef.current = null;
    }, 2200);
  };

  const handleCopy = async () => {
    const exportEl = getExportEl();
    if (!exportEl || busy) return;
    setCopying(true);
    try {
      await copySquadImage({ element: exportEl, fileName });
      flashDone(setCopied, copiedTimerRef);
    } catch (err: unknown) {
      console.error("Copy squad image failed:", err);
    } finally {
      setCopying(false);
    }
  };

  const handleDownload = async () => {
    const exportEl = getExportEl();
    if (!exportEl || busy) return;
    setDownloading(true);
    try {
      await downloadSquadImage({ element: exportEl, fileName });
      flashDone(setDownloaded, downloadedTimerRef);
    } catch (err: unknown) {
      console.error("Download squad image failed:", err);
    } finally {
      setDownloading(false);
    }
  };

  const overlay = modalOverlayMotion(reduce);

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-[210] flex min-h-[100dvh] items-center justify-center p-4 sm:p-8",
            busy && "cursor-default",
          )}
          role="dialog"
          aria-modal="true"
          aria-label={ss.modalTitle}
        >
          <motion.button
            type="button"
            aria-label={ss.closeAria}
            className="absolute inset-0 bg-black/86 backdrop-blur-xl"
            initial={overlay.initial}
            animate={overlay.animate}
            exit={overlay.exit}
            transition={overlay.transition}
            onClick={() => {
              if (!busy) onClose();
            }}
          />

          <motion.div
            className="relative w-full max-w-[min(100%,920px)]"
            initial={reduce ? false : { opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduce ? undefined : { opacity: 0, y: 12 }}
            transition={{ duration: reduce ? 0.12 : 0.34, ease: EASE_OUT }}
          >
            <button
              type="button"
              onClick={onClose}
              disabled={busy}
              className="absolute -top-1 right-0 z-20 grid h-10 w-10 place-items-center rounded-full text-white/40 transition hover:bg-white/[0.06] hover:text-white/85 active:scale-[0.96] disabled:cursor-default disabled:opacity-40 sm:-right-2 sm:-top-2"
              aria-label={ss.closeAria}
            >
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>

            <SharePosterExportRoot exportRef={exportRef}>
              <SquadLockShareCard {...cardProps} />
            </SharePosterExportRoot>

            <SharePosterTiltStage className="mb-5 sm:mb-6">
              <SquadLockShareCard {...cardProps} />
            </SharePosterTiltStage>

            <div className="mx-auto flex w-full max-w-md flex-col gap-2 sm:flex-row sm:gap-3">
              <ActionButton
                variant="secondary"
                busy={downloading}
                done={downloaded}
                label={ss.downloadButton}
                doneLabel={ss.downloadButtonDone}
                onClick={handleDownload}
                disabled={busy}
              />
              <ActionButton
                variant="primary"
                busy={copying}
                done={copied}
                label={ss.copyButton}
                doneLabel={ss.copyButtonCopied}
                onClick={handleCopy}
                disabled={busy}
              />
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
