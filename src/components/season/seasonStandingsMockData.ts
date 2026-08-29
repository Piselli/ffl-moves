import { CURRENT_SEASON, type GwSeasonPointSlice } from "@/lib/season-points-rules";
import type { SeasonLeaderboardEntry, SeasonLeaderboardPayload } from "@/lib/seasonPoints";

/** Demo «you» row — stable for Find me / neighborhood previews */
export const DEMO_YOU_OWNER = "0xdemo0000000000000000000000000000000000000001";

const DEMO_NICKNAMES: Record<string, string> = {
  "0xmock0000000000000000000000000000000000000001": "MAG",
  "0xmock0000000000000000000000000000000000000002": "LUKA",
  "0xmock0000000000000000000000000000000000000003": "KDB10",
  "0xmock0000000000000000000000000000000000000004": "MAX",
  "0xmock0000000000000000000000000000000000000005": "CHICHARITO",
  "0xmock0000000000000000000000000000000000000006": "SALAHFC",
  "0xmock0000000000000000000000000000000000000007": "HAALAND",
  "0xmock0000000000000000000000000000000000000008": "SONNY",
  "0xmock0000000000000000000000000000000000000009": "RICE",
  "0xmock000000000000000000000000000000000000000a": "WATKINS",
  "0xmock000000000000000000000000000000000000000b": "BRUNO",
  [DEMO_YOU_OWNER]: "YOU",
  "0xmock000000000000000000000000000000000000000c": "TAA",
  "0xmock000000000000000000000000000000000000000d": "ISAK",
  "0xmock000000000000000000000000000000000000000e": "PALMER",
  "0xmock000000000000000000000000000000000000000f": "SAKA",
  "0xmock0000000000000000000000000000000000000010": "GORDON",
  "0xmock0000000000000000000000000000000000000011": "WISSA",
  "0xmock0000000000000000000000000000000000000012": "MUNOZ",
};

type MockRowSpec = {
  owner: string;
  rank: number;
  totalPoints: number;
  registrations: number;
  top10Finishes: number;
  bestRank: number;
  maxStreak: number;
  /** Per-event totals (GW / tour ids 901–908 in demo) */
  eventTotals: number[];
  rankWins?: (number | undefined)[];
  firstReg?: boolean;
  claimGw?: number;
};

function demoSlice(
  gameweekId: number,
  total: number,
  opts: {
    rank?: number;
    streakLength?: number;
    first?: boolean;
    claim?: boolean;
  } = {},
): GwSeasonPointSlice {
  const registered = total > 0 || opts.first;
  if (!registered) {
    return {
      gameweekId,
      registered: false,
      rank: 0,
      claimed: false,
      streakLength: 0,
      registration: 0,
      rankPoints: 0,
      streak: 0,
      claim: 0,
      firstRegistration: 0,
      total: 0,
    };
  }
  const registration = 25;
  const firstRegistration = opts.first ? 50 : 0;
  const rankPoints = opts.rank ? rankPointsForPlace(opts.rank) : 0;
  const streak = opts.streakLength && opts.streakLength >= 2 ? streakForLen(opts.streakLength) : 0;
  const claim = opts.claim ? 10 : 0;
  return {
    gameweekId,
    registered: true,
    rank: opts.rank ?? 0,
    claimed: !!opts.claim,
    streakLength: opts.streakLength ?? 0,
    registration,
    rankPoints,
    streak,
    claim,
    firstRegistration,
    total: registration + firstRegistration + rankPoints + streak + claim,
  };
}

function rankPointsForPlace(rank: number): number {
  const map: Record<number, number> = { 1: 200, 2: 150, 3: 120, 4: 100, 5: 85, 6: 70, 7: 55, 8: 45, 9: 35, 10: 25 };
  return map[rank] ?? 0;
}

function streakForLen(len: number): number {
  if (len >= 4) return 20;
  if (len === 3) return 15;
  if (len === 2) return 10;
  return 0;
}

const DEMO_EVENT_IDS = [1, 2, 3, 4, 5, 6, 7, 8];

