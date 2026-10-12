import { NextRequest, NextResponse } from "next/server";

import { getConfig } from "@/lib/chainClient";
import {
  isOracleStatsStoreDurable,
  writeOracleStatsJson,
} from "@/lib/oracleStatsStore";
import { clientIp, safeEqual } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function normAddr(a: string): string {
  return a.trim().toLowerCase();
}

/**
 * POST /api/oracle/stats
 *
 * Preferred: raw body = exact stats JSON bytes to publish, plus headers
 *   x-gameweek-id, x-oracle-wallet
 * Legacy: JSON body { gameweekId, canonicalJson, oracleWallet }
 *
 * Auth: wallet must match on-chain config.oracle. Optional shared secret via
 * `ORACLE_STATS_SECRET` as Bearer or `x-oracle-key`.
 */
export async function POST(req: NextRequest) {
  const gate = await rateLimit(`oracle:stats:${clientIp(req)}`, 20, 60);
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

  const headerGw = Number(req.headers.get("x-gameweek-id") ?? "");
  const headerWallet = (req.headers.get("x-oracle-wallet") ?? "").trim();

  let gameweekId = headerGw;
  let canonicalJson = "";
  let oracleWallet = headerWallet;

  const rawText = await req.text();
  if (!rawText) {
    return NextResponse.json({ error: "Empty body." }, { status: 400 });
  }

  // Raw body mode: body IS the canonical stats JSON (preferred — no double-escape).
  if (Number.isInteger(headerGw) && headerGw >= 1 && headerWallet) {
    canonicalJson = rawText;
    gameweekId = headerGw;
    oracleWallet = headerWallet;
  } else {
    // Legacy wrapper: { gameweekId, canonicalJson, oracleWallet }
    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(rawText) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
    }
    gameweekId = Number(parsed.gameweekId);
    canonicalJson =
      typeof parsed.canonicalJson === "string" ? parsed.canonicalJson : "";
    oracleWallet =
      typeof parsed.oracleWallet === "string" ? parsed.oracleWallet : "";
  }

  if (!Number.isInteger(gameweekId) || gameweekId < 1) {
    return NextResponse.json({ error: "Invalid gameweekId." }, { status: 400 });
  }
  if (!canonicalJson || canonicalJson.length > 2_000_000) {
    return NextResponse.json({ error: "Invalid canonicalJson." }, { status: 400 });
  }
  if (!oracleWallet) {
    return NextResponse.json({ error: "oracleWallet required." }, { status: 400 });
  }

  try {
    JSON.parse(canonicalJson);
  } catch {
    return NextResponse.json({ error: "canonicalJson is not valid JSON." }, { status: 400 });
  }

  const config = await getConfig();
  if (!config?.oracle) {
    return NextResponse.json({ error: "On-chain config unavailable." }, { status: 503 });
  }
  if (normAddr(config.oracle) !== normAddr(oracleWallet)) {
    return NextResponse.json({ error: "Wallet is not the on-chain oracle." }, { status: 403 });
  }

  try {
    const published = await writeOracleStatsJson(gameweekId, canonicalJson);
    return NextResponse.json({
      ok: true,
      gameweekId,
      durable: published.durable || isOracleStatsStoreDurable(),
      local: published.local,
      uriPath: `/data/stats/${gameweekId}.json`,
      bytes: canonicalJson.length,
    });
  } catch (e) {
    console.error("oracle stats publish failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Publish failed" },
      { status: 500 },
    );
  }
}
