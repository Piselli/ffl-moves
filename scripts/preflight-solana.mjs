#!/usr/bin/env node
/**
 * Pre-deploy checks for the Solana app config. Reads .env.local (or process.env
 * in CI), then verifies the same values against the chain they point at.
 *
 *   npm run preflight:solana              # asserts mainnet-beta
 *   npm run preflight:solana -- --devnet  # same checks, devnet expectations
 *
 * Written for the runbook in docs/solana-migration/06-runbook.md §9.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Connection, PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddressSync } from "@solana/spl-token";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";
const USDC_DEVNET = "4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU";
/** Ships as the default in constants.ts — never a valid mainnet target. */
const DEVNET_PROGRAM_ID = "A8UiSCd5yzhpZZwmop6k5upLVxUhDZq3x9pq7SfwoKN5";
/** Hot key that deployed devnet; must not hold mainnet upgrade authority. */
const DEVNET_DEPLOYER = "Be2H3uNWxZRCXAoAw31nkgo7S1W5GprmS3a9QT8ZcxHh";
const BPF_UPGRADEABLE_LOADER = "BPFLoaderUpgradeab1e11111111111111111111111";

const devnetMode = process.argv.includes("--devnet");
const expectedCluster = devnetMode ? "devnet" : "mainnet-beta";

function loadDotEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

const env = { ...process.env, ...loadDotEnvLocal() };
const read = (k) => (env[k] ?? "").trim();

let failed = 0;
const ok = (m) => console.log(`✓ ${m}`);
const warn = (m) => console.warn(`⚠️  ${m}`);
const fail = (m) => {
  console.error(`✗ ${m}`);
  failed += 1;
};

function pubkeyOrNull(value) {
  try {
    return new PublicKey(value);
  } catch {
    return null;
  }
}

/** Reads the upgrade authority out of the BPF loader's ProgramData account. */
async function upgradeAuthority(connection, programId) {
  const program = await connection.getAccountInfo(programId);
  if (!program) return { error: "program account not found" };
  if (!program.executable) return { error: "account exists but is not executable" };
  if (program.owner.toBase58() !== BPF_UPGRADEABLE_LOADER) {
    return { error: `owned by ${program.owner.toBase58()}, not the upgradeable loader` };
  }
  // Program account: u32 enum (2) + 32-byte ProgramData address.
  const programData = new PublicKey(program.data.subarray(4, 36));
  const meta = await connection.getAccountInfo(programData);
  if (!meta) return { error: "ProgramData account not found" };
  // ProgramData: u32 enum (3) + u64 slot + 1-byte Option tag + 32-byte authority.
  const hasAuthority = meta.data[12] === 1;
  if (!hasAuthority) return { authority: null, immutable: true };
  return { authority: new PublicKey(meta.data.subarray(13, 45)).toBase58() };
}

/** Config account layout mirrors decodeConfig() in src/lib/chainClient.ts. */
function decodeConfig(data) {
  const body = data.subarray(8);
  const view = new DataView(body.buffer, body.byteOffset, body.byteLength);
  const at = (offset) => new PublicKey(body.subarray(offset, offset + 32)).toBase58();
  const adminCount = body[160];
  return {
    admins: Array.from({ length: 5 }, (_, i) => at(i * 32)).slice(0, adminCount),
    oracle: at(161),
    usdcMint: at(193),
    houseWallet: at(225),
    entryFee: view.getBigUint64(257, true),
    prizePoolBps: view.getUint16(265, true),
    currentGameweek: view.getUint32(267, true),
    paused: body[271] !== 0,
    version: view.getUint16(272, true),
    totalPrizeObligation: view.getBigUint64(274, true),
  };
}

console.log(`Solana preflight — expecting ${expectedCluster}\n`);

if (!fs.existsSync(path.join(root, ".env.local"))) {
  warn("No .env.local — reading process.env only.");
}

