import { createPublicKey, verify } from "crypto";
import { PublicKey } from "@solana/web3.js";

export const PARTNER_SIGN_TTL_MS = 10 * 60 * 1000; // 10 min

const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

export function partnerLoginMessage(wallet: string, ts: number): string {
  return `FORM8 partner cabinet\nWallet: ${wallet}\nTs: ${ts}`;
}

export function partnerCreateCodeMessage(
  wallet: string,
  code: string,
  ts: number,
): string {
  return `FORM8 partner create code\nWallet: ${wallet}\nCode: ${code}\nTs: ${ts}`;
}

export function decodeEd25519Signature(raw: string): Buffer | null {
  const s = raw.trim();
  if (/^[0-9a-fA-F]{128}$/.test(s)) return Buffer.from(s, "hex");
  try {
    const b = Buffer.from(s, "base64");
    return b.length === 64 ? b : null;
  } catch {
    return null;
  }
}

/** Wallets sign UTF-8; some embedded signers sign the hex of those bytes. */
export function verifyWalletMessageSignature(
  wallet: string,
  message: string,
  signature: Buffer,
): boolean {
  let pubkey: Buffer;
  try {
    pubkey = Buffer.from(new PublicKey(wallet).toBytes());
  } catch {
    return false;
  }
  const key = createPublicKey({
    key: Buffer.concat([ED25519_SPKI_PREFIX, pubkey]),
    format: "der",
    type: "spki",
  });
  const candidates = [
    Buffer.from(message, "utf8"),
    Buffer.from(Buffer.from(message, "utf8").toString("hex"), "utf8"),
  ];
  return candidates.some((data) => {
    try {
      return verify(null, data, key, signature);
    } catch {
      return false;
    }
  });
}

export function isFreshPartnerTs(ts: number): boolean {
  return Number.isFinite(ts) && Math.abs(Date.now() - ts) <= PARTNER_SIGN_TTL_MS;
}
