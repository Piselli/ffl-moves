import { catalogHitFromName } from "@/lib/fpl-photo-from-name";

export type LabSquadPlayer = {
  name: string;
  pts: number;
  /** FPL teamId — club footer colours (same as homepage pitch chips) */
  teamId?: number;
  /** Optional cast portrait under /design-lab/locker-hero/cast/ */
  cast?: string;
  /** Live FPL / catalog photo URL */
  photo?: string;
  /** For pitch cutout candidates (same path as homepage) */
  fplPhotoCode?: number;
  apiId?: number;
  /** 0 GK · 1 DEF · 2 MID · 3 FWD */
  positionId?: number;
  position?: "GK" | "DEF" | "MID" | "FWD";
  slotIndex?: number;
  isStarter?: boolean;
  /** Auto-sub / effective scorer note */
  subNote?: string | null;
  /** GW stat blob for points breakdown */
  stats?: Record<string, unknown>;
};

export type SeasonHighlightRow = {
  rank: number;
  owner: string;
  nickname: string;
  /** Season points total */
  points: number;
  top10: number;
  bestRank: number;
  isYou?: boolean;
};

export type LabLeaderboardRow = {
  rank: number;
  owner: string;
  nickname: string;
  finalPoints: number;
  prizeAmount: number;
  claimed: boolean;
  /** Rank change this GW (positive = climbed) */
  gwDelta?: number;
  isYou?: boolean;
  /** Mock squad surnames for expand / reveal interactions */
  squad?: readonly string[];
  /** Formation order: GK → DEF → MID → FWD — used by team-sheet pitch */
  xi?: readonly LabSquadPlayer[];
  bench?: readonly LabSquadPlayer[];
  /** Inferred from on-chain starter positions when available */
  formationId?: "4-3-3" | "3-4-3";
};

export type LabLeaderboardSnapshot = {
  gameweek: number;
  status: "open" | "closed" | "resolved";
  prizePoolLabel: string;
  prizeSymbol: string;
  entries: number;
  isPreview: boolean;
  rows: LabLeaderboardRow[];
};

const CAST = "/design-lab/locker-hero/cast";

/** Rough FPL teamId for mock XI club footers (26/27 catalog). */
const MOCK_TEAM_ID: Record<string, number> = {
  Raya: 1,
  Saliba: 1,
  Saka: 1,
  Rice: 1,
  Ødegaard: 1,
  Timber: 1,
  White: 1,
  Virgil: 14,
  "Van Dijk": 14,
  Salah: 14,
  Gakpo: 14,
  Robertson: 14,
  Konate: 14,
  Gravenberch: 14,
  "Mac Allister": 14,
  Diaz: 14,
  Szoboszlai: 14,
  Alisson: 14,
  Quansah: 14,
  Haaland: 15,
  Foden: 15,
  Rodri: 15,
  Dias: 15,
  Walker: 15,
  Ederson: 15,
  Ake: 15,
  Gvardiol: 15,
  Palmer: 6,
  Colwill: 6,
  Caicedo: 6,
  James: 6,
  Jackson: 6,
  Sánchez: 6,
  Pickford: 9,
  Bruno: 16,
  Mainoo: 16,
  Shaw: 16,
  "Dewsbury-Hall": 9,
  Watkins: 2,
  Mbeumo: 16,
  Son: 19,
  Isak: 14,
  "João Pedro": 6,
  Eze: 1,
  Guehi: 15,
  Sarr: 8,
  Trippier: 17,
  Romero: 19,
  Porro: 19,
  Maddison: 19,
  Bellingham: 16,
  Wissa: 17,
};

function xi(
  players: Array<[string, number, string?, Partial<LabSquadPlayer>?]>,
  startIndex = 0,
): LabSquadPlayer[] {
  return players.map(([name, pts, cast, extra], i) => {
    const preferredTeam = extra?.teamId ?? MOCK_TEAM_ID[name];
    const hit = catalogHitFromName(name, preferredTeam);
    return {
      ...extra,
      name,
      pts,
      teamId: extra?.teamId ?? hit?.teamId ?? preferredTeam,
      fplPhotoCode: extra?.fplPhotoCode ?? hit?.code,
      cast: cast ? `${CAST}/${cast}.png` : extra?.cast,
      slotIndex: startIndex + i,
      isStarter: startIndex + i < 11,
    };
  });
}

