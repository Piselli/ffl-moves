"use client";

import type { WalletConnectRow } from "@/lib/walletNightly";
import { NIGHTLY_DOWNLOAD_URL, isMobileBrowser, isSafariBrowser, movementWalletDef } from "@/lib/walletNightly";
import { useSiteMessages } from "@/i18n/LocaleProvider";

type Props = {
  rows: WalletConnectRow[];
  pending?: boolean;
  onConnect: (walletName: string) => void;
  variant?: "navbar" | "cta";
};

function installHref(row: WalletConnectRow, safari: boolean) {
  const def = movementWalletDef(row.walletId);
  if (row.walletId === "nightly" && safari) return NIGHTLY_DOWNLOAD_URL;
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

export function MovementWalletRows({ rows, pending = false, onConnect, variant = "cta" }: Props) {
  const m = useSiteMessages();
  const safari = isSafariBrowser();
  const pad = variant === "navbar" ? "px-2 py-1" : "";

  const shellInstall =
    "group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.14] transition-all text-left";
  const shellConnect =
    "group w-full flex items-center gap-3 px-3.5 py-3 rounded-xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] hover:border-[#00f948]/30 transition-all text-left disabled:opacity-50 cursor-pointer";
  const iconShell =
    "w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 p-2 flex shrink-0 items-center justify-center";

  return (
    <div className={`flex flex-col gap-1.5 ${pad}`}>
      {rows.map((row) => {
        const installSub =
          row.walletId === "motion" ? m.nav.walletMotionInstallSub : m.nav.walletNightlyInstallSub;

        if (row.mode === "extension-missing") {
          return (
            <a
              key={row.walletId + row.mode}
              href={installHref(row, safari)}
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
            : row.walletId === "motion"
              ? m.nav.openInMotion
              : m.nav.openInNightly;

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
