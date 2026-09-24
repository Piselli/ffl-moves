import { NextResponse } from "next/server";
import {
  PLAYER_FORM_LEN,
  statusFromLiveStats,
  type PlayerFormPayload,
  type PlayerFormStatus,
} from "@/lib/fplPlayerForm";

const FPL_BASE = "https://fantasy.premierleague.com/api";

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "en-US,en;q=0.9",
  Referer: "https://fantasy.premierleague.com/",
  Origin: "https://fantasy.premierleague.com",
};

const FRESH_MS = 5 * 60 * 1000;
const STALE_MS = 60 * 60 * 1000;

type CacheEntry = { at: number; payload: PlayerFormPayload };

let memory: CacheEntry | null = null;
let refreshInFlight: Promise<PlayerFormPayload> | null = null;

type FplEvent = { id: number; finished?: boolean };
type FplLiveElement = {
  id: number;
  stats?: { minutes?: number; starts?: number };
};

async function buildFormPayload(): Promise<PlayerFormPayload> {
  const bootstrapRes = await fetch(`${FPL_BASE}/bootstrap-static/`, {
    headers: BROWSER_HEADERS,
    cache: "no-store",
  });
  if (!bootstrapRes.ok) {
    throw new Error(`FPL bootstrap ${bootstrapRes.status}`);
  }
  const bootstrap = (await bootstrapRes.json()) as { events?: FplEvent[] };
  const finished = (bootstrap.events ?? [])
    .filter((e) => e.finished)
    .map((e) => e.id)
    .sort((a, b) => a - b);
  const gameweeks = finished.slice(-PLAYER_FORM_LEN);

  if (gameweeks.length === 0) {
    return { gameweeks: [], byPlayer: {} };
  }

  const lives = await Promise.all(
    gameweeks.map(async (gw) => {
      const res = await fetch(`${FPL_BASE}/event/${gw}/live/`, {
        headers: BROWSER_HEADERS,
        cache: "no-store",
      });
      if (!res.ok) throw new Error(`FPL live GW${gw} ${res.status}`);
      const json = (await res.json()) as { elements?: FplLiveElement[] };
      return { gw, elements: json.elements ?? [] };
    }),
  );

  const byPlayer: Record<string, PlayerFormStatus[]> = {};
  for (let i = 0; i < lives.length; i++) {
    const { elements } = lives[i]!;
    for (const el of elements) {
      const key = String(el.id);
      if (!byPlayer[key]) {
        byPlayer[key] = Array.from(
          { length: gameweeks.length },
          () => "out" as PlayerFormStatus,
        );
      }
      byPlayer[key]![i] = statusFromLiveStats(el.stats);
    }
  }

  return { gameweeks, byPlayer };
}

async function refreshForm(): Promise<PlayerFormPayload> {
  if (refreshInFlight) return refreshInFlight;
  refreshInFlight = buildFormPayload()
    .then((payload) => {
      memory = { at: Date.now(), payload };
      return payload;
    })
    .finally(() => {
      refreshInFlight = null;
    });
  return refreshInFlight;
}

/**
 * GET /api/fpl-form
 * Last finished FPL gameweeks (≤5) → start / sub / out per player.
 */
export async function GET() {
  try {
    const now = Date.now();
    if (memory) {
      const age = now - memory.at;
      if (age < FRESH_MS) {
        return NextResponse.json(memory.payload, {
          headers: {
            "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
          },
        });
      }
      if (age < STALE_MS) {
        void refreshForm();
        return NextResponse.json(memory.payload, {
          headers: {
            "Cache-Control": "public, s-maxage=60, stale-while-revalidate=600",
          },
        });
      }
    }

    const payload = await refreshForm();
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch (err) {
    console.error("fpl-form route error:", err);
    if (memory) {
      return NextResponse.json(memory.payload, {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120",
        },
      });
    }
    return NextResponse.json(
      {
        gameweeks: [],
        byPlayer: {},
        error: err instanceof Error ? err.message : String(err),
      },
      { status: 500 },
    );
  }
}
