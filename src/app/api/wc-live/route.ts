import { NextResponse } from "next/server";
import { WC_ROUNDS, getWorldCupRound, getWorldCupRoundByKey } from "@/lib/worldcup";
import { getWcRoundFixtures, hasFootballDataToken } from "@/lib/football-data";

/**
 * GET /api/wc-live?tour=10001  (or ?round=md1)
 *
 * Live World Cup match state (kickoffs, in-play status, scores) for one tour, sourced
 * from football-data.org (free). This is DISPLAY data only — per-player oracle scoring
 * is resolved separately from API-Sports (different id space), so the two never mix.
 *
 * When no FOOTBALL_DATA_TOKEN is configured this returns an empty payload in the same
 * shape, since authoritative resolved stats are read from the chain elsewhere.
 */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tourRaw = searchParams.get("tour");
  const roundKey = searchParams.get("round");

  let round =
    tourRaw != null ? getWorldCupRound(parseInt(tourRaw, 10)) : undefined;
  if (!round && roundKey) round = getWorldCupRoundByKey(roundKey);
  if (!round) round = WC_ROUNDS[0];

  const noStore = {
    headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" },
  };

  if (!hasFootballDataToken()) {
    return NextResponse.json(
      {
        tour: { id: round.tourId, key: round.key, stage: round.stage },
        source: "none",
        fixtures: [],
        errors: ["No live source configured (set FOOTBALL_DATA_TOKEN for live WC scores)."],
      },
      noStore,
    );
  }

  const live = await getWcRoundFixtures(round.key);
  if (!live) {
    return NextResponse.json(
      {
        tour: { id: round.tourId, key: round.key, stage: round.stage },
        source: "football-data",
        fixtures: [],
        errors: ["football-data.org request failed."],
      },
      noStore,
    );
  }

  return NextResponse.json(
    {
      tour: { id: round.tourId, key: round.key, stage: round.stage },
      source: "football-data",
      deadlineTime: live.deadlineTime,
      deadlineEpochMs: live.deadlineEpochMs,
      fixtures: live.fixtures,
      errors: [],
    },
    noStore,
  );
}
