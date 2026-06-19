/** Official Nightly downloads (extension, mobile, Safari). */
export const NIGHTLY_DOWNLOAD_URL = "https://nightly.app/";

/** Chrome / Brave / Edge — required for desktop Mac & Windows browser connect. */
export const NIGHTLY_CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/nightly/fiikommddbeccaoicoejoniammnalkfa";

/** Motion Wallet — official Movement-native wallet. */
export const MOTION_DOWNLOAD_URL = "https://motion.movementnetwork.xyz/";

export const MOTION_CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/motion-wallet/lcicbbjcjidfcideckmacabjdfiiogfo";

export const MOTION_WALLET_ICON_URL = "https://motion.movementnetwork.xyz/favicon.ico";

/** Official Motion Wallet FAQ. */
export const MOTION_WALLET_FAQ_URL = "https://www.movementnetwork.xyz/faqs/motion-wallet";

/** Wallets shown in the connect UI, in display order (Motion first). */
export const SUPPORTED_MOVEMENT_WALLET_IDS = ["motion", "nightly"] as const;
export type SupportedMovementWalletId = (typeof SUPPORTED_MOVEMENT_WALLET_IDS)[number];

export type MovementWalletDef = {
  id: SupportedMovementWalletId;
  /** Names the Aptos adapter may register (installed + notDetected). */
  adapterNames: readonly string[];
  displayName: string;
  chromeExtensionUrl: string;
  downloadUrl: string;
  fallbackIcon?: string;
  /** Mobile deeplink connect (Nightly app); Motion is Chrome-only for now. */
  mobileDeeplink: boolean;
  /** Show a manual install row when the adapter registry omits this wallet. */
  manualFallback: boolean;
};

export const MOVEMENT_WALLETS: readonly MovementWalletDef[] = [
  {
    id: "motion",
    adapterNames: ["Motion", "Motion Wallet"],
    displayName: "Motion",
    chromeExtensionUrl: MOTION_CHROME_EXTENSION_URL,
    downloadUrl: MOTION_DOWNLOAD_URL,
    fallbackIcon: MOTION_WALLET_ICON_URL,
    mobileDeeplink: false,
    manualFallback: true,
  },
  {
    id: "nightly",
    adapterNames: ["Nightly"],
    displayName: "Nightly",
    chromeExtensionUrl: NIGHTLY_CHROME_EXTENSION_URL,
    downloadUrl: NIGHTLY_DOWNLOAD_URL,
    mobileDeeplink: true,
    manualFallback: false,
  },
];

export function movementWalletDef(id: SupportedMovementWalletId): MovementWalletDef {
  const def = MOVEMENT_WALLETS.find((w) => w.id === id);
  if (!def) throw new Error(`Unknown wallet id: ${id}`);
  return def;
}

export function movementWalletDefByAdapterName(name: string): MovementWalletDef | undefined {
  return MOVEMENT_WALLETS.find((w) => w.adapterNames.includes(name));
}

export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|Edg|Brave|OPR|OPiOS|CriOS|FxiOS/i.test(ua);
}

/** Desktop: wait for wallet extensions to inject before showing "install extension". */
export const WALLET_DESKTOP_SCAN_MS = 6500;

/** @deprecated Use WALLET_DESKTOP_SCAN_MS */
export const NIGHTLY_DESKTOP_SCAN_MS = WALLET_DESKTOP_SCAN_MS;

/** Movement Network: install Nightly, USDCx, bridge, ecosystem onboarding. */
export const MOVEMENT_WALLET_WELCOME_GUIDE_URL =
  "https://www.movementnetwork.xyz/guides/welcome";

/**
 * Yuzu — official Movement DEX. Pre-filled MOVE → USDCx swap (mainnet).
 * Users connect Nightly and confirm the swap in-wallet.
 */
export const YUZU_USDCX_SWAP_URL =
  "https://app.yuzu.finance/swap?tokenIn=0xa&tokenOut=0xba11833544a2f99eec743f41a228ca6ffa7f13c3b6b04681d5a79a8b75ff225e";

/**
 * Desktop: extension injects → readyState "Installed".
 * Mobile Safari/Chrome: no injection → adapter lists wallet in `notDetectedWallets`;
 * connect(name) uses the wallet deeplink to open the app (Nightly only today).
 */
type WalletRow = { name: string; icon?: string; readyState?: string };

export type WalletConnectRow = {
  walletId: SupportedMovementWalletId;
  /** Adapter name passed to connect() */
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

function rowForWallet(
  def: MovementWalletDef,
  source: WalletRow,
  mode: WalletConnectRow["mode"],
): WalletConnectRow {
  return {
    walletId: def.id,
    name: source.name,
    displayName: def.displayName,
    icon: source.icon ?? def.fallbackIcon,
    installUrl: def.chromeExtensionUrl,
    mode,
  };
}

function fallbackRow(def: MovementWalletDef, mode: WalletConnectRow["mode"]): WalletConnectRow {
  return {
    walletId: def.id,
    name: def.adapterNames[0],
    displayName: def.displayName,
    icon: def.fallbackIcon,
    installUrl: def.chromeExtensionUrl,
    mode,
  };
}

export function movementWalletConnectRows(
  wallets: readonly WalletRow[] | undefined,
  notDetectedWallets: readonly WalletRow[] | undefined,
): WalletConnectRow[] {
  const rows: WalletConnectRow[] = [];

  for (const def of MOVEMENT_WALLETS) {
    const installed = wallets?.filter((w) => def.adapterNames.includes(w.name)) ?? [];
    if (installed.length > 0) {
      rows.push(...installed.map((w) => rowForWallet(def, w, "installed")));
      continue;
    }

    const nd = notDetectedWallets?.filter((w) => def.adapterNames.includes(w.name)) ?? [];
    if (nd.length > 0) {
      const w = nd[0];
      const mode =
        isMobileBrowser() && def.mobileDeeplink ? ("app" as const) : ("extension-missing" as const);
      rows.push(rowForWallet(def, w, mode));
      continue;
    }

    if (def.manualFallback) {
      rows.push(fallbackRow(def, "extension-missing"));
    }
  }

  return rows;
}

/** @deprecated Use movementWalletConnectRows */
export function nightlyConnectRows(
  wallets: readonly WalletRow[] | undefined,
  notDetectedWallets: readonly WalletRow[] | undefined,
): WalletConnectRow[] {
  return movementWalletConnectRows(wallets, notDetectedWallets);
}

/** @deprecated Use WalletConnectRow */
export type NightlyConnectRow = WalletConnectRow;
