import { NextResponse } from "next/server";
import { findOpenGameweek, getConfig, getGameweek } from "@/lib/chainClient";

export const dynamic = "force-dynamic";

function serializeGameweek(
  gw: Awaited<ReturnType<typeof getGameweek>>,
): Record<string, unknown> | null {
  if (!gw) return null;
  return {
    ...gw,
    prizePool: gw.prizePool.toString(),
    prizeAllocated: gw.prizeAllocated.toString(),
    prizeClaimed: gw.prizeClaimed.toString(),
  };
}

/**
 * Server-side Config + open gameweek. Prefer this from the browser when
 * client→Helius is blocked (extensions, stale allowlists, etc.).
 */
export async function GET() {
  try {
    const config = await getConfig();
    if (!config) {
      return NextResponse.json(
        { error: "Config account not found on Solana" },
        { status: 404 },
      );
    }

    const [currentGameweek, openGameweek] = await Promise.all([
      config.currentGameweek
        ? getGameweek(config.currentGameweek).catch(() => null)
        : Promise.resolve(null),
      findOpenGameweek().catch(() => null),
    ]);

    return NextResponse.json({
      config: {
        ...config,
        entryFee: config.entryFee.toString(),
        totalPrizeObligation: config.totalPrizeObligation.toString(),
      },
      currentGameweek: serializeGameweek(currentGameweek),
      openGameweek: serializeGameweek(openGameweek),
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Failed to read Config";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
