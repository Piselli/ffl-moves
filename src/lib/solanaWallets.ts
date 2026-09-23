/** Wallets intentionally supported by the Solana integration. */
export const SUPPORTED_SOLANA_WALLET_IDS = ["phantom", "solflare", "jupiter"] as const;
export type SupportedSolanaWalletId = (typeof SUPPORTED_SOLANA_WALLET_IDS)[number];

export type SolanaWalletDef = {
  id: SupportedSolanaWalletId;
  adapterNames: readonly string[];
  displayName: string;
  /** Chromium desktop — Chrome Web Store listing (Add to Chrome). */
  chromeExtensionUrl: string;
  /** Safari / Firefox / unknown — official download hub. */
  downloadUrl: string;
  iosAppUrl: string;
  androidAppUrl: string;
  fallbackIcon?: string;
};

export const SOLANA_WALLETS: readonly SolanaWalletDef[] = [
  {
    id: "phantom",
    adapterNames: ["Phantom"],
    displayName: "Phantom",
    chromeExtensionUrl:
      "https://chromewebstore.google.com/detail/phantom/bfnaelmomeimhlpmgjnjophhpkkoljpa",
    downloadUrl: "https://phantom.com/download",
    iosAppUrl: "https://apps.apple.com/app/phantom-solana-wallet/id1598432977",
    androidAppUrl: "https://play.google.com/store/apps/details?id=app.phantom",
    fallbackIcon: "/wallets/phantom.svg",
  },
  {
    id: "solflare",
    adapterNames: ["Solflare"],
    displayName: "Solflare",
    chromeExtensionUrl:
      "https://chromewebstore.google.com/detail/solflare-wallet/bhhhlbepdkbapadjdnnojkbgioiodbic",
    downloadUrl: "https://solflare.com/download",
    iosAppUrl: "https://apps.apple.com/app/solflare/id1580902717",
    androidAppUrl: "https://play.google.com/store/apps/details?id=com.solflare.mobile",
    fallbackIcon: "/wallets/solflare.svg",
  },
  {
    id: "jupiter",
    adapterNames: ["Jupiter", "Jupiter Wallet", "Jupiter Mobile"],
    displayName: "Jupiter",
    chromeExtensionUrl:
      "https://chromewebstore.google.com/detail/jupiter-wallet/iledlaeogohbilgbfhmbgkgmpplbfboh",
    downloadUrl: "https://jup.ag/wallet",
    iosAppUrl: "https://apps.apple.com/app/jupiter-mobile/id6484069059",
    androidAppUrl: "https://play.google.com/store/apps/details?id=ag.jup.jupiter.android",
    fallbackIcon: "/wallets/jupiter.png",
  },
];

export function solanaWalletDef(id: SupportedSolanaWalletId): SolanaWalletDef {
  const def = SOLANA_WALLETS.find((w) => w.id === id);
  if (!def) throw new Error(`Unknown wallet id: ${id}`);
  return def;
}

export function solanaWalletDefByAdapterName(name: string): SolanaWalletDef | undefined {
  return SOLANA_WALLETS.find((w) => w.adapterNames.includes(name));
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

/**
 * Instagram / Facebook / TikTok / Line / Twitter in-app browsers.
 * Wallet extensions and often Google OAuth break here — email + “open in Safari/Chrome”.
 */
export function isInAppBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return (
    /Instagram/i.test(ua) ||
    /FBAN|FBAV|FB_IAB|FB4A|FBAN\//i.test(ua) ||
    /Line\//i.test(ua) ||
    /Twitter/i.test(ua) ||
    /TikTok/i.test(ua) ||
    /BytedanceWebview|ByteLocale|musical_ly/i.test(ua) ||
    /Snapchat/i.test(ua) ||
    /; wv\)/i.test(ua) // Android WebView marker
  );
}

/** Prefer Safari on iOS, Chrome on Android — for banner copy. */
export function preferredSystemBrowserName(): "Safari" | "Chrome" | "browser" {
  if (typeof navigator === "undefined") return "browser";
  if (isIOSBrowser()) return "Safari";
  if (/Android/i.test(navigator.userAgent)) return "Chrome";
  return "browser";
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|Edg|Brave|OPR|OPiOS|CriOS|FxiOS/i.test(ua);
}

export function isFirefoxBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Firefox\//i.test(navigator.userAgent);
}

function isIOSBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPhone|iPad|iPod/i.test(navigator.userAgent);
}

/** Official install page for the current browser / OS. */
export function walletInstallUrl(def: SolanaWalletDef): string {
  if (typeof navigator === "undefined") return def.downloadUrl;
  if (isMobileBrowser()) {
    return isIOSBrowser() ? def.iosAppUrl : def.androidAppUrl;
  }
  if (isSafariBrowser() || isFirefoxBrowser()) return def.downloadUrl;
  return def.chromeExtensionUrl;
}

type WalletRow = { name: string; icon?: string; readyState?: string };

function isAdapterReady(readyState: string | undefined): boolean {
  return readyState === "Installed";
}

export type WalletConnectRow = {
  walletId: SupportedSolanaWalletId;
  name: string;
  displayName: string;
  icon?: string;
  installUrl: string;
  /**
   * installed — browser extension injected (desktop connect popup)
   * app — mobile deeplink into the wallet app
   * extension-missing — desktop browser without extension (install CTA, not deeplink)
   */
  mode: "installed" | "app" | "extension-missing";
};

function rowForWallet(def: SolanaWalletDef, source: WalletRow, mode: WalletConnectRow["mode"]): WalletConnectRow {
  return {
    walletId: def.id,
    name: source.name,
    displayName: def.displayName,
    icon: source.icon || def.fallbackIcon,
    installUrl: walletInstallUrl(def),
    mode,
  };
}

function fallbackRow(def: SolanaWalletDef, mode: WalletConnectRow["mode"]): WalletConnectRow {
  return {
    walletId: def.id,
    name: def.adapterNames[0],
    displayName: def.displayName,
    icon: def.fallbackIcon,
    installUrl: walletInstallUrl(def),
    mode,
  };
}

export function solanaWalletConnectRows(
  wallets: readonly WalletRow[] | undefined,
): WalletConnectRow[] {
  const rows: WalletConnectRow[] = [];

  for (const def of SOLANA_WALLETS) {
    const matches = wallets?.filter((w) => def.adapterNames.includes(w.name)) ?? [];
    const ready = matches.find((w) => isAdapterReady(w.readyState));
    if (ready) {
      rows.push(rowForWallet(def, ready, "installed"));
      continue;
    }
    const detected = matches[0];
    if (detected) {
      rows.push(rowForWallet(def, detected, "extension-missing"));
      continue;
    }
    rows.push(fallbackRow(def, "extension-missing"));
  }

  return rows;
}
