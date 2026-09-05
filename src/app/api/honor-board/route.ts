import { NextResponse } from "next/server";
import { unstable_cache } from "next/cache";
import { buildHonorBoard } from "@/lib/honorBoard";

export const dynamic = "force-dynamic";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
  "Cache-Control": "public, max-age=60",
};

/**
 * GET /api/honor-board
 * All-time top earners by published prize USDC (wall “honor board”).
 */
export async function GET() {
  try {
    const cached = unstable_cache(() => buildHonorBoard(10), ["honor-board-v1"], {
      revalidate: 120,
    });
    const board = await cached();
    return NextResponse.json(
      { ...board, count: board.entries.length },
      { headers: CORS_HEADERS },
    );
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: message }, { status: 500, headers: CORS_HEADERS });
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}
