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

import { topUpCandidates } from "../../src/lib/sponsorClient";

test("topUpCandidates: exact rent for an empty wallet, cheapest first, safe fallback last", () => {
  const floor = 650_240;
  const c = topUpCandidates(0, [1_498_600, 1_503_680], floor);
  assert.deepEqual(c, [1_498_600, 1_503_680, 1_503_680 + floor]);
});

test("topUpCandidates: never leaves a wallet with dust between 0 and the rent floor", () => {
  const floor = 650_240;
  const rent = 1_498_600;
  for (const balance of [0, 1, 235_560, rent - 1, rent, rent + 1, rent + floor - 1, rent + floor, 5_000_000]) {
    const [first] = topUpCandidates(balance, [rent], floor);
    const end = balance + first! - rent;
    assert.ok(end === 0 || end >= floor, `balance ${balance} ends at ${end}`);
  }
});

test("topUpCandidates: funded wallet needs nothing; cap respected", () => {
  assert.deepEqual(topUpCandidates(9_000_000, [1_498_600], 650_240), [0]);
  assert.ok(topUpCandidates(0, [50_000_000], 650_240).every((x) => x <= 10_000_000));
});
