import { NextRequest, NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { buildSeasonLeaderboard } from "@/lib/seasonPoints";
import { SEASON_POINTS_RULES_VERSION } from "@/lib/season-points-rules";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

function splitCsv(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").map((a) => a.trim().toLowerCase()).filter(Boolean);
}

/**
 * GET /api/season-points/snapshot
 *
 * Drop-eligibility snapshot: ranked wallets with Season Points totals.
 * Intended for future airdrops / allowlists — same data as the public leaderboard,
 * with optional filters.
 *
 * Query params:
 *   min=<n>          — minimum SP to include (default 0)
 *   limit=<n>        — max rows (default 1000, max 5000)
 *   wallets=0x,0x    — if set, only return these wallets (still ranked among themselves)
 *   at=<iso>         — echo snapshot timestamp (informational; data is live-cached)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const minPoints = Math.max(0, Number.parseInt(searchParams.get("min") ?? "0", 10) || 0);
    const limitRaw = Number.parseInt(searchParams.get("limit") ?? "1000", 10);
    const limit = Math.min(Math.max(1, Number.isFinite(limitRaw) ? limitRaw : 1000), 5000);

    const walletsCsv = splitCsv(searchParams.get("wallets"));
    const walletsRepeated = searchParams.getAll("wallets").flatMap((v) => splitCsv(v));
    const walletFilter = new Set([...walletsCsv, ...walletsRepeated]);

    const cached = unstable_cache(() => buildSeasonLeaderboard(), ["season-points-snapshot-v3"], {
      revalidate: 120,
    });
    const board = await cached();
    const snapshotAt = new Date().toISOString();

    let rows = board.entries.filter((e) => e.totalPoints >= minPoints);
    if (walletFilter.size > 0) {
      rows = rows.filter((e) => walletFilter.has(e.owner.toLowerCase()));
    }
    rows = rows.slice(0, limit);

    const payload = {
      kind: "season-points-snapshot",
      rulesVersion: SEASON_POINTS_RULES_VERSION,
      seasonId: board.seasonId,
      seasonLabel: board.seasonLabel,
      active: board.active,
      status: board.status,
      wcTourIds: board.wcTourIds,
      resolvedWcTourCount: board.resolvedWcTourCount,
      eplStartGw: board.eplStartGw,
      eplEndGw: board.eplEndGw,
      startGw: board.eplStartGw,
      endGw: board.eplEndGw,
      resolvedEplThroughGw: board.resolvedEplThroughGw,
      resolvedThroughGw: board.resolvedEplThroughGw,
      snapshotAt,
      minPoints,
      count: rows.length,
      wallets: rows.map((e) => ({
        address: e.owner,
        rank: e.rank,
        seasonPoints: e.totalPoints,
        registrations: e.registrations,
        top10Finishes: e.top10Finishes,
        bestRank: e.bestRank,
        maxStreak: e.maxStreak,
      })),
    };

    return NextResponse.json(payload, { headers: CORS_HEADERS });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
