import { NextRequest, NextResponse } from "next/server";
import { resolveRegistrationDeadline } from "@/lib/server/fplRegistrationDeadline";
import { pokeAutoCloseWatchdog } from "@/lib/server/autoCloseWatchdog";

export const dynamic = "force-dynamic";

/** Public: first-kickoff registration deadline for an EPL gameweek (same rule as auto-close). */
export async function GET(request: NextRequest) {
  pokeAutoCloseWatchdog();
  const gameweek = Number(request.nextUrl.searchParams.get("gameweek"));
  if (!Number.isInteger(gameweek) || gameweek < 1 || gameweek > 38) {
    return NextResponse.json({ error: "gameweek must be 1..38" }, { status: 400 });
  }
  const deadline = await resolveRegistrationDeadline(gameweek);
  return NextResponse.json(deadline, { headers: { "cache-control": "public, max-age=60" } });
}
