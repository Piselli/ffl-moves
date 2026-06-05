/** Official Nightly downloads (extension, mobile, Safari). */
export const NIGHTLY_DOWNLOAD_URL = "https://nightly.app/";

/** Movement Network: install Nightly, USDCx, bridge, ecosystem onboarding. */
export const MOVEMENT_WALLET_WELCOME_GUIDE_URL =
  "https://www.movementnetwork.xyz/guides/welcome";

/** How USDCx works on Movement (bridge USDC → receive USDCx in wallet). */
export const USDCX_GUIDE_URL =
  "https://www.movementnetwork.xyz/article/introducing-usdcx-movements-native-usdc-backed-stablecoin";

/** Circle xReserve — infrastructure behind USDCx minting (for advanced readers). */
export const CIRCLE_XRESERVE_URL = "https://www.circle.com/xreserve";

/**
 * Desktop: Nightly extension injects → readyState "Installed".
 * Mobile Safari/Chrome: no injection → adapter lists Nightly in `notDetectedWallets`;
 * connect("Nightly") uses Nightly's deeplink (nightly://…&url=…) to open the app.
 */
type WalletRow = { name: string; icon?: string; readyState?: string };

export type NightlyConnectRow = {
  name: string;
  icon?: string;
  /** installed = in-page extension; app = open Nightly / deep link */
  mode: "installed" | "app";
};

export function nightlyConnectRows(
  wallets: readonly WalletRow[] | undefined,
  notDetectedWallets: readonly WalletRow[] | undefined,
): NightlyConnectRow[] {
  const installed = wallets?.filter((w) => w.name === "Nightly" && w.readyState === "Installed") ?? [];
  if (installed.length > 0) {
    return installed.map((w) => ({ name: w.name, icon: w.icon, mode: "installed" }));
  }
  const nd = notDetectedWallets?.filter((w) => w.name === "Nightly") ?? [];
  if (nd.length > 0) {
    const w = nd[0];
    return [{ name: w.name, icon: w.icon, mode: "app" }];
  }
  return [];
}