/** Static preview data — visual only, no chain. */
export const LAB_LEADERBOARD: LabLeaderboardSnapshot = {
  gameweek: 8,
  status: "resolved",
  prizePoolLabel: "24,820",
  prizeSymbol: "USDC",
  entries: 1000,
  isPreview: false,
  rows: [
    {
      rank: 1,
      owner: "0xaaa1",
      nickname: "MAG",
      finalPoints: 98,
      prizeAmount: 7446,
      claimed: true,
      gwDelta: 2,
      squad: ["Raya", "Saliba", "Gabriel", "Virgil", "Robertson", "Rice", "Palmer", "Salah", "Saka", "Haaland", "Isak"],
      xi: xi([
        ["Raya", 5],
        ["Saliba", 6, "gabriel"],
        ["Virgil", 6],
        ["Colwill", 2],
        ["Salah", 10],
        ["Saka", 7],
        ["Palmer", 6, "palmer"],
        ["Mbeumo", 5],
        ["Haaland", 12, "haaland"],
        ["Watkins", 9, "watkins"],
        ["Bruno", 8, "bruno"],
      ]),
    },
    {
      rank: 2,
      owner: "0xbbb2",
      nickname: "LUKA",
      finalPoints: 94,
      prizeAmount: 4964,
      claimed: false,
      gwDelta: 1,
      squad: ["Pickford", "White", "Konate", "Ake", "Digne", "Caicedo", "Rodri", "Bruno", "Foden", "Watkins", "Son"],
      xi: xi([
        ["Pickford", 4, "pickford"],
        ["White", 5],
        ["Konate", 6],
        ["Ake", 3],
        ["Caicedo", 4],
        ["Rodri", 7],
        ["Bruno", 8, "bruno"],
        ["Foden", 6],
        ["Watkins", 9, "watkins"],
        ["Son", 7, "son"],
        ["Isak", 8, "isak"],
      ]),
    },
    {
      rank: 3,
      owner: "0xccc3",
      nickname: "MAX",
      finalPoints: 91,
      prizeAmount: 3723,
      claimed: false,
      gwDelta: 4,
      squad: ["Alisson", "Walker", "Dias", "Timber", "Gvardiol", "Mainoo", "Ødegaard", "Eze", "Salah", "João Pedro", "Jackson"],
      xi: xi([
        ["Alisson", 6],
        ["Walker", 4],
        ["Dias", 5],
        ["Timber", 3],
        ["Mainoo", 5],
        ["Ødegaard", 6],
        ["Eze", 7],
        ["Salah", 10],
        ["João Pedro", 6, "joaopedro"],
        ["Jackson", 4],
        ["Szoboszlai", 5, "szoboszlai"],
      ]),
    },
    {
      rank: 4,
      owner: "0xddd4",
      nickname: "CHICHARITO",
      finalPoints: 89,
      prizeAmount: 1986,
      claimed: false,
      gwDelta: 0,
      squad: ["Ederson", "Trippier", "Romero", "Quansah", "Udogie", "Gravenberch", "Mac Allister", "Maddison", "Diaz", "Isak", "Wissa"],
      xi: xi([
        ["Ederson", 3],
        ["Trippier", 4],
        ["Romero", 5],
        ["Quansah", 2],
        ["Gravenberch", 5],
        ["Mac Allister", 6],
        ["Maddison", 4],
        ["Diaz", 5],
        ["Isak", 8, "isak"],
        ["Wissa", 6],
        ["Palmer", 6, "palmer"],
      ]),
    },
    {
      rank: 5,
      owner: "0xeee5",
      nickname: "KDB10",
      finalPoints: 87,
      prizeAmount: 1737,
      claimed: false,
      gwDelta: 3,
      squad: ["Sánchez", "James", "Van Dijk", "Guehi", "Kerkez", "Caicedo", "Rice", "Palmer", "Sarr", "Haaland", "Cunha"],
      xi: xi([
        ["Sánchez", 4],
        ["James", 3],
        ["Van Dijk", 6],
        ["Guehi", 4],
        ["Caicedo", 5],
        ["Rice", 6],
        ["Palmer", 6, "palmer"],
        ["Sarr", 4],
        ["Haaland", 12, "haaland"],
        ["Cunha", 5],
        ["Son", 7, "son"],
      ]),
    },
    {
      rank: 87,
      owner: "0xyou4",
      nickname: "YOU",
      finalPoints: 79,
      prizeAmount: 124,
      claimed: false,
      isYou: true,
      gwDelta: 14,
      formationId: "4-3-3",
      squad: ["Raya", "Shaw", "Van Dijk", "Colwill", "Saliba", "Saka", "Dewsbury-Hall", "Bruno", "Gakpo", "Haaland", "Watkins"],
      xi: xi([
        ["Raya", 5, undefined, {
          positionId: 0,
          position: "GK",
          stats: { minutes_played: 90, clean_sheet: true, saves: 4 },
        }],
        ["Shaw", 14, undefined, {
          positionId: 1,
          position: "DEF",
          // Dense GW line: 60' + G + A + CS + YC — stress-tests why strip wrap.
          stats: {
            minutes_played: 90,
            goals: 1,
            assists: 1,
            clean_sheet: true,
            yellow_cards: 1,
          },
        }],
        ["Van Dijk", 6, undefined, {
          positionId: 1,
          position: "DEF",
          stats: { minutes_played: 90, clean_sheet: true },
        }],
        ["Colwill", 2, undefined, {
          positionId: 1,
          position: "DEF",
          stats: { minutes_played: 90, goals_conceded: 2 },
        }],
        ["Saliba", 6, "gabriel", {
          positionId: 1,
          position: "DEF",
          stats: { minutes_played: 90, clean_sheet: true },
        }],
        ["Saka", 7, undefined, {
          positionId: 2,
          position: "MID",
          stats: { minutes_played: 78, goals: 1, bonus: 1 },
        }],
        ["Dewsbury-Hall", 9, undefined, {
          positionId: 2,
          position: "MID",
          stats: { minutes_played: 90, assists: 1, bonus: 1 },
        }],
        ["Bruno", 8, "bruno", {
          positionId: 2,
          position: "MID",
          stats: { minutes_played: 90, goals: 1, bonus: 1 },
        }],
        // Gakpo (not Salah) — in PL 26/27 FPL catalog with a real cutout code.
        ["Gakpo", 10, undefined, {
          positionId: 3,
          position: "FWD",
          stats: { minutes_played: 90, goals: 1, assists: 1, bonus: 2 },
        }],
        ["Haaland", 12, "haaland", {
          positionId: 3,
          position: "FWD",
          stats: { minutes_played: 90, goals: 2, bonus: 2 },
        }],
        ["Watkins", 9, "watkins", {
          positionId: 3,
          position: "FWD",
          stats: { minutes_played: 88, goals: 1, assists: 1 },
        }],
      ]),
      bench: xi(
        [
          ["Mbeumo", 5, undefined, {
            positionId: 2,
            position: "MID",
            stats: { minutes_played: 0 },
          }],
          ["White", 1, undefined, {
            positionId: 1,
            position: "DEF",
            stats: { minutes_played: 12 },
            subNote: "Subbed on · 12′",
          }],
          ["Rice", 2, undefined, {
            positionId: 2,
            position: "MID",
            stats: { minutes_played: 0 },
          }],
        ],
        11,
      ),
    },
    {
      rank: 88,
      owner: "0x8888",
      nickname: "NICO",
      finalPoints: 70,
      prizeAmount: 0,
      claimed: false,
      gwDelta: -2,
      squad: ["Pickford", "Porro", "Saliba", "Ake", "Robertson", "Bellingham", "Bruno", "Foden", "Salah", "Haaland", "João Pedro"],
      xi: xi([
        ["Pickford", 4, "pickford"],
        ["Porro", 3],
        ["Saliba", 5, "gabriel"],
        ["Ake", 4],
        ["Bellingham", 5],
        ["Bruno", 8, "bruno"],
        ["Foden", 6],
        ["Salah", 10],
        ["Haaland", 12, "haaland"],
        ["João Pedro", 6, "joaopedro"],
        ["Isak", 8, "isak"],
      ]),
    },
    {
      rank: 90,
      owner: "0x9090",
      nickname: "TOMMY",
      finalPoints: 68,
      prizeAmount: 0,
      claimed: false,
      gwDelta: -5,
      squad: ["Alisson", "White", "Dias", "Virgil", "Digne", "Mainoo", "Ødegaard", "Szoboszlai", "Diaz", "Son", "Jackson"],
      xi: xi([
        ["Alisson", 6],
        ["White", 4],
        ["Dias", 5],
        ["Virgil", 6],
        ["Mainoo", 5],
        ["Ødegaard", 6],
        ["Szoboszlai", 5, "szoboszlai"],
        ["Diaz", 4],
        ["Son", 7, "son"],
        ["Jackson", 3],
        ["Watkins", 9, "watkins"],
      ]),
    },
    {
      rank: 1000,
      owner: "0x1k00",
      nickname: "DANNY",
      finalPoints: 12,
      prizeAmount: 0,
      claimed: false,
      gwDelta: -40,
      squad: ["Ederson", "Walker", "Timber", "Romero", "Gvardiol", "Gravenberch", "Caicedo", "Eze", "Palmer", "Watkins", "Wissa"],
      xi: xi([
        ["Ederson", 1],
        ["Walker", 0],
        ["Timber", 1],
        ["Romero", 0],
        ["Gravenberch", 2],
        ["Caicedo", 1],
        ["Eze", 2],
        ["Palmer", 2, "palmer"],
        ["Watkins", 2, "watkins"],
        ["Wissa", 1],
        ["Son", 0, "son"],
      ]),
    },
  ],
};

