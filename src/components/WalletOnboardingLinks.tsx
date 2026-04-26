"use client";

import {
  MOVEMENT_WALLET_WELCOME_GUIDE_URL,
  NIGHTLY_DOWNLOAD_URL,
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
        }
      : {
          nightly: "Download Nightly",
          movement: "Official Movement guide",
        };

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      <a
        href={NIGHTLY_DOWNLOAD_URL}
        target="_blank"
        rel="noopener noreferrer"
        className={`${linkClass} border-[#00C46A]/40 bg-[#00C46A]/10 text-[#00C46A] hover:bg-[#00C46A]/20 hover:border-[#00C46A]/60`}
      >
        {t.nightly}
      </a>
      <a
        href={MOVEMENT_WALLET_WELCOME_GUIDE_URL}
        target="_blank"
        rel="noopener noreferrer"
        title={locale === "uk" ? "Nightly, MOVE, брідж — матеріали Movement" : "Nightly, MOVE, bridge — from Movement"}
        className={`${linkClass} border-white/15 bg-white/[0.04] text-white/80 hover:text-white hover:bg-white/[0.08] hover:border-white/25`}
      >
        {t.movement}
      </a>
    </div>
  );
}
