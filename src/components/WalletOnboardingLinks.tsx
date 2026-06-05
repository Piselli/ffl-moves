"use client";

import {
  MOVEMENT_WALLET_WELCOME_GUIDE_URL,
  NIGHTLY_DOWNLOAD_URL,
  YUZU_USDCX_SWAP_URL,
} from "@/lib/walletNightly";

const linkClass =
  "block w-full text-center rounded-xl px-3 py-2.5 text-xs font-display font-bold uppercase tracking-wider border transition-colors";

export function WalletOnboardingLinks({
  locale,
  className = "",
}: {
  locale: "uk" | "en";
  className?: string;
}) {
  const t =
    locale === "uk"
      ? {
          nightly: "Завантажити Nightly",
          movement: "Офіційний гайд Movement",
          usdcx: "Своп на Yuzu → USDCx",
        }
      : {
          nightly: "Download Nightly",
          movement: "Official Movement guide",
          usdcx: "Swap on Yuzu → USDCx",
        };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <a
        href={NIGHTLY_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkClass} border-[#00f948]/40 bg-[#00f948]/10 text-[#00f948] hover:bg-[#00f948]/20 hover:border-[#00f948]/60`}
      >
        {t.nightly}
      </a>
      <a
        href={MOVEMENT_WALLET_WELCOME_GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={locale === "uk" ? "Nightly, USDCx, брідж — матеріали Movement" : "Nightly, USDCx, bridge — from Movement"}
        className={`${linkClass} border-white/15 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-white/25`}
      >
        {t.movement}
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
