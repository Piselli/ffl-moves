/**
 * Server-side loader for the repository fallback World Cup fixture file.
 */

import fs from "node:fs";
import path from "node:path";
import { WC_ROUNDS, getWorldCupRoundByKey, type WorldCupRound } from "@/lib/worldcup";
import type { WcFixture, WcRoundFixtures } from "@/lib/football-data";

type StaticFixture = Partial<WcFixture> & {
  id?: number;
};

interface WcFixtureFile {
  [roundKey: string]: {
    deadlineTime?: string | null;
    fixtures?: StaticFixture[];
  };
}

const FIXTURES_FILE = path.join(process.cwd(), "public", "data", "wc-fixtures.json");

function normalizeFixture(f: StaticFixture, roundKey: string, index: number): WcFixture {
  return {
    id: typeof f.id === "number" ? f.id : index,
    kickoffTime: f.kickoffTime ?? null,
    home: f.home ?? "TBD",
    away: f.away ?? "TBD",
    homeCode: f.homeCode ?? null,
    awayCode: f.awayCode ?? null,
    homeCrest: f.homeCrest ?? null,
    awayCrest: f.awayCrest ?? null,
    finished: Boolean(f.finished),
    started: Boolean(f.started ?? f.finished),
    scoreH: f.scoreH ?? null,
    scoreA: f.scoreA ?? null,
    penaltyH: f.penaltyH ?? null,
    penaltyA: f.penaltyA ?? null,
    winner: f.winner ?? null,
    group: f.group ?? null,
    roundKey: f.roundKey ?? roundKey,
  };
}

export function loadStaticWcFixturesFile(): WcFixtureFile {
  try {
    const raw = fs.readFileSync(FIXTURES_FILE, "utf8");
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as WcFixtureFile) : {};
  } catch {
    return {};
  }
}

export function getStaticWcRoundFixtures(roundKey: string): WcRoundFixtures | null {
  const round: WorldCupRound = getWorldCupRoundByKey(roundKey) ?? WC_ROUNDS[0];
  const file = loadStaticWcFixturesFile();
  const entry = file[round.key];
  if (!entry) return null;

  const fixtures = Array.isArray(entry.fixtures)
    ? entry.fixtures.map((f, i) => normalizeFixture(f, round.key, i))
    : [];

  const deadlineTime = entry.deadlineTime ?? null;
  const deadlineEpochMs =
    typeof deadlineTime === "string" && deadlineTime.length > 0 && Number.isFinite(Date.parse(deadlineTime))
      ? Date.parse(deadlineTime)
      : null;

  return {
    round,
    deadlineTime,
    deadlineEpochMs,
    fixtures,
  };
}

export function getAllStaticWcFixtures(): WcFixture[] {
  const out: WcFixture[] = [];
  for (const round of WC_ROUNDS) {
    const roundFixtures = getStaticWcRoundFixtures(round.key);
    if (roundFixtures) out.push(...roundFixtures.fixtures);
  }
  return out;
}
