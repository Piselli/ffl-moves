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
 */
export function formatTxError(error: unknown): string {
  if (error == null) return "Unknown error";
  if (typeof error === "string") return error;

  const e = error as Record<string, unknown>;
  const logs = Array.isArray(e.logs) ? (e.logs as unknown[]).map(String) : null;
  const programError = logs?.find((l) => l.includes("Error Message:"));

  const base =
    error instanceof Error && error.message
      ? error.message
      : typeof e.message === "string" && e.message
        ? e.message
        : safeStringify(error);

  return programError ? `${base}\n\n— ${programError.trim()}` : base;
}

function safeStringify(value: unknown): string {
  try {
    const s = JSON.stringify(value, Object.getOwnPropertyNames(value as object), 2);
    return s.length > 1800 ? `${s.slice(0, 1800)}…` : s;
  } catch {
    return String(value);
  }
}
