import { NextRequest, NextResponse } from "next/server";

import { auditStatsAgainstFpl, type AuditCatalogRow } from "@/lib/statsAudit";
import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const FPL_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "application/json, text/plain, */*",
  Referer: "https://fantasy.premierleague.com/",
};

async function fplJson<T>(path: string): Promise<T> {
  const res = await fetch(`https://fantasy.premierleague.com/api/${path}`, {
    headers: FPL_HEADERS,
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FPL ${path} → HTTP ${res.status}`);
  return (await res.json()) as T;
}

type RawRow = Record<string, unknown>;
const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0);

/**
 * POST /api/oracle/stats-audit   { gameweekId, players: [...] | { [id]: {...} } }
 *
 * Read-only sanity check of fetched oracle stats against FPL's live feed. Public data in,
 * public data out — nothing is stored.
 */
export async function POST(req: NextRequest) {
  const gate = await rateLimit(`oracle:stats-audit:${clientIp(req)}`, 20, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests" },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  let body: { gameweekId?: unknown; players?: unknown };
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const gw = Number(body.gameweekId);
  if (!Number.isInteger(gw) || gw < 1 || gw > 38) {
    return NextResponse.json({ error: "EPL gameweekId (1–38) required." }, { status: 400 });
  }

  const rows: RawRow[] = Array.isArray(body.players)
    ? (body.players as RawRow[])
    : body.players && typeof body.players === "object"
      ? Object.entries(body.players as Record<string, RawRow>).map(([id, r]) => ({
          ...r,
          playerId: r.playerId ?? id,
        }))
      : [];
  if (rows.length === 0) {
    return NextResponse.json({ error: "No players." }, { status: 400 });
  }

  try {
    const [live, fixtures, catalog] = await Promise.all([
      fplJson<{ elements: { id: number; stats: { minutes: number; goals_scored: number } }[] }>(
        `event/${gw}/live/`,
      ),
      fplJson<{ finished: boolean; finished_provisional: boolean }[]>(`fixtures/?event=${gw}`),
      fetch(`${new URL(req.url).origin}/api/players`, { cache: "no-store" }).then(
        (r) => r.json() as Promise<AuditCatalogRow[]>,
      ),
    ]);

    const report = auditStatsAgainstFpl({
      ours: rows.map((r) => ({
        playerId: num(r.playerId),
        minutes: num(r.minutesPlayed ?? r.minutes_played),
        goals: num(r.goals),
      })),
      live: live.elements.map((e) => ({
        id: e.id,
        minutes: e.stats.minutes,
        goals: e.stats.goals_scored,
      })),
      catalog,
      fixtures: {
        total: fixtures.length,
        finished: fixtures.filter((f) => f.finished || f.finished_provisional).length,
      },
    });
    return NextResponse.json(report);
  } catch (e) {
    // Audit is advisory: a failure must never block the oracle flow on its own.
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Audit failed" },
      { status: 502 },
    );
  }
}
