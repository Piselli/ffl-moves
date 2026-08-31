import * as anchor from "@anchor-lang/core";
import { Keypair, PublicKey, SystemProgram } from "@solana/web3.js";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ASSOCIATED_TOKEN_PROGRAM_ID,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccount,
  createMint,
  getAccount,
  getAssociatedTokenAddressSync,
  mintTo,
  transfer,
} from "@solana/spl-token";
import { expect } from "chai";
import { keccak_256 } from "@noble/hashes/sha3";

// Golden tests run against the shipped business logic, not a copy of it.
import {
  DEFAULT_PRIZE_TIERS,
  allocatePrizes,
  getPrizeTiers,
  sumPrizeAwards,
  type PrizeAward,
} from "@/lib/prize-distribution";
import { previewTourPointsFromRegisteredTeam } from "@/lib/chainAlignedScoring";
import { WC_R16_TOUR_ID } from "@/lib/prize-distribution";

import { buildResultsTree, u32le, type ProofNode, type ResultLeaf } from "@/lib/resultsTree";

const TEAM_SIZE = 14;
const INITIALIZER_KEY_PATH = resolve(__dirname, "../.keys/initializer.json");
const ENTRY_FEE = new anchor.BN(1_000_000);
const PRIZE_BPS = 8_000;
const PRIZE_LEG = 800_000;
const PLAYER_FUNDING = 10_000_000;

/** Position ids as the program stores them: 0 GK, 1 DEF, 2 MID, 3 FWD. */
const GK = 0;
const DEF = 1;
const MID = 2;
const FWD = 3;

type Player = { key: Keypair; ata: PublicKey };
type Award = PrizeAward<PublicKey>;

function toChainProof(proof: ProofNode[]) {
  return proof.map((node) => ({
    hash: [...node.hash],
    sum: new anchor.BN(node.sum.toString()),
  }));
}

function awardsToLeaves(awards: Award[]): ResultLeaf[] {
  return awards.map((award) => ({
    owner: award.owner,
    rank: award.rank,
    finalPoints: award.finalPoints,
    amount: award.amount,
  }));
}

async function expectFailure(promise: Promise<unknown>, label: string, expectedCode?: string) {
  try {
    await promise;
  } catch (error) {
    if (expectedCode) {
      const text = String((error as { message?: string })?.message ?? error);
      expect(text, `"${label}" failed for the wrong reason: ${text}`).to.contain(expectedCode);
    }
    return;
  }
  expect.fail(`expected "${label}" to be rejected`);
}

