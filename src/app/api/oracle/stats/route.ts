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
 * Body: { gameweekId, canonicalJson, oracleWallet }
 *
 * Publishes the exact stats JSON the oracle will (or already did) commit on-chain.
 * Auth: wallet must match on-chain config.oracle. Optional shared secret via
 * `ORACLE_STATS_SECRET` / `CRON_SECRET` as Bearer or `x-oracle-key`.
 */
export async function POST(req: NextRequest) {
  const gate = await rateLimit(`oracle:stats:${clientIp(req)}`, 20, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  // Optional extra gate — do NOT reuse CRON_SECRET (that must stay server-only).
  const expectedSecret = process.env.ORACLE_STATS_SECRET?.trim() || "";
  if (expectedSecret) {
    const bearer = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
    const headerKey = req.headers.get("x-oracle-key") ?? "";
    if (!safeEqual(bearer, expectedSecret) && !safeEqual(headerKey, expectedSecret)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const rec = body as Record<string, unknown>;
  const gameweekId = Number(rec.gameweekId);
  const canonicalJson = typeof rec.canonicalJson === "string" ? rec.canonicalJson : "";
  const oracleWallet = typeof rec.oracleWallet === "string" ? rec.oracleWallet : "";

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
    });
  } catch (e) {
    console.error("oracle stats publish failed", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Publish failed" },
      { status: 500 },
    );
  }
}