/** Extra scroll depth for the results tablet — keeps hero rows, fills the gaps. */
const SCROLL_NICKS = [
  "ACE", "RIO", "NOVA", "KAI", "REX", "ORB", "ZED", "NYX", "JAX", "VIN",
  "LEO", "ARK", "FOX", "SKIP", "BOW", "REM", "OTTO", "PIN", "CAL", "DEX",
  "HUE", "IVY", "JET", "KOA", "LAN", "MO", "NED", "OAK", "PIP", "QUILL",
] as const;

const FILLER_XI = xi([
  ["Raya", 4],
  ["Saliba", 5],
  ["Virgil", 5],
  ["Colwill", 3],
  ["Salah", 8],
  ["Saka", 6],
  ["Palmer", 5, "palmer"],
  ["Mbeumo", 4],
  ["Haaland", 9, "haaland"],
  ["Watkins", 6, "watkins"],
  ["Bruno", 5, "bruno"],
]);

function fillerRow(rank: number, finalPoints: number, prizeAmount = 0): LabLeaderboardRow {
  const tag = SCROLL_NICKS[(rank - 1) % SCROLL_NICKS.length];
  return {
    rank,
    owner: `0xfill${rank.toString(16).padStart(3, "0")}`,
    nickname: `${tag}${rank}`,
    finalPoints,
    prizeAmount,
    claimed: false,
    gwDelta: ((rank * 3) % 11) - 5,
    squad: [
      "Raya",
      "Saliba",
      "Virgil",
      "Colwill",
      "Salah",
      "Saka",
      "Palmer",
      "Mbeumo",
      "Haaland",
      "Watkins",
      "Bruno",
    ],
    xi: FILLER_XI,
  };
}

