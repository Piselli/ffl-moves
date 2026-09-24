/**
 * Server-only Solana admin signer (never import from client components).
 * Env: ADMIN_KEYPAIR — JSON array of 64 secret-key bytes (initializer.json).
 */
import {
  Connection,
  Keypair,
  Transaction,
  type TransactionInstruction,
} from "@solana/web3.js";
import { SOLANA_RPC_URL } from "@/lib/constants";

let cached: Keypair | null = null;

export function loadAdminKeypair(): Keypair {
  if (cached) return cached;
  const raw = process.env.ADMIN_KEYPAIR?.trim();
  if (!raw) {
    throw new Error("ADMIN_KEYPAIR is not set (JSON array of the admin secret key).");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("ADMIN_KEYPAIR must be a JSON array of numbers.");
  }
  if (!Array.isArray(parsed) || parsed.length < 32) {
    throw new Error("ADMIN_KEYPAIR must be a Solana secret key byte array.");
  }
  cached = Keypair.fromSecretKey(Uint8Array.from(parsed as number[]));
  return cached;
}

export function getServerConnection(): Connection {
  return new Connection(SOLANA_RPC_URL, "confirmed");
}

export async function signAndSendAsAdmin(
  instructions: TransactionInstruction[],
): Promise<{ signature: string; admin: string }> {
  const admin = loadAdminKeypair();
  const connection = getServerConnection();
  const tx = new Transaction().add(...instructions);
  tx.feePayer = admin.publicKey;
  tx.recentBlockhash = (await connection.getLatestBlockhash("confirmed")).blockhash;
  tx.sign(admin);
  const signature = await connection.sendRawTransaction(tx.serialize(), {
    skipPreflight: false,
  });
  await connection.confirmTransaction(signature, "confirmed");
  return { signature, admin: admin.publicKey.toBase58() };
}