// ── Environment ─────────────────────────────────────────────────────────────

const cluster = read("NEXT_PUBLIC_SOLANA_CLUSTER");
if (cluster === expectedCluster) ok(`NEXT_PUBLIC_SOLANA_CLUSTER=${cluster}`);
else if (!cluster && devnetMode) ok("NEXT_PUBLIC_SOLANA_CLUSTER unset — defaults to devnet");
else fail(`NEXT_PUBLIC_SOLANA_CLUSTER must be "${expectedCluster}", got "${cluster || "unset"}"`);

const rpc = read("NEXT_PUBLIC_SOLANA_RPC_URL");
if (!rpc) {
  if (devnetMode) warn("NEXT_PUBLIC_SOLANA_RPC_URL unset — falling back to the public devnet endpoint");
  else fail("NEXT_PUBLIC_SOLANA_RPC_URL is unset. Mainnet needs a paid RPC; the public one rate-limits.");
} else if (!/^https:\/\//i.test(rpc)) {
  fail(`NEXT_PUBLIC_SOLANA_RPC_URL must be https, got "${rpc}"`);
} else {
  if (!devnetMode && /api\.(mainnet-beta|devnet)\.solana\.com/i.test(rpc)) {
    warn("RPC is a public Solana endpoint — it will rate-limit under real traffic.");
  }
  if (!devnetMode && /devnet|testnet/i.test(rpc)) fail(`RPC URL looks like a test cluster: ${rpc}`);
  ok(`RPC set (${rpc.slice(0, 48)}…)`);
}

const programIdRaw = read("NEXT_PUBLIC_MOVEMATCH_PROGRAM_ID") || DEVNET_PROGRAM_ID;
const programId = pubkeyOrNull(programIdRaw);
if (!programId) fail(`NEXT_PUBLIC_MOVEMATCH_PROGRAM_ID is not a valid pubkey: "${programIdRaw}"`);
else if (!devnetMode && programIdRaw === DEVNET_PROGRAM_ID) {
  fail("Program id is still the devnet default. Deploy to mainnet and set NEXT_PUBLIC_MOVEMATCH_PROGRAM_ID.");
} else ok(`Program id ${programIdRaw}`);

const expectedMint = devnetMode ? USDC_DEVNET : USDC_MAINNET;
const mintRaw = read("NEXT_PUBLIC_USDC_MINT") || expectedMint;
if (mintRaw === expectedMint) ok(`USDC mint ${mintRaw}`);
else fail(`NEXT_PUBLIC_USDC_MINT should be ${expectedMint} on ${expectedCluster}, got ${mintRaw}`);

const statsBase = read("NEXT_PUBLIC_STATS_BASE_URL");
if (statsBase) ok(`Stats bucket ${statsBase}`);
else if (devnetMode) warn("NEXT_PUBLIC_STATS_BASE_URL unset — the app will self-host stats from public/data.");
else fail("NEXT_PUBLIC_STATS_BASE_URL is required on mainnet: commit_stats hashes a publicly fetchable file.");

// ── Chain ───────────────────────────────────────────────────────────────────

if (!programId) {
  console.error("\nSkipping chain checks — no usable program id.");
  process.exit(1);
}

const endpoint = rpc || `https://api.${expectedCluster}.solana.com`;
const connection = new Connection(endpoint, "confirmed");

console.log("\nChecking chain state…\n");

try {
  const genesis = await connection.getGenesisHash();
  // Solana's well-known genesis hashes; guards against an RPC that lies in its URL.
  const known = {
    "5eykt4UsFv8P8NJdTREpY1vzqKqZKvdpKuc147dw2N9d": "mainnet-beta",
    "EtWTRABZaYq6iMfeYKouRu166VU2xqa1wcWWoxZ8hPss": "devnet",
  };
  const actual = known[genesis];
  if (actual && actual !== expectedCluster) fail(`RPC is on ${actual}, expected ${expectedCluster}`);
  else ok(`RPC reachable (genesis ${genesis.slice(0, 8)}…)`);
} catch (error) {
  fail(`RPC unreachable: ${error.message}`);
  process.exit(1);
}

