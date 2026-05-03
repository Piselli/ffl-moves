import { NextRequest, NextResponse } from "next/server";
import { Aptos, AptosConfig, Network } from "@aptos-labs/ts-sdk";

const RPC_URL = process.env.NEXT_PUBLIC_MOVEMENT_RPC_URL ?? "https://mainnet.movementnetwork.xyz/v1";
const MODULE_ADDRESS = process.env.NEXT_PUBLIC_MODULE_ADDRESS ?? "";
const MODULE_NAME = "fantasy_epl";

const client = new Aptos(
  new AptosConfig({ network: Network.CUSTOM, fullnode: RPC_URL }),
);

function moduleFunction(fn: string) {
  return `${MODULE_ADDRESS}::${MODULE_NAME}::${fn}` as `${string}::${string}::${string}`;
}

async function getConfig() {
  const result = await client.view({
    payload: { function: moduleFunction("get_config"), typeArguments: [], functionArguments: [] },
  });
  return { currentGameweek: Number(result[6]) };
}

async function getGameweekTeams(gameweekId: number): Promise<string[]> {
  const result = await client.view({
    payload: {
      function: moduleFunction("get_gameweek_teams"),
      typeArguments: [],
      functionArguments: [gameweekId.toString()],
    },
  });
  return (result[0] as string[]).map((a) => a.toString());
}

async function getGameweek(gameweekId: number) {
  try {
    const result = await client.view({
      payload: {
        function: moduleFunction("get_gameweek"),
        typeArguments: [],
        functionArguments: [gameweekId.toString()],
      },
    });
    const st = Number(result[1]);
    return {
      id: Number(result[0]),
      status: st === 0 ? "open" : st === 1 ? "closed" : "resolved",
      prizePool: Number(result[2]),
      totalEntries: Number(result[3]),
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/registrations
 *
 * Returns list of wallet addresses registered for a gameweek.
 *
 * Query params:
 *   gw  — gameweek number (optional; defaults to current gameweek)
 *
 * Response:
 * {
 *   gameweek: number,
 *   status: "open" | "closed" | "resolved",
 *   totalEntries: number,
 *   registrations: string[]   // wallet addresses
 * }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const gwParam = searchParams.get("gw");

    let gameweekId: number;

    if (gwParam) {
      gameweekId = parseInt(gwParam, 10);
      if (!Number.isFinite(gameweekId) || gameweekId < 1) {
        return NextResponse.json(
          { error: "Invalid gameweek. Use ?gw=35" },
          { status: 400 },
        );
      }
    } else {
      const config = await getConfig();
      gameweekId = config.currentGameweek;
    }

    const [gw, addresses] = await Promise.all([
      getGameweek(gameweekId),
      getGameweekTeams(gameweekId),
    ]);

    if (!gw) {
      return NextResponse.json(
        { error: `Gameweek ${gameweekId} not found` },
        { status: 404 },
      );
    }

    return NextResponse.json(
      {
        gameweek: gw.id,
        status: gw.status,
        totalEntries: addresses.length,
        registrations: addresses,
      },
      {
        status: 200,
        headers: {
          "Cache-Control": "no-store",
          "Access-Control-Allow-Origin": "*",
        },
      },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
