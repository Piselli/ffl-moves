import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/** Human-readable message from `catch` values without using `any`. */
export function getErrorMessage(err: unknown, fallback = "Unknown error"): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err.trim()) return err;
  return fallback;
}

export function getMultiplierDisplay(basisPoints: number): string {
  return `${basisPoints / 100}%`;
}

/** Non-negative integer for u64 stat vectors (FPL can send negative bps). */
export function toU64Stat(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/**
 * Best-effort text for wallet / RPC errors. Anchor puts the useful part in
 * simulation `logs`, which most wallets drop from `message`.
 * Never dumps stacks or raw JSON at users.
 */
export function formatTxError(error: unknown): string {
  if (error == null) return "Something went wrong. Please try again.";
  if (typeof error === "string") {
    return humanizeTxMessage(truncate(error, 280));
  }

  const e = error as Record<string, unknown>;
  const name = String(
    (error instanceof Error ? error.name : "") || e.name || e.code || "",
  );
  const rawMessage =
    error instanceof Error && error.message
      ? error.message
      : typeof e.message === "string"
        ? e.message
        : typeof e.error === "string"
          ? e.error
          : "";

  const logs = Array.isArray(e.logs) ? (e.logs as unknown[]).map(String) : null;
  const programError = logs?.find((l) => /Error Message:/i.test(l));
  const customProgram =
    logs?.find((l) => /Program log: (Error:|Custom program error)/i.test(l)) ??
    logs?.find((l) => /failed: /i.test(l) && /Program /i.test(l));
  const rentFail =
    logs?.some((l) => /InsufficientFundsForRent/i.test(l)) ||
    /InsufficientFundsForRent/i.test(rawMessage) ||
    (e.err != null && /InsufficientFundsForRent/i.test(JSON.stringify(e.err)));

  if (rentFail) {
    return "Account rent top-up was short. Please try Confirm again.";
  }
  if (programError) {
    return programError.replace(/^.*Error Message:\s*/i, "").trim();
  }
  if (customProgram) {
    return truncate(customProgram.replace(/^.*Program log:\s*/i, "").trim(), 220);
  }

  const blob = `${name}\n${rawMessage}`.toLowerCase();
  if (
    /user rejected|user denied|rejected the request|cancelled|canceled|approval.*denied/i.test(
      blob,
    )
  ) {
    return "Transaction cancelled in your wallet.";
  }
  if (/insufficient|not enough|0x1\b/i.test(blob)) {
    return "Not enough USDC (or SOL for fees). Top up and try again.";
  }
  if (/blockhash|expired|timed out|timeout|network|fetch failed|429|503/i.test(blob)) {
    return "Network hiccup — wait a moment and try again.";
  }
  if (
    /WalletSendTransactionError|SendTransactionError|WalletSign|could not co-sign/i.test(
      name + rawMessage,
    )
  ) {
    // Prefer a short wallet message when present; otherwise a calm fallback.
    const cleaned = rawMessage
      .split(/Logs:\s*\[/i)[0]
      .replace(/\s*Catch the 'SendTransactionError'[\s\S]*$/i, "")
      .replace(/^WalletSendTransactionError:?\s*/i, "")
      .replace(/^Wallet could not co-sign the sponsored registration:\s*/i, "")
      .trim();
    if (cleaned && cleaned.length < 160 && !/^\s*\{/.test(cleaned) && !/at\s+\w+/.test(cleaned)) {
      return humanizeTxMessage(cleaned);
    }
    return "Wallet couldn’t send the transaction.\nCheck the wallet popup, then try again.";
  }

  if (rawMessage) {
    const cleaned = rawMessage
      .split(/Logs:\s*\[/i)[0]
      .replace(/\s*Catch the 'SendTransactionError'[\s\S]*$/i, "")
      .trim();
    // Never surface stack traces / stringified error objects.
    if (/^\s*\{/.test(cleaned) || /\n\s*at\s+/.test(cleaned) || /"stack"\s*:/.test(cleaned)) {
      return "Registration failed. Please try again.";
    }
    return humanizeTxMessage(truncate(cleaned, 220));
  }

  return "Registration failed. Please try again.";
}

function humanizeTxMessage(msg: string): string {
  const m = msg.trim();
  if (!m) return "Registration failed. Please try again.";
  if (/user rejected|user denied|rejected the request/i.test(m)) {
    return "Transaction cancelled in your wallet.";
  }
  return m;
}

function truncate(s: string, max: number): string {
  return s.length > max ? `${s.slice(0, max)}…` : s;
}
