import { NextRequest, NextResponse } from "next/server";

import { SELF_HOSTED_RESULTS_PATH } from "@/lib/constants";
import { readOracleResultsJson } from "@/lib/oracleStatsStore";

export const dynamic = "force-dynamic";

/**
 * Keeps the oracle result-storage URL server-only. `chainClient` verifies every
 * claimable row against the on-chain Merkle root before exposing it to UI code.
 *
 * Source order: durable store written by Calculate & Publish (Redis / local file),
 * then the optional external bucket, then the static `public/data/results` mirror.
 */
export async function GET(request: NextRequest) {
  const gameweek = Number(request.nextUrl.searchParams.get("gameweek"));
  if (!Number.isInteger(gameweek) || gameweek <= 0) {
    return NextResponse.json({ error: "gameweek must be a positive integer" }, { status: 400 });
  }

  const stored = await readOracleResultsJson(gameweek);
  if (stored) {
    return new NextResponse(stored, {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=15" },
    });
  }

  const base =
    process.env.RESULTS_PUBLISH_BUCKET?.replace(/\/$/, "") ??
    `${request.nextUrl.origin}${SELF_HOSTED_RESULTS_PATH}`;

  const response = await fetch(`${base}/${gameweek}.json`, { cache: "no-store" });
  if (!response.ok) {
    return NextResponse.json({ error: "Results are not published." }, { status: response.status });
  }
  return new NextResponse(await response.text(), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=15" },
  });
}
