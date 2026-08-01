import {
  AccountMeta,
  ComputeBudgetProgram,
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import { Buffer } from "buffer";
import { sha256 } from "@noble/hashes/sha2.js";
import { keccak_256 } from "@noble/hashes/sha3.js";
import {
  MOVEMATCH_PROGRAM_ID,
  SOLANA_RPC_URL,
  SOLANA_USDC_MINT,
} from "@/lib/constants";
import {
  buildResultsTree,
  verifyResultProof,
  type ProofNode,
  type ResultLeaf,
} from "@/lib/resultsTree";

const encoder = new TextEncoder();
const PROGRAM_ID = new PublicKey(MOVEMATCH_PROGRAM_ID);
const USDC_MINT = new PublicKey(SOLANA_USDC_MINT);
const TEAM_SIZE = 14;

export type ChainConfig = {
  admins: string[];
  oracle: string;
  usdcMint: string;
  houseWallet: string;
  entryFee: bigint;
  prizePoolBps: number;
  currentGameweek: number;
  paused: boolean;
  version: number;
  totalPrizeObligation: bigint;
  prizePoolPercent: number;
};

export type GameweekSummary = {
  id: number;
  status: "open" | "closed" | "resolved";
  prizePool: bigint;
  totalEntries: number;
  resultsRoot: string | null;
  prizeAllocated: bigint;
  prizeClaimed: bigint;
};

export type UserTeam = {
  playerIds: number[];
  /** UI convention: 0=GK, 1=DEF, 2=MID, 3=FWD. */
  positions: number[];
  playerPositions: number[];
  clubs: number[];
};

export type TeamResult = {
  owner: string;
  rank: number;
  finalPoints: number;
  basePoints: number;
  prizeAmount: bigint;
  claimed: boolean;
  proof?: ResultProofNode[];
  ratingBonus: number;
  titleTriggered: boolean;
  titleMultiplier: number;
  guildTriggered: boolean;
  guildMultiplier: number;
};
export type ResultProofNode = { hash: string; sum: string | number | bigint };

export type StatsCommit = { hash: string; uri: string };
type AccountReader = {
  bytes: Uint8Array;
  offset: number;
  readonly view: DataView;
};

let connection: Connection | undefined;

export function getConnection(): Connection {
  connection ??= new Connection(SOLANA_RPC_URL, "confirmed");
  return connection;
}

function u8(value: number): Uint8Array {
  return Uint8Array.of(value);
}

function u16le(value: number): Uint8Array {
  const data = new Uint8Array(2);
  new DataView(data.buffer).setUint16(0, value, true);
  return data;
}

function u32le(value: number): Uint8Array {
  const data = new Uint8Array(4);
  new DataView(data.buffer).setUint32(0, value, true);
  return data;
}

function u64le(value: bigint): Uint8Array {
  const data = new Uint8Array(8);
  new DataView(data.buffer).setBigUint64(0, value, true);
  return data;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const length = parts.reduce((total, part) => total + part.length, 0);
  const data = new Uint8Array(length);
  let offset = 0;
  for (const part of parts) {
    data.set(part, offset);
    offset += part.length;
  }
  return data;
}

function discriminator(namespace: "global" | "account", name: string): Uint8Array {
  return sha256(encoder.encode(`${namespace}:${name}`)).slice(0, 8);
}

function instructionData(name: string, ...args: Uint8Array[]): Uint8Array {
  return concat(discriminator("global", name), ...args);
}

function ix(name: string, keys: AccountMeta[], ...args: Uint8Array[]): TransactionInstruction {
  return new TransactionInstruction({ programId: PROGRAM_ID, keys, data: Buffer.from(instructionData(name, ...args)) });
}

function meta(address: PublicKey, isSigner = false, isWritable = false): AccountMeta {
  return { pubkey: address, isSigner, isWritable };
}

function key(value: string): PublicKey {
  return new PublicKey(value);
}

function isZero(bytes: Uint8Array): boolean {
  return bytes.every((byte) => byte === 0);
}

function readAccount(data: Uint8Array, expected: string): AccountReader {
  const actual = data.slice(0, 8);
  const wanted = discriminator("account", expected);
  if (actual.length !== wanted.length || actual.some((byte, index) => byte !== wanted[index])) {
    throw new Error(`Unexpected account discriminator for ${expected}`);
  }
  return { bytes: data, offset: 8, view: new DataView(data.buffer, data.byteOffset, data.byteLength) };
}

function readBytes(reader: AccountReader, length: number): Uint8Array {
  const value = reader.bytes.slice(reader.offset, reader.offset + length);
  reader.offset += length;
  return value;
}

function readPubkey(reader: AccountReader): PublicKey {
  return new PublicKey(Buffer.from(readBytes(reader, 32)));
}

function readU8(reader: AccountReader): number {
  const value = reader.view.getUint8(reader.offset);
  reader.offset += 1;
  return value;
}

function readU16(reader: AccountReader): number {
  const value = reader.view.getUint16(reader.offset, true);
  reader.offset += 2;
  return value;
}

function readU32(reader: AccountReader): number {
  const value = reader.view.getUint32(reader.offset, true);
  reader.offset += 4;
  return value;
}

function readU64(reader: AccountReader): bigint {
  const value = reader.view.getBigUint64(reader.offset, true);
  reader.offset += 8;
  return value;
}

function readString(reader: AccountReader): string {
  const length = readU32(reader);
  return new TextDecoder().decode(readBytes(reader, length));
}

function decodeConfig(data: Uint8Array): ChainConfig {
  const reader = readAccount(data, "Config");
  const admins = Array.from({ length: 5 }, () => readPubkey(reader));
  const adminCount = readU8(reader);
  const oracle = readPubkey(reader);
  const usdcMint = readPubkey(reader);
  const houseWallet = readPubkey(reader);
  const entryFee = readU64(reader);
  const prizePoolBps = readU16(reader);
  const currentGameweek = readU32(reader);
  const paused = readU8(reader) !== 0;
  const version = readU16(reader);
  const totalPrizeObligation = readU64(reader);
  readU8(reader);
  readU8(reader);
  return {
    admins: admins.slice(0, adminCount).map(String),
    oracle: String(oracle),
    usdcMint: String(usdcMint),
    houseWallet: String(houseWallet),
    entryFee,
    prizePoolBps,
    currentGameweek,
    paused,
    version,
    totalPrizeObligation,
    prizePoolPercent: prizePoolBps,
  };
}

function decodeGameweek(data: Uint8Array): GameweekSummary {
  const reader = readAccount(data, "Gameweek");
  const id = readU32(reader);
  const state = readU8(reader);
  const prizePool = readU64(reader);
  const totalEntries = readU32(reader);
  const root = readBytes(reader, 32);
  const prizeAllocated = readU64(reader);
  const prizeClaimed = readU64(reader);
  return {
    id,
    status: state === 0 ? "open" : state === 1 ? "closed" : "resolved",
    prizePool,
    totalEntries,
    resultsRoot: isZero(root) ? null : Buffer.from(root).toString("hex"),
    prizeAllocated,
    prizeClaimed,
  };
}

function decodeEntry(data: Uint8Array): UserTeam {
  const reader = readAccount(data, "Entry");
  readPubkey(reader);
  readU32(reader);
  const playerIds = Array.from({ length: TEAM_SIZE }, () => readU32(reader));
  const positions = Array.from({ length: TEAM_SIZE }, () => readU8(reader));
  const clubs = Array.from({ length: TEAM_SIZE }, () => readU16(reader));
  return { playerIds, positions, playerPositions: positions, clubs };
}

function decodeStatsCommit(data: Uint8Array): StatsCommit {
  const reader = readAccount(data, "StatsCommit");
  readU32(reader);
  const hash = readBytes(reader, 32);
  return { hash: Buffer.from(hash).toString("hex"), uri: readString(reader) };
}

export function configPda(): PublicKey {
  return PublicKey.findProgramAddressSync([encoder.encode("config")], PROGRAM_ID)[0];
}

export function treasuryPda(): PublicKey {
  return PublicKey.findProgramAddressSync([encoder.encode("treasury")], PROGRAM_ID)[0];
}

export function gameweekPda(gameweekId: number): PublicKey {
  return PublicKey.findProgramAddressSync([encoder.encode("gw"), u32le(gameweekId)], PROGRAM_ID)[0];
}

export function entryPda(gameweekId: number, owner: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [encoder.encode("entry"), u32le(gameweekId), key(owner).toBytes()],
    PROGRAM_ID,
  )[0];
}

