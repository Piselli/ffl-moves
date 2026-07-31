/**
 * Phase 4 compatibility facade. New modules import `chainClient` directly;
 * legacy page shapes remain numeric until their presentation code is migrated.
 */
import * as solana from "@/lib/chainClient";

export type ChainConfig = Omit<solana.ChainConfig, "entryFee" | "titleFee" | "guildFee" | "totalPrizeObligation"> & {
  entryFee: number;
  titleFee: number;
  guildFee: number;
  totalPrizeObligation: number;
};
export type GameweekSummary = Omit<solana.GameweekSummary, "prizePool" | "prizeAllocated" | "prizeClaimed"> & {
  prizePool: number;
  prizeAllocated: number;
  prizeClaimed: number;
};
export type OnChainPlayerStats = solana.OnChainPlayerStats;

export async function getConfig(): Promise<ChainConfig | null> {
  const config = await solana.getConfig();
  return config && {
    ...config,
    entryFee: Number(config.entryFee),
    titleFee: Number(config.titleFee),
    guildFee: Number(config.guildFee),
    totalPrizeObligation: Number(config.totalPrizeObligation),
  };
}
export const isAdmin = solana.isAdmin;
export async function getGameweek(id: number): Promise<GameweekSummary | null> {
  const gameweek = await solana.getGameweek(id);
  return gameweek && {
    ...gameweek,
    prizePool: Number(gameweek.prizePool),
    prizeAllocated: Number(gameweek.prizeAllocated),
    prizeClaimed: Number(gameweek.prizeClaimed),
  };
}
export const findHighestGameweekIdOnChain = async (_?: ChainConfig | null) => solana.findHighestGameweekId();
export const findLatestResolvedGameweekId = solana.findLatestResolvedGameweekId;
export const findLatestUserRegisteredGameweek = solana.findLatestUserRegisteredGameweek;
export const findOpenGameweekFromChain = async (_?: ChainConfig | null) => {
  const config = await solana.getConfig();
  return config ? getGameweek(config.currentGameweek) : null;
};
export const findActiveGameweekFromChain = findOpenGameweekFromChain;
export const hasRegisteredTeam = solana.hasRegisteredTeam;
export async function getUserTeam(owner: string, gameweekId: number) {
  const team = await solana.getUserTeam(owner, gameweekId);
  return team && { playerIds: team.playerIds, playerPositions: team.positions, clubs: team.clubs };
}
export const getGameweekTeams = solana.getGameweekEntrants;
export const getPlayerStats = solana.getPlayerStats;
export const getGameweekStats = solana.getGameweekStats;
export async function getTeamResult(owner: string, gameweekId: number) {
  const result = await solana.getTeamResult(owner, gameweekId);
  return result && {
    ...result,
    prizeAmount: Number(result.prizeAmount),
  };
}

export const getBracketChallengeStatus = async (): Promise<number | null> => null;
export const getBracketChallengeEntries = async (): Promise<number | null> => null;
export const hasBracketPrediction = async (_owner: string): Promise<boolean> => false;
export const getBracketPrediction = async (_owner: string): Promise<{
  groupRanks: number[]; thirdPlaceOrder: number[]; knockoutWinners: number[]; submittedAt: number;
} | null> => null;
export const hasRegisterBracketPredictionOnChain = async () => false;
export const hasAdminSponsorPrizePoolOnChain = async () => true;
export const hasAdminMarkPrizeClaimedOnChain = async () => false;
export const hasAdminWithdrawPrizeVaultOnChain = async () => true;
export const hasAdminWithdrawLegacyMoveFromVaultOnChain = async () => false;
export const getEntryFeeAssetOnChain = async () => ({ asset: 1, usdcMetadata: "" });
export const getUserTitle = async (_owner: string) => null;
export const getUserGuild = async (_owner: string) => null;
export const hasTitle = async (_owner: string) => false;
export const hasGuild = async (_owner: string) => false;

/** Temporary guard while write pages move to chainClient `build*` APIs. */
const removed = () => { throw new Error("Movement transactions have been removed. Use chainClient."); };
export const client: any = { transaction: { build: { simple: removed }, submit: { simple: removed } }, waitForTransaction: removed };
export const moduleFunction = (name: string): never => { throw new Error(`Movement entry ${name} is unavailable on Solana.`); };