function withScrollDepth(core: readonly LabLeaderboardRow[]): LabLeaderboardRow[] {
  const byRank = new Map(core.map((r) => [r.rank, r]));
  const out: LabLeaderboardRow[] = [];

  // Dense top + mid ladder so the board actually scrolls
  for (let rank = 1; rank <= 48; rank++) {
    const existing = byRank.get(rank);
    if (existing) {
      out.push(existing);
      continue;
    }
    const pts = Math.max(40, 86 - rank + ((rank * 5) % 4));
    const prize =
      rank <= 10 ? Math.max(80, Math.round(2000 / rank)) : 0;
    out.push(fillerRow(rank, pts, prize));
  }

  // Pack around "you" (87) so FIND ME / scroll-to-you still has neighbours
  for (let rank = 70; rank <= 110; rank++) {
    if (byRank.has(rank)) {
      out.push(byRank.get(rank)!);
      continue;
    }
    if (out.some((r) => r.rank === rank)) continue;
    const pts = Math.max(28, 78 - (rank - 70) + ((rank * 3) % 5));
    out.push(fillerRow(rank, pts));
  }

  // Keep the last-place punchline
  const last = byRank.get(1000);
  if (last) out.push(last);

  return out.sort((a, b) => a.rank - b.rank);
}

LAB_LEADERBOARD.rows = withScrollDepth(LAB_LEADERBOARD.rows);

