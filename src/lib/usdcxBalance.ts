import { MOVEMENT_RPC_URL } from "./constants";
import { stableyardUsdcxMetadata } from "./stableyard";

/** Raw on-chain USDCx balance (micro-units) for a Movement address. */
export async function fetchUsdcxBalance(address: string): Promise<number> {
  const base = MOVEMENT_RPC_URL.replace(/\/$/, "");
  const metadata = stableyardUsdcxMetadata();
  const addr = address.startsWith("0x") ? address : `0x${address}`;
  try {
    const res = await fetch(`${base}/accounts/${addr}/balance/${metadata}`);
    if (!res.ok) return 0;
    const text = await res.text();
    const n = Number(text.replace(/"/g, "").trim() || 0);
    return Number.isFinite(n) ? n : 0;
  } catch {
    return 0;
  }
}

export async function hasEnoughUsdcxForEntry(
  address: string,
  entryFeeRaw: number,
): Promise<boolean> {
  const balance = await fetchUsdcxBalance(address);
  return balance >= entryFeeRaw;
}

export async function waitForUsdcxBalance(
  address: string,
  minRaw: number,
  opts?: { attempts?: number; intervalMs?: number },
): Promise<number> {
  const attempts = opts?.attempts ?? 12;
  const intervalMs = opts?.intervalMs ?? 2000;
  let last = 0;
  for (let i = 0; i < attempts; i++) {
    last = await fetchUsdcxBalance(address);
    if (last >= minRaw) return last;
    if (i < attempts - 1) {
      await new Promise((r) => setTimeout(r, intervalMs));
    }
  }
  return last;
}
