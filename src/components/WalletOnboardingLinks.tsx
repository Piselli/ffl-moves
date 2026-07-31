"use client";

import { WalletBeginnerHelp } from "@/components/WalletBeginnerHelp";

const linkClass =
  "block w-full text-center rounded-xl px-3 py-2.5 text-xs font-display font-bold uppercase tracking-wider border transition-colors";

const primaryLinkClass = `${linkClass} border-[#00f948]/40 bg-[#00f948]/10 text-[#00f948] hover:bg-[#00f948]/20 hover:border-[#00f948]/60`;
const secondaryLinkClass = `${linkClass} border-white/15 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-white/25`;

export function WalletOnboardingLinks({
  locale,
  className = "",
  /** `full` — no wallet rows yet; `footer` — install cards already shown above */
  variant = "full",
  includeBeginnerHelp = true,
}: {
  locale: "uk" | "en";
  className?: string;
  variant?: "full" | "footer";
  includeBeginnerHelp?: boolean;
}) {
  if (variant === "footer") {
    const t =
      locale === "uk"
        ? { refresh: "Після встановлення гаманця оновіть сторінку.", faq: "Phantom Help", usdc: "Circle USDC faucet" }
        : { refresh: "Refresh after installing a wallet.", faq: "Phantom Help", usdc: "Circle USDC faucet" };

    return (
      <div className={`space-y-2 ${className}`}>
        {includeBeginnerHelp ? <WalletBeginnerHelp locale={locale} /> : null}
        <div className="px-1 pt-1 space-y-2">
          <p className="text-[10px] text-white/35 text-center leading-relaxed">{t.refresh}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px]">
            <a
              href="https://help.phantom.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-white/45 hover:text-white/75 transition-colors"
            >
              {t.faq}
            </a>
            <span className="text-white/20 select-none" aria-hidden>
              ·
            </span>
            <a
              href="https://faucet.circle.com/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400/70 hover:text-sky-300 transition-colors"
            >
              {t.usdc}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const t =
    locale === "uk"
      ? {
          phantom: "Встановити Phantom",
          solflare: "Встановити Solflare",
          usdc: "Отримати devnet USDC",
        }
      : {
          phantom: "Install Phantom",
          solflare: "Install Solflare",
          usdc: "Get devnet USDC",
        };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {includeBeginnerHelp ? <WalletBeginnerHelp locale={locale} /> : null}
      <a
        href="https://phantom.com/download"
        target="_blank"
        rel="noopener noreferrer"
        className={primaryLinkClass}
      >
        {t.phantom}
      </a>
      <a
        href="https://solflare.com/download"
        target="_blank"
        rel="noopener noreferrer"
        className={secondaryLinkClass}
      >
        {t.solflare}
      </a>
      <a
        href="https://faucet.circle.com/"
        target="_blank"
        rel="noopener noreferrer"
        title={locale === "uk" ? "Офіційний faucet Circle для devnet USDC" : "Official Circle faucet for devnet USDC"}
        className={`${linkClass} border-sky-400/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:border-sky-400/50`}
      >
        {t.usdc}
      </a>
    </div>
  );
}
