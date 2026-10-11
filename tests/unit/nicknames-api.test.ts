import assert from "node:assert/strict";
import { generateKeyPairSync, sign } from "node:crypto";
import { test } from "node:test";
import { PublicKey } from "@solana/web3.js";
import { GET, POST } from "../../src/app/api/nicknames/route";
import { nicknameClaimMessage } from "../../src/lib/nicknames";

function newWallet() {
  const { publicKey, privateKey } = generateKeyPairSync("ed25519");
  const raw = publicKey.export({ format: "der", type: "spki" }).subarray(-32);
  return { address: new PublicKey(raw).toBase58(), privateKey };
}

function post(body: unknown) {
  return POST(
    new Request("http://x/api/nicknames", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-real-ip": `10.0.0.${Math.floor(Math.random() * 250)}` },
      body: JSON.stringify(body),
    }),
  );
}

test("signed claim is stored and listed; forged / foreign / duplicate claims are rejected", async () => {
  const a = newWallet();
  const b = newWallet();
  const ts = Date.now();
  const msg = nicknameClaimMessage(a.address, "Maestro", ts);
  const sig = sign(null, Buffer.from(msg), a.privateKey).toString("hex");

  const ok = await post({ wallet: a.address, nickname: "Maestro", ts, signature: sig });
  assert.equal(ok.status, 200);

  const list = (await (await GET(new Request("http://x/api/nicknames"))).json()) as {
    nicknames: Record<string, string>;
  };
  assert.equal(list.nicknames[a.address], "Maestro");

  // B signs a claim for A's wallet → signature does not match A.
  const forged = sign(null, Buffer.from(msg), b.privateKey).toString("hex");
  const bad = await post({ wallet: a.address, nickname: "Maestro", ts, signature: forged });
  assert.equal(bad.status, 401);

  // B signs for itself but wants A's (case-insensitive) nickname → taken.
  const msgB = nicknameClaimMessage(b.address, "maestro", ts);
  const sigB = sign(null, Buffer.from(msgB), b.privateKey).toString("hex");
  const taken = await post({ wallet: b.address, nickname: "maestro", ts, signature: sigB });
  assert.equal(taken.status, 409);

  // Expired timestamp.
  const old = ts - 60 * 60 * 1000;
  const msgOld = nicknameClaimMessage(b.address, "Fresh", old);
  const sigOld = sign(null, Buffer.from(msgOld), b.privateKey).toString("hex");
  const expired = await post({ wallet: b.address, nickname: "Fresh", ts: old, signature: sigOld });
  assert.equal(expired.status, 400);
});