function buildBreakdown(spec: MockRowSpec): GwSeasonPointSlice[] {
  return DEMO_EVENT_IDS.map((gw, i) => {
    const total = spec.eventTotals[i] ?? 0;
    if (total <= 0) return demoSlice(gw, 0);
    const rank = spec.rankWins?.[i];
    const streakLength = Math.min(spec.maxStreak, i + 1);
    return demoSlice(gw, total, {
      rank,
      streakLength: streakLength >= 2 ? streakLength : undefined,
      first: spec.firstReg && i === 0,
      claim: spec.claimGw === gw,
    });
  });
}

function toEntry(spec: MockRowSpec): SeasonLeaderboardEntry {
  const breakdown = buildBreakdown(spec);
  return {
    owner: spec.owner,
    rank: spec.rank,
    totalPoints: spec.totalPoints,
    registrations: spec.registrations,
    top10Finishes: spec.top10Finishes,
    bestRank: spec.bestRank,
    maxStreak: spec.maxStreak,
    currentStreak: spec.maxStreak,
    breakdown,
  };
}

const MOCK_SPECS: MockRowSpec[] = [
  {
    owner: "0xmock0000000000000000000000000000000000000001",
    rank: 1,
    totalPoints: 842,
    registrations: 8,
    top10Finishes: 6,
    bestRank: 1,
    maxStreak: 8,
    firstReg: true,
    claimGw: 7,
    eventTotals: [75, 45, 220, 45, 35, 195, 45, 182],
    rankWins: [undefined, undefined, 1, undefined, undefined, 2, undefined, 3],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000002",
    rank: 2,
    totalPoints: 798,
    registrations: 8,
    top10Finishes: 5,
    bestRank: 1,
    maxStreak: 8,
    firstReg: true,
    eventTotals: [75, 45, 200, 45, 170, 45, 45, 173],
    rankWins: [undefined, undefined, 1, undefined, 4, undefined, undefined, undefined],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000003",
    rank: 3,
    totalPoints: 756,
    registrations: 8,
    top10Finishes: 5,
    bestRank: 2,
    maxStreak: 7,
    firstReg: true,
    eventTotals: [75, 45, 170, 45, 45, 150, 45, 181],
    rankWins: [undefined, undefined, 2, undefined, undefined, undefined, undefined, 1],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000004",
    rank: 4,
    totalPoints: 612,
    registrations: 8,
    top10Finishes: 4,
    bestRank: 3,
    maxStreak: 8,
    eventTotals: [75, 45, 45, 120, 45, 45, 85, 152],
    rankWins: [undefined, undefined, undefined, 3, undefined, undefined, 5, undefined],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000005",
    rank: 5,
    totalPoints: 584,
    registrations: 8,
    top10Finishes: 3,
    bestRank: 4,
    maxStreak: 6,
    eventTotals: [75, 45, 45, 45, 100, 45, 45, 184],
    rankWins: [undefined, undefined, undefined, undefined, 4, undefined, undefined, undefined],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000006",
    rank: 6,
    totalPoints: 521,
    registrations: 8,
    top10Finishes: 2,
    bestRank: 5,
    maxStreak: 5,
    eventTotals: [75, 45, 45, 45, 45, 85, 45, 136],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000007",
    rank: 7,
    totalPoints: 498,
    registrations: 8,
    top10Finishes: 2,
    bestRank: 6,
    maxStreak: 4,
    eventTotals: [75, 45, 45, 45, 70, 45, 45, 128],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000008",
    rank: 8,
    totalPoints: 467,
    registrations: 7,
    top10Finishes: 1,
    bestRank: 8,
    maxStreak: 4,
    eventTotals: [75, 45, 45, 45, 55, 45, 45, 0],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000009",
    rank: 9,
    totalPoints: 445,
    registrations: 7,
    top10Finishes: 1,
    bestRank: 9,
    maxStreak: 3,
    eventTotals: [75, 45, 45, 35, 45, 45, 45, 0],
  },
  {
    owner: "0xmock000000000000000000000000000000000000000a",
    rank: 10,
    totalPoints: 428,
    registrations: 7,
    top10Finishes: 1,
    bestRank: 10,
    maxStreak: 3,
    eventTotals: [75, 45, 45, 25, 45, 45, 45, 0],
    rankWins: [undefined, undefined, undefined, undefined, undefined, undefined, undefined, 10],
  },
  {
    owner: "0xmock000000000000000000000000000000000000000b",
    rank: 11,
    totalPoints: 401,
    registrations: 7,
    top10Finishes: 0,
    bestRank: 14,
    maxStreak: 4,
    eventTotals: [75, 45, 45, 45, 45, 45, 45, 0],
  },
  {
    owner: DEMO_YOU_OWNER,
    rank: 12,
    totalPoints: 384,
    registrations: 7,
    top10Finishes: 1,
    bestRank: 7,
    maxStreak: 4,
    firstReg: true,
    claimGw: 7,
    eventTotals: [75, 45, 45, 45, 55, 45, 45, 29],
    rankWins: [undefined, undefined, undefined, undefined, 7, undefined, undefined, undefined],
  },
  {
    owner: "0xmock000000000000000000000000000000000000000c",
    rank: 13,
    totalPoints: 362,
    registrations: 6,
    top10Finishes: 0,
    bestRank: 18,
    maxStreak: 3,
    eventTotals: [75, 45, 45, 45, 45, 45, 0, 0],
  },
  {
    owner: "0xmock000000000000000000000000000000000000000d",
    rank: 14,
    totalPoints: 340,
    registrations: 6,
    top10Finishes: 0,
    bestRank: 22,
    maxStreak: 2,
    eventTotals: [75, 45, 45, 45, 45, 0, 0, 0],
  },
  {
    owner: "0xmock000000000000000000000000000000000000000e",
    rank: 15,
    totalPoints: 318,
    registrations: 6,
    top10Finishes: 0,
    bestRank: 31,
    maxStreak: 2,
    eventTotals: [75, 45, 45, 45, 0, 0, 0, 0],
  },
  {
    owner: "0xmock000000000000000000000000000000000000000f",
    rank: 16,
    totalPoints: 295,
    registrations: 5,
    top10Finishes: 0,
    bestRank: 44,
    maxStreak: 2,
    eventTotals: [75, 45, 45, 0, 0, 0, 0, 0],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000010",
    rank: 17,
    totalPoints: 245,
    registrations: 4,
    top10Finishes: 0,
    bestRank: 67,
    maxStreak: 2,
    eventTotals: [75, 45, 0, 0, 0, 0, 0, 0],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000011",
    rank: 18,
    totalPoints: 198,
    registrations: 3,
    top10Finishes: 0,
    bestRank: 91,
    maxStreak: 1,
    eventTotals: [75, 45, 0, 0, 0, 0, 0, 0],
  },
  {
    owner: "0xmock0000000000000000000000000000000000000012",
    rank: 19,
    totalPoints: 125,
    registrations: 2,
    top10Finishes: 0,
    bestRank: 112,
    maxStreak: 1,
    eventTotals: [75, 0, 0, 0, 0, 0, 0, 0],
  },
];

