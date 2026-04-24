import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatMOVE(octas: number): string {
  return (octas / 100_000_000).toFixed(2);
}

export function octasToMOVE(octas: number): number {
  return octas / 100_000_000;
}

export function moveToOctas(move: number): number {
  return Math.floor(move * 100_000_000);
}

export function shortenAddress(address: string, chars = 4): string {
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

export function getMultiplierDisplay(basisPoints: number): string {
  return `${basisPoints / 100}%`;
}

/** Non-negative integer for Move u64 stat vectors (FPL can send negative bps). */
export function toU64Stat(v: unknown): number {
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.floor(n);
}

/** Best-effort text for wallet / Aptos SDK errors (often missing `message`). */
export function formatTxError(error: unknown): string {
  if (error == null) return "Unknown error";
  if (typeof error === "string") return error;
  if (error instanceof Error && error.message) return error.message;

  const e = error as Record<string, unknown>;
  const pick = (o: unknown): string | undefined => {
    if (o == null || typeof o !== "object") return undefined;
    const r = o as Record<string, unknown>;
    if (typeof r.vm_status === "string" && r.vm_status) return r.vm_status;
    if (typeof r.message === "string" && r.message) return r.message;
    return undefined;
  };

  const fromTx = pick(e.transaction);
  if (fromTx) return fromTx;
  if (typeof e.vm_status === "string" && e.vm_status) return e.vm_status;
  const fromCause = pick(e.cause);
  if (fromCause) return fromCause;
  const fromData = pick(e.data);
  if (fromData) return fromData;

  try {
    const s = JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2);
    return s.length > 1800 ? `${s.slice(0, 1800)}…` : s;
  } catch {
    return String(error);
  }
}
