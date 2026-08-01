/**
 * One-shot mainnet initialize. Signs with `.keys/initializer.json` only.
 *
 * Prerequisites:
 *   - Program deployed on mainnet-beta (see docs/solana-migration/06-runbook.md §4)
 *   - INITIALIZER in lib.rs matches initializer keypair
 *   - Squads multisig address ready for add_admin after init (optional env)
 *
 * Env:
 *   MOVEMATCH_PROGRAM_ID   — deployed program id (required)
 *   SOLANA_RPC_URL         — default https://api.mainnet-beta.solana.com
 *   MOVEMATCH_ENTRY_FEE    — default 100000 (0.1 USDC pilot; raise via set_fees before public launch)
 *   MOVEMATCH_PRIZE_POOL_BPS — default 8000
 *   MOVEMATCH_ORACLE_KEY   — path to oracle keypair (default .keys/oracle.json)
 *   MOVEMATCH_HOUSE_KEY    — path to house keypair (default .keys/house.json)
 *   MOVEMATCH_FUNDER_KEY   — pays ATA rent if not initializer (default deployer.json)
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  SYSVAR_RENT_PUBKEY,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keys = (name) => resolve(root, ".keys", name);

const programIdStr = process.env.MOVEMATCH_PROGRAM_ID;
if (!programIdStr) {
  console.error("Set MOVEMATCH_PROGRAM_ID to the deployed mainnet program id.");
  process.exit(1);
}

const programId = new PublicKey(programIdStr);
const usdcMint = new PublicKey("EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v");
const rpc = process.env.SOLANA_RPC_URL ?? "https://api.mainnet-beta.solana.com";
const entryFee = BigInt(process.env.MOVEMATCH_ENTRY_FEE ?? "100000");
const prizePoolBps = Number(process.env.MOVEMATCH_PRIZE_POOL_BPS ?? "8000");

async function loadKey(path) {
  return Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(path, "utf8"))));
}

const initializer = await loadKey(keys("initializer.json"));
const oracle = await loadKey(process.env.MOVEMATCH_ORACLE_KEY ?? keys("oracle.json"));
const house = await loadKey(process.env.MOVEMATCH_HOUSE_KEY ?? keys("house.json"));
const funder = await loadKey(process.env.MOVEMATCH_FUNDER_KEY ?? keys("deployer.json"));
const connection = new Connection(rpc, "confirmed");

if (!initializer.publicKey.equals(new PublicKey("CJKNFKKfvvYotke7EjYbKNAP1YWy8f4DBcxRFna1no57"))) {
  console.error("initializer.json pubkey does not match INITIALIZER in lib.rs — rebuild first.");
  process.exit(1);
}

const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
const [treasury] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], programId);
const treasuryAta = getAssociatedTokenAddressSync(usdcMint, treasury, true);

async function ensureHouseAta(houseWallet) {
  const houseAta = getAssociatedTokenAddressSync(usdcMint, houseWallet);
  if (await connection.getAccountInfo(houseAta)) {
    console.log(`House token account ready: ${houseAta.toBase58()}`);
    return houseAta;
  }
  const payer = funder.publicKey.equals(initializer.publicKey) ? initializer : funder;
  const signature = await sendAndConfirmTransaction(
    connection,
    new Transaction().add(
      createAssociatedTokenAccountIdempotentInstruction(payer.publicKey, houseAta, houseWallet, usdcMint),
    ),
    [payer],
  );
  console.log(`House token account created: ${houseAta.toBase58()} (${signature})`);
  return houseAta;
}

if (await connection.getAccountInfo(config)) {
  console.log(`Config already initialized: ${config.toBase58()}`);
  await ensureHouseAta(house.publicKey);
  process.exit(0);
}

const discriminator = createHash("sha256").update("global:initialize").digest().subarray(0, 8);
const args = Buffer.alloc(8 + 2 + 32 + 32);
args.writeBigUInt64LE(entryFee, 0);
args.writeUInt16LE(prizePoolBps, 8);
oracle.publicKey.toBuffer().copy(args, 10);
house.publicKey.toBuffer().copy(args, 42);

const instruction = new TransactionInstruction({
  programId,
  keys: [
    { pubkey: initializer.publicKey, isSigner: true, isWritable: true },
    { pubkey: usdcMint, isSigner: false, isWritable: false },
    { pubkey: config, isSigner: false, isWritable: true },
    { pubkey: treasury, isSigner: false, isWritable: false },
    { pubkey: treasuryAta, isSigner: false, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    { pubkey: ASSOCIATED_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
    { pubkey: SYSVAR_RENT_PUBKEY, isSigner: false, isWritable: false },
  ],
  data: Buffer.concat([discriminator, args]),
});

console.log("Initializing mainnet Config…");
console.log(`  program: ${programId.toBase58()}`);
console.log(`  initializer (admin[0]): ${initializer.publicKey.toBase58()}`);
console.log(`  oracle: ${oracle.publicKey.toBase58()}`);
console.log(`  house: ${house.publicKey.toBase58()}`);

const signature = await sendAndConfirmTransaction(connection, new Transaction().add(instruction), [initializer]);
const houseAta = await ensureHouseAta(house.publicKey);

console.log(
  JSON.stringify(
    {
      signature,
      config: config.toBase58(),
      treasury: treasury.toBase58(),
      treasuryAta: treasuryAta.toBase58(),
      houseAta: houseAta.toBase58(),
      usdcMint: usdcMint.toBase58(),
      entryFee: entryFee.toString(),
      prizePoolBps,
      nextSteps: [
        "add_admin Squads multisig via /admin or CLI",
        "set-upgrade-authority to Squads vault",
        "npm run preflight:solana",
        "fund house ATA is not needed — fees arrive on register",
      ],
    },
    null,
    2,
  ),
);
