"use client";

import { useLogin } from "@/components/LoginProvider";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { useWallet } from "@/hooks/useSolanaWallet";

export function ConnectWalletCTA({ className = "" }: { className?: string }) {
  const m = useSiteMessages();
  const { connected } = useWallet();
  const { openLogin } = useLogin();

  if (connected) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={openLogin}
        className="inline-flex w-full items-center justify-center rounded-xl bg-[#00f948] px-5 py-3 text-[13px] font-black uppercase tracking-[0.08em] text-black transition hover:brightness-110 active:scale-[0.98] sm:w-auto"
      >
        {m.nav.connectWallet}
      </button>
    </div>
  );
}
