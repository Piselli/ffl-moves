"use client";

import Link from "next/link";
import { useState } from "react";
import { useSiteMessages } from "@/i18n/LocaleProvider";

const FAQ = {
  whatIsWallet: "/faq#web3-101--what-is-wallet",
  whichWallet: "/faq#web3-101--which-wallet",
  firstSteps: "/faq#how-to-play--first-steps",
  web3Section: "/faq#cat-web3-101",
} as const;

export function WalletBeginnerHelp({
  locale,
  className = "",
  compact = false,
}: {
  locale: "uk" | "en";
  className?: string;
  /** Header strip in the wallet modal — always shows the guide link */
  compact?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const m = useSiteMessages();

  const t =
    locale === "uk"
      ? {
          headerLink: "Вперше з Web3? Пояснення →",
          blurb:
            "Гаманець — це розширення для браузера. Воно зберігає крипто і підтверджує дії на сайті — логін і підпис замість пароля.",
          whatIs: "Що таке гаманець?",
          which: "Motion чи Nightly — що обрати?",
          steps: "Покрокова інструкція",
          all: "Усі питання про Web3",
        }
      : {
          headerLink: "New to Web3? Read the guide →",
          blurb:
            "A wallet is a browser extension. It holds your crypto and approves actions on sites — your login and signature instead of a password.",
          whatIs: "What is a wallet?",
          which: "Motion or Nightly — which to pick?",
          steps: "Step-by-step guide",
          all: "All Web3 questions",
        };

  if (compact) {
    return (
      <p className={className}>
        <Link
          href={FAQ.web3Section}
          className="text-[11px] text-white/40 hover:text-[#00f948]/90 transition-colors underline-offset-2 hover:underline"
        >
          {t.headerLink}
        </Link>
      </p>
    );
  }

  return (
    <div className={`rounded-xl border border-white/[0.07] bg-white/[0.015] overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full flex items-center gap-3 px-3.5 py-3 text-left hover:bg-white/[0.03] transition-colors"
      >
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-white/40 leading-none mb-1">{m.nav.walletBeginnerEyebrow}</p>
          <p className="text-[13px] font-display font-semibold text-white/80 leading-snug">
            {m.nav.walletBeginnerTitle}
          </p>
        </div>
        <svg
          className={`w-4 h-4 shrink-0 text-white/30 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
          aria-hidden
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open ? (
        <div className="px-3.5 pb-3.5 space-y-3 border-t border-white/[0.06]">
          <p className="text-[12px] text-white/50 leading-relaxed pt-3">{t.blurb}</p>
          <ul className="space-y-2">
            {(
              [
                [t.whatIs, FAQ.whatIsWallet],
                [t.which, FAQ.whichWallet],
                [t.steps, FAQ.firstSteps],
              ] as const
            ).map(([label, href]) => (
              <li key={href}>
                <Link
                  href={href}
                  className="flex items-center gap-2 text-[12px] text-white/65 hover:text-[#00f948] transition-colors group"
                >
                  <span className="w-1 h-1 rounded-full bg-[#00f948]/60 group-hover:bg-[#00f948] shrink-0" />
                  {label}
                </Link>
              </li>
            ))}
          </ul>
          <Link
            href={FAQ.web3Section}
            className="inline-flex items-center gap-1 text-[11px] text-white/35 hover:text-white/55 transition-colors"
          >
            {t.all}
            <span aria-hidden>→</span>
          </Link>
        </div>
      ) : null}
    </div>
  );
}
