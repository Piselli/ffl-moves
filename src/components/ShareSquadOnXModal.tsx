"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { SquadSharePoster } from "@/components/SquadSharePoster";
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
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose, sharing]);

  if (!open || !portalRoot) return null;

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

  const modal = (
    <div
      className="fixed inset-0 z-[210] flex min-h-[100dvh] items-center justify-center p-4 sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-labelledby="share-squad-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !sharing) onClose();
      }}
    >
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" />

      <div className="relative w-full max-w-md max-h-[min(92dvh,calc(100dvh-2rem))] overflow-y-auto rounded-2xl border border-white/[0.10] bg-[#111214] shadow-2xl overscroll-contain">
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
              className="-mr-1 -mt-1 p-1 text-white/20 transition-colors hover:text-white/60 disabled:opacity-40"
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
                  brandLabel="MoveMatch"
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
              brandLabel="MoveMatch"
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
              className="flex-1 rounded-xl border border-white/[0.08] py-2.5 text-sm font-semibold text-white/40 transition-all hover:border-white/[0.15] hover:text-white/70 disabled:opacity-40"
            >
              {ss.laterButton}
            </button>
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex flex-grow items-center justify-center gap-2 rounded-xl bg-white py-2.5 px-5 text-sm font-display font-black uppercase tracking-wider text-black transition-all hover:brightness-95 disabled:opacity-50"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
              {sharing ? ss.generating : ss.shareButton}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, portalRoot);
}