export function claimPda(gameweekId: number, owner: string): PublicKey {
  return PublicKey.findProgramAddressSync(
    [encoder.encode("claim"), u32le(gameweekId), key(owner).toBytes()],
    PROGRAM_ID,
  )[0];
}

export function statsPda(gameweekId: number): PublicKey {
  return PublicKey.findProgramAddressSync([encoder.encode("stats"), u32le(gameweekId)], PROGRAM_ID)[0];
}

export async function getConfig(): Promise<ChainConfig | null> {
  const account = await getConnection().getAccountInfo(configPda());
  return account ? decodeConfig(account.data) : null;
}

export async function isAdmin(address: string): Promise<boolean> {
  const config = await getConfig();
  return config?.admins.includes(address) ?? false;
}

export async function getGameweek(gameweekId: number): Promise<GameweekSummary | null> {
  const account = await getConnection().getAccountInfo(gameweekPda(gameweekId));
  return account ? decodeGameweek(account.data) : null;
}

export async function getUserTeam(owner: string, gameweekId: number): Promise<UserTeam | null> {
  const account = await getConnection().getAccountInfo(entryPda(gameweekId, owner));
  return account ? decodeEntry(account.data) : null;
}

export async function hasRegisteredTeam(owner: string, gameweekId: number): Promise<boolean> {
  return (await getConnection().getAccountInfo(entryPda(gameweekId, owner))) !== null;
}

