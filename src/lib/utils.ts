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

/** fantasy_epl.move assertion codes (subset — see contract Error Codes). */
const FANTASY_EPL_ABORT_HINT_UK: Record<number, string> = {
  1: "Потрібна адмінська адреса з конфігу.",
  5: "Тур з таким номером уже є в контракті — «створити» ще раз неможливо. Обери Re-open для цього туру або створи наступний вільний номер.",
  18: "Невірний номер туру для цієї операції.",
  20: "Re-open можливий лише для туру в статусі «закрито» або «завершено», не для відкритого.",
};

/** Parse Move abort code from vm_status / wallet strings (best-effort). */
export function extractMoveAbortCode(text: string): number | null {
  const t = text.toLowerCase();
  const patterns: RegExp[] = [
    /move_abort\s*\(?(\d+)\)?/i,
    /abort[^\d]*(\d+)/i,
    /sub_status[^\d]*(\d+)/i,
    /:\s*(\d+)\s*(?:$|[,\s])/,
    /\((\d+)\)\s*$/,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m?.[1]) {
      const n = Number(m[1]);
      if (Number.isFinite(n) && n >= 1 && n <= 200) return n;
    }
  }
  if (t.includes("already_exists") || t.includes("egameweek_already_exists")) return 5;
  return null;
}

function fantasyEplAbortHintUk(code: number): string | undefined {
  return FANTASY_EPL_ABORT_HINT_UK[code];
}

/** Best-effort text for wallet / Aptos SDK errors (often missing `message`). */
export function formatTxError(error: unknown): string {
  if (error == null) return "Unknown error";

  let raw: string;
  if (typeof error === "string") raw = error;
  else if (error instanceof Error && error.message) raw = error.message;
  else {
    const e = error as Record<string, unknown>;
    const pick = (o: unknown): string | undefined => {
      if (o == null || typeof o !== "object") return undefined;
      const r = o as Record<string, unknown>;
      if (typeof r.vm_status === "string" && r.vm_status) return r.vm_status;
      if (typeof r.message === "string" && r.message) return r.message;
      return undefined;
    };

    let picked =
      pick(e.transaction) ??
      (typeof e.vm_status === "string" ? e.vm_status : undefined) ??
      pick(e.cause) ??
      pick(e.data);

    if (!picked) {
      try {
        picked = JSON.stringify(error, Object.getOwnPropertyNames(error as object), 2);
        if (picked.length > 1800) picked = `${picked.slice(0, 1800)}…`;
      } catch {
        picked = String(error);
      }
    }
    raw = picked;
  }

  const code = extractMoveAbortCode(raw);
  const hint = code != null ? fantasyEplAbortHintUk(code) : undefined;
  if (hint) return `${raw}\n\n— ${hint}`;
  return raw;
}
