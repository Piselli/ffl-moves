export type LabSquadPlayer = {
  name: string;
  pts: number;
  /** Optional cast portrait under /design-lab/locker-hero/cast/ */
  cast?: string;
  /** Live FPL / catalog photo URL */
  photo?: string;
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
  /** Formation order: GK, DEF×3–4, MID, FWD — used by team-sheet pitch */
  xi?: readonly LabSquadPlayer[];
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

function xi(
  players: Array<[string, number, string?]>,
): LabSquadPlayer[] {
  return players.map(([name, pts, cast]) => ({
    name,
    pts,
    cast: cast ? `${CAST}/${cast}.png` : undefined,
  }));
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
      finalPoints: 71,
      prizeAmount: 124,
      claimed: false,
      isYou: true,
      gwDelta: 14,
      squad: ["Raya", "Shaw", "Van Dijk", "Colwill", "Salah", "Saka", "Palmer", "Mbeumo", "Haaland", "Watkins", "Bruno"],
      xi: xi([
        ["Raya", 5],
        ["Shaw", 6],
        ["Van Dijk", 6],
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
