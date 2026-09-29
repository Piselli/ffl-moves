"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { getCtaStyle } from "@/components/design-lab/locker-hero/ctaStyles";
import { LegalAttestCheckbox } from "@/components/legal/LegalAttestCheckbox";
import { useSiteLocale } from "@/i18n/LocaleProvider";

type Props = {
  open: boolean;
  checked: boolean;
  onCheckedChange: (next: boolean) => void;
  onConfirm: () => void;
  onClose: () => void;
  busy?: boolean;
};

/**
 * Attestation UI lives in a document.body portal — never inside drei Html.
 * (Next/router + R3F Html was blanking the tablet after wallet connect.)
 */
export function LegalAttestModal({
  open,
  checked,
  onCheckedChange,
  onConfirm,
  onClose,
  busy = false,
}: Props) {
  const { locale } = useSiteLocale();
  const uk = locale === "uk";
  const reduce = Boolean(useReducedMotion());
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const cta = getCtaStyle("convex-green");

  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handler);
    return () => {
      document.body.style.overflow = prev;
      window.removeEventListener("keydown", handler);
    };
  }, [open, onClose]);

  if (!portalRoot) return null;

  return createPortal(
    <AnimatePresence>
      {open ? (
        <motion.div
          key="legal-attest"
          className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
          initial={reduce ? { opacity: 0 } : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-attest-title"
        >
          <button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/65 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            className="relative z-10 w-full max-w-md"
            initial={reduce ? false : { opacity: 0, y: 16, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 380, damping: 34 }}
          >
            <GlassPanel crystal className="!rounded-2xl p-5 sm:p-6">
              <p
                id="legal-attest-title"
                className="font-display text-lg font-black uppercase tracking-tight text-white"
              >
                {uk ? "Перед грою" : "Before you play"}
              </p>
              <p className="mt-1.5 text-[13px] leading-snug text-white/45">
                {uk
                  ? "Швидка перевірка. Запитаємо знову лише якщо зміняться Умови."
                  : "One quick check. We'll ask again only if the Terms change."}
              </p>

              <LegalAttestCheckbox
                checked={checked}
                onChange={onCheckedChange}
                className="mt-4"
              />

              <div className="mt-5 flex flex-col gap-2 sm:flex-row-reverse">
                <button
                  type="button"
                  disabled={!checked || busy}
                  onClick={onConfirm}
                  className="flex-1 rounded-xl px-4 py-3 text-[12px] font-black uppercase tracking-[0.12em] text-black transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
                  style={cta.style}
                >
                  {busy
                    ? uk
                      ? "Збереження…"
                      : "Saving…"
                    : uk
                      ? "Продовжити"
                      : "Continue"}
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 rounded-xl border border-white/15 bg-white/[0.04] px-4 py-3 text-[12px] font-bold uppercase tracking-[0.12em] text-white/60 transition hover:border-white/30 hover:text-white"
                >
                  {uk ? "Скасувати" : "Cancel"}
                </button>
              </div>
            </GlassPanel>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>,
    portalRoot,
  );
}