export const PRIZE_SPLIT = [
  { rank: 1, pct: "30%" },
  { rank: 2, pct: "20%" },
  { rank: 3, pct: "15%" },
  { rank: 4, pct: "8%" },
  { rank: 5, pct: "7%" },
  { rank: 6, pct: "6%" },
  { rank: 7, pct: "5%" },
  { rank: 8, pct: "4%" },
  { rank: 9, pct: "3%" },
  { rank: 10, pct: "2%" },
] as const;

/** Previous GW board — wall TV cycle partner (informative, not interactive). */
export const LAB_PREV_LEADERBOARD: LabLeaderboardSnapshot = {
  ...LAB_LEADERBOARD,
  gameweek: LAB_LEADERBOARD.gameweek - 1,
  prizePoolLabel: "21,400",
  rows: LAB_LEADERBOARD.rows.map((r, i) => ({
    ...r,
    rank: r.rank === 1000 ? 1000 : Math.max(1, r.rank + (i % 3) - 1),
    finalPoints: Math.max(10, r.finalPoints - 4 + (i % 5)),
    prizeAmount: r.rank <= 5 ? Math.round(r.prizeAmount * 0.85) : 0,
    claimed: r.rank === 1,
    gwDelta: undefined,
  })),
};

/**
 * Season points highlights for the wall (not lifetime USDC — that lands later).
 * Shape matches `/api/season-points` highlights.
 */
export const LAB_SEASON_HIGHLIGHTS: readonly SeasonHighlightRow[] = [
  { rank: 1, owner: "0xaaa1", nickname: "MAG", points: 186, top10: 4, bestRank: 1 },
  { rank: 2, owner: "0xbbb2", nickname: "LUKA", points: 162, top10: 3, bestRank: 1 },
  { rank: 3, owner: "0xeee5", nickname: "KDB10", points: 148, top10: 2, bestRank: 2 },
  { rank: 4, owner: "0xccc3", nickname: "MAX", points: 131, top10: 2, bestRank: 3 },
  { rank: 5, owner: "0xddd4", nickname: "CHICHARITO", points: 118, top10: 1, bestRank: 4 },
  {
    rank: 12,
    owner: "0xyou4",
    nickname: "YOU",
    points: 74,
    top10: 0,
    bestRank: 87,
    isYou: true,
  },
];

/** @deprecated Use LAB_SEASON_HIGHLIGHTS — kept for older shells. */
export type LifetimeEarning = {
  rank: number;
  nickname: string;
  earned: number;
  wins: number;
  isYou?: boolean;
};

/** @deprecated Use LAB_SEASON_HIGHLIGHTS */
export const LAB_LIFETIME_EARNINGS: readonly LifetimeEarning[] = LAB_SEASON_HIGHLIGHTS.map(
  (r) => ({
    rank: r.rank,
    nickname: r.nickname,
    earned: r.points * 40,
    wins: r.top10,
    isYou: r.isYou,
  }),
);
