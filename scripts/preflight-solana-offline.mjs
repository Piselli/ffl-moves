#!/usr/bin/env node
/**
 * Local, zero-cost checks before a mainnet deploy. No RPC, no SOL.
 *
 *   npm run preflight:solana:offline
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Keypair, PublicKey } from "@solana/web3.js";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const keysDir = path.join(root, "solana/movematch/.keys");
const libRs = path.join(root, "solana/movematch/programs/movematch/src/lib.rs");
const anchorToml = path.join(root, "solana/movematch/Anchor.toml");
const initMainnet = path.join(root, "solana/movematch/migrations/initialize-mainnet.mjs");
const soPath = path.join(root, "solana/movematch/target/deploy/movematch.so");

const EXPECTED_PROGRAM_ID = "A8UiSCd5yzhpZZwmop6k5upLVxUhDZq3x9pq7SfwoKN5";
const EXPECTED_INITIALIZER = "CJKNFKKfvvYotke7EjYbKNAP1YWy8f4DBcxRFna1no57";
const USDC_MAINNET = "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v";

let failed = 0;
const ok = (m) => console.log(`✓ ${m}`);
const warn = (m) => console.warn(`⚠️  ${m}`);
const fail = (m) => {
  console.error(`✗ ${m}`);
  failed += 1;
};

function read(p) {
  return fs.readFileSync(p, "utf8");
}

function pubkeyFromKeyfile(name) {
  const p = path.join(keysDir, name);
  if (!fs.existsSync(p)) return null;
  try {
    return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(read(p)))).publicKey.toBase58();
  } catch {
    return null;
  }
}

console.log("MoveMatch offline preflight (no RPC, no spend)\n");

const rust = read(libRs);
const declare = rust.match(/declare_id!\("([^"]+)"\)/);
const initializerConst = rust.match(/const INITIALIZER: Pubkey = pubkey!\("([^"]+)"\)/);
const allows343 = /defenders == 3 && midfielders == 4/.test(rust);
const allows433 = /defenders == 4 && midfielders == 3/.test(rust);

if (declare?.[1] === EXPECTED_PROGRAM_ID) ok(`declare_id! ${EXPECTED_PROGRAM_ID}`);
else fail(`declare_id! is ${declare?.[1] ?? "missing"}, expected ${EXPECTED_PROGRAM_ID}`);

if (initializerConst?.[1] === EXPECTED_INITIALIZER) {
  ok(`INITIALIZER ${EXPECTED_INITIALIZER}`);
} else {
  fail(`INITIALIZER is ${initializerConst?.[1] ?? "missing"}, expected ${EXPECTED_INITIALIZER}`);
}

if (allows433 && allows343) ok("Program accepts 4-3-3 and 3-4-3");
else fail("validate_team does not accept both 4-3-3 and 3-4-3");

const toml = read(anchorToml);
if (toml.includes("[programs.mainnet]") && toml.includes(EXPECTED_PROGRAM_ID)) {
  ok("Anchor.toml [programs.mainnet] matches program id");
} else fail("Anchor.toml is missing [programs.mainnet] with the program id");

const initSrc = read(initMainnet);
if (initSrc.includes(USDC_MAINNET)) ok(`initialize-mainnet.mjs uses Circle USDC ${USDC_MAINNET}`);
else fail("initialize-mainnet.mjs is not pinned to mainnet USDC");
if (initSrc.includes("ensureHouseAta")) ok("initialize-mainnet.mjs creates house ATA");
else fail("initialize-mainnet.mjs does not create house ATA");
if (initSrc.includes(EXPECTED_INITIALIZER)) ok("initialize-mainnet.mjs checks initializer pubkey");
else fail("initialize-mainnet.mjs does not pin INITIALIZER pubkey");

const roles = [
  ["deployer.json", null],
  ["initializer.json", EXPECTED_INITIALIZER],
  ["house.json", "4vDibv147NHUyCNvuv5gBEtQPV2Y38kPPFhR9gbJJsbe"],
  ["oracle.json", "6vvo1tFS6Syq9mxg2qADJ3JXCGb99VC5Axpb6zZzonYS"],
];

for (const [file, expected] of roles) {
  const pk = pubkeyFromKeyfile(file);
  if (!pk) {
    fail(`${file} missing or unreadable in solana/movematch/.keys/`);
    continue;
  }
  if (expected && pk !== expected) fail(`${file} pubkey ${pk} ≠ documented ${expected}`);
  else ok(`${file} ${pk}`);
}

if (initializerConst?.[1]) {
  const initKey = pubkeyFromKeyfile("initializer.json");
  if (initKey && initKey !== initializerConst[1]) {
    fail("initializer.json does not match INITIALIZER in lib.rs — rebuild would deploy a trap");
  }
}

if (fs.existsSync(soPath)) {
  const bytes = fs.statSync(soPath).size;
  ok(`movematch.so present (${bytes.toLocaleString()} bytes) — rebuild before deploy if formation change is newer`);
} else {
  warn("movematch.so not built yet — run cargo-build-sbf before deploy (free, local)");
}

try {
  new PublicKey(EXPECTED_PROGRAM_ID);
  new PublicKey(EXPECTED_INITIALIZER);
  new PublicKey(USDC_MAINNET);
  ok("Canonical pubkeys parse");
} catch (error) {
  fail(`pubkey parse: ${error.message}`);
}

console.log("");
if (failed === 0) {
  console.log("Offline preflight passed.");
  console.log("Still needs money: ~3–4 SOL on deployer, paid RPC, then deploy + initialize + open GW1.");
} else {
  console.error(`Offline preflight failed: ${failed} problem(s).`);
}
process.exit(failed === 0 ? 0 : 1);
