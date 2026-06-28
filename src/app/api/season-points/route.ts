import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { buildSeasonLeaderboard } from "@/lib/seasonPoints";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

async function loadLeaderboard() {
  return buildSeasonLeaderboard();
}

/**
 * GET /api/season-points
 *
 * Public season leaderboard (Season Points / SP).
 *
 * Query params:
 *   owner=0x…       — return single entry (still uses cached full board)
 *   includeBreakdown — if "1", include per-GW breakdown in response
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const ownerParam = searchParams.get("owner")?.trim().toLowerCase();
    const includeBreakdown = searchParams.get("includeBreakdown") === "1";

    const cached = unstable_cache(loadLeaderboard, ["season-points-v3"], { revalidate: 120 });
    const board = await cached();

    if (ownerParam) {
      const entry = board.entries.find((e) => e.owner.toLowerCase() === ownerParam);
      if (!entry) {
        return NextResponse.json(
          {
            seasonId: board.seasonId,
            seasonLabel: board.seasonLabel,
            rulesVersion: board.rulesVersion,
            resolvedThroughGw: board.resolvedThroughGw,
            owner: ownerParam,
            found: false,
            totalPoints: 0,
          },
          { headers: CORS_HEADERS },
        );
      }
      const { breakdown, ...rest } = entry;
      return NextResponse.json(
        {
          ...board,
          entries: undefined,
          found: true,
          entry: includeBreakdown ? entry : rest,
        },
        { headers: CORS_HEADERS },
      );
    }

    const entries = includeBreakdown
      ? board.entries
      : board.entries.map(({ breakdown, ...rest }) => rest);

    return NextResponse.json({ ...board, entries, count: entries.length }, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
