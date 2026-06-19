"use client";

import { WalletBeginnerHelp } from "@/components/WalletBeginnerHelp";
import {
  MOTION_CHROME_EXTENSION_URL,
  MOTION_DOWNLOAD_URL,
  MOTION_WALLET_FAQ_URL,
  NIGHTLY_CHROME_EXTENSION_URL,
  NIGHTLY_DOWNLOAD_URL,
  YUZU_USDCX_SWAP_URL,
  isMobileBrowser,
} from "@/lib/walletNightly";

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
  const desktop = !isMobileBrowser();

  if (variant === "footer") {
    const t =
      locale === "uk"
        ? { refresh: "Після встановлення оновіть сторінку.", faq: "Motion FAQ", usdcx: "Yuzu → USDCx" }
        : { refresh: "Refresh the page after installing.", faq: "Motion FAQ", usdcx: "Yuzu → USDCx" };

    return (
      <div className={`space-y-2 ${className}`}>
        {includeBeginnerHelp ? <WalletBeginnerHelp locale={locale} /> : null}
        <div className="px-1 pt-1 space-y-2">
          <p className="text-[10px] text-white/35 text-center leading-relaxed">{t.refresh}</p>
          <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-[11px]">
            <a
              href={MOTION_WALLET_FAQ_URL}
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
              href={YUZU_USDCX_SWAP_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sky-400/70 hover:text-sky-300 transition-colors"
            >
              {t.usdcx}
            </a>
          </div>
        </div>
      </div>
    );
  }

  const t =
    locale === "uk"
      ? {
          motion: desktop ? "Motion — розширення (Chrome)" : "Завантажити Motion",
          nightly: desktop ? "Nightly — розширення (Chrome)" : "Завантажити Nightly",
          usdcx: "Своп на Yuzu → USDCx",
        }
      : {
          motion: desktop ? "Motion extension (Chrome)" : "Download Motion",
          nightly: desktop ? "Nightly extension (Chrome)" : "Download Nightly",
          usdcx: "Swap on Yuzu → USDCx",
        };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {includeBeginnerHelp ? <WalletBeginnerHelp locale={locale} /> : null}
      <a
        href={desktop ? MOTION_CHROME_EXTENSION_URL : MOTION_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={primaryLinkClass}
      >
        {t.motion}
      </a>
      <a
        href={desktop ? NIGHTLY_CHROME_EXTENSION_URL : NIGHTLY_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={secondaryLinkClass}
      >
        {t.nightly}
      </a>
      <a
        href={YUZU_USDCX_SWAP_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={locale === "uk" ? "Офіційний DEX Movement — своп у USDCx" : "Official Movement DEX — swap to USDCx"}
        className={`${linkClass} border-sky-400/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 hover:border-sky-400/50`}
      >
        {t.usdcx}
      </a>
    </div>
  );
}
