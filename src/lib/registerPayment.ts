import { getUsdcBalance } from "@/lib/chainClient";
import { formatTxError, getErrorMessage } from "@/lib/utils";

/**
 * Email / Google sessions spend USDC from the Privy embedded address — gate on
 * that balance and open deposit if it's short. Phantom / Solflare / Jupiter
 * pay from the extension: skip the pre-check so Confirm squad opens the wallet.
 */
export async function shouldOpenDepositBeforeRegister(
  owner: string,
  requiredRaw: bigint,
  hasExternalWallet: boolean,
): Promise<boolean> {
  if (hasExternalWallet) return false;
  const balance = await getUsdcBalance(owner);
  return balance < requiredRaw;
}

export function isInsufficientFundsError(error: unknown): boolean {
  const msg = `${getErrorMessage(error)}\n${formatTxError(error)}`.toLowerCase();
  return (
    msg.includes("insufficient") ||
    msg.includes("found no record of a prior credit") ||
    /custom program error:\s*(0x1)\b/.test(msg)
  );
}

export function isWalletUserRejection(error: unknown): boolean {
  const msg = getErrorMessage(error).toLowerCase();
  const code =
    error !== null && typeof error === "object"
      ? (error as { code?: unknown }).code
      : undefined;
  return (
    code === 4001 ||
    msg.includes("user rejected") ||
    msg.includes("user has rejected") ||
    msg.includes("rejected the request") ||
    msg.includes("user denied") ||
    msg.includes("denied transaction") ||
    msg.includes("denied message") ||
    msg.includes("request rejected") ||
    msg.includes("cancelled") ||
    msg.includes("canceled")
  );
}
