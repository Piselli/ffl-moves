/** Wallets intentionally supported by the Solana integration. */
export const SUPPORTED_SOLANA_WALLET_IDS = ["phantom", "solflare"] as const;
export type SupportedSolanaWalletId = (typeof SUPPORTED_SOLANA_WALLET_IDS)[number];

export type SolanaWalletDef = {
  id: SupportedSolanaWalletId;
  adapterNames: readonly string[];
  displayName: string;
  chromeExtensionUrl: string;
  downloadUrl: string;
  fallbackIcon?: string;
};

export const SOLANA_WALLETS: readonly SolanaWalletDef[] = [
  {
    id: "phantom",
    adapterNames: ["Phantom"],
    displayName: "Phantom",
    chromeExtensionUrl: "https://phantom.com/download",
    downloadUrl: "https://phantom.com/download",
  },
  {
    id: "solflare",
    adapterNames: ["Solflare"],
    displayName: "Solflare",
    chromeExtensionUrl: "https://solflare.com/download",
    downloadUrl: "https://solflare.com/download",
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

export function isSafariBrowser(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /Safari/i.test(ua) && !/Chrome|Chromium|Edg|Brave|OPR|OPiOS|CriOS|FxiOS/i.test(ua);
}

type WalletRow = { name: string; icon?: string; readyState?: string };

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
    icon: source.icon,
    installUrl: def.chromeExtensionUrl,
    mode,
  };
}

function fallbackRow(def: SolanaWalletDef, mode: WalletConnectRow["mode"]): WalletConnectRow {
  return {
    walletId: def.id,
    name: def.adapterNames[0],
    displayName: def.displayName,
    installUrl: def.chromeExtensionUrl,
    mode,
  };
}

export function solanaWalletConnectRows(
  wallets: readonly WalletRow[] | undefined,
): WalletConnectRow[] {
  const rows: WalletConnectRow[] = [];

  for (const def of SOLANA_WALLETS) {
    const installed = wallets?.filter((w) => def.adapterNames.includes(w.name)) ?? [];
    if (installed.length > 0) {
      rows.push(...installed.map((w) => rowForWallet(def, w, "installed")));
      continue;
    }

    rows.push(fallbackRow(def, "extension-missing"));
  }

  return rows;
}
