"use client";

import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
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
 * No Framer Motion here: the homepage WebGL loop re-renders often; motion +
 * backdrop-blur over the canvas caused a visible flash on open.
 */
export const LegalAttestModal = memo(function LegalAttestModal({
  open,
  checked,
  onCheckedChange,
  onConfirm,
  onClose,
  busy = false,
}: Props) {
  const { locale } = useSiteLocale();
  const uk = locale === "uk";
  const [portalRoot] = useState<HTMLElement | null>(() =>
    typeof document !== "undefined" ? document.body : null,
  );
  const cta = getCtaStyle("convex-green");

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

  if (!portalRoot || !open) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-4 sm:items-center"
      style={{ isolation: "isolate" }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="legal-attest-title"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-[#050607]/88"
        onClick={onClose}
      />
      <div
        className="relative z-10 w-full max-w-md"
        style={{ transform: "translateZ(0)" }}
        onWheel={(e) => e.stopPropagation()}
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
      </div>
    </div>,
    portalRoot,
  );
});
