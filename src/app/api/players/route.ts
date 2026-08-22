import { readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { CLEAN_SHEET_POINTS, GOAL_POINTS } from "@/lib/scoring-rules";
import { playerPhotoSrc } from "@/lib/playerPhoto";
import type { Player } from "@/lib/types";

type FplApiIdMapFile = {
  byCode?: Record<string, number>;
};

const FPL_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const PHOTO_BASE =
  "https://resources.premierleague.com/premierleague/photos/players/250x250/p";

const POSITION_MAP: Record<number, "GK" | "DEF" | "MID" | "FWD"> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

/** Season-to-date “our rules” form — same goal / clean-sheet weights as `scoring-rules.ts` / on-chain. */
interface FplElementSeasonTotals {
  starts?: number;
  goals_scored?: number;
  assists?: number;
  clean_sheets?: number;
  saves?: number;
  yellow_cards?: number;
  red_cards?: number;
  own_goals?: number;
  penalties_missed?: number;
}

type ApiSportsCatalogRow = {
  apiId?: number;
  name?: string;
  position?: string;
};

function goalPointsForPosition(position: "GK" | "DEF" | "MID" | "FWD"): number {
  if (position === "GK") return GOAL_POINTS.GK;
  if (position === "DEF") return GOAL_POINTS.DEF;
  if (position === "MID") return GOAL_POINTS.MID;
  return GOAL_POINTS.FWD;
}

function cleanSheetPointsForPosition(position: "GK" | "DEF" | "MID" | "FWD"): number {
  if (position === "GK" || position === "DEF") return CLEAN_SHEET_POINTS.GK_DEF;
  if (position === "MID") return CLEAN_SHEET_POINTS.MID;
  return 0;
}

function calcOurForm(el: FplElementSeasonTotals, position: "GK" | "DEF" | "MID" | "FWD"): number {
  const starts = el.starts || 0;
  if (starts === 0) return 0;

  let pts = 0;
  pts += (el.goals_scored      || 0) * goalPointsForPosition(position);
  pts += (el.assists            || 0) * 3;
  pts += (el.clean_sheets       || 0) * cleanSheetPointsForPosition(position);
  pts += (el.saves              || 0) * 1;   // GK +1 per save
  pts += (el.yellow_cards       || 0) * -1;
  pts += (el.red_cards          || 0) * -3;
  pts += (el.own_goals          || 0) * -2;
  pts += (el.penalties_missed   || 0) * -2;
  pts += starts * 2;                          // 90+ min full game = +2

  return parseFloat((pts / starts).toFixed(2));
}

function normName(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

/**
 * Map FPL webName → API-Sports id for photo fallback when PL CDN has no asset.
 * Catalog names look like "F. Wirtz" / "G. Donnarumma"; index by last token + position.
 */
function buildApiIdIndex(catalog: ApiSportsCatalogRow[]): Map<string, number> {
  const index = new Map<string, number>();
  const ambiguous = new Set<string>();

  for (const row of catalog) {
    if (row.apiId == null || row.apiId <= 0 || !row.name) continue;
    const parts = row.name.trim().split(/[\s.]+/).filter(Boolean);
    const last = normName(parts[parts.length - 1] || "");
    if (last.length < 3) continue;
    const pos = (row.position || "").toUpperCase();
    const key = `${last}|${pos}`;
    if (ambiguous.has(key)) continue;
    if (index.has(key) && index.get(key) !== row.apiId) {
      index.delete(key);
      ambiguous.add(key);
      continue;
    }
    index.set(key, row.apiId);
  }
  return index;
}

function loadJsonSafe<T>(relPath: string, fallback: T): T {
  try {
    const raw = readFileSync(join(process.cwd(), relPath), "utf8");
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`players: failed to read ${relPath}`, err);
    return fallback;
  }
}

/** Built by `npm run build:atlas` — FPL element.code → API-Sports id. */
const API_ID_BY_FPL_CODE: Record<string, number> = (() => {
  const file = loadJsonSafe<FplApiIdMapFile>("src/data/fpl-apiid-map.json", {});
  return file.byCode ?? {};
})();

const API_ID_BY_NAME_POS = buildApiIdIndex(
  loadJsonSafe<ApiSportsCatalogRow[]>("public/data/players.json", []),
);

/** No `revalidate` / Data Cache: FPL bootstrap JSON exceeds Next’s ~2MB fetch cache limit — we use `cache: "no-store"` below. */

export async function GET() {
  try {
    const res = await fetch(FPL_URL, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "en-US,en;q=0.9",
        "Accept-Encoding": "gzip, deflate, br",
        Referer: "https://fantasy.premierleague.com/",
        Origin: "https://fantasy.premierleague.com",
      },
      cache: "no-store", // FPL response is 2.6MB, over Next.js 2MB cache limit
    });

    if (!res.ok) {
      throw new Error(`FPL API returned ${res.status}`);
    }

    const data = await res.json();

    // Build team id → name map
    const teamMap: Record<number, string> = {};
    for (const t of data.teams) {
      teamMap[t.id] = t.name;
    }

    // Do not filter on can_select — FPL sets can_select=false for every player after the
    // season closes, which would return an empty catalog and break squad/result views.
    const players = data.elements
      .filter(
        (el: { status?: string }) => el.status !== "u",
      )
      .map((el: Record<string, unknown>) => {
        const elementType = Number(el.element_type);
        const pos = POSITION_MAP[elementType] || "MID";
        const webName = el.web_name as string;
        const secondName = String(el.second_name || "");
        const code = el.code as number;
        const apiId =
          API_ID_BY_FPL_CODE[String(code)] ??
          API_ID_BY_NAME_POS.get(`${normName(webName)}|${pos}`) ??
          API_ID_BY_NAME_POS.get(`${normName(secondName)}|${pos}`) ??
          undefined;
        return {
          id: el.id as number,
          fplId: el.id as number,
          name: (el.known_name as string) || `${el.first_name} ${el.second_name}`,
          webName,
          team: teamMap[el.team as number] || "Unknown",
          teamId: el.team as number,
          position: pos,
          positionId: elementType - 1,
          squadNumber:
            el.squad_number == null || el.squad_number === ""
              ? null
              : Number(el.squad_number),
          photo: `${PHOTO_BASE}${el.code}.png`,
          fplPhotoCode: code,
          apiId,
          status: el.status as string, // a, d, i, s (FPL)
          chanceOfPlaying: el.chance_of_playing_next_round as number | null | undefined,
          news: (el.news as string) || "",
          totalPoints: el.total_points as number,
          form: calcOurForm(el as FplElementSeasonTotals, pos),
          selectedByPercent: parseFloat(String(el.selected_by_percent)),
        };
      });

    const withProxiedPhotos = (players as Player[]).map((p) => {
      const proxied = playerPhotoSrc(p);
      return proxied ? { ...p, photo: proxied } : p;
    });
    return NextResponse.json(withProxiedPhotos);
  } catch (err) {
    console.error("Failed to fetch FPL players:", err);
    return NextResponse.json(
      { error: "Failed to fetch player data" },
      { status: 500 }
    );
  }
}
