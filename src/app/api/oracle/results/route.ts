import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "@/lib/chainClient";
import { writeOracleResultsJson } from "@/lib/oracleStatsStore";
import { clientIp, safeEqual } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normAddr(a: string): string {
  return a.trim().toLowerCase();
}

/**
 * POST /api/oracle/results
 * Raw body = results JSON ({ gameweek, root, prizeAllocated, results[] }).
 * Headers: x-gameweek-id, x-oracle-wallet.
 *
 * Auto-publishes the settlement file right after `publish_results`, so winners can claim
 * without a manual download/upload. Every row is still verified client-side against the
 * on-chain Merkle root, so a bad file can never pay out — it simply shows nothing.
 */
export async function POST(req: NextRequest) {
  const gate = await rateLimit(`oracle:results:${clientIp(req)}`, 20, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  const expectedSecret = process.env.ORACLE_STATS_SECRET?.trim() || "";
  if (expectedSecret) {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const headerKey = req.headers.get("x-oracle-key") ?? "";
    if (!safeEqual(bearer, expectedSecret) && !safeEqual(headerKey, expectedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  const gameweekId = Number(req.headers.get("x-gameweek-id") ?? "");
  const oracleWallet = (req.headers.get("x-oracle-wallet") ?? "").trim();
  if (!Number.isInteger(gameweekId) || gameweekId < 1) {
    return NextResponse.json({ error: "Invalid gameweekId." }, { status: 400 });
  }
  if (!oracleWallet) {
    return NextResponse.json({ error: "oracleWallet required." }, { status: 400 });
  }

  const body = await req.text();
  if (!body || body.length > 2_000_000) {
    return NextResponse.json({ error: "Invalid body." }, { status: 400 });
  }
  let parsed: { gameweek?: number; results?: unknown };
  try {
    parsed = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "Body is not valid JSON." }, { status: 400 });
  }
  if (Number(parsed.gameweek) !== gameweekId || !Array.isArray(parsed.results)) {
    return NextResponse.json({ error: "Results payload does not match gameweek." }, { status: 400 });
  }

  const config = await getConfig();
  if (!config?.oracle) {
    return NextResponse.json({ error: "On-chain config unavailable." }, { status: 503 });
  }
  if (normAddr(config.oracle) !== normAddr(oracleWallet)) {
    return NextResponse.json({ error: "Wallet is not the on-chain oracle." }, { status: 403 });
  }

  try {
    const published = await writeOracleResultsJson(gameweekId, body);
    return NextResponse.json({ ok: true, gameweekId, ...published, bytes: body.length });
  } catch (e) {
    console.error("oracle results publish failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Publish failed" },
      { status: 500 },
    );
  }
}
