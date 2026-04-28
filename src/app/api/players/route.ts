import { NextResponse } from "next/server";
import { CLEAN_SHEET_POINTS, GOAL_POINTS } from "@/lib/scoring-rules";

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

    // Filter players: must be selectable and not loaned out
    // Use official FPL element id as `id` everywhere (on-chain register_team, stats, display).
    // Never use filtered-array index — it drifts from FPL ids and breaks name ↔ chain mapping.
    const players = data.elements
      .filter(
        (el: { can_select?: boolean; status?: string }) => Boolean(el.can_select) && el.status !== "u",
      )
      .map((el: Record<string, unknown>) => {
        const elementType = Number(el.element_type);
        const pos = POSITION_MAP[elementType] || "MID";
        return {
        id: el.id as number,
        fplId: el.id as number,
        name: (el.known_name as string) || `${el.first_name} ${el.second_name}`,
        webName: el.web_name as string,
        team: teamMap[el.team as number] || "Unknown",
        teamId: el.team as number,
        position: pos,
        positionId: elementType - 1,
        photo: `${PHOTO_BASE}${el.code}.png`,
        fplPhotoCode: el.code as number,
        status: el.status as string, // a, d, i, s (FPL)
        chanceOfPlaying: el.chance_of_playing_next_round as number | null | undefined,
        news: (el.news as string) || "",
        totalPoints: el.total_points as number,
        form: calcOurForm(el as FplElementSeasonTotals, pos),
        selectedByPercent: parseFloat(String(el.selected_by_percent)),
      };
      });

    return NextResponse.json(players);
  } catch (err) {
    console.error("Failed to fetch FPL players:", err);
    return NextResponse.json(
      { error: "Failed to fetch player data" },
      { status: 500 }
    );
  }
}
