import { PRIVY_ONRAMP_USDC_MINT } from "@/lib/privyFunding";

function publicEnv(s: string | undefined): string | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

/** Transak — Phantom / MetaMask Solana partner. Staging or prod API key. */
export const TRANSAK_API_KEY = publicEnv(process.env.NEXT_PUBLIC_TRANSAK_API_KEY);

/** Onramper aggregator (routes Transak, Mercuryo, etc.). */
export const ONRAMPER_API_KEY = publicEnv(process.env.NEXT_PUBLIC_ONRAMPER_API_KEY);

export const TRANSAK_ENV =
  publicEnv(process.env.NEXT_PUBLIC_TRANSAK_ENV)?.toLowerCase() === "production"
    ? "production"
    : "staging";

export type OnrampPaymentHint = "card" | "apple" | "google";

export type OpenUsdcOnrampArgs = {
  address: string;
  /** Fiat amount as decimal string, e.g. "25". */
  amountUsd: string;
  method?: OnrampPaymentHint;
};

/**
 * Build a Transak buy URL for Solana USDC.
 * Partner of Phantom & MetaMask Solana — much better UA/EU coverage than Stripe.
 * Query-param widget URLs still work with partner API keys on both staging & prod hosts.
 */
export function buildTransakBuyUrl(args: OpenUsdcOnrampArgs): string | null {
  if (!TRANSAK_API_KEY) return null;
  const host =
    TRANSAK_ENV === "production" ? "https://global.transak.com" : "https://global-stg.transak.com";
  const params = new URLSearchParams({
    apiKey: TRANSAK_API_KEY,
    productsAvailed: "BUY",
    cryptoCurrencyCode: "USDC",
    network: "solana",
    walletAddress: args.address,
    disableWalletAddressForm: "true",
    fiatAmount: args.amountUsd,
    // EUR clears UA/EU better than USD (Stripe USDC-on-USD is geo-blocked).
    fiatCurrency: "EUR",
    themeColor: "00f948",
    colorMode: "DARK",
  });
  if (args.method === "apple") params.set("paymentMethod", "apple_pay");
  else if (args.method === "google") params.set("paymentMethod", "google_pay");
  else params.set("paymentMethod", "credit_debit_card");
  return `${host}?${params.toString()}`;
}

/** Onramper buy widget — aggregator that includes Transak and other Solana rails. */
export function buildOnramperBuyUrl(args: OpenUsdcOnrampArgs): string | null {
  if (!ONRAMPER_API_KEY) return null;
  const params = new URLSearchParams({
    apiKey: ONRAMPER_API_KEY,
    mode: "buy",
    defaultCrypto: "usdc_solana",
    onlyCryptos: "usdc_solana",
    wallets: `usdc_solana:${args.address}`,
    defaultFiat: "EUR",
    defaultAmount: args.amountUsd,
    themeName: "dark",
    darkMode: "true",
  });
  return `https://buy.onramper.com/?${params.toString()}`;
}

/** Prefer Transak (Solana-wallet standard), then Onramper. Null → caller uses Privy Coinbase. */
export function buildExternalUsdcOnrampUrl(args: OpenUsdcOnrampArgs): string | null {
  return buildTransakBuyUrl(args) ?? buildOnramperBuyUrl(args);
}

export function openExternalUsdcOnramp(args: OpenUsdcOnrampArgs): boolean {
  const url = buildExternalUsdcOnrampUrl(args);
  if (!url) return false;
  window.open(url, "_blank", "noopener,noreferrer");
  return true;
}

export { PRIVY_ONRAMP_USDC_MINT };
