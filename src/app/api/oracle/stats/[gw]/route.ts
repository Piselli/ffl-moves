import { NextResponse } from "next/server";

import { readOracleStatsJson } from "@/lib/oracleStatsStore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RouteContext = { params: { gw: string } };

/**
 * GET /api/oracle/stats/:gw
 * Public — same bytes the leaderboard / chain verify fetch at /data/stats/:gw.json.
 */
export async function GET(_request: Request, context: RouteContext) {
  const gw = Number(context.params.gw);
  if (!Number.isInteger(gw) || gw < 1) {
    return NextResponse.json({ error: "Invalid gameweek." }, { status: 400 });
  }

  const body = await readOracleStatsJson(gw);
  if (!body) {
    return NextResponse.json({ error: "Stats not published." }, { status: 404 });
  }

  return new NextResponse(body, {
    status: 200,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=15, stale-while-revalidate=60",
      "access-control-allow-origin": "*",
    },
  });
}
