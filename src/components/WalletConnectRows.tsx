"use client";

import { useState } from "react";
import type { WalletConnectRow } from "@/lib/solanaWallets";
import { isMobileBrowser, solanaWalletDef } from "@/lib/solanaWallets";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { usePrivyAuth } from "@/components/PrivyAppProvider";

type Props = {
  rows: WalletConnectRow[];
  pending?: boolean;
  onConnect: (walletName: string) => void;
  variant?: "navbar" | "cta";
};

function installHref(row: WalletConnectRow) {
  const def = solanaWalletDef(row.walletId);
  if (isMobileBrowser()) return def.downloadUrl;
  return def.chromeExtensionUrl;
}

function ExternalIcon() {
  return (
    <svg className="w-3.5 h-3.5 shrink-0 opacity-0 group-hover:opacity-40 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
      <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="h-5 w-5 text-[#00f948]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M4 7l8 6 8-6" />
    </svg>
  );
}

export function WalletConnectRows({ rows, pending = false, onConnect, variant = "cta" }: Props) {
  const m = useSiteMessages();
  const privy = usePrivyAuth();
  const [emailHint, setEmailHint] = useState<string | null>(null);
  const pad = variant === "navbar" ? "px-2 py-1" : "";

  const shellInstall =
    "group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.985] text-left";
  const shellConnect =
    "group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#00f948]/30 transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.23,1,0.32,1)] active:scale-[0.985] text-left disabled:opacity-50 cursor-pointer";
  const iconShell =
    "w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 p-2 flex shrink-0 items-center justify-center";

  const onEmailLogin = () => {
    setEmailHint(null);
    if (!privy.configured) {
      setEmailHint(m.nav.emailLoginNeedsAppId);
      return;
    }
    if (!privy.ready) return;
    privy.login({ loginMethods: ["email", "google"] });
  };

  return (
    <div className={`flex flex-col gap-1.5 ${pad}`}>
      <button
        type="button"
        disabled={pending || (privy.configured && !privy.ready)}
        onClick={onEmailLogin}
        className={shellConnect}
      >
        <div className={iconShell}>
          <MailIcon />
        </div>
        <div className="min-w-0 flex-1 text-left">
          <p className="text-[15px] font-display font-bold leading-tight text-white">
            {m.nav.continueWithEmail}
          </p>
          <p className="text-[11px] mt-1 leading-snug text-white/45">{m.nav.continueWithEmailSub}</p>
        </div>
      </button>
      {emailHint ? (
        <p className="px-1 text-[10px] leading-snug text-amber-200/80">{emailHint}</p>
      ) : null}

      <div className="flex items-center gap-2 px-1 py-1">
        <span className="h-px flex-1 bg-white/10" />
        <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-white/35">
          {m.nav.orUseWallet}
        </span>
        <span className="h-px flex-1 bg-white/10" />
      </div>

      {rows.map((row) => {
        const installSub =
          row.walletId === "phantom"
            ? m.nav.walletPhantomInstallSub
            : row.walletId === "solflare"
              ? m.nav.walletSolflareInstallSub
              : m.nav.walletJupiterInstallSub;

        if (row.mode === "extension-missing") {
          return (
            <a
              key={row.walletId + row.mode}
              href={installHref(row)}
              target="_blank"
              rel="noopener noreferrer"
              className={shellInstall}
            >
              <div className={iconShell}>
                {row.icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={row.icon} alt="" className="w-full h-full object-contain" />
                ) : null}
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[15px] font-display font-bold leading-tight text-white">
                  {row.displayName}
                </p>
                <p className="text-[11px] mt-1 leading-snug text-white/45">{installSub}</p>
              </div>
              <ExternalIcon />
            </a>
          );
        }

        const connectLabel =
          row.mode === "installed"
            ? m.nav.installed
            : `Connect ${row.displayName}`;

        return (
          <button
            key={row.walletId + row.mode}
            type="button"
            disabled={pending}
            onClick={() => onConnect(row.name)}
            className={shellConnect}
          >
            <div className={iconShell}>
              {row.icon ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={row.icon} alt="" className="w-full h-full object-contain" />
              ) : null}
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-[15px] font-display font-bold leading-tight text-white">
                {row.displayName}
              </p>
              <p className="text-[11px] font-semibold text-[#00f948]/80 uppercase tracking-wide mt-1">{connectLabel}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
