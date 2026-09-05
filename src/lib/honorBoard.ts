import fs from "fs";
import path from "path";
import { ENTRY_FEE_SYMBOL } from "@/lib/entryFee";

export type HonorBoardEntry = {
  rank: number;
  owner: string;
  /** Micro-USDC (raw on-chain units) as decimal string. */
  earnedRaw: string;
  /** Human USDC amount. */
  earned: number;
  /** Full amount label for the wall (no K shorthand), e.g. `18,420`. */
  earnedLabel: string;
};

export type HonorBoardPayload = {
  symbol: string;
  generatedAt: string;
  gameweeksCounted: number;
  entries: HonorBoardEntry[];
};

type ResultsFile = {
  results?: Array<{ owner?: string; prizeAmount?: string | number }>;
};

/** Raw micro-USDC → full human label without K abbreviation. */
export function formatHonorAmount(raw: number | bigint): string {
  const n = (typeof raw === "bigint" ? Number(raw) : raw) / 1_000_000;
  if (!Number.isFinite(n)) return "—";
  if (Number.isInteger(n)) return n.toLocaleString("en-US");
  return n.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * All-time prize honor board — sum of published GW prizeAmount by owner.
 * Reads oracle JSON from `public/data/results` (same store as /api/results).
 */
export async function buildHonorBoard(limit = 10): Promise<HonorBoardPayload> {
  const totals = new Map<string, bigint>();
  let gameweeksCounted = 0;

  const dir = path.join(process.cwd(), "public", "data", "results");
  if (fs.existsSync(dir)) {
    const files = fs
      .readdirSync(dir)
      .filter((f) => /^\d+\.json$/.test(f))
      .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10));

    for (const file of files) {
      try {
        const raw = fs.readFileSync(path.join(dir, file), "utf8");
        const data = JSON.parse(raw) as ResultsFile;
        const rows = Array.isArray(data.results) ? data.results : [];
        let scored = false;
        for (const row of rows) {
          if (!row?.owner) continue;
          const amt = BigInt(row.prizeAmount ?? 0);
          if (amt <= 0n) continue;
          scored = true;
          const key = String(row.owner);
          totals.set(key, (totals.get(key) ?? 0n) + amt);
        }
        if (scored) gameweeksCounted += 1;
      } catch {
        // Skip corrupt / partial publish files.
      }
    }
  }

  const sorted = [...totals.entries()].sort((a, b) => {
    if (a[1] === b[1]) return a[0].localeCompare(b[0]);
    return a[1] > b[1] ? -1 : 1;
  });

  const entries: HonorBoardEntry[] = sorted.slice(0, limit).map(([owner, raw], i) => ({
    rank: i + 1,
    owner,
    earnedRaw: raw.toString(),
    earned: Number(raw) / 1_000_000,
    earnedLabel: formatHonorAmount(raw),
  }));

  return {
    symbol: ENTRY_FEE_SYMBOL,
    generatedAt: new Date().toISOString(),
    gameweeksCounted,
    entries,
  };
}
