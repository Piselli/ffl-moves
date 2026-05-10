import { Network } from "@aptos-labs/ts-sdk";

/** Movement uses a custom fullnode; `Network` enum is from the compatible TS SDK. */
export const NETWORK = Network.CUSTOM;

/** Dev fallback — production must set NEXT_PUBLIC_* (see .env.example). */
const DEFAULT_MOVEMENT_RPC = "https://testnet.movementnetwork.xyz/v1";
/** Dev fallback package address — override on mainnet via env. */
/** Documented package account; override with NEXT_PUBLIC_MODULE_ADDRESS in env. */
const DEFAULT_MODULE_ADDRESS =
  "0xf598f059a0353b0d9ea80c9fd9d1c3e15b71ff4535388dd79acf813b567c5b47";

/** Trims; returns undefined if missing/blank (so ?? fallback works). */
function publicEnv(s: string | undefined): string | undefined {
  if (s == null) return undefined;
  const t = s.trim();
  return t.length > 0 ? t : undefined;
}

/**
 * Movement fullnode REST base (must end with /v1 for these defaults).
 * Docs: https://docs.movementnetwork.xyz/devs/networkEndpoints
 * Testnet chain ID 250; Mainnet chain ID 126 (SDK uses Network.CUSTOM + this URL).
 *
 * IMPORTANT: use only direct `process.env.NEXT_PUBLIC_*` reads (no `process.env[key]`).
 * Otherwise the client bundle cannot inline values from `.env.local` / next.config and
 * SSR briefly shows correct env while hydration falls back to defaults (flicker).
 */
export const MOVEMENT_RPC_URL =
  publicEnv(process.env.NEXT_PUBLIC_MOVEMENT_RPC_URL) ??
  publicEnv(process.env.NEXT_PUBLIC_APTOS_API) ??
  DEFAULT_MOVEMENT_RPC;

/** @deprecated use MOVEMENT_RPC_URL — kept for older imports */
export const MOVEMENT_TESTNET_URL = MOVEMENT_RPC_URL;

/** Published package account (module lives at MODULE_NAME under this address). */
export const MODULE_ADDRESS =
  publicEnv(process.env.NEXT_PUBLIC_MODULE_ADDRESS) ?? DEFAULT_MODULE_ADDRESS;

export const MODULE_NAME = publicEnv(process.env.NEXT_PUBLIC_MODULE_NAME) ?? "fantasy_epl";

// Entry fee in MOVE (for display / docs; on-chain value comes from contract config)
export const ENTRY_FEE_MOVE = 300;

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
