import { NextRequest, NextResponse } from "next/server";
import { findHighestGameweekId, getGameweek, getGameweekEntrants } from "@/lib/chainClient";

export async function GET(request: NextRequest) {
  const requested = request.nextUrl.searchParams.get("gw");
  const gameweekId = requested ? Number(requested) : await findHighestGameweekId();
  if (!Number.isInteger(gameweekId) || gameweekId < 1) {
    return NextResponse.json({ error: "Invalid gameweek." }, { status: 400 });
  }

  const [gameweek, registrations] = await Promise.all([
    getGameweek(gameweekId),
    getGameweekEntrants(gameweekId),
  ]);
  if (!gameweek) return NextResponse.json({ error: `Gameweek ${gameweekId} not found` }, { status: 404 });

  return NextResponse.json(
    { gameweek: gameweek.id, status: gameweek.status, totalEntries: registrations.length, registrations },
    { headers: { "Cache-Control": "no-store", "Access-Control-Allow-Origin": "*" } },
  );
}