export async function isPrizeClaimed(owner: string, gameweekId: number): Promise<boolean> {
  return (await getConnection().getAccountInfo(claimPda(gameweekId, owner))) !== null;
}

/**
 * Owners already paid for this gameweek. A `ClaimReceipt` PDA is the only
 * authority on that: it is created by the payout itself and reopening a
 * gameweek after a claim is refused, so it can never go stale.
 */
export async function getClaimedOwners(gameweekId: number, owners: string[]): Promise<string[]> {
  const claimed: string[] = [];
  for (let start = 0; start < owners.length; start += 100) {
    const batch = owners.slice(start, start + 100);
    const accounts = await getConnection().getMultipleAccountsInfo(
      batch.map((owner) => claimPda(gameweekId, owner)),
    );
    batch.forEach((owner, index) => {
      if (accounts[index]) claimed.push(owner);
    });
  }
  return claimed;
}

export async function getStatsCommit(gameweekId: number): Promise<StatsCommit | null> {
  const account = await getConnection().getAccountInfo(statsPda(gameweekId));
  return account ? decodeStatsCommit(account.data) : null;
}

export async function findOpenGameweek(): Promise<GameweekSummary | null> {
  const config = await getConfig();
  if (!config) return null;
  const current = await getGameweek(config.currentGameweek);
  return current?.status === "open" ? current : null;
}

export async function findActiveGameweek(): Promise<GameweekSummary | null> {
  const config = await getConfig();
  return config ? getGameweek(config.currentGameweek) : null;
}

export async function findHighestGameweekId(): Promise<number> {
  return (await getConfig())?.currentGameweek ?? 0;
}

export async function findLatestResolvedGameweekId(highestId: number): Promise<number> {
  for (let id = highestId; id > 0; id -= 1) {
    if ((await getGameweek(id))?.status === "resolved") return id;
  }
  return 0;
}

export async function findLatestUserRegisteredGameweek(owner: string): Promise<number | null> {
  const highest = await findHighestGameweekId();
  for (let id = highest; id > 0; id -= 1) {
    if (await hasRegisteredTeam(owner, id)) return id;
  }
  return null;
}

export async function getGameweekEntrants(gameweekId: number): Promise<string[]> {
  const accounts = await getConnection().getProgramAccounts(PROGRAM_ID, { filters: [{ dataSize: 167 }] });
  return accounts.flatMap(({ account }) => {
    const reader = readAccount(account.data, "Entry");
    const owner = String(readPubkey(reader));
    return readU32(reader) === gameweekId ? [owner] : [];
  });
}

type PublishedResults = { results: TeamResult[] };

async function resultsPayload(gameweekId: number): Promise<PublishedResults | null> {
  const response = await fetch(`/api/results?gameweek=${gameweekId}`);
  if (!response.ok) return null;
  return response.json() as Promise<PublishedResults>;
}

function decodeProof(proof: ResultProofNode[]): ProofNode[] {
  return proof.map((node) => ({
    hash: Buffer.from(node.hash.startsWith("0x") ? node.hash.slice(2) : node.hash, "hex"),
    sum: BigInt(node.sum),
  }));
}

