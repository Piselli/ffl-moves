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

/** Same FPL fetch headers as `/api/players`. */
async function fetchBootstrap() {
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
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`FPL API returned ${res.status}`);
  return res.json() as Promise<{
    teams: { id: number; name: string }[];
    elements: any[];
  }>;
}

/**
 * Resolve FPL element ids that are missing from `/api/players` (injured, loaned,
 * can_select=false, etc.) so on-chain squads still show real names/photos.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { ids?: unknown };
    const raw = Array.isArray(body.ids) ? body.ids : [];
    const seen = new Set<number>();
    const ids: number[] = [];
    for (const x of raw) {
      const n = Number(x);
      if (!Number.isFinite(n) || n <= 0 || seen.has(n)) continue;
      seen.add(n);
      ids.push(n);
      if (ids.length >= 24) break;
    }
    if (!ids.length) {
      return NextResponse.json([]);
    }

    const data = await fetchBootstrap();
    const teamMap: Record<number, string> = {};
    for (const t of data.teams) {
      teamMap[t.id] = t.name;
    }

    const byId = new Map<number, any>();
    for (const el of data.elements) {
      if (typeof el?.id === "number") byId.set(el.id, el);
    }

    const out = ids
      .map((id) => {
        const el = byId.get(id);
        if (!el) return null;
        const pos = POSITION_MAP[el.element_type] || "MID";
        return {
          id: el.id,
          fplId: el.id,
          name: el.known_name || `${el.first_name} ${el.second_name}`,
          webName: el.web_name,
          team: teamMap[el.team] || "Unknown",
          teamId: el.team,
          position: pos,
          positionId: el.element_type - 1,
          photo: `${PHOTO_BASE}${el.code}.png`,
          fplPhotoCode: el.code,
          status: el.status,
          chanceOfPlaying: el.chance_of_playing_next_round,
          news: el.news || "",
        };
      })
      .filter(Boolean);

    return NextResponse.json(out);
  } catch (err) {
    console.error("players-resolve:", err);
    return NextResponse.json({ error: "resolve failed" }, { status: 500 });
  }
}
