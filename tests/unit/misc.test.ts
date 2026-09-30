import assert from "node:assert/strict";
import { test } from "node:test";
import { randomBytes } from "node:crypto";
import { PublicKey } from "@solana/web3.js";
import { base58Encode } from "../../src/lib/base58";
import { auditEntry, buildCatalogIndex, correctedPositions } from "../../src/lib/entryAudit";
import { rateLimit } from "../../src/lib/server/rateLimit";
import { POST as rpcPost } from "../../src/app/api/solana/rpc/route";
import { MOVEMATCH_PROGRAM_ID } from "../../src/lib/constants";

test("base58Encode matches web3.js PublicKey.toBase58 (incl. leading zeros)", () => {
  for (let i = 0; i < 500; i += 1) {
    const b = randomBytes(32);
    for (let z = 0; z < i % 4; z += 1) b[z] = 0;
    assert.equal(base58Encode(b), new PublicKey(b).toBase58());
  }
});

const catalog = buildCatalogIndex([
  { id: 1, teamId: 10, positionId: 3 },
  { id: 2, teamId: 10, positionId: 1 },
  { id: 3, teamId: 10, positionId: 2 },
  { id: 4, teamId: 10, positionId: 2 },
  { id: 5, teamId: 11, positionId: 0 },
]);

test("entry audit flags relabelled positions, fake clubs, >3 per club, late and unknown", () => {
  const cheat = {
    playerIds: [1, 2, 3, 4, 5, 99],
    // player 1 is a FWD (3) but registered as DEF (1); fake club ids hide 4 players from club 10
    playerPositions: [1, 1, 2, 2, 0, 2],
    clubs: [1, 2, 3, 4, 11, 0],
    createdAt: 2_000,
  };
  const kinds = new Set(auditEntry("W", cheat, catalog, 1_000).map((i) => i.kind));
  for (const k of ["late_registration", "position_mismatch", "club_mismatch", "club_limit_exceeded", "unknown_player"]) {
    assert.ok(kinds.has(k as never), `missing ${k}`);
  }
  assert.equal(correctedPositions(cheat, catalog)[0], 3);
});

test("entry audit is silent for an honest entry and tolerates the grace window", () => {
  const honest = { playerIds: [1, 2, 5], playerPositions: [3, 1, 0], clubs: [10, 10, 11], createdAt: 1_030 };
  assert.deepEqual(auditEntry("W", honest, catalog, 1_000), []);
});

test("rateLimit blocks after the limit (in-memory fallback)", async () => {
  const key = `test:${Date.now()}:${Math.random()}`;
  for (let i = 0; i < 3; i += 1) assert.equal((await rateLimit(key, 3, 60)).ok, true);
  const blocked = await rateLimit(key, 3, 60);
  assert.equal(blocked.ok, false);
});

function rpc(body: unknown): Promise<Response> {
  return rpcPost(new Request("http://localhost/api/solana/rpc", { method: "POST", body: JSON.stringify(body) }));
}

test("RPC proxy rejects non-allowlisted methods, foreign gPA, empty and oversized batches", async () => {
  assert.equal((await rpc({ jsonrpc: "2.0", id: 1, method: "getProgramAccounts", params: ["TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"] })).status, 403);
  assert.equal((await rpc({ jsonrpc: "2.0", id: 1, method: "requestAirdrop", params: [] })).status, 403);
  assert.equal((await rpc({ jsonrpc: "2.0", id: 1, method: "getBlock", params: [1] })).status, 403);
  assert.equal((await rpc([])).status, 400);
  assert.equal((await rpc(Array.from({ length: 21 }, (_, i) => ({ jsonrpc: "2.0", id: i, method: "getSlot" })))).status, 400);
  assert.equal((await rpcPost(new Request("http://localhost/api/solana/rpc", { method: "POST", body: "{nope" }))).status, 400);
  // a mixed batch with one bad call is rejected as a whole
  assert.equal((await rpc([{ id: 1, method: "getSlot" }, { id: 2, method: "getBlock" }])).status, 403);
  void MOVEMATCH_PROGRAM_ID;
});
