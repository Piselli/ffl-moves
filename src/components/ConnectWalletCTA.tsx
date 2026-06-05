"use client";

import { WalletOnboardingLinks } from "@/components/WalletOnboardingLinks";
import { useSiteLocale, useSiteMessages } from "@/i18n/LocaleProvider";
import { useNightlyConnect } from "@/hooks/useNightlyConnect";
import { NIGHTLY_CHROME_EXTENSION_URL, isSafariBrowser } from "@/lib/walletNightly";

export function ConnectWalletCTA({ className = "" }: { className?: string }) {
  const { locale } = useSiteLocale();
  const m = useSiteMessages();
  const {
    nightlyRows,
    adapterReady,
    scanDone,
    pending,
    hint,
    statusLine,
    lastError,
    connectNightly,
    connected,
  } = useNightlyConnect();

  if (connected) return null;

  const needsExtension = scanDone && nightlyRows.some((r) => r.mode === "extension-missing");
  const safari = isSafariBrowser();

  return (
    <div className={`space-y-4 ${className}`}>
      {!adapterReady && !scanDone ? (
        <p className="text-xs text-white/45 text-center py-2">{m.nav.scanningNightly}</p>
      ) : null}

      {safari && needsExtension ? (
        <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-4 py-3 text-left">
          <p className="text-xs text-amber-100/90 leading-relaxed">{m.nav.safariExtensionHint}</p>
        </div>
      ) : null}

      {needsExtension && !safari ? (
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
      ) : nightlyRows.length > 0 ? (
        <div className="flex flex-col gap-2">
          {nightlyRows.map((row) =>
            row.mode === "extension-missing" ? (
              <a
                key={row.name + row.mode}
                href={safari ? "https://nightly.app/" : NIGHTLY_CHROME_EXTENSION_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-[#00f948]/35 bg-[#00f948]/10 hover:bg-[#00f948]/20 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 p-2 flex shrink-0 items-center justify-center">
                  {row.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.icon} alt={row.name} className="w-full h-full object-contain" />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-display font-bold text-[#00f948]">
                    {safari ? m.nav.openInNightly : m.nav.installNightlyExtension}
                  </p>
                  <p className="text-xs text-white/50 font-medium mt-0.5">
                    {safari ? "nightly.app" : "Chrome Web Store"}
                  </p>
                </div>
              </a>
            ) : (
              <button
                key={row.name + row.mode}
                type="button"
                disabled={pending}
                onClick={() => connectNightly(row.name)}
                className="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] hover:border-[#00f948]/35 transition-colors text-left disabled:opacity-50 cursor-pointer"
              >
                <div className="w-10 h-10 rounded-xl bg-white/[0.04] border border-white/10 p-2 flex shrink-0 items-center justify-center">
                  {row.icon ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={row.icon} alt={row.name} className="w-full h-full object-contain" />
                  ) : null}
                </div>
                <div>
                  <p className="text-sm font-display font-bold text-white">{row.name}</p>
                  <p className="text-xs text-[#00f948] font-bold uppercase tracking-wider mt-0.5">
                    {row.mode === "installed" ? m.nav.installed : m.nav.openInNightly}
                  </p>
                </div>
              </button>
            ),
          )}
        </div>
      ) : scanDone ? (
        <div className="text-center py-2">
          <p className="text-sm font-bold text-white mb-1">{m.nav.noWalletsFound}</p>
          <p className="text-xs text-white/45 leading-relaxed mb-4">{m.nav.noWalletsHint}</p>
        </div>
      ) : null}

      <WalletOnboardingLinks locale={locale} />
    </div>
  );
}
