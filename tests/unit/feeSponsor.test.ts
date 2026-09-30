import assert from "node:assert/strict";
import { test } from "node:test";
import {
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountIdempotentInstruction,
  createTransferCheckedInstruction,
  createTransferInstruction,
  getAssociatedTokenAddressSync,
} from "@solana/spl-token";
import {
  ComputeBudgetProgram,
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
} from "@solana/web3.js";
import { sha256 } from "@noble/hashes/sha2.js";
import { MOVEMATCH_PROGRAM_ID, SOLANA_USDC_MINT } from "../../src/lib/constants";
import {
  analyzeSponsoredTransaction,
  assertPresentSignaturesValid,
  assertRentTopUpJustified,
  assertSponsorableTransaction,
  findRegisterTeamGameweeks,
  isFeeSponsorConfigured,
} from "../../src/lib/server/feeSponsor";

const PROGRAM = new PublicKey(MOVEMATCH_PROGRAM_ID);
const MINT = new PublicKey(SOLANA_USDC_MINT);
const sponsor = Keypair.generate();

function disc(name: string): Buffer {
  return Buffer.from(sha256(new TextEncoder().encode(`global:${name}`)).slice(0, 8));
}

/** A register_team-shaped ix: only discriminator + owner-at-index-2 matter to the allowlist. */
function registerIx(owner: PublicKey, gameweek = 7): TransactionInstruction {
  const gw = Buffer.alloc(4);
  gw.writeUInt32LE(gameweek);
  return new TransactionInstruction({
    programId: PROGRAM,
    keys: [
      { pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: true },
      { pubkey: Keypair.generate().publicKey, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: true, isWritable: true },
    ],
    data: Buffer.concat([disc("register_team"), gw]),
  });
}

function build(ixs: TransactionInstruction[], signers: Keypair[], feePayer: PublicKey = sponsor.publicKey): Transaction {
  const tx = new Transaction().add(...ixs);
  tx.feePayer = feePayer;
  tx.recentBlockhash = Keypair.generate().publicKey.toBase58();
  if (signers.length) tx.partialSign(...signers);
  // Round-trip like the server does.
  return Transaction.from(tx.serialize({ requireAllSignatures: false, verifySignatures: false }));
}

const ata = (owner: PublicKey) => getAssociatedTokenAddressSync(MINT, owner);
const ataCreate = (payer: PublicKey, owner: PublicKey) =>
  createAssociatedTokenAccountIdempotentInstruction(payer, ata(owner), owner, MINT);
const checked = (from: PublicKey, to: PublicKey, amount: number) =>
  createTransferCheckedInstruction(ata(from), MINT, ata(to), from, amount, 6, [], TOKEN_PROGRAM_ID);

// ——— the exact attack seen on mainnet (2026-09-30 12:33–12:38 UTC) ———
test("blocks sponsor-paid ATA for a stranger + dust USDC transfer (the drain)", () => {
  const attacker = Keypair.generate();
  const fresh = Keypair.generate().publicKey;
  const tx = build([ataCreate(sponsor.publicKey, fresh), checked(attacker.publicKey, fresh, 100)], [attacker]);
  assert.throws(() => assertSponsorableTransaction(tx, sponsor.publicKey), /only allowed with register_team or claim_prize/);
});

test("blocks sponsor-paid ATA for the attacker's own wallet without a game action", () => {
  const attacker = Keypair.generate();
  const tx = build([ataCreate(sponsor.publicKey, attacker.publicKey), checked(attacker.publicKey, attacker.publicKey, 1)], [attacker]);
  assert.throws(() => assertSponsorableTransaction(tx, sponsor.publicKey), /only allowed with register_team or claim_prize/);
});

test("allows a plain USDC withdraw the player signed", () => {
  const user = Keypair.generate();
  const to = Keypair.generate().publicKey;
  const tx = build([checked(user.publicKey, to, 1_000_000)], [user]);
  assert.doesNotThrow(() => assertSponsorableTransaction(tx, sponsor.publicKey));
});

test("rejects unchecked Transfer (mint could be faked with a decoy account)", () => {
  const user = Keypair.generate();
  const to = Keypair.generate().publicKey;
  const ix = createTransferInstruction(ata(user.publicKey), ata(to), user.publicKey, 5);
  ix.keys.push({ pubkey: MINT, isSigner: false, isWritable: false });
  const tx = build([ix], [user]);
  assert.throws(() => assertSponsorableTransaction(tx, sponsor.publicKey), /Disallowed token instruction/);
});

