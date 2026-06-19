"use client";

import { WalletOnboardingLinks } from "@/components/WalletOnboardingLinks";
import { WalletBeginnerHelp } from "@/components/WalletBeginnerHelp";
import { MovementWalletRows } from "@/components/MovementWalletRows";
import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";
import { useWalletConnect } from "@/hooks/useWalletConnect";
import { isSafariBrowser } from "@/lib/walletNightly";

export function ConnectWalletCTA({ className = "" }: { className?: string }) {
  const { locale } = useSiteLocale();
  const m = useSiteMessages();
  const {
    walletRows,
    adapterReady,
    scanDone,
    pending,
    hint,
    statusLine,
    lastError,
    connectWallet,
    connected,
  } = useWalletConnect();

  if (connected) return null;

  const needsExtension = scanDone && walletRows.some((r) => r.mode === "extension-missing");
  const showInstallRows = adapterReady && walletRows.length > 0;
  const showFooterLinks =
    showInstallRows && walletRows.some((r) => r.mode === "app" || r.mode === "extension-missing");
  const safari = isSafariBrowser();

  return (
    <div className={`space-y-4 ${className}`}>
      {!adapterReady && !scanDone ? (
        <p className="text-xs text-white/45 text-center py-2">{m.nav.scanningWallets}</p>
      ) : null}

      {safari && needsExtension && !showInstallRows ? (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-left">
          <p className="text-xs text-amber-100/90 leading-relaxed">{m.nav.safariExtensionHint}</p>
        </div>
      ) : null}

      {needsExtension && !safari && !showInstallRows ? (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-left">
          <p className="text-xs text-amber-100/90 leading-relaxed">{m.nav.desktopExtensionHint}</p>
          <p className="text-xs text-amber-100/70 leading-relaxed mt-2">{m.nav.desktopExtensionRefresh}</p>
        </div>
      ) : null}

      {statusLine ? (
        <div className="rounded-xl bg-sky-500/10 border border-sky-400/25 px-4 py-3">
          <p className="text-xs text-sky-100/90 leading-relaxed">{statusLine}</p>
        </div>
      ) : null}

      {lastError ? (
        <div className="rounded-xl bg-rose-500/10 border border-rose-500/30 px-4 py-3">
          <p className="text-xs text-rose-100/90 leading-relaxed break-words">{lastError}</p>
        </div>
      ) : null}

      {hint ? (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3">
          <p className="text-xs text-amber-100/90 leading-relaxed">{hint}</p>
        </div>
      ) : null}

      {!adapterReady ? (
        <p className="text-xs text-white/35 text-center py-2">{m.nav.loading}</p>
      ) : walletRows.length > 0 ? (
        <div className="flex flex-col gap-2">
          <WalletBeginnerHelp locale={locale} />
          <MovementWalletRows rows={walletRows} pending={pending} onConnect={connectWallet} />
        </div>
      ) : scanDone ? (
        <div className="text-center py-2">
          <p className="text-sm font-bold text-white mb-1">{m.nav.noWalletsFound}</p>
          <p className="text-xs text-white/45 leading-relaxed mb-4">{m.nav.noWalletsHint}</p>
        </div>
      ) : null}

      {showFooterLinks ? (
        <WalletOnboardingLinks locale={locale} variant="footer" includeBeginnerHelp={false} />
      ) : scanDone && !showInstallRows ? (
        <WalletOnboardingLinks locale={locale} variant="full" />
      ) : null}
    </div>
  );
}