async function verifiedResults(gameweekId: number): Promise<TeamResult[]> {
  const [gameweek, payload] = await Promise.all([getGameweek(gameweekId), resultsPayload(gameweekId)]);
  if (!gameweek?.resultsRoot || !payload) return [];
  const root = Buffer.from(gameweek.resultsRoot, "hex");
  const rows = await Promise.all(payload.results.map(async (row) => ({
    ...row,
    prizeAmount: BigInt(row.prizeAmount),
    claimed: await isPrizeClaimed(row.owner, gameweekId),
    ratingBonus: 0,
    titleTriggered: false,
    titleMultiplier: 0,
    guildTriggered: false,
    guildMultiplier: 0,
  })));
  // A row is only shown once its proof reconstructs the on-chain root *and* the
  // tree pays exactly what the oracle allocated, which is what the program enforces.
  return rows.filter((row) => {
    if (!row.proof) return false;
    const total = verifyResultProof(
      gameweekId,
      { owner: row.owner, rank: row.rank, finalPoints: row.finalPoints, amount: row.prizeAmount },
      decodeProof(row.proof),
      root,
    );
    return total !== null && total === gameweek.prizeAllocated;
  });
}

export async function getGameweekResults(gameweekId: number): Promise<TeamResult[]> {
  return verifiedResults(gameweekId);
}

export async function getTeamResult(owner: string, gameweekId: number): Promise<TeamResult | null> {
  return (await verifiedResults(gameweekId)).find((result) => result.owner === owner) ?? null;
}

export async function getUsdcBalance(owner: string): Promise<bigint> {
  const ata = getAssociatedTokenAddressSync(USDC_MINT, key(owner));
  const balance = await getConnection().getTokenAccountBalance(ata).catch(() => null);
  return balance ? BigInt(balance.value.amount) : BigInt(0);
}

export type OnChainPlayerStats = {
  position: number;
  minutes_played: number;
  goals: number;
  assists: number;
  clean_sheet: boolean;
  saves: number;
  penalties_saved: number;
  penalties_missed: number;
  own_goals: number;
  yellow_cards: number;
  red_cards: number;
  rating: number;
  tackles: number;
  interceptions: number;
  successful_dribbles: number;
  free_kick_goals: number;
  goals_conceded: number;
  bonus: number;
  fpl_clean_sheets: number;
};

async function verifiedStats(gameweekId: number): Promise<Record<number, OnChainPlayerStats>> {
  const commit = await getStatsCommit(gameweekId);
  if (!commit) return {};
  const response = await fetch(commit.uri);
  if (!response.ok) return {};
  const body = await response.arrayBuffer();
  const digest = Buffer.from(keccak_256(new Uint8Array(body))).toString("hex");
  if (digest !== commit.hash) return {};
  const payload = JSON.parse(new TextDecoder().decode(body)) as { players?: Record<string, OnChainPlayerStats> };
  return payload.players ?? {};
}

export async function getPlayerStats(gameweekId: number, playerId: number): Promise<OnChainPlayerStats | null> {
  return (await verifiedStats(gameweekId))[playerId] ?? null;
}

export async function getGameweekStats(
  gameweekId: number,
  playerIds: number[],
): Promise<Record<number, OnChainPlayerStats>> {
  const all = await verifiedStats(gameweekId);
  return playerIds.reduce<Record<number, OnChainPlayerStats>>((stats, id) => {
    if (all[id]) stats[id] = all[id];
    return stats;
  }, {});
}

/** Bracket is intentionally absent from the first Solana devnet deployment. */
export const getBracketChallengeStatus = async (): Promise<number | null> => null;
export const getBracketChallengeEntries = async (): Promise<number | null> => null;
export const hasBracketPrediction = async (_owner?: string): Promise<boolean> => false;
export type BracketPredictionOnChain = {
  groupRanks: number[];
  thirdPlaceOrder: number[];
  knockoutWinners: number[];
  submittedAt: number;
};
export const getBracketPrediction = async (_owner?: string): Promise<BracketPredictionOnChain | null> => null;
export const hasRegisterBracketPredictionOnChain = async (): Promise<boolean> => false;
export const hasAdminSponsorPrizePoolOnChain = async (): Promise<boolean> => true;
export const hasAdminWithdrawPrizeVaultOnChain = async (): Promise<boolean> => true;

/** Titles and guilds were Movement-era; not in Solana v1. */
export const getUserTitle = async (_owner: string) => null;
export const getUserGuild = async (_owner: string) => null;
export const hasTitle = async (_owner: string) => false;
export const hasGuild = async (_owner: string) => false;