describe("movematch", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);
  const program: any = (anchor.workspace as any).movematch ?? (anchor.workspace as any).Movematch;
  const admin = (provider.wallet as anchor.Wallet).payer;
  const initializer = Keypair.fromSecretKey(
    Uint8Array.from(JSON.parse(readFileSync(INITIALIZER_KEY_PATH, "utf8"))),
  );
  const oracle = Keypair.generate();
  const house = Keypair.generate();
  const outsider = Keypair.generate();

  let mint: PublicKey;
  let config: PublicKey;
  let treasury: PublicKey;
  let treasuryAta: PublicKey;
  let houseAta: PublicKey;
  let outsiderAta: PublicKey;
  let squatterError = "";

  const gameweekPda = (id: number) =>
    PublicKey.findProgramAddressSync([Buffer.from("gw"), u32le(id)], program.programId)[0];
  const entryPda = (id: number, owner: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("entry"), u32le(id), owner.toBuffer()],
      program.programId
    )[0];
  const claimPda = (id: number, owner: PublicKey) =>
    PublicKey.findProgramAddressSync(
      [Buffer.from("claim"), u32le(id), owner.toBuffer()],
      program.programId
    )[0];
  const statsPda = (id: number) =>
    PublicKey.findProgramAddressSync([Buffer.from("stats"), u32le(id)], program.programId)[0];

  const validTeam = () => ({
    playerIds: Array.from({ length: TEAM_SIZE }, (_, index) => index + 1),
    positions: [GK, DEF, DEF, DEF, DEF, MID, MID, MID, FWD, FWD, FWD, GK, DEF, MID],
    clubs: [10, 11, 11, 12, 12, 13, 13, 14, 14, 15, 15, 16, 17, 18],
  });

  const validTeam343 = () => ({
    playerIds: Array.from({ length: TEAM_SIZE }, (_, index) => index + 101),
    positions: [GK, DEF, DEF, DEF, MID, MID, MID, MID, FWD, FWD, FWD, GK, DEF, MID],
    clubs: [10, 11, 11, 12, 13, 13, 14, 14, 15, 15, 16, 17, 18, 19],
  });

  async function fundedPlayer(): Promise<Player> {
    const key = Keypair.generate();
    const signature = await provider.connection.requestAirdrop(
      key.publicKey,
      2 * anchor.web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(signature);
    const ata = await createAssociatedTokenAccount(provider.connection, admin, mint, key.publicKey);
    await mintTo(provider.connection, admin, mint, ata, admin, PLAYER_FUNDING);
    return { key, ata };
  }

  async function register(gameweek: number, player: Player) {
    return registerWithTeam(gameweek, player, validTeam());
  }

  async function registerWithTeam(
    gameweek: number,
    player: Player,
    team: { playerIds: number[]; positions: number[]; clubs: number[] }
  ) {
    return program.methods
      .registerTeam(gameweek, team.playerIds, team.positions, team.clubs, 8)
      .accountsPartial({
        config,
        gameweek: gameweekPda(gameweek),
        owner: player.key.publicKey,
        entry: entryPda(gameweek, player.key.publicKey),
        usdcMint: mint,
        ownerAta: player.ata,
        treasury,
        treasuryAta,
        houseWallet: house.publicKey,
        houseAta,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([player.key])
      .rpc();
  }

  async function createGameweek(id: number) {
    await program.methods
      .createGameweek(id)
      .accountsPartial({
        config,
        admin: admin.publicKey,
        gameweek: gameweekPda(id),
        systemProgram: SystemProgram.programId,
      })
      .rpc();
  }

  async function closeGameweek(id: number) {
    await program.methods
      .closeGameweek()
      .accountsPartial({ config, admin: admin.publicKey, gameweek: gameweekPda(id) })
      .rpc();
  }

  async function commitStats(id: number, payload = `gameweek-${id}-stats`) {
    const hash = Array.from(keccak_256(Buffer.from(payload)));
    const uri = `https://movematch.example/stats/${id}.json`;
    await program.methods
      .commitStats(hash, uri)
      .accountsPartial({
        config,
        oracle: oracle.publicKey,
        gameweek: gameweekPda(id),
        statsCommit: statsPda(id),
        systemProgram: SystemProgram.programId,
      })
      .signers([oracle])
      .rpc();
  }

  async function publish(id: number, root: Buffer, entries: number, allocated: bigint) {
    await program.methods
      .publishResults([...root], entries, new anchor.BN(allocated.toString()))
      .accountsPartial({
        config,
        oracle: oracle.publicKey,
        gameweek: gameweekPda(id),
        statsCommit: statsPda(id),
      })
      .signers([oracle])
      .rpc();
  }

  function claim(
    id: number,
    player: Player,
    award: Award,
    proof: ProofNode[],
    signer: Keypair = player.key
  ) {
    return program.methods
      .claimPrize(
        id,
        award.rank,
        award.finalPoints,
        new anchor.BN(award.amount.toString()),
        toChainProof(proof)
      )
      .accountsPartial({
        config,
        gameweek: gameweekPda(id),
        owner: signer.publicKey,
        claimReceipt: claimPda(id, signer.publicKey),
        usdcMint: mint,
        treasury,
        treasuryAta,
        ownerAta: player.ata,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([signer])
      .rpc();
  }

  /** Registers `points.length` players and settles the tour off the real prize module. */
  async function runTour(id: number, points: number[], sponsor = 0n) {
    await createGameweek(id);
    const players: Player[] = [];
    for (let i = 0; i < points.length; i += 1) {
      const player = await fundedPlayer();
      await register(id, player);
      players.push(player);
    }
    if (sponsor > 0n) {
      await program.methods
        .sponsorPrizePool(new anchor.BN(sponsor.toString()))
        .accountsPartial({
          config,
          admin: admin.publicKey,
          sponsor: admin.publicKey,
          gameweek: gameweekPda(id),
          usdcMint: mint,
          sponsorAta: await adminAta(),
          treasury,
          treasuryAta,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    }
    await closeGameweek(id);
    await commitStats(id);

    const gameweek = await program.account.gameweek.fetch(gameweekPda(id));
    const pool = BigInt(gameweek.prizePool.toString());
    const awards = allocatePrizes(
      pool,
      players.map((player, index) => ({
        owner: player.key.publicKey,
        finalPoints: points[index],
      })),
      id
    );
    const tree = buildResultsTree(id, awardsToLeaves(awards));
    await publish(id, tree.root, players.length, tree.total);
    return { players, pool, awards, tree };
  }

  let adminAtaCache: PublicKey | undefined;
  async function adminAta(): Promise<PublicKey> {
    if (!adminAtaCache) {
      adminAtaCache = await createAssociatedTokenAccount(
        provider.connection,
        admin,
        mint,
        admin.publicKey
      );
      await mintTo(provider.connection, admin, mint, adminAtaCache, admin, 50_000_000);
    }
    return adminAtaCache;
  }

  before(async () => {
    for (const key of [initializer.publicKey, oracle.publicKey, house.publicKey, outsider.publicKey]) {
      const signature = await provider.connection.requestAirdrop(
        key,
        2 * anchor.web3.LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(signature);
    }
    mint = await createMint(provider.connection, admin, admin.publicKey, null, 6);
    [config] = PublicKey.findProgramAddressSync([Buffer.from("config")], program.programId);
    [treasury] = PublicKey.findProgramAddressSync([Buffer.from("treasury")], program.programId);
    treasuryAta = getAssociatedTokenAddressSync(mint, treasury, true);
    houseAta = await createAssociatedTokenAccount(provider.connection, admin, mint, house.publicKey);
    outsiderAta = await createAssociatedTokenAccount(
      provider.connection,
      admin,
      mint,
      outsider.publicKey
    );

    const bootstrap = (authority: Keypair) =>
      program.methods
        .initialize(ENTRY_FEE, PRIZE_BPS, oracle.publicKey, house.publicKey)
        .accountsPartial({
          authority: authority.publicKey,
          usdcMint: mint,
          config,
          treasury,
          treasuryAta,
          systemProgram: SystemProgram.programId,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([authority])
        .rpc();

    // Run before the real bootstrap, while the Config PDA genuinely does not exist.
    try {
      await bootstrap(outsider);
      squatterError = "";
    } catch (error) {
      squatterError = String((error as { message?: string })?.message ?? error);
    }

    await bootstrap(initializer);
    await program.methods
      .addAdmin(admin.publicKey)
      .accountsPartial({ config, admin: initializer.publicKey })
      .signers([initializer])
      .rpc();
  });

  it("lets nobody but the configured initializer bootstrap the config", async () => {
    expect(squatterError, "an outsider was able to seize the config PDA").to.contain(
      "UnauthorizedInitializer"
    );
    const state = await program.account.config.fetch(config);
    expect(state.admins[0].toBase58()).to.equal(initializer.publicKey.toBase58());
    expect(state.admins[1].toBase58()).to.equal(admin.publicKey.toBase58());
    expect(state.oracle.toBase58()).to.equal(oracle.publicKey.toBase58());
  });

  it("splits the entry fee between treasury and house", async () => {
    await createGameweek(1);
    const player = await fundedPlayer();
    await register(1, player);

    expect(Number((await getAccount(provider.connection, player.ata)).amount)).to.equal(
      PLAYER_FUNDING - 1_000_000
    );
    expect(Number((await getAccount(provider.connection, treasuryAta)).amount)).to.equal(PRIZE_LEG);
    expect(Number((await getAccount(provider.connection, houseAta)).amount)).to.equal(200_000);

    const gameweek = await program.account.gameweek.fetch(gameweekPda(1));
    expect(gameweek.prizePool.toNumber()).to.equal(PRIZE_LEG);
    expect(gameweek.totalEntries).to.equal(1);

    const entry = await program.account.entry.fetch(entryPda(1, player.key.publicKey));
    expect(entry.prizeContribution.toNumber()).to.equal(PRIZE_LEG);
    expect(entry.feePaid.toNumber()).to.equal(1_000_000);
  });

  it("rejects squads that break formation, club limit, uniqueness, or bench positions", async () => {
    await createGameweek(2);

    const badFormation = await fundedPlayer();
    const formation = validTeam();
    formation.positions[0] = FWD;
    await expectFailure(registerWithTeam(2, badFormation, formation), "invalid formation");

    const ok343 = await fundedPlayer();
    await registerWithTeam(2, ok343, validTeam343());

    const badBench = await fundedPlayer();
    const bench = validTeam();
    bench.positions[13] = 9;
    await expectFailure(registerWithTeam(2, badBench, bench), "bench position out of range");

    const tooManyFromClub = await fundedPlayer();
    const clubs = validTeam();
    clubs.clubs = Array.from({ length: TEAM_SIZE }, () => 10);
    await expectFailure(registerWithTeam(2, tooManyFromClub, clubs), "four players from one club");

    const duplicates = await fundedPlayer();
    const duplicate = validTeam();
    duplicate.playerIds[13] = duplicate.playerIds[0];
    await expectFailure(registerWithTeam(2, duplicates, duplicate), "duplicate player id");

    const twice = await fundedPlayer();
    await register(2, twice);
    await expectFailure(register(2, twice), "second registration for one wallet");
  });

  it("blocks registration while paused", async () => {
    await createGameweek(3);
    await program.methods.setPaused(true).accountsPartial({ config, admin: admin.publicKey }).rpc();
    const player = await fundedPlayer();
    await expectFailure(register(3, player), "register while paused");
    await program.methods.setPaused(false).accountsPartial({ config, admin: admin.publicKey }).rpc();
    await register(3, player);
  });

  it("pays tied ranks exactly what the oracle allocated, and only once", async () => {
    const id = 4;
    const { players, awards, tree } = await runTour(id, [71, 71, 55]);
    expect(awards.map((award) => award.rank)).to.deep.equal([1, 1, 3]);

    await expectFailure(
      claim(id, players[0], { ...awards[0], amount: awards[0].amount + 1n }, tree.proofs[0]),
      "claim with a tampered amount",
      "InvalidMerkleProof"
    );

    for (let index = 0; index < awards.length; index += 1) {
      const player = players.find((candidate) =>
        candidate.key.publicKey.equals(awards[index].owner)
      )!;
      await claim(id, player, awards[index], tree.proofs[index]);
      const balance = BigInt((await getAccount(provider.connection, player.ata)).amount);
      expect(balance).to.equal(BigInt(PLAYER_FUNDING) - 1_000_000n + awards[index].amount);
    }

    await expectFailure(
      claim(id, players[0], awards[0], tree.proofs[0]),
      "second claim by the same wallet"
    );

    const gameweek = await program.account.gameweek.fetch(gameweekPda(id));
    expect(gameweek.prizeClaimed.toString()).to.equal(tree.total.toString());
  });

  it("refuses a claim signed by someone outside the results tree", async () => {
    const id = 5;
    const { players, awards, tree } = await runTour(id, [60]);

    const thief: Player = { key: outsider, ata: outsiderAta };
    await expectFailure(
      claim(id, thief, awards[0], tree.proofs[0], outsider),
      "claim signed by a non-winner",
      "InvalidMerkleProof"
    );
    await claim(id, players[0], awards[0], tree.proofs[0]);
  });

  it("locks reopen once a prize has been claimed", async () => {
    const id = 6;
    const { players, awards, tree } = await runTour(id, [42]);
    await claim(id, players[0], awards[0], tree.proofs[0]);
    await expectFailure(
      program.methods
        .reopenGameweek()
        .accountsPartial({ config, admin: admin.publicKey, gameweek: gameweekPda(id) })
        .rpc(),
      "reopen after a claim",
      "GameweekAlreadyClaimed"
    );
  });

  it("guards oracle authority and prize allocation limits", async () => {
    const id = 7;
    await createGameweek(id);
    const player = await fundedPlayer();
    await register(id, player);

    const awards = allocatePrizes(
      BigInt(PRIZE_LEG),
      [{ owner: player.key.publicKey, finalPoints: 33 }],
      id
    );
    const tree = buildResultsTree(id, awardsToLeaves(awards));

    await commitStats(id);
    await expectFailure(
      publish(id, tree.root, 1, tree.total),
      "publish before the gameweek closes",
      "GameweekNotClosed"
    );
    await closeGameweek(id);

    await expectFailure(
      program.methods
        .publishResults([...tree.root], 1, new anchor.BN(PRIZE_LEG))
        .accountsPartial({
          config,
          oracle: outsider.publicKey,
          gameweek: gameweekPda(id),
          statsCommit: statsPda(id),
        })
        .signers([outsider])
        .rpc(),
      "publish signed by a non-oracle",
      "UnauthorizedOracle"
    );
    await expectFailure(
      publish(id, tree.root, 1, BigInt(PRIZE_LEG) + 1n),
      "allocation larger than the pool",
      "PrizeAllocationTooLarge"
    );
    await expectFailure(
      publish(id, tree.root, 99, tree.total),
      "entry count that does not match the chain",
      "UnexpectedEntryCount"
    );

    await publish(id, tree.root, 1, tree.total);
  });

  it("rejects publish without a prior stats commit", async () => {
    const id = 17;
    await createGameweek(id);
    const player = await fundedPlayer();
    await register(id, player);
    await closeGameweek(id);

    const awards = allocatePrizes(
      BigInt(PRIZE_LEG),
      [{ owner: player.key.publicKey, finalPoints: 44 }],
      id
    );
    const tree = buildResultsTree(id, awardsToLeaves(awards));

    await expectFailure(
      publish(id, tree.root, 1, tree.total),
      "publish with no stats commit on chain"
    );
  });

  it("refuses to settle a tree that pays more than the oracle declared", async () => {
    const id = 10;
    await createGameweek(id);
    const players = [await fundedPlayer(), await fundedPlayer()];
    for (const player of players) await register(id, player);
    await closeGameweek(id);
    await commitStats(id);

    // A root whose leaves total the whole pool, published as if it cost almost nothing.
    const greedy: ResultLeaf[] = [
      { owner: players[0].key.publicKey, rank: 1, finalPoints: 80, amount: BigInt(PRIZE_LEG) },
      { owner: players[1].key.publicKey, rank: 2, finalPoints: 70, amount: BigInt(PRIZE_LEG) },
    ];
    const tree = buildResultsTree(id, greedy);
    expect(tree.total).to.equal(BigInt(PRIZE_LEG) * 2n);

    await publish(id, tree.root, 2, 1n);
    await expectFailure(
      claim(
        id,
        players[0],
        { owner: players[0].key.publicKey, rank: 1, finalPoints: 80, amount: BigInt(PRIZE_LEG) },
        tree.proofs[0]
      ),
      "claim against an over-allocating tree",
      "TreeTotalMismatch"
    );

    // Shrinking the sibling sum to make the total fit breaks the root instead.
    const forged: ProofNode[] = tree.proofs[0].map((node) => ({ hash: node.hash, sum: 0n }));
    await expectFailure(
      claim(
        id,
        players[0],
        { owner: players[0].key.publicKey, rank: 1, finalPoints: 80, amount: 1n },
        forged
      ),
      "claim with understated sibling sums",
      "InvalidMerkleProof"
    );
  });

  it("keeps unclaimed prize money out of treasury withdrawals", async () => {
    const recipient = await fundedPlayer();
    const outstanding = (await program.account.config.fetch(config)).totalPrizeObligation.toNumber();
    const balance = Number((await getAccount(provider.connection, treasuryAta)).amount);
    const withdrawable = balance - outstanding;

    await expectFailure(
      program.methods
        .withdrawTreasury(new anchor.BN(withdrawable + 1))
        .accountsPartial({
          config,
          admin: admin.publicKey,
          usdcMint: mint,
          treasury,
          treasuryAta,
          recipientAta: recipient.ata,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc(),
      "withdrawal that dips into unpaid prizes",
      "OutstandingPrizeObligations"
    );

    if (withdrawable > 0) {
      await program.methods
        .withdrawTreasury(new anchor.BN(withdrawable))
        .accountsPartial({
          config,
          admin: admin.publicKey,
          usdcMint: mint,
          treasury,
          treasuryAta,
          recipientAta: recipient.ata,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
    }
  });

  it("records an immutable stats commitment from the oracle", async () => {
    const id = 8;
    await createGameweek(id);
    const hash = Array.from(keccak_256(Buffer.from("gameweek-8-stats")));
    const uri = "https://movematch.example/stats/8.json";

    await expectFailure(
      program.methods
        .commitStats(hash, uri)
        .accountsPartial({
          config,
          oracle: outsider.publicKey,
          gameweek: gameweekPda(id),
          statsCommit: statsPda(id),
          systemProgram: SystemProgram.programId,
        })
        .signers([outsider])
        .rpc(),
      "stats commit signed by a non-oracle",
      "UnauthorizedOracle"
    );

    await program.methods
      .commitStats(hash, uri)
      .accountsPartial({
        config,
        oracle: oracle.publicKey,
        gameweek: gameweekPda(id),
        statsCommit: statsPda(id),
        systemProgram: SystemProgram.programId,
      })
      .signers([oracle])
      .rpc();

    const commit = await program.account.statsCommit.fetch(statsPda(id));
    expect(commit.uri).to.equal(uri);
    expect(Buffer.from(commit.statsHash)).to.deep.equal(Buffer.from(hash));

    await expectFailure(
      program.methods
        .commitStats(hash, uri)
        .accountsPartial({
          config,
          oracle: oracle.publicKey,
          gameweek: gameweekPda(id),
          statsCommit: statsPda(id),
          systemProgram: SystemProgram.programId,
        })
        .signers([oracle])
        .rpc(),
      "overwriting a published stats commitment"
    );
  });

  it("refunds an entry closed by an admin", async () => {
    const id = 9;
    await createGameweek(id);
    const player = await fundedPlayer();
    await register(id, player);
    expect(Number((await getAccount(provider.connection, player.ata)).amount)).to.equal(
      PLAYER_FUNDING - 1_000_000
    );

    await closeEntry(id, player);

    expect(Number((await getAccount(provider.connection, player.ata)).amount)).to.equal(
      PLAYER_FUNDING
    );
    const gameweek = await program.account.gameweek.fetch(gameweekPda(id));
    expect(gameweek.totalEntries).to.equal(0);
    expect(gameweek.prizePool.toNumber()).to.equal(0);
  });

  function closeEntry(id: number, player: Player) {
    return program.methods
      .closeEntry(id)
      .accountsPartial({
        config,
        admin: admin.publicKey,
        gameweek: gameweekPda(id),
        entry: entryPda(id, player.key.publicKey),
        owner: player.key.publicKey,
        usdcMint: mint,
        treasury,
        treasuryAta,
        houseAuthority: house.publicKey,
        houseAta,
        ownerAta: player.ata,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .signers([house])
      .rpc();
  }

  it("refunds the split that was booked, not the one the current bps would compute", async () => {
    const id = 11;
    await createGameweek(id);
    const player = await fundedPlayer();
    await register(id, player);

    const before = await program.account.config.fetch(config);
    const obligationBefore = BigInt(before.totalPrizeObligation.toString());

    // The house share doubles after the entry was booked at 80/20.
    await program.methods
      .setPrizePoolBps(6_000)
      .accountsPartial({ config, admin: admin.publicKey })
      .rpc();
    try {
      await closeEntry(id, player);

      expect(Number((await getAccount(provider.connection, player.ata)).amount)).to.equal(
        PLAYER_FUNDING
      );
      const gameweek = await program.account.gameweek.fetch(gameweekPda(id));
      expect(gameweek.prizePool.toNumber(), "pool must return to zero, not go negative").to.equal(0);
      const after = await program.account.config.fetch(config);
      expect(BigInt(after.totalPrizeObligation.toString())).to.equal(
        obligationBefore - BigInt(PRIZE_LEG)
      );
    } finally {
      await program.methods
        .setPrizePoolBps(PRIZE_BPS)
        .accountsPartial({ config, admin: admin.publicKey })
        .rpc();
    }
  });

  it("reports a drained house account instead of failing opaquely on refund", async () => {
    const id = 12;
    await createGameweek(id);
    const player = await fundedPlayer();
    await register(id, player);

    const parked = await fundedPlayer();
    const houseBalance = (await getAccount(provider.connection, houseAta)).amount;
    await transfer(provider.connection, admin, houseAta, parked.ata, house, houseBalance);

    await expectFailure(
      closeEntry(id, player),
      "refund with an empty house account",
      "HouseBalanceInsufficient"
    );

    await transfer(provider.connection, admin, parked.ata, houseAta, parked.key, houseBalance);
    await closeEntry(id, player);
    expect(Number((await getAccount(provider.connection, player.ata)).amount)).to.equal(
      PLAYER_FUNDING
    );
  });

  it("keeps admin-only instructions away from other signers", async () => {
    await expectFailure(
      program.methods
        .setFees(new anchor.BN(1))
        .accountsPartial({ config, admin: outsider.publicKey })
        .signers([outsider])
        .rpc(),
      "set_fees by a non-admin",
      "UnauthorizedAdmin"
    );
    await expectFailure(
      program.methods
        .setPrizePoolBps(20_000)
        .accountsPartial({ config, admin: admin.publicKey })
        .rpc(),
      "basis points above 10000",
      "InvalidBasisPoints"
    );
    await program.methods
      .removeAdmin(initializer.publicKey)
      .accountsPartial({ config, admin: admin.publicKey })
      .rpc();
    await expectFailure(
      program.methods
        .removeAdmin(admin.publicKey)
        .accountsPartial({ config, admin: admin.publicKey })
        .rpc(),
      "removing the last admin",
      "CannotRemoveLastAdmin"
    );
    await expectFailure(
      program.methods
        .setOracle(PublicKey.default)
        .accountsPartial({ config, admin: admin.publicKey })
        .rpc(),
      "handing the oracle role to the default pubkey",
      "InvalidOracle"
    );
  });

  it("accepts a World Cup tour id after an EPL one", async () => {
    await createGameweek(WC_R16_TOUR_ID);
    await createGameweek(13);
    const wc = await program.account.gameweek.fetch(gameweekPda(WC_R16_TOUR_ID));
    expect(wc.id).to.equal(WC_R16_TOUR_ID);
    const epl = await program.account.gameweek.fetch(gameweekPda(13));
    expect(epl.id).to.equal(13);
    const state = await program.account.config.fetch(config);
    expect(state.currentGameweek).to.equal(WC_R16_TOUR_ID);
  });

  describe("golden: prize distribution against src/lib/prize-distribution.ts", () => {
    it("pays a three-way tie with a remainder exactly as the module allocates", async () => {
      const id = 14;
      // A sponsor of 8 units nudges the 65% group total to a value that leaves a
      // remainder of 2 across three tied wallets, which is where a "give it all to
      // the first" rule and the real one disagree.
      const points = [90, 90, 90, 50, 50, 10];
      const { players, pool, awards, tree } = await runTour(id, points, 8n);

      expect(pool).to.equal(BigInt(PRIZE_LEG) * 6n + 8n);
      const amounts = awards.map((award) => award.amount);
      expect(awards.map((award) => award.rank)).to.deep.equal([1, 1, 1, 4, 4, 6]);
      expect(amounts[0] - amounts[2]).to.equal(1n);
      expect(amounts[1] - amounts[2]).to.equal(1n);
      expect(sumPrizeAwards(awards)).to.equal(tree.total);

      const before = await Promise.all(
        players.map(async (player) =>
          BigInt((await getAccount(provider.connection, player.ata)).amount)
        )
      );
      for (let index = 0; index < awards.length; index += 1) {
        const player = players.find((candidate) =>
          candidate.key.publicKey.equals(awards[index].owner)
        )!;
        await claim(id, player, awards[index], tree.proofs[index]);
      }
      for (let index = 0; index < players.length; index += 1) {
        const award = awards.find((candidate) =>
          candidate.owner.equals(players[index].key.publicKey)
        )!;
        const after = BigInt((await getAccount(provider.connection, players[index].ata)).amount);
        expect(after - before[index], `payout for player ${index}`).to.equal(award.amount);
      }

      const gameweek = await program.account.gameweek.fetch(gameweekPda(id));
      expect(gameweek.prizeClaimed.toString()).to.equal(sumPrizeAwards(awards).toString());
    });

    it("releases the share the tier table never assigned", async () => {
      const id = 15;
      const { pool, tree } = await runTour(id, [70, 60, 50]);
      // Three entrants only occupy ranks 1-3, so 35% of the pool is never allocated.
      expect(tree.total < pool, "expected an unallocated remainder").to.equal(true);

      const before = await program.account.config.fetch(config);
      await program.methods
        .releaseUnallocated()
        .accountsPartial({ config, admin: admin.publicKey, gameweek: gameweekPda(id) })
        .rpc();
      const after = await program.account.config.fetch(config);

      const released =
        BigInt(before.totalPrizeObligation.toString()) -
        BigInt(after.totalPrizeObligation.toString());
      expect(released).to.equal(pool - tree.total);

      const gameweek = await program.account.gameweek.fetch(gameweekPda(id));
      expect(gameweek.prizePool.toString()).to.equal(tree.total.toString());

      await expectFailure(
        program.methods
          .releaseUnallocated()
          .accountsPartial({ config, admin: admin.publicKey, gameweek: gameweekPda(id) })
          .rpc(),
        "releasing surplus twice",
        "NoUnallocatedSurplus"
      );
    });

    it("matches the module for every tie shape the tier table can produce", () => {
      const shapes: number[][] = [
        [10],
        [10, 10],
        [10, 10, 10],
        [50, 40, 40, 40, 30, 20, 20, 10, 10, 10, 5, 5],
        [9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9, 9],
        [100, 90, 80, 70, 60, 50, 40, 30, 20, 10, 5],
      ];
      for (const pool of [1_000_000n, 4_800_008n, 7n, 999_999_999_999n]) {
        for (const shape of shapes) {
          const standings = shape.map((finalPoints, index) => ({
            owner: `wallet-${index}`,
            finalPoints,
          }));
          const awards = allocatePrizes(pool, standings, 1);
          expect(awards.length).to.equal(shape.length);
          // Never over-allocates: the tier table sums to 100% and every group floors.
          expect(sumPrizeAwards(awards) <= pool, "allocation exceeded the pool").to.equal(true);
          // Competition ranking.
          let expectedRank = 1;
          for (let index = 0; index < awards.length; index += 1) {
            if (index > 0 && awards[index].finalPoints !== awards[index - 1].finalPoints) {
              expectedRank = index + 1;
            }
            expect(awards[index].rank).to.equal(expectedRank);
          }
          // Inside one tie the spread is at most a single unit, biased to sort order.
          for (let index = 1; index < awards.length; index += 1) {
            if (awards[index].rank !== awards[index - 1].rank) continue;
            const delta = awards[index - 1].amount - awards[index].amount;
            expect(delta === 0n || delta === 1n, "tie spread must be 0 or 1").to.equal(true);
          }
        }
      }
    });

    it("uses the World Cup tier override for World Cup tour ids", () => {
      expect(getPrizeTiers(WC_R16_TOUR_ID).length).to.equal(5);
      expect(DEFAULT_PRIZE_TIERS.length).to.equal(10);
      const standings = Array.from({ length: 8 }, (_, index) => ({
        owner: `w${index}`,
        finalPoints: 100 - index,
      }));
      const wc = allocatePrizes(1_000_000n, standings, WC_R16_TOUR_ID);
      expect(wc.slice(5).every((award) => award.amount === 0n)).to.equal(true);
      expect(sumPrizeAwards(wc)).to.equal(1_000_000n);
      const epl = allocatePrizes(1_000_000n, standings, 1);
      expect(epl[7].amount > 0n, "rank 8 is inside the default tier table").to.equal(true);
    });
  });

  describe("golden: scoring against src/lib/chainAlignedScoring.ts", () => {
    it("settles on the points the real scoring module derives from the stored squad", async () => {
      const id = 16;
      await createGameweek(id);
      const player = await fundedPlayer();
      await register(id, player);
      await closeGameweek(id);
      await commitStats(id);

      const entry = await program.account.entry.fetch(entryPda(id, player.key.publicKey));
      const playerIds: number[] = entry.playerIds.map((value: number) => Number(value));
      const positions: number[] = entry.positions.map((value: number) => Number(value));

      const stats: Record<string, Record<string, unknown>> = {};
      for (const playerId of playerIds.slice(0, 11)) {
        stats[playerId] = { minutes_played: 90, goals: 1, assists: 1, rating: 7.5 };
      }
      // The stored bytes go straight into the scoring module: the program shares the
      // 0..3 position encoding with the Move contract and the TypeScript catalog.
      const finalPoints = previewTourPointsFromRegisteredTeam(
        { playerIds, playerPositions: positions },
        stats
      );
      expect(finalPoints).to.be.greaterThan(0);

      const gameweek = await program.account.gameweek.fetch(gameweekPda(id));
      const awards = allocatePrizes(
        BigInt(gameweek.prizePool.toString()),
        [{ owner: player.key.publicKey, finalPoints }],
        id
      );
      const tree = buildResultsTree(id, awardsToLeaves(awards));
      await publish(id, tree.root, 1, tree.total);

      // The leaf commits to the points, so an off-by-one score cannot be claimed.
      await expectFailure(
        claim(id, player, { ...awards[0], finalPoints: finalPoints + 1 }, tree.proofs[0]),
        "claim with points the oracle did not publish",
        "InvalidMerkleProof"
      );

      await claim(id, player, awards[0], tree.proofs[0]);
      const receipt = await program.account.claimReceipt.fetch(
        claimPda(id, player.key.publicKey)
      );
      expect(receipt.amount.toString()).to.equal(awards[0].amount.toString());
      expect(receipt.rank).to.equal(1);
    });
  });
});