test("rejects zero-amount and wrong-decimals USDC transfers", () => {
  const user = Keypair.generate();
  const to = Keypair.generate().publicKey;
  assert.throws(
    () => assertSponsorableTransaction(build([checked(user.publicKey, to, 0)], [user]), sponsor.publicKey),
    /must be positive/,
  );
  const bad = createTransferCheckedInstruction(ata(user.publicKey), MINT, ata(to), user.publicKey, 10, 9);
  assert.throws(() => assertSponsorableTransaction(build([bad], [user]), sponsor.publicKey), /6 decimals/);
});

test("rejects a transfer of a different mint", () => {
  const user = Keypair.generate();
  const other = Keypair.generate().publicKey;
  const ix = createTransferCheckedInstruction(ata(user.publicKey), other, ata(Keypair.generate().publicKey), user.publicKey, 10, 6);
  assert.throws(() => assertSponsorableTransaction(build([ix], [user]), sponsor.publicKey), /USDC mint/);
});

test("rejects the sponsor as a token authority (no spending sponsor funds)", () => {
  const ix = createTransferCheckedInstruction(ata(sponsor.publicKey), MINT, ata(Keypair.generate().publicKey), sponsor.publicKey, 10, 6);
  const tx = build([ix], []);
  assert.throws(() => assertSponsorableTransaction(tx, sponsor.publicKey), /Sponsor cannot be the only required signer/);
});

test("rejects non-transfer system instructions and arbitrary programs", () => {
  const user = Keypair.generate();
  const alloc = SystemProgram.createAccount({
    fromPubkey: user.publicKey,
    newAccountPubkey: Keypair.generate().publicKey,
    lamports: 1,
    space: 1,
    programId: SystemProgram.programId,
  });
  assert.throws(() => assertSponsorableTransaction(build([alloc], [user]), sponsor.publicKey), /Only SystemProgram.transfer/);
  const foreign = new TransactionInstruction({
    programId: Keypair.generate().publicKey,
    keys: [{ pubkey: user.publicKey, isSigner: true, isWritable: false }],
    data: Buffer.alloc(1),
  });
  assert.throws(() => assertSponsorableTransaction(build([foreign, checked(user.publicKey, user.publicKey, 1)], [user]), sponsor.publicKey), /Disallowed program/);
});

test("rejects an ATA instruction other than create / createIdempotent", () => {
  const user = Keypair.generate();
  const ix = ataCreate(user.publicKey, user.publicKey);
  ix.data = Buffer.from([2]); // RecoverNested
  const tx = build([ix, checked(user.publicKey, user.publicKey, 1)], [user]);
  assert.throws(() => assertSponsorableTransaction(tx, sponsor.publicKey), /Disallowed associated-token instruction/);
});

// ——— legitimate register / claim shapes ———
test("allows register_team + own ATA (sponsor paid) + bounded rent top-up", () => {
  const user = Keypair.generate();
  const tx = build(
    [
      ComputeBudgetProgram.setComputeUnitPrice({ microLamports: 1_000 }),
      SystemProgram.transfer({ fromPubkey: sponsor.publicKey, toPubkey: user.publicKey, lamports: 2_800_000 }),
      ataCreate(sponsor.publicKey, user.publicKey),
      registerIx(user.publicKey),
    ],
    [user],
  );
  assert.doesNotThrow(() => assertSponsorableTransaction(tx, sponsor.publicKey));
  assert.deepEqual(findRegisterTeamGameweeks(tx), [7]);
  const { costLamports, topUpLamports } = analyzeSponsoredTransaction(tx, sponsor.publicKey);
  assert.equal(topUpLamports, 2_800_000);
  assert.ok(costLamports >= 2_800_000 + 2_039_280 + 10_000);
});

test("rejects a top-up above the hard cap and a second sponsor ATA", () => {
  const user = Keypair.generate();
  const big = build(
    [SystemProgram.transfer({ fromPubkey: sponsor.publicKey, toPubkey: user.publicKey, lamports: 10_000_001 }), registerIx(user.publicKey)],
    [user],
  );
  assert.throws(() => assertSponsorableTransaction(big, sponsor.publicKey), /exceeds max/);
  const two = build([ataCreate(sponsor.publicKey, user.publicKey), ataCreate(sponsor.publicKey, user.publicKey), registerIx(user.publicKey)], [user]);
  assert.throws(() => assertSponsorableTransaction(two, sponsor.publicKey), /at most one USDC ATA/);
});

