/**
 * Add an admin pubkey to MoveMatch Config on devnet.
 *
 *   node scripts/add-admin-devnet.mjs <NEW_ADMIN_PUBKEY>
 *
 * Signs with solana/movematch/.keys/deployer.json (current admin[0] on devnet).
 */
import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
} from "@solana/web3.js";

const newAdminArg = process.argv[2];
if (!newAdminArg) {
  console.error("Usage: node scripts/add-admin-devnet.mjs <NEW_ADMIN_PUBKEY>");
  process.exit(1);
}

const programId = new PublicKey(
  process.env.MOVEMATCH_PROGRAM_ID ?? "A8UiSCd5yzhpZZwmop6k5upLVxUhDZq3x9pq7SfwoKN5",
);
const rpc = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const deployer = Keypair.fromSecretKey(
  Uint8Array.from(JSON.parse(await readFile(resolve(root, "solana/movematch/.keys/deployer.json"), "utf8"))),
);
const newAdmin = new PublicKey(newAdminArg);
const connection = new Connection(rpc, "confirmed");

const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);

const discriminator = createHash("sha256").update("global:add_admin").digest().subarray(0, 8);
const instruction = new TransactionInstruction({
  programId,
  keys: [
    { pubkey: config, isSigner: false, isWritable: true },
    { pubkey: deployer.publicKey, isSigner: true, isWritable: false },
  ],
  data: Buffer.concat([discriminator, newAdmin.toBuffer()]),
});

console.log(`Adding admin ${newAdmin.toBase58()}…`);
console.log(`  program: ${programId.toBase58()}`);
console.log(`  signer:  ${deployer.publicKey.toBase58()}`);

const signature = await sendAndConfirmTransaction(connection, new Transaction().add(instruction), [deployer]);
console.log(`Done: ${signature}`);
