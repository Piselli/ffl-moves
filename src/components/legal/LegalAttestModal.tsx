"use client";

import { memo, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { GlassPanel } from "@/components/design-lab/locker-hero/GlassPanel";
import { getCtaStyle } from "@/components/design-lab/locker-hero/ctaStyles";
import { LegalAttestCheckbox } from "@/components/legal/LegalAttestCheckbox";
import { useSiteLocale } from "@/i18n/LocaleProvider";

const docs = [
  { href: "/terms", en: "Terms of Service", uk: "Умови користування" },
  { href: "/privacy", en: "Privacy Policy", uk: "Політика конфіденційності" },
  { href: "/risk", en: "Risk Disclosure", uk: "Розкриття ризиків" },
] as const;

const DISPLAY = { fontFamily: "var(--font-display), sans-serif" };

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
 *
 * Look = the product's default obsidian glass (GlassPanel crystal), same as
 * NicknameModal, with the convex-green "Registration" CTA.
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
        <GlassPanel crystal className="relative w-full !rounded-2xl p-5 sm:p-6">
          <div>
            <h2
              id="legal-attest-title"
              className="pr-8 text-[22px] font-black uppercase tracking-[-0.02em] text-white"
              style={DISPLAY}
            >
              {uk ? "Перед грою" : "Before you play"}
            </h2>
            <p className="mt-2 text-[13px] font-medium leading-snug text-white/50">
              {uk
                ? "Швидка перевірка. Запитаємо знову лише якщо зміняться Умови."
                : "One quick check. We'll ask again only if the Terms change."}
            </p>

            <ul className="mt-5 flex flex-col gap-2">
              {docs.map((d) => (
                <li key={d.href}>
                  <a
                    href={d.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-xl border border-white/20 bg-black/35 px-3.5 py-3 text-[14px] font-medium text-white/85 transition-[border-color,color] duration-150 hover:border-white/40 hover:text-white"
                  >
                    {uk ? d.uk : d.en}
                    <svg
                      aria-hidden
                      viewBox="0 0 14 14"
                      className="h-3.5 w-3.5 text-white/35 transition-colors group-hover:text-white/70"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M8 2.5h3.5V6M11.5 2.5 6.5 7.5M10 8.5v2a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1h2" />
                    </svg>
                  </a>
                </li>
              ))}
            </ul>

            <LegalAttestCheckbox
              checked={checked}
              onChange={onCheckedChange}
              className="mt-3"
            />

            <div className="mt-5 flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-white/20 py-3 text-[11px] font-bold uppercase tracking-[0.12em] text-white/70 transition hover:border-white/35 hover:text-white active:scale-[0.98]"
              >
                {uk ? "Скасувати" : "Cancel"}
              </button>
              <button
                type="button"
                disabled={!checked || busy}
                onClick={onConfirm}
                style={cta.style}
                className="flex-1 rounded-xl py-3 text-[11px] font-bold uppercase tracking-[0.12em] transition enabled:hover:brightness-110 enabled:active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
              >
                {busy
                  ? uk
                    ? "Збереження…"
                    : "Saving…"
                  : uk
                    ? "Продовжити"
                    : "Continue"}
              </button>
            </div>
          </div>
        </GlassPanel>

        <button
          type="button"
          onClick={onClose}
          aria-label={uk ? "Закрити" : "Close"}
          className="absolute right-1.5 top-1.5 z-30 grid h-8 w-8 place-items-center rounded-lg text-white/45 transition-[transform,background-color,color] duration-150 hover:bg-white/[0.06] hover:text-white/85 active:scale-[0.96]"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="1.7"
              strokeLinecap="round"
            />
          </svg>
        </button>
      </div>
    </div>,
    portalRoot,
  );
});
