import { NextResponse } from "next/server";
import { WC_ROUNDS, getWorldCupRound, getWorldCupRoundByKey } from "@/lib/worldcup";
import { getWcRoundFixtures } from "@/lib/football-data";
import { getStaticWcRoundFixtures } from "@/lib/wcStaticFixtures";

/**
 * GET /api/wc-fixtures?tour=10001  (or ?round=md1)
 *
 * Returns the schedule + deadline for one World Cup tour. Source priority:
 *   1. football-data.org (free) when FOOTBALL_DATA_TOKEN is set — live schedule/scores.
 *   2. Static file public/data/wc-fixtures.json keyed by round key, e.g.:
 *        { "md1": { "deadlineTime": "2026-06-11T19:00:00Z", "fixtures": [ ... ] } }
 * football-data is display-only and intentionally decoupled from the API-Sports
 * player oracle (incompatible ids), so mixing the two sources is safe.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tourRaw = searchParams.get("tour");
  const roundKey = searchParams.get("round");

  let round =
    tourRaw != null ? getWorldCupRound(parseInt(tourRaw, 10)) : undefined;
  if (!round && roundKey) round = getWorldCupRoundByKey(roundKey);
  // Default to the first round if nothing specified.
  if (!round) round = WC_ROUNDS[0];

  // 1. Prefer live football-data.org schedule/scores when a token is configured.
  const live = await getWcRoundFixtures(round.key);
  if (live && live.fixtures.length > 0) {
    return NextResponse.json(
      {
        tour: { id: round.tourId, key: round.key, stage: round.stage },
        source: "football-data",
        deadlineTime: live.deadlineTime,
        deadlineEpochMs: live.deadlineEpochMs,
        fixtures: live.fixtures,
      },
      { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
    );
  }

  // 2. Fall back to the static file.
  const fallback = getStaticWcRoundFixtures(round.key);

  return NextResponse.json(
    {
      tour: { id: round.tourId, key: round.key, stage: round.stage },
      source: "static",
      deadlineTime: fallback?.deadlineTime ?? null,
      deadlineEpochMs: fallback?.deadlineEpochMs ?? null,
      fixtures: fallback?.fixtures ?? [],
    },
    { headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" } },
  );
}
