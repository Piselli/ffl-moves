import { NextRequest, NextResponse } from "next/server";

import { SELF_HOSTED_RESULTS_PATH } from "@/lib/constants";

/**
 * Keeps the oracle result-storage URL server-only. `chainClient` verifies every
 * claimable row against the on-chain Merkle root before exposing it to UI code.
 */
export async function GET(request: NextRequest) {
  const gameweek = Number(request.nextUrl.searchParams.get("gameweek"));
  if (!Number.isInteger(gameweek) || gameweek <= 0) {
    return NextResponse.json({ error: "gameweek must be a positive integer" }, { status: 400 });
  }

  // Without an external bucket the oracle files live in `public/data/results`,
  // which this same deployment already serves as static assets.
  const base =
    process.env.RESULTS_PUBLISH_BUCKET?.replace(/\/$/, "") ??
    `${request.nextUrl.origin}${SELF_HOSTED_RESULTS_PATH}`;

  const response = await fetch(`${base}/${gameweek}.json`, { next: { revalidate: 15 } });
  if (!response.ok) {
    return NextResponse.json({ error: "Results are not published." }, { status: response.status });
  }
  return new NextResponse(await response.text(), {
    headers: { "content-type": "application/json", "cache-control": "public, max-age=15" },
  });
}
