import { NextResponse } from "next/server";
import { resolveServerSolanaRpcUrl } from "@/lib/solanaRpc";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Same-origin JSON-RPC proxy so the browser never hits a domain/IP-ACL
 * Helius key directly (that 403'd balance reads and looked like "0 USDC").
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null },
      { status: 400 },
    );
  }

  const upstream = resolveServerSolanaRpcUrl();
  try {
    const res = await fetch(upstream, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store",
    });
    const text = await res.text();
    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": res.headers.get("content-type") ?? "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Upstream RPC failed";
    console.error("[solana/rpc]", message);
    return NextResponse.json(
      {
        jsonrpc: "2.0",
        error: { code: -32000, message },
        id: null,
      },
      { status: 502 },
    );
  }
}
