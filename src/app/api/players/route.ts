import { NextResponse } from "next/server";

const FPL_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const PHOTO_BASE =
  "https://resources.premierleague.com/premierleague/photos/players/250x250/p";

const POSITION_MAP: Record<number, "GK" | "DEF" | "MID" | "FWD"> = {
  1: "GK",
  2: "DEF",
  3: "MID",
  4: "FWD",
};

// Our scoring system
const GOAL_PTS: Record<string, number> = { GK: 10, DEF: 6, MID: 5, FWD: 4 };
const CS_PTS:   Record<string, number> = { GK: 6,  DEF: 6, MID: 1, FWD: 0 };

function calcOurForm(el: any, position: string): number {
  const starts = el.starts || 0;
  if (starts === 0) return 0;

  let pts = 0;
  pts += (el.goals_scored      || 0) * (GOAL_PTS[position] ?? 4);
  pts += (el.assists            || 0) * 3;
  pts += (el.clean_sheets       || 0) * (CS_PTS[position]  ?? 0);
  pts += (el.saves              || 0) * 1;   // GK +1 per save
  pts += (el.yellow_cards       || 0) * -1;
  pts += (el.red_cards          || 0) * -3;
  pts += (el.own_goals          || 0) * -2;
  pts += (el.penalties_missed   || 0) * -2;
  pts += starts * 2;                          // 90+ min full game = +2

  return parseFloat((pts / starts).toFixed(2));
}

export const revalidate = 3600; // cache for 1 hour

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
    const players = data.elements
      .filter((el: any) => el.can_select && el.status !== "u")
      .map((el: any, idx: number) => ({
        id: idx + 1,
        fplId: el.id,
        name: el.known_name || `${el.first_name} ${el.second_name}`,
        webName: el.web_name,
        team: teamMap[el.team] || "Unknown",
        teamId: el.team,
        position: POSITION_MAP[el.element_type] || "MID",
        positionId: el.element_type - 1,
        photo: `${PHOTO_BASE}${el.code}.png`,
        fplPhotoCode: el.code,
        status: el.status, // a, d, i, s (FPL)
        chanceOfPlaying: el.chance_of_playing_next_round,
        news: el.news || "",
        totalPoints: el.total_points,
        form: calcOurForm(el, POSITION_MAP[el.element_type] || "MID"),
        selectedByPercent: parseFloat(el.selected_by_percent),
      }));

    return NextResponse.json(players);
  } catch (err) {
    console.error("Failed to fetch FPL players:", err);
    return NextResponse.json(
      { error: "Failed to fetch player data" },
      { status: 500 }
    );
  }
}