export async function buildRegisterTeam(
  owner: string,
  gameweekId: number,
  squad: UserTeam,
): Promise<TransactionInstruction[]> {
  if (squad.playerIds.length !== TEAM_SIZE || squad.positions.length !== TEAM_SIZE || squad.clubs.length !== TEAM_SIZE) {
    throw new Error("A MoveMatch squad must contain exactly 14 players.");
  }
  const ownerKey = key(owner);
  const config = await getConfig();
  if (!config) throw new Error("MoveMatch has not been initialized on this network.");
  const treasury = treasuryPda();
  const ownerAta = getAssociatedTokenAddressSync(USDC_MINT, ownerKey);
  const treasuryAta = getAssociatedTokenAddressSync(USDC_MINT, treasury, true);
  const houseWallet = key(config.houseWallet);
  const houseAta = getAssociatedTokenAddressSync(USDC_MINT, houseWallet);
  const playerIds = concat(...squad.playerIds.map(u32le));
  const positions = Uint8Array.from(squad.positions);
  const clubs = concat(...squad.clubs.map(u16le));
  const register = ix(
    "register_team",
    [
      meta(configPda(), false, true), meta(gameweekPda(gameweekId), false, true), meta(ownerKey, true, true),
      meta(entryPda(gameweekId, owner), false, true), meta(USDC_MINT), meta(ownerAta, false, true),
      meta(treasury), meta(treasuryAta, false, true), meta(houseWallet), meta(houseAta, false, true),
      meta(SystemProgram.programId), meta(TOKEN_PROGRAM_ID),
    ],
    u32le(gameweekId), playerIds, positions, clubs,
  );
  return [
    ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
    createAssociatedTokenAccountIdempotentInstruction(ownerKey, ownerAta, ownerKey, USDC_MINT),
    // The program requires the house token account to exist but never creates it,
    // so without this the first registration on a fresh deployment dead-ends on an
    // opaque AccountNotInitialized. Operators should pre-create it (the migration
    // does) — this only keeps registration from being the thing that discovers it.
    createAssociatedTokenAccountIdempotentInstruction(ownerKey, houseAta, houseWallet, USDC_MINT),
    register,
  ];
}

export async function buildClaimPrize(owner: string, gameweekId: number): Promise<TransactionInstruction[]> {
  const result = await getTeamResult(owner, gameweekId);
  if (!result?.proof) throw new Error("No verified prize proof is available for this wallet.");
  const ownerKey = key(owner);
  const treasury = treasuryPda();
  const ownerAta = getAssociatedTokenAddressSync(USDC_MINT, ownerKey);
  const treasuryAta = getAssociatedTokenAddressSync(USDC_MINT, treasury, true);
  const proof = concat(
    u32le(result.proof.length),
    ...decodeProof(result.proof).map((node) => concat(node.hash, u64le(node.sum))),
  );
  return [
    createAssociatedTokenAccountIdempotentInstruction(ownerKey, ownerAta, ownerKey, USDC_MINT),
    ix(
      "claim_prize",
      [
        meta(configPda(), false, true), meta(gameweekPda(gameweekId), false, true), meta(ownerKey, true, true),
        meta(claimPda(gameweekId, owner), false, true), meta(USDC_MINT), meta(treasury),
        meta(treasuryAta, false, true), meta(ownerAta, false, true), meta(SystemProgram.programId), meta(TOKEN_PROGRAM_ID),
      ],
      u32le(gameweekId), u32le(result.rank), u32le(result.finalPoints), u64le(result.prizeAmount), proof,
    ),
  ];
}

function adminIx(name: string, admin: string, ...args: Uint8Array[]): TransactionInstruction {
  return ix(name, [meta(configPda(), false, true), meta(key(admin), true, name !== "set_oracle")], ...args);
}

