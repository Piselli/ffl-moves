import { clusterApiUrl } from "@solana/web3.js";

/** Trims; returns undefined if missing/blank (so ?? fallback works). */
function publicEnv(s: string | undefined): string | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

/** Squad registration entry fee in USDC (on-chain: 5_000_000 micro-units). */
export const ENTRY_FEE_USDC = 5;

/** First gameweek shown in leaderboard UI (earlier weeks were test / internal). */
export const MIN_PUBLIC_LEADERBOARD_GW = 35;

// Title types
export const TITLE_TYPES = {
  0: { name: "Tackles Master", category: "Defensive", description: "Your player has most tackles + interceptions" },
  1: { name: "Penalty Box Wall", category: "Defensive", description: "Your GK has most saves/clean sheets" },
  2: { name: "Free-Kick Specialist", category: "Attacking", description: "Your player scores from a free kick" },
  3: { name: "Team Striker", category: "Attacking", description: "Your team scores 3+ goals combined" },
  4: { name: "Dribble King", category: "Attacking", description: "Your player has most successful dribbles" },
} as const;

// Multiplier display
export const MULTIPLIER_DISPLAY = {
  500: "5%",
  1000: "10%",
  1500: "15%",
} as const;

// Positions
export const POSITIONS = {
  GK: 0,
  DEF: 1,
  MID: 2,
  FWD: 3,
} as const;

export const POSITION_NAMES = {
  0: "GK",
  1: "DEF",
  2: "MID",
  3: "FWD",
} as const;

// Formation requirements (4-3-3)
export const FORMATION = {
  GK: 1,
  DEF: 4,
  MID: 3,
  FWD: 3,
  BENCH: 3,
  TOTAL: 14,
} as const;

// Max players per club
export const MAX_PER_CLUB = 3;

/** Official X (Twitter) profile — news and announcements. */
export const SOCIAL_X_URL = "https://x.com/MoveMatchxyz";
export const SOCIAL_X_HANDLE = "@MoveMatchxyz";

/** Official Telegram channel — questions, bugs, support. */
export const SOCIAL_TG_URL = "https://t.me/movematch";
export const SOCIAL_TG_HANDLE = "@movematch";

/** Solana deployment settings. Only public values belong in NEXT_PUBLIC_* variables. */
export const SOLANA_CLUSTER =
  publicEnv(process.env.NEXT_PUBLIC_SOLANA_CLUSTER) === "mainnet-beta"
    ? "mainnet-beta"
    : "devnet";

export const SOLANA_RPC_URL =
  publicEnv(process.env.NEXT_PUBLIC_SOLANA_RPC_URL) ?? clusterApiUrl(SOLANA_CLUSTER);

export const MOVEMATCH_PROGRAM_ID =
  publicEnv(process.env.NEXT_PUBLIC_MOVEMATCH_PROGRAM_ID) ??
  "A8UiSCd5yzhpZZwmop6k5upLVxUhDZq3x9pq7SfwoKN5";

/** Circle's canonical six-decimal USDC mint on Solana devnet. */
export const SOLANA_USDC_MINT =
  publicEnv(process.env.NEXT_PUBLIC_USDC_MINT) ??
  (SOLANA_CLUSTER === "mainnet-beta"
    ? "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
    : "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");

export const USDC_DECIMALS = 6;

/**
 * Public bucket the oracle uploads committed stats to. It is public on purpose:
 * `StatsCommit` stores the hash of these bytes, so anyone can re-verify them.
 * Unset means the app serves the files itself from `public/data`.
 */
export const STATS_PUBLISH_BASE_URL = publicEnv(process.env.NEXT_PUBLIC_STATS_BASE_URL);

/** Paths the app serves oracle files from when no external bucket is configured. */
export const SELF_HOSTED_STATS_PATH = "/data/stats";
export const SELF_HOSTED_RESULTS_PATH = "/data/results";
