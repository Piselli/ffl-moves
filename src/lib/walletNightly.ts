/** Official Nightly downloads (extension, mobile, Safari). */
export const NIGHTLY_DOWNLOAD_URL = "https://nightly.app/";

/** Chrome / Brave / Edge — required for desktop Mac & Windows browser connect. */
export const NIGHTLY_CHROME_EXTENSION_URL =
  "https://chromewebstore.google.com/detail/nightly/fiikommddbeccaoicoejoniammnalkfa";

export function isMobileBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent);
}

export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|Edg|Brave|OPR|OPiOS|CriOS|FxiOS/i.test(ua);
}

/** Desktop: wait for Nightly extension injection before showing "install extension". */
export const NIGHTLY_DESKTOP_SCAN_MS = 6500;

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
 * Desktop: Nightly extension injects → readyState "Installed".
 * Mobile Safari/Chrome: no injection → adapter lists Nightly in `notDetectedWallets`;
 * connect("Nightly") uses Nightly's deeplink (nightly://…&url=…) to open the app.
 */
type WalletRow = { name: string; icon?: string; readyState?: string };

export type NightlyConnectRow = {
  name: string;
  icon?: string;
  /**
   * installed — browser extension injected (desktop connect popup)
   * app — mobile deeplink into the Nightly app
   * extension-missing — desktop browser without extension (install CTA, not deeplink)
   */
  mode: "installed" | "app" | "extension-missing";
};

export function nightlyConnectRows(
  wallets: readonly WalletRow[] | undefined,
  notDetectedWallets: readonly WalletRow[] | undefined,
): NightlyConnectRow[] {
  // Any Nightly in `wallets` was detected by the browser (readyState may lag behind).
  const installed = wallets?.filter((w) => w.name === "Nightly") ?? [];
  if (installed.length > 0) {
    return installed.map((w) => ({ name: w.name, icon: w.icon, mode: "installed" as const }));
  }
  const nd = notDetectedWallets?.filter((w) => w.name === "Nightly") ?? [];
  if (nd.length > 0) {
    const w = nd[0];
    return [
      {
        name: w.name,
        icon: w.icon,
        mode: isMobileBrowser() ? "app" : "extension-missing",
      },
    ];
  }
  return [];
}
