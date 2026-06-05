import { formatMOVE } from "./utils";
import { ENTRY_FEE_USDCX, USDCX_METADATA_MAINNET, usdcxMetadataForRpc, MOVEMENT_RPC_URL } from "./constants";

/** On-chain `entry_fee_asset` values — must match fantasy_epl.move */
export const ENTRY_FEE_ASSET_MOVE = 0;
export const ENTRY_FEE_ASSET_USDCX = 1;

export type EntryFeeAssetKind = "usdcx" | "move";

/** Squad registration + prize pool denomination (title/guild fees stay MOVE). */
export function resolveEntryFeeAsset(chainAsset: number | null | undefined): EntryFeeAssetKind {
  // Only explicit on-chain `1` means USDCx. Missing view / legacy deploy → MOVE.
  if (chainAsset === ENTRY_FEE_ASSET_USDCX) return "usdcx";
  return "move";
}

/** Default on-chain entry fee in raw units (5 USDCx = 5_000_000). */
export const DEFAULT_ENTRY_FEE_RAW = ENTRY_FEE_USDCX * 1_000_000;

export function defaultUsdcxMetadata(): string {
  return usdcxMetadataForRpc(MOVEMENT_RPC_URL);
}

export { USDCX_METADATA_MAINNET, ENTRY_FEE_USDCX };

/** Raw on-chain units → human amount string (no symbol). */
export function formatFeeUnits(units: number, asset: EntryFeeAssetKind): string {
  if (asset === "usdcx") return (units / 1_000_000).toFixed(2);
  return formatMOVE(units);
}

export function feeSymbol(asset: EntryFeeAssetKind): string {
  return asset === "usdcx" ? "USDCx" : "MOVE";
}

/** e.g. `5.00 USDCx` or `300.00 MOVE` */
export function formatFeeLabel(units: number, asset: EntryFeeAssetKind): string {
  return `${formatFeeUnits(units, asset)} ${feeSymbol(asset)}`;
}

/** Prize pool / entry fee display uses the same asset once USDCx entry is enabled. */
export function formatPoolLabel(units: number, asset: EntryFeeAssetKind): string {
  return formatFeeLabel(units, asset);
}

/** Compact hero / table display (`12.5K`, `7.50`). Input = raw on-chain units. */
export function formatPoolCompact(units: number, asset: EntryFeeAssetKind): string {
  const n = asset === "usdcx" ? units / 1_000_000 : units / 100_000_000;
  if (!Number.isFinite(n)) return "—";
  if (n >= 1000) return `${(n / 1000).toFixed(n % 1000 === 0 ? 0 : 1)}K`;
  if (n < 1 && n > 0) return n.toFixed(2);
  if (!Number.isInteger(n)) return n.toFixed(2);
  return n.toLocaleString("en-US");
}

