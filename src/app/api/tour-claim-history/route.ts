import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { getGameweekTeams } from "@/lib/movement";
import { fetchOwnersWithClaimPrizeTx, normTourOwnerAddr } from "@/lib/tourClaimHistory";

export const dynamic = "force-dynamic";

async function loadClaimOwners(tourId: number): Promise<string[]> {
  const addresses = await getGameweekTeams(tourId);
  if (addresses.length === 0) return [];
  const claimed = await fetchOwnersWithClaimPrizeTx(tourId, addresses);
  return Array.from(claimed).map(normTourOwnerAddr);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tourId = Number.parseInt(searchParams.get("tour") ?? "", 10);
  if (!Number.isFinite(tourId) || tourId < 1) {
    return NextResponse.json({ error: "Invalid tour id" }, { status: 400 });
  }

  const cached = unstable_cache(() => loadClaimOwners(tourId), [`tour-claim-history-${tourId}`], {
    revalidate: 120,
  });

  const owners = await cached();
  return NextResponse.json(
    { tourId, owners },
    { headers: { "Cache-Control": "private, max-age=60" } },
  );
}
