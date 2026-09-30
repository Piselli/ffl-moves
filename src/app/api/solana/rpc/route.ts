import { NextResponse } from "next/server";
import { resolveServerSolanaRpcUrl } from "@/lib/solanaRpc";
import { MOVEMATCH_PROGRAM_ID } from "@/lib/constants";
import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Same-origin JSON-RPC proxy so the browser never hits a domain/IP-ACL
 * Helius key directly (that 403'd balance reads and looked like "0 USDC").
 *
 * It spends our paid RPC quota for anonymous callers, so it is an allowlist:
 * only the read methods the app and wallet adapters use, plus
 * send/simulateTransaction. `getProgramAccounts` (expensive) is restricted to
 * the MoveMatch program.
 */
const READ_METHODS = new Set([
  "getAccountInfo",
  "getBalance",
  "getBlockHeight",
  "getBlockTime",
  "getEpochInfo",
  "getFeeForMessage",
  "getGenesisHash",
  "getHealth",
  "getLatestBlockhash",
  "getRecentBlockhash",
  "getMinimumBalanceForRentExemption",
  "getMultipleAccounts",
  "getProgramAccounts",
  "getRecentPrioritizationFees",
  "getSignatureStatuses",
  "getSignaturesForAddress",
  "getSlot",
  "getTokenAccountBalance",
  "getTokenAccountsByOwner",
  "getTokenSupply",
  "getTransaction",
  "getVersion",
  "isBlockhashValid",
]);
const SEND_METHODS = new Set(["sendTransaction", "simulateTransaction"]);

const MAX_BODY_BYTES = 200_000;
const MAX_BATCH = 20;
const READS_PER_MIN = 600;
const SENDS_PER_MIN = 30;

type RpcCall = { method?: unknown; params?: unknown };

function rpcError(status: number, code: number, message: string, headers?: HeadersInit) {
  return NextResponse.json(
    { jsonrpc: "2.0", error: { code, message }, id: null },
    { status, headers },
  );
}

/** Returns an error message when the call is not allowed, otherwise null. */
function disallowed(call: RpcCall): string | null {
  const method = typeof call.method === "string" ? call.method : "";
  if (SEND_METHODS.has(method)) return null;
  if (!READ_METHODS.has(method)) return `Method not allowed: ${method || "(none)"}`;
  if (method === "getProgramAccounts") {
    const params = Array.isArray(call.params) ? call.params : [];
    if (params[0] !== MOVEMATCH_PROGRAM_ID) return "getProgramAccounts is restricted to the MoveMatch program";
  }
  return null;
}

export async function POST(request: Request) {
  const declared = Number(request.headers.get("content-length") ?? "0");
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return rpcError(413, -32600, "Request too large");
  }

  let text: string;
  try {
    text = await request.text();
  } catch {
    return rpcError(400, -32700, "Parse error");
  }
  if (text.length > MAX_BODY_BYTES) return rpcError(413, -32600, "Request too large");

  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    return rpcError(400, -32700, "Parse error");
  }

  const calls: RpcCall[] = Array.isArray(body) ? (body as RpcCall[]) : [body as RpcCall];
  if (calls.length === 0 || calls.length > MAX_BATCH) {
    return rpcError(400, -32600, "Invalid batch size");
  }
  for (const call of calls) {
    if (!call || typeof call !== "object") return rpcError(400, -32600, "Invalid request");
    const reason = disallowed(call);
    if (reason) return rpcError(403, -32601, reason);
  }

  const ip = clientIp(request);
  const sends = calls.filter((c) => SEND_METHODS.has(String(c.method))).length;
  const reads = calls.length - sends;
  const gates = [
    reads > 0 ? await rateLimit(`rpc:read:${ip}`, READS_PER_MIN, 60) : { ok: true as const },
    sends > 0 ? await rateLimit(`rpc:send:${ip}`, SENDS_PER_MIN, 60) : { ok: true as const },
  ];
  const blocked = gates.find((g) => !g.ok);
  if (blocked && !blocked.ok) {
    return rpcError(429, -32005, "Rate limit exceeded", {
      "Retry-After": String(blocked.retryAfterSec),
    });
  }

  const upstream = resolveServerSolanaRpcUrl();
  try {
    const res = await fetch(upstream, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: text,
      cache: "no-store",
    });
    const payload = await res.text();
    return new NextResponse(payload, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    // Never echo the upstream error: it can contain the keyed RPC URL.
    console.error("[solana/rpc]", err instanceof Error ? err.message : err);
    return rpcError(502, -32000, "Upstream RPC failed");
  }
}