/** Hero stat strip — locale-aware grouping, raw on-chain units. */
export function formatHeroPoolAmount(
  units: number,
  asset: EntryFeeAssetKind,
  locale: "uk" | "en",
): string {
  const n = asset === "usdcx" ? units / 1_000_000 : units / 100_000_000;
  if (!Number.isFinite(n)) return "—";
  const loc = locale === "uk" ? "uk-UA" : "en-US";
  const rounded = Number(n.toFixed(2));
  const whole = Math.round(rounded);
  if (Math.abs(rounded - whole) < 1e-6) {
    return whole.toLocaleString(loc);
  }
  return rounded.toLocaleString(loc, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
}

/** Display amount (human) → raw on-chain units for admin sponsor/withdraw. */
export function displayAmountToRaw(amount: number, asset: EntryFeeAssetKind): number {
  return asset === "usdcx"
    ? Math.floor(amount * 1_000_000)
    : Math.floor(amount * 100_000_000);
}

export type PrizeDisplay = {
  asset: EntryFeeAssetKind;
  symbol: string;
  formatUnits: (raw: number) => string;
  formatLabel: (raw: number) => string;
  formatCompact: (raw: number) => string;
  formatHero: (raw: number, locale: "uk" | "en") => string;
  colPrizeLabel: string;
};

export function createPrizeDisplay(chainAsset: number | null | undefined): PrizeDisplay {
  const asset = resolveEntryFeeAsset(chainAsset);
  const symbol = feeSymbol(asset);
  return {
    asset,
    symbol,
    formatUnits: (raw) => formatFeeUnits(raw, asset),
    formatLabel: (raw) => formatPoolLabel(raw, asset),
    formatCompact: (raw) => formatPoolCompact(raw, asset),
    formatHero: (raw, locale) => formatHeroPoolAmount(raw, asset, locale),
    colPrizeLabel: `Prize (${symbol})`,
  };
}

/** FAQ / static copy — replace `{{PRIZE_ASSET}}` and `{{ENTRY_ASSET}}` at render time. */
export function substitutePrizeAssetCopy(
  text: string,
  symbol: string,
  entrySymbol: string = symbol,
): string {
  return text
    .replaceAll("{{PRIZE_ASSET}}", symbol)
    .replaceAll("{{ENTRY_ASSET}}", entrySymbol);
}

/** Best-effort FAQ copy when USDCx is active (no per-line placeholders required). */
export function adaptFaqCopy(text: string, prizeSymbol: string, entrySymbol: string): string {
  let out = substitutePrizeAssetCopy(text, prizeSymbol, entrySymbol);
  if (prizeSymbol === "MOVE") return out;
  const pairs: [RegExp, string][] = [
    [/MOVE crypto/gi, prizeSymbol],
    [/paid in MOVE\b/gi, `paid in ${prizeSymbol}`],
    [/in MOVE on/gi, `in ${prizeSymbol} on`],
    [/entry fee in MOVE/gi, `entry fee in ${entrySymbol}`],
    [/prize pool in MOVE/gi, `prize pool in ${prizeSymbol}`],
    [/receive prizes in MOVE/gi, `receive prizes in ${prizeSymbol}`],
    [/pay entry fees and receive prizes in MOVE/gi, `pay entry fees in ${entrySymbol} and receive prizes in ${prizeSymbol}`],
    [/moves MOVE from/gi, `moves ${prizeSymbol} from`],
    [/MOVE lands on/gi, `${prizeSymbol} lands on`],
    [/MOVE crypto/gi, prizeSymbol],
    [/криптовалюті MOVE/gi, prizeSymbol],
    [/токенах MOVE/gi, `токенах ${prizeSymbol}`],
    [/внеску у MOVE/gi, `внеску у ${entrySymbol}`],
    [/сума в MOVE/gi, `сума в ${entrySymbol}`],
    [/приходить на гаманець/gi, `приходить на гаманець`],
    [/MOVE падає/gi, `${prizeSymbol} падає`],
    [/MOVE приходить/gi, `${prizeSymbol} приходить`],
    [/з твоїми MOVE/gi, `з твоїми ${prizeSymbol}`],
    [/перерахунок MOVE/gi, `перерахунок ${prizeSymbol}`],
    [/платиш внески і отримуєш виграш у MOVE/gi, `платиш внески в ${entrySymbol} і отримуєш виграш у ${prizeSymbol}`],
    [/Buy MOVE\./gi, `Get ${entrySymbol} (bridge USDC on Movement).`],
    [/Купи MOVE\./gi, `Отримай ${entrySymbol} (брідж USDC у Movement).`],
    [/в MOVE на/gi, `${prizeSymbol} на`],
    [/у MOVE/gi, `у ${prizeSymbol}`],
    [/MOVE токени/gi, prizeSymbol],
    [/MOVE надіслано/gi, `${prizeSymbol} надіслано`],
    [/внесків у MOVE/gi, `внесків у ${entrySymbol}`],
    [/сума в MOVE/gi, `сума в ${entrySymbol}`],
  ];
  for (const [re, rep] of pairs) out = out.replace(re, rep);
  return out;
}