export async function buildCreateGameweek(admin: string, gameweekId: number): Promise<TransactionInstruction[]> {
  return [ix("create_gameweek", [meta(configPda(), false, true), meta(key(admin), true, true), meta(gameweekPda(gameweekId), false, true), meta(SystemProgram.programId)], u32le(gameweekId))];
}
export async function buildCloseGameweek(admin: string, gameweekId: number): Promise<TransactionInstruction[]> {
  return [ix("close_gameweek", [meta(configPda(), false, true), meta(key(admin), true), meta(gameweekPda(gameweekId), false, true)])];
}
export async function buildReopenGameweek(admin: string, gameweekId: number): Promise<TransactionInstruction[]> {
  return [ix("reopen_gameweek", [meta(configPda(), false, true), meta(key(admin), true), meta(gameweekPda(gameweekId), false, true)])];
}
export async function buildSetFees(admin: string, entryFee: bigint): Promise<TransactionInstruction[]> {
  return [adminIx("set_fees", admin, u64le(entryFee))];
}
export async function buildSetPrizePoolBps(admin: string, bps: number): Promise<TransactionInstruction[]> {
  return [adminIx("set_prize_pool_bps", admin, u16le(bps))];
}
export async function buildSetPaused(admin: string, paused: boolean): Promise<TransactionInstruction[]> {
  return [adminIx("set_paused", admin, u8(paused ? 1 : 0))];
}

/** Frees the slice of the pool no winner was allocated, so treasury is not held forever. */
export async function buildReleaseUnallocated(admin: string, gameweekId: number): Promise<TransactionInstruction[]> {
  return [ix("release_unallocated", [
    meta(configPda(), false, true), meta(key(admin), true), meta(gameweekPda(gameweekId), false, true),
  ])];
}

export async function buildSponsorPrizePool(
  admin: string,
  gameweekId: number,
  amount: bigint,
): Promise<TransactionInstruction[]> {
  const adminKey = key(admin);
  const treasury = treasuryPda();
  return [ix(
    "sponsor_prize_pool",
    [
      meta(configPda(), false, true), meta(adminKey, true), meta(adminKey, true, true),
      meta(gameweekPda(gameweekId), false, true), meta(USDC_MINT),
      meta(getAssociatedTokenAddressSync(USDC_MINT, adminKey), false, true),
      meta(treasury), meta(getAssociatedTokenAddressSync(USDC_MINT, treasury, true), false, true),
      meta(TOKEN_PROGRAM_ID),
    ],
    u64le(amount),
  )];
}

export async function buildWithdrawTreasury(
  admin: string,
  recipient: string,
  amount: bigint,
): Promise<TransactionInstruction[]> {
  const treasury = treasuryPda();
  return [ix(
    "withdraw_treasury",
    [
      meta(configPda()), meta(key(admin), true), meta(USDC_MINT), meta(treasury),
      meta(getAssociatedTokenAddressSync(USDC_MINT, treasury, true), false, true),
      meta(getAssociatedTokenAddressSync(USDC_MINT, key(recipient)), false, true),
      meta(TOKEN_PROGRAM_ID),
    ],
    u64le(amount),
  )];
}

function borshString(value: string): Uint8Array {
  const bytes = encoder.encode(value);
  return concat(u32le(bytes.length), bytes);
}

/** Commits the keccak digest of the published stats JSON plus where to fetch it. */
export async function buildCommitStats(
  oracle: string,
  gameweekId: number,
  statsJson: string,
  uri: string,
): Promise<TransactionInstruction[]> {
  return [ix(
    "commit_stats",
    [
      meta(configPda()), meta(key(oracle), true, true), meta(gameweekPda(gameweekId)),
      meta(statsPda(gameweekId), false, true), meta(SystemProgram.programId),
    ],
    keccak_256(encoder.encode(statsJson)), borshString(uri),
  )];
}

export type SettlementRow = { owner: string; rank: number; finalPoints: number; amount: bigint };

/**
 * Publishes the settlement root. Returns the instruction plus the proofs the
 * oracle must upload, since the program can only verify what the tree commits to.
 */
export async function buildPublishResults(
  oracle: string,
  gameweekId: number,
  rows: SettlementRow[],
  totalEntries: number,
): Promise<{ instructions: TransactionInstruction[]; root: string; total: bigint; proofs: ProofNode[][] }> {
  const leaves: ResultLeaf[] = rows.map((row) => ({
    owner: row.owner,
    rank: row.rank,
    finalPoints: row.finalPoints,
    amount: row.amount,
  }));
  const tree = buildResultsTree(gameweekId, leaves);
  const instruction = ix(
    "publish_results",
    [meta(configPda()), meta(key(oracle), true), meta(gameweekPda(gameweekId), false, true)],
    tree.root, u32le(totalEntries), u64le(tree.total),
  );
  return {
    instructions: [instruction],
    root: tree.root.toString("hex"),
    total: tree.total,
    proofs: tree.proofs,
  };
}
