import { NextResponse } from "next/server";
import { createPublicKey, verify } from "crypto";
import { PublicKey } from "@solana/web3.js";
import {
  NICKNAME_SIGN_TTL_MS,
  nicknameClaimMessage,
  sanitizeNickname,
  validateNickname,
} from "@/lib/nicknames";
import { getAllNicknames, setNickname } from "@/lib/server/nicknameStore";
import { clientIp } from "@/lib/server/clientIp";
import { rateLimit } from "@/lib/server/rateLimit";

export const dynamic = "force-dynamic";

// ASN.1 SPKI prefix for a raw 32-byte Ed25519 public key.
const ED25519_SPKI_PREFIX = Buffer.from("302a300506032b6570032100", "hex");

function decodeSignature(raw: string): Buffer | null {
  const s = raw.trim();
  if (/^[0-9a-fA-F]{128}$/.test(s)) return Buffer.from(s, "hex");
  try {
    const b = Buffer.from(s, "base64");
    return b.length === 64 ? b : null;
  } catch {
    return null;
  }
}

/** Wallets sign the UTF-8 message; some embedded signers sign its hex encoding instead. */
function signatureIsValid(wallet: string, message: string, signature: Buffer): boolean {
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

/** GET — every claimed nickname, `{ nicknames: { [wallet]: nickname } }`. */
export async function GET(request: Request) {
  const gate = await rateLimit(`nick:get:${clientIp(request)}`, 120, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }
  try {
    const nicknames = await getAllNicknames();
    return NextResponse.json(
      { nicknames },
      { headers: { "Cache-Control": "public, s-maxage=15, stale-while-revalidate=60" } },
    );
  } catch (err) {
    console.warn("[nicknames] read failed:", err);
    return NextResponse.json({ nicknames: {} });
  }
}

/** POST { wallet, nickname, ts, signature } — signature is by `wallet` over the claim message. */
export async function POST(request: Request) {
  const gate = await rateLimit(`nick:post:${clientIp(request)}`, 10, 60);
  if (!gate.ok) {
    return NextResponse.json(
      { error: "Too many requests." },
      { status: 429, headers: { "Retry-After": String(gate.retryAfterSec) } },
    );
  }

  let body: { wallet?: unknown; nickname?: unknown; ts?: unknown; signature?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON." }, { status: 400 });
  }

  const wallet = typeof body.wallet === "string" ? body.wallet.trim() : "";
  const ts = Number(body.ts);
  const sigRaw = typeof body.signature === "string" ? body.signature : "";
  const nickname = sanitizeNickname(typeof body.nickname === "string" ? body.nickname : "");

  if (wallet.length < 32 || wallet.length > 44) {
    return NextResponse.json({ error: "Invalid wallet." }, { status: 400 });
  }
  const invalid = validateNickname(nickname);
  if (invalid) return NextResponse.json({ error: invalid }, { status: 400 });

  if (!Number.isFinite(ts) || Math.abs(Date.now() - ts) > NICKNAME_SIGN_TTL_MS) {
    return NextResponse.json({ error: "Signature expired. Try again." }, { status: 400 });
  }
  const signature = decodeSignature(sigRaw);
  if (!signature) return NextResponse.json({ error: "Invalid signature." }, { status: 400 });

  if (!signatureIsValid(wallet, nicknameClaimMessage(wallet, nickname, ts), signature)) {
    return NextResponse.json({ error: "Signature does not match this wallet." }, { status: 401 });
  }

  try {
    const res = await setNickname(wallet, nickname);
    if (!res.ok) {
      return NextResponse.json({ error: "This nickname is already taken." }, { status: 409 });
    }
    return NextResponse.json({ ok: true, nickname });
  } catch (err) {
    console.error("[nicknames] write failed:", err);
    return NextResponse.json({ error: "Failed to save nickname." }, { status: 500 });
  }
}
