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

async function hasRegisteredTeam(owner: string, gameweekId: number): Promise<boolean> {
  try {
    const result = await client.view({
      payload: {
        function: moduleFunction("has_registered_team"),
        typeArguments: [],
        functionArguments: [owner, gameweekId.toString()],
      },
    });
    return result[0] as boolean;
  } catch {
    return false;
  }
}

async function getTeamResult(owner: string, gameweekId: number) {
  try {
    const result = await client.view({
      payload: {
        function: moduleFunction("get_team_result"),
        typeArguments: [],
        functionArguments: [owner, gameweekId.toString()],
      },
    });
    return {
      finalPoints: Number(result[7]),
      rank: Number(result[8]),
      prizeAmount: Number(result[9]),
      claimed: result[10] as boolean,
    };
  } catch {
    return null;
  }
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
    };
  } catch {
    return null;
  }
}

/**
 * GET /api/quest
 *
 * Parthenon-compatible quest verification endpoint.
 * Returns whether a wallet address has completed a specific quest.
 *
 * Query params:
 *   address  — wallet address to check (required)
 *   quest    — quest type (optional, default: "registered")
 *              "registered"  — has registered a squad for any recent gameweek
 *              "top10"       — has finished in top 10 in any resolved gameweek
 *              "winner"      — has finished #1 in any resolved gameweek
 *              "claimed"     — has claimed a prize in any resolved gameweek
 *   gw       — specific gameweek to check (optional, defaults to current)
 *
 * Response:
 *   { "eligible": true }  or  { "eligible": false, "reason": "..." }
 */
export async function GET(req: NextRequest) {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Cache-Control": "no-store",
  };

  try {
    const { searchParams } = new URL(req.url);
    const address = searchParams.get("address");
    const quest = searchParams.get("quest") ?? "registered";
    const gwParam = searchParams.get("gw");

    if (!address) {
      return NextResponse.json(
        { eligible: false, reason: "Missing required param: address" },
        { status: 400, headers: corsHeaders },
      );
    }

    const config = await getConfig();
    const currentGw = config.currentGameweek;

    // Determine which gameweeks to scan
    let gwsToCheck: number[];
    if (gwParam) {
      const n = parseInt(gwParam, 10);
      gwsToCheck = Number.isFinite(n) && n >= 1 ? [n] : [];
    } else {
      // Scan last 5 gameweeks to catch recent activity
      gwsToCheck = Array.from({ length: 5 }, (_, i) => currentGw - i).filter((n) => n >= 1);
    }

    if (gwsToCheck.length === 0) {
      return NextResponse.json(
        { eligible: false, reason: "No valid gameweeks to check" },
        { status: 400, headers: corsHeaders },
      );
    }

    // ── Quest: registered ─────────────────────────────────────────────────────
    if (quest === "registered") {
      for (const gw of gwsToCheck) {
        const registered = await hasRegisteredTeam(address, gw);
        if (registered) {
          return NextResponse.json(
            { eligible: true, gameweek: gw },
            { status: 200, headers: corsHeaders },
          );
        }
      }
      return NextResponse.json(
        { eligible: false, reason: "No squad registered in recent gameweeks" },
        { status: 200, headers: corsHeaders },
      );
    }

    // ── Quest: top10 / winner / claimed ───────────────────────────────────────
    if (quest === "top10" || quest === "winner" || quest === "claimed") {
      for (const gw of gwsToCheck) {
        const gwData = await getGameweek(gw);
        if (gwData?.status !== "resolved") continue;

        const result = await getTeamResult(address, gw);
        if (!result) continue;

        if (quest === "top10" && result.rank >= 1 && result.rank <= 10) {
          return NextResponse.json(
            { eligible: true, gameweek: gw, rank: result.rank },
            { status: 200, headers: corsHeaders },
          );
        }
        if (quest === "winner" && result.rank === 1) {
          return NextResponse.json(
            { eligible: true, gameweek: gw, rank: 1 },
            { status: 200, headers: corsHeaders },
          );
        }
        if (quest === "claimed" && result.claimed) {
          return NextResponse.json(
            { eligible: true, gameweek: gw },
            { status: 200, headers: corsHeaders },
          );
        }
      }
      return NextResponse.json(
        { eligible: false, reason: `Quest "${quest}" not completed` },
        { status: 200, headers: corsHeaders },
      );
    }

    return NextResponse.json(
      { eligible: false, reason: `Unknown quest type: "${quest}". Valid: registered, top10, winner, claimed` },
      { status: 400, headers: corsHeaders },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json(
      { eligible: false, reason: message },
      { status: 500, headers: corsHeaders },
    );
  }
}

// Handle CORS preflight
export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    },
  });
}
