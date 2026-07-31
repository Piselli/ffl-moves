import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
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
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";

const programId = new PublicKey("A8UiSCd5yzhpZZwmop6k5upLVxUhDZq3x9pq7SfwoKN5");
const usdcMint = new PublicKey("4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU");
const rpc = process.env.SOLANA_RPC_URL ?? "https://api.devnet.solana.com";
const entryFee = BigInt(process.env.MOVEMATCH_ENTRY_FEE ?? "5000000");
const prizePoolBps = Number(process.env.MOVEMATCH_PRIZE_POOL_BPS ?? "8000");
const deployerPath = new URL("../.keys/deployer.json", import.meta.url);
const deployer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(await readFile(deployerPath, "utf8"))));
const connection = new Connection(rpc, "confirmed");

const [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], programId);
const [treasury] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], programId);
const treasuryAta = getAssociatedTokenAddressSync(usdcMint, treasury, true);

if (await connection.getAccountInfo(config)) {
  console.log(`Config already initialized: ${config}`);
  process.exit(0);
}

const discriminator = createHash("sha256").update("global:initialize").digest().subarray(0, 8);
const args = Buffer.alloc(8 + 2 + 32 + 32);
args.writeBigUInt64LE(entryFee, 0);
args.writeUInt16LE(prizePoolBps, 8);
deployer.publicKey.toBuffer().copy(args, 10); // devnet oracle
deployer.publicKey.toBuffer().copy(args, 42); // devnet house wallet

const instruction = new TransactionInstruction({
  programId,
  keys: [
    { pubkey: deployer.publicKey, isSigner: true, isWritable: true },
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

const signature = await sendAndConfirmTransaction(connection, new Transaction().add(instruction), [deployer]);
console.log(JSON.stringify({
  signature,
  config: config.toBase58(),
  treasury: treasury.toBase58(),
  treasuryAta: treasuryAta.toBase58(),
  usdcMint: usdcMint.toBase58(),
  entryFee: entryFee.toString(),
  prizePoolBps,
}, null, 2));
