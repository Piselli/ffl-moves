import { Network } from "@aptos-labs/ts-sdk";

/** Movement uses CUSTOM + explicit fullnode in Aptos TS SDK. */
export const NETWORK = Network.CUSTOM;

const DEFAULT_MOVEMENT_RPC = "https://testnet.movementnetwork.xyz/v1";
const DEFAULT_MODULE_ADDRESS =
  "0xc9f5444ab989c2a7ef73b1eab58b66947c4c5788e25d997d649c7d6ddfbeb5a1";

function envStr(key: string, fallback: string): string {
  if (typeof process !== "undefined" && process.env[key]) {
    const v = process.env[key]!.trim();
    if (v.length > 0) return v;
  }
  return fallback;
}

/**
 * Movement fullnode REST base (v1). For mainnet set e.g.
 * NEXT_PUBLIC_MOVEMENT_RPC_URL=https://mainnet.movementnetwork.xyz/v1
 * (confirm URL in official Movement docs — endpoint may change).
 */
export const MOVEMENT_RPC_URL = envStr(
  "NEXT_PUBLIC_MOVEMENT_RPC_URL",
  envStr("NEXT_PUBLIC_APTOS_API", DEFAULT_MOVEMENT_RPC),
);

/** @deprecated use MOVEMENT_RPC_URL — kept for older imports */
export const MOVEMENT_TESTNET_URL = MOVEMENT_RPC_URL;

/** Published package account (module lives at MODULE_NAME under this address). */
export const MODULE_ADDRESS = envStr("NEXT_PUBLIC_MODULE_ADDRESS", DEFAULT_MODULE_ADDRESS);

export const MODULE_NAME = envStr("NEXT_PUBLIC_MODULE_NAME", "fantasy_epl");

// Entry fee in MOVE (for display)
export const ENTRY_FEE_MOVE = 1;

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
