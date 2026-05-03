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

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "no-store",
};

type QuestType = "registered" | "top10" | "winner" | "claimed";

/** Check one address against one quest type across given gameweeks. */
async function checkAddress(
  address: string,
  quest: QuestType,
  gwsToCheck: number[],
): Promise<{ eligible: true; gameweek: number; rank?: number } | { eligible: false }> {
  if (quest === "registered") {
    for (const gw of gwsToCheck) {
      if (await hasRegisteredTeam(address, gw)) return { eligible: true, gameweek: gw };
    }
    return { eligible: false };
  }

  for (const gw of gwsToCheck) {
    const gwData = await getGameweek(gw);
    if (gwData?.status !== "resolved") continue;
    const result = await getTeamResult(address, gw);
    if (!result) continue;
    if (quest === "top10" && result.rank >= 1 && result.rank <= 10)
      return { eligible: true, gameweek: gw, rank: result.rank };
    if (quest === "winner" && result.rank === 1)
      return { eligible: true, gameweek: gw, rank: 1 };
    if (quest === "claimed" && result.claimed)
      return { eligible: true, gameweek: gw };
  }
  return { eligible: false };
}

async function resolveParams(
  addresses: string[],
  quest: QuestType,
  gwParam: string | null,
): Promise<NextResponse> {
  if (addresses.length === 0) {
    return NextResponse.json(
      { eligible: false, reason: "Missing required param: address or addresses" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const validQuests: QuestType[] = ["registered", "top10", "winner", "claimed"];
  if (!validQuests.includes(quest)) {
    return NextResponse.json(
      { eligible: false, reason: `Unknown quest: "${quest}". Valid: ${validQuests.join(", ")}` },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  const config = await getConfig();
  const currentGw = config.currentGameweek;

  let gwsToCheck: number[];
  if (gwParam) {
    const n = parseInt(gwParam, 10);
    gwsToCheck = Number.isFinite(n) && n >= 1 ? [n] : [];
  } else {
    gwsToCheck = Array.from({ length: 5 }, (_, i) => currentGw - i).filter((n) => n >= 1);
  }

  if (gwsToCheck.length === 0) {
    return NextResponse.json(
      { eligible: false, reason: "No valid gameweeks to check" },
      { status: 400, headers: CORS_HEADERS },
    );
  }

  // Check all addresses — eligible if ANY of them satisfies the quest
  for (const addr of addresses) {
    const result = await checkAddress(addr.trim(), quest, gwsToCheck);
    if (result.eligible) {
      const { eligible: _, ...rest } = result;
      void _;
      return NextResponse.json(
        { eligible: true, matchedAddress: addr.trim(), ...rest },
        { status: 200, headers: CORS_HEADERS },
      );
    }
  }

  return NextResponse.json(
    { eligible: false, reason: `Quest "${quest}" not completed by any of the provided addresses` },
    { status: 200, headers: CORS_HEADERS },
  );
}

/**
 * GET /api/quest
 *
 * Single address:   ?address=0xABC...&quest=registered
 * Multiple (array): ?addresses=0xABC...,0xDEF...&quest=registered
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const quest = (searchParams.get("quest") ?? "registered") as QuestType;
    const gwParam = searchParams.get("gw");

    // Support both ?address=X and ?addresses=X,Y,Z and multiple ?address=X&address=Y
    const addressesParam = searchParams.get("addresses");
    const addressParam = searchParams.getAll("address");
    const addresses = addressesParam
      ? addressesParam.split(",").map((a) => a.trim()).filter(Boolean)
      : addressParam.filter(Boolean);

    return await resolveParams(addresses, quest, gwParam);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ eligible: false, reason: message }, { status: 500, headers: CORS_HEADERS });
  }
}

/**
 * POST /api/quest
 *
 * Body: { "addresses": ["0xABC...", "0xDEF..."], "quest": "registered", "gw": 35 }
 */
export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      address?: string;
      addresses?: string[];
      quest?: string;
      gw?: number;
    };

    const addresses = body.addresses ?? (body.address ? [body.address] : []);
    const quest = (body.quest ?? "registered") as QuestType;
    const gwParam = body.gw != null ? String(body.gw) : null;

    return await resolveParams(addresses, quest, gwParam);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ eligible: false, reason: message }, { status: 500, headers: CORS_HEADERS });
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
