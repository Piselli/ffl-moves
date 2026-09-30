import { clientIp, safeEqual } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";
import { NextResponse } from "next/server";
import {
  parseBracketStatePayload,
  type WcBracketState,
} from "@/lib/wcBracketState";
import { loadWcBracketState, saveWcBracketState } from "@/lib/wcBracketStateStore";
import { resolveLiveWcBracketState, syncBracketStateFromApi } from "@/lib/wcBracketStateFromApi";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const NO_STORE = {
  headers: { "Cache-Control": "private, no-store, max-age=0, must-revalidate" },
};

function adminKey(): string {
  return process.env.WC_BRACKET_STATE_ADMIN_KEY ?? "";
}

async function assertAdmin(request: Request): Promise<NextResponse | null> {
  const gate = await rateLimit(`admin:wcbracket:${clientIp(request)}`, 30, 60);
  if (!gate.ok) {
    return NextResponse.json({ error: "Too many requests." }, { status: 429, ...NO_STORE });
  }
  const expected = adminKey();
  if (!expected) {
    return NextResponse.json(
      { error: "Bracket state admin disabled: set WC_BRACKET_STATE_ADMIN_KEY." },
      { status: 503, ...NO_STORE },
    );
  }
  const provided = request.headers.get("x-admin-key") ?? "";
  if (!safeEqual(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401, ...NO_STORE });
  }
  return null;
}

/** Public read — live merge from football-data.org when FOOTBALL_DATA_TOKEN is set. */
export async function GET() {
  const state = await resolveLiveWcBracketState();
  return NextResponse.json(state, NO_STORE);
}

/** Publish official state to public/data/wc-bracket-state.json. */
export async function PUT(request: Request) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400, ...NO_STORE });
  }

  const parsed = parseBracketStatePayload(body);
  if (!parsed) {
    return NextResponse.json({ error: "Invalid bracket state payload." }, { status: 400, ...NO_STORE });
  }

  const state: WcBracketState = {
    ...parsed,
    meta: {
      ...parsed.meta,
      updatedAt: new Date().toISOString(),
      source: parsed.meta?.source ?? "manual",
    },
  };

  await saveWcBracketState(state);
  return NextResponse.json({ ok: true, state }, NO_STORE);
}

/** Pull football-data.org results and merge into the posted base state (does not save). */
export async function POST(request: Request) {
  const denied = await assertAdmin(request);
  if (denied) return denied;

  let base = await loadWcBracketState();
  try {
    const body = await request.json();
    const parsed = parseBracketStatePayload(body);
    if (parsed) base = parsed;
  } catch {
    // empty body → sync from file
  }

  const result = await syncBracketStateFromApi(base);
  return NextResponse.json(result, NO_STORE);
}
