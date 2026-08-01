import { ENTRY_FEE_USDC } from "./constants";

/** SPL USDC has 6 decimals — every raw on-chain amount in this app is micro-USDC. */
const USDC_DECIMALS_DIVISOR = 1_000_000;

export const ENTRY_FEE_SYMBOL = "USDC";

/** Default on-chain entry fee in raw units (5 USDC = 5_000_000). */
export const DEFAULT_ENTRY_FEE_RAW = ENTRY_FEE_USDC * USDC_DECIMALS_DIVISOR;

export { ENTRY_FEE_USDC };

function toNumber(units: number | bigint): number {
  return typeof units === "bigint" ? Number(units) : units;
}

/** Raw on-chain units → human amount string (no symbol). */
export function formatFeeUnits(units: number | bigint): string {
  return (toNumber(units) / USDC_DECIMALS_DIVISOR).toFixed(2);
}

/** e.g. `5.00 USDC` */
export function formatFeeLabel(units: number | bigint): string {
  return `${formatFeeUnits(units)} ${ENTRY_FEE_SYMBOL}`;
}

export function formatPoolLabel(units: number | bigint): string {
  return formatFeeLabel(units);
}

/** Compact hero / table display (`12.5K`, `7.50`). Input = raw on-chain units. */
export function formatPoolCompact(units: number | bigint): string {
  const n = toNumber(units) / USDC_DECIMALS_DIVISOR;
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  if (n < 1 && n > 0) return n.toFixed(2);
  if (!Number.isInteger(n)) return n.toFixed(2);
  return n.toLocaleString("en-US");
}

/** Hero stat strip — locale-aware grouping, raw on-chain units. */
export function formatHeroPoolAmount(units: number | bigint, locale: "uk" | "en"): string {
  const n = toNumber(units) / USDC_DECIMALS_DIVISOR;
  if (!Number.isFinite(n)) return "—";
  const loc = locale === "uk" ? "uk-UA" : "en-US";
  const rounded = Number(n.toFixed(2));
  const whole = Math.round(rounded);
  if (Math.abs(rounded - whole) < 1e-6) return whole.toLocaleString(loc);
  return rounded.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Display amount (human) → raw on-chain units for admin sponsor/withdraw. */
export function displayAmountToRaw(amount: number): number {
  return Math.floor(amount * USDC_DECIMALS_DIVISOR);
}

export type PrizeDisplay = {
  symbol: string;
  formatUnits: (raw: number | bigint) => string;
  formatLabel: (raw: number | bigint) => string;
  formatCompact: (raw: number | bigint) => string;
  formatHero: (raw: number | bigint, locale: "uk" | "en") => string;
  colPrizeLabel: string;
};

export function createPrizeDisplay(): PrizeDisplay {
  return {
    symbol: ENTRY_FEE_SYMBOL,
    formatUnits: formatFeeUnits,
    formatLabel: formatPoolLabel,
    formatCompact: formatPoolCompact,
    formatHero: formatHeroPoolAmount,
    colPrizeLabel: `Prize (${ENTRY_FEE_SYMBOL})`,
  };
}