export function demoDisplayName(owner: string): string {
  return DEMO_NICKNAMES[owner] ?? owner.slice(0, 6);
}

export function buildDemoSeasonPayload(): SeasonLeaderboardPayload {
  return {
    seasonId: CURRENT_SEASON.id,
    seasonLabel: CURRENT_SEASON.label,
    rulesVersion: 1,
    active: true,
    status: "live",
    eventIds: DEMO_EVENT_IDS,
    wcTourIds: CURRENT_SEASON.wcTourIds,
    resolvedWcTourCount: 0,
    eplStartGw: 1,
    eplEndGw: 0,
    resolvedEplThroughGw: 8,
    startGw: 1,
    endGw: 0,
    resolvedThroughGw: 8,
    generatedAt: new Date().toISOString(),
    entries: MOCK_SPECS.map(toEntry),
  };
}

export function shouldUseDemoSeason(data: SeasonLeaderboardPayload | null): boolean {
  if (!data) return true;
  return data.entries.length === 0;
}

export function resolveSeasonPayload(
  data: SeasonLeaderboardPayload | null,
): { payload: SeasonLeaderboardPayload; isDemo: boolean } {
  if (data && data.entries.length > 0) {
    return { payload: data, isDemo: false };
  }
  return { payload: buildDemoSeasonPayload(), isDemo: true };
}

export function resolveDemoWallet(wallet: string | null, isDemo: boolean): string | null {
  if (isDemo) return DEMO_YOU_OWNER;
  return wallet;
}