test("rejects a top-up with no game action and top-up to a stranger", () => {
  const user = Keypair.generate();
  const stranger = Keypair.generate().publicKey;
  const a = build([SystemProgram.transfer({ fromPubkey: sponsor.publicKey, toPubkey: user.publicKey, lamports: 1_000 }), checked(user.publicKey, user.publicKey, 1)], [user]);
  assert.throws(() => assertSponsorableTransaction(a, sponsor.publicKey), /requires a register_team or claim_prize/);
  const b = build([SystemProgram.transfer({ fromPubkey: sponsor.publicKey, toPubkey: stranger, lamports: 1_000 }), registerIx(user.publicKey)], [user]);
  assert.throws(() => assertSponsorableTransaction(b, sponsor.publicKey), /must be the registering/);
});

test("requires the player's signature and a sane fee payer / signer count", () => {
  const user = Keypair.generate();
  const unsigned = build([checked(user.publicKey, user.publicKey, 1)], []);
  assert.throws(() => assertSponsorableTransaction(unsigned, sponsor.publicKey), /Player must sign/);
  const wrongPayer = build([checked(user.publicKey, user.publicKey, 1)], [user], user.publicKey);
  assert.throws(() => assertSponsorableTransaction(wrongPayer, sponsor.publicKey), /fee payer must be/);
});

test("a forged signature is caught before it can burn a victim's limits", () => {
  const victim = Keypair.generate();
  const tx = build([checked(victim.publicKey, victim.publicKey, 1)], []);
  const forged = tx.signatures.find((s) => s.publicKey.equals(victim.publicKey))!;
  forged.signature = Buffer.alloc(64, 7);
  assert.doesNotThrow(() => assertSponsorableTransaction(tx, sponsor.publicKey)); // presence only
  assert.throws(() => assertPresentSignaturesValid(tx), /invalid signature/);
});

// ——— top-up justification against the live balance ———
function fakeConnection(balance: number): Connection {
  return {
    getMinimumBalanceForRentExemption: async (space: number) => (space === 0 ? 890_880 : 1_900_000),
    getBalance: async () => balance,
  } as unknown as Connection;
}

test("top-up must match what the player actually needs", async () => {
  const user = Keypair.generate();
  const mk = (lamports: number) =>
    build([SystemProgram.transfer({ fromPubkey: sponsor.publicKey, toPubkey: user.publicKey, lamports }), registerIx(user.publicKey)], [user]);
  // needs 1_900_000 + 890_880 - 0 = 2_790_880
  await assert.doesNotReject(assertRentTopUpJustified(mk(2_790_880), sponsor.publicKey, fakeConnection(0)));
  await assert.rejects(assertRentTopUpJustified(mk(10_000_000), sponsor.publicKey, fakeConnection(0)), /larger than this wallet needs/);
  // already funded → any top-up is unjustified
  await assert.rejects(assertRentTopUpJustified(mk(1_000_000), sponsor.publicKey, fakeConnection(5_000_000)), /larger than this wallet needs/);
  // no top-up at all → nothing to check
  await assert.doesNotReject(assertRentTopUpJustified(build([registerIx(user.publicKey)], [user]), sponsor.publicKey, fakeConnection(5_000_000)));
});

// ——— key hygiene ———
test("no fallback to ADMIN_KEYPAIR: only SOLANA_FEE_SPONSOR_KEYPAIR configures the sponsor", () => {
  const prevS = process.env.SOLANA_FEE_SPONSOR_KEYPAIR;
  const prevA = process.env.ADMIN_KEYPAIR;
  try {
    delete process.env.SOLANA_FEE_SPONSOR_KEYPAIR;
    process.env.ADMIN_KEYPAIR = JSON.stringify(Array.from(Keypair.generate().secretKey));
    assert.equal(isFeeSponsorConfigured(), false);
    process.env.SOLANA_FEE_SPONSOR_KEYPAIR = JSON.stringify(Array.from(Keypair.generate().secretKey));
    assert.equal(isFeeSponsorConfigured(), true);
  } finally {
    if (prevS === undefined) delete process.env.SOLANA_FEE_SPONSOR_KEYPAIR;
    else process.env.SOLANA_FEE_SPONSOR_KEYPAIR = prevS;
    if (prevA === undefined) delete process.env.ADMIN_KEYPAIR;
    else process.env.ADMIN_KEYPAIR = prevA;
  }
});