const authority = await upgradeAuthority(connection, programId);
if (authority.error) {
  fail(`Program: ${authority.error}`);
} else if (authority.immutable) {
  warn("Program is immutable — upgrade authority was revoked. No further upgrades are possible.");
} else if (!devnetMode && authority.authority === DEVNET_DEPLOYER) {
  fail(`Upgrade authority is still the devnet deployer (${DEVNET_DEPLOYER}). Move it to the multisig.`);
} else {
  ok(`Upgrade authority ${authority.authority}`);
  if (!devnetMode) warn("Confirm by hand that this address is the Squads vault, not a hot key.");
}

const [configPda] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
const configAccount = await connection.getAccountInfo(configPda);

if (!configAccount) {
  fail(`Config PDA ${configPda.toBase58()} does not exist — the program was never initialized.`);
} else {
  const config = decodeConfig(configAccount.data);
  ok(`Config ${configPda.toBase58()}`);

  if (config.usdcMint === mintRaw) ok(`  usdc_mint matches env (${config.usdcMint})`);
  else fail(`  usdc_mint on chain is ${config.usdcMint}, env says ${mintRaw}`);

  if (config.paused) fail("  config.paused is true — registrations and claims are frozen");
  else ok("  not paused");

  if (config.prizePoolBps > 0 && config.prizePoolBps <= 10_000) {
    ok(`  prize_pool_bps ${config.prizePoolBps} (${config.prizePoolBps / 100}% to the pool)`);
  } else fail(`  prize_pool_bps out of range: ${config.prizePoolBps}`);

  ok(`  entry_fee ${Number(config.entryFee) / 1e6} USDC`);
  ok(`  oracle ${config.oracle}`);
  ok(`  admins ${config.admins.join(", ")}`);
  ok(`  outstanding prize obligation ${Number(config.totalPrizeObligation) / 1e6} USDC`);

  if (!devnetMode && config.admins.includes(DEVNET_DEPLOYER)) {
    fail(`  devnet deployer ${DEVNET_DEPLOYER} is an admin on mainnet`);
  }
  if (!devnetMode && config.oracle === DEVNET_DEPLOYER) {
    fail(`  oracle is still the devnet deployer ${DEVNET_DEPLOYER}`);
  }

  const mint = new PublicKey(config.usdcMint);
  const [treasuryPda] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], programId);
  const treasuryAta = getAssociatedTokenAddressSync(mint, treasuryPda, true);
  const houseAta = getAssociatedTokenAddressSync(mint, new PublicKey(config.houseWallet));

  const [treasuryInfo, houseInfo] = await connection.getMultipleAccountsInfo([treasuryAta, houseAta]);

  if (treasuryInfo) {
    const balance = await connection.getTokenAccountBalance(treasuryAta);
    ok(`  treasury ATA ${treasuryAta.toBase58()} — ${balance.value.uiAmountString} USDC`);
    if (Number(balance.value.amount) < Number(config.totalPrizeObligation)) {
      fail("  treasury balance is below the outstanding prize obligation");
    }
  } else fail(`  treasury ATA ${treasuryAta.toBase58()} missing`);

  // register_team debits the house share here but the program never creates it.
  if (houseInfo) ok(`  house ATA ${houseAta.toBase58()}`);
  else fail(`  house ATA ${houseAta.toBase58()} missing — the first registration will fail`);
}

console.log("");
if (failed === 0) {
  console.log("Preflight passed.");
  if (!devnetMode) {
    console.log("Remaining manual gate: a full tour on mainnet — register → settle → claim.");
  }
} else {
  console.error(`Preflight failed: ${failed} problem(s).`);
}

process.exit(failed === 0 ? 0 : 1);
