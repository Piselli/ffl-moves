"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { SquadSharePoster } from "@/components/SquadSharePoster";
import { modalOverlayMotion, modalPanelMotion } from "@/lib/uiMotion";
import {
  buildSquadShareTweetText,
  shareSquadImageOnX,
  type ShareSquadResult,
  type SquadShareContext,
} from "@/lib/shareSquadOnX";
import type { Player } from "@/lib/types";
import { useSiteMessages } from "@/i18n/LocaleProvider";

export function ShareSquadOnXModal({
  open,
  onClose,
  starters,
  bench,
  context,
  tourLabel,
  sitePath,
}: {
  open: boolean;
  onClose: () => void;
  starters: Player[];
  bench: Player[];
  context: SquadShareContext;
  tourLabel: string;
  sitePath: string;
}) {
  const ss = useSiteMessages().pages.squadShare;
  const g = useSiteMessages().pages.gameweek;
  const reduce = Boolean(useReducedMotion());
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const [sharing, setSharing] = useState(false);
  const [resultHint, setResultHint] = useState<ShareSquadResult | null>(null);
  const posterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    setResultHint(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !sharing) onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose, sharing]);

  if (!portalRoot) return null;

  const handleShare = async () => {
    if (!posterRef.current || sharing) return;
    setSharing(true);
    setResultHint(null);
    try {
      const tweetText = buildSquadShareTweetText({
        context,
        tourLabel,
        starters,
        bench,
        sitePath,
        copy: ss,
      });
      const method = await shareSquadImageOnX({
        element: posterRef.current,
        tweetText,
        fileName: `movematch-squad-${context}.png`,
      });
      setResultHint(method);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message.toLowerCase() : "";
      if (!msg.includes("abort") && !msg.includes("cancel")) {
        console.error("Share on X failed:", err);
      }
    } finally {
      setSharing(false);
    }
  };

  const hintText =
    resultHint === "clipboard"
      ? ss.clipboardHint
      : resultHint === "download"
        ? ss.desktopHint
        : null;

  const overlay = modalOverlayMotion(reduce);
  const panel = modalPanelMotion(reduce);

  return createPortal(
    <AnimatePresence>
      {open ? (
    <div
      className="fixed inset-0 z-[210] flex min-h-[100dvh] items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-squad-modal-title"
    >
      <motion.button
        type="button"
        aria-label={ss.closeAria}
        className="absolute inset-0 bg-black/75 backdrop-blur-sm"
        initial={overlay.initial}
        animate={overlay.animate}
        exit={overlay.exit}
        transition={overlay.transition}
        onClick={() => {
          if (!sharing) onClose();
        }}
      />

      <motion.div
        className="relative w-full max-w-md max-h-[min(92dvh,calc(100dvh-2rem))] overflow-y-auto rounded-2xl border border-white/[0.10] bg-[#111214] shadow-2xl overscroll-contain"
        initial={panel.initial}
        animate={panel.animate}
        exit={panel.exit}
        transition={panel.transition}
      >
        <div className="h-0.5 w-full bg-gradient-to-r from-transparent via-[#00f948]/60 to-transparent" />

        <div className="p-6">
          <div className="mb-5 flex items-start justify-between gap-3">
            <div>
              <h2
                id="share-squad-modal-title"
                className="text-lg font-display font-black uppercase tracking-tight leading-none text-white"
              >
                {ss.modalTitle}
              </h2>
              <p className="mt-1.5 text-xs leading-relaxed text-white/35">{ss.modalDesc}</p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={sharing}
              className="-mr-1 -mt-1 p-1 text-white/20 transition-[color,transform] duration-150 hover:text-white/60 active:scale-[0.96] disabled:opacity-40"
              aria-label={ss.closeAria}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="mb-4 overflow-hidden rounded-xl border border-white/[0.08] bg-[#0D0F12]">
            <div className="pointer-events-none max-h-[220px] overflow-hidden">
              <div className="origin-top-left scale-[0.28]">
                <SquadSharePoster
                  starters={starters}
                  bench={bench}
                  tourLabel={tourLabel}
                  brandLabel="FORM8"
                  startersLabel={g.startersSection}
                  benchLabel={g.benchSection}
                  ctaLine={ss.posterCta}
                />
              </div>
            </div>
          </div>

          <div
            ref={posterRef}
            className="pointer-events-none fixed left-[-9999px] top-0 z-[-1] opacity-0"
            aria-hidden
          >
            <SquadSharePoster
              starters={starters}
              bench={bench}
              tourLabel={tourLabel}
              brandLabel="FORM8"
              startersLabel={g.startersSection}
              benchLabel={g.benchSection}
              ctaLine={ss.posterCta}
            />
          </div>

          {hintText ? (
            <p className="mb-3 rounded-xl border border-sky-500/25 bg-sky-500/10 px-3 py-2.5 text-xs leading-relaxed text-sky-100/90">
              {hintText}
            </p>
          ) : null}

          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={sharing}
              className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-semibold text-white/40 transition-[border-color,color,transform] duration-150 hover:border-white/[0.15] hover:text-white/70 active:scale-[0.98] disabled:opacity-40"
            >
              {ss.laterButton}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex flex-grow items-center justify-center gap-2 rounded-xl bg-white py-2.5 px-5 text-sm font-display font-black uppercase tracking-wider text-black transition-[transform,filter] duration-150 hover:brightness-95 active:scale-[0.98] disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {sharing ? ss.generating : ss.shareButton}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
