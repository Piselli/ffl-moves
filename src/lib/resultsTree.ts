/**
 * Settlement tree the `movematch` program verifies in `claim_prize`.
 * Must stay byte-identical to `result_leaf` / `verify_proof` in
 * `solana/movematch/programs/movematch/src/lib.rs`.
 *
 * It is a *sum* tree: every internal node commits to both child hashes and both
 * child sums, so one proof lets the program add up the whole tree and compare it
 * against the allocation the oracle published. Leaf and internal pre-images carry
 * different domain tags and different lengths.
 */
import { keccak_256 } from "@noble/hashes/sha3.js";
import { PublicKey } from "@solana/web3.js";
import { Buffer } from "buffer";

const LEAF_DOMAIN = 0x00;
const NODE_DOMAIN = 0x01;

/** Mirrors `MAX_PROOF_LEN`; a deeper tree cannot be settled on-chain. */
export const MAX_PROOF_LEN = 32;

export type ResultLeaf = {
  owner: string;
  rank: number;
  finalPoints: number;
  amount: bigint;
};

export type ProofNode = { hash: Buffer; sum: bigint };

export type ResultsTree = {
  root: Buffer;
  /** Prize money committed by the root; the program requires it to equal `prize_allocated`. */
  total: bigint;
  /** Proof for each leaf, in the order the leaves were supplied. */
  proofs: ProofNode[][];
};

export function u32le(value: number): Buffer {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32LE(value);
  return buffer;
}

export function u64le(value: bigint): Buffer {
  const buffer = Buffer.alloc(8);
  buffer.writeBigUInt64LE(value);
  return buffer;
}

export function resultLeafHash(gameweekId: number, leaf: ResultLeaf): Buffer {
  return Buffer.from(
    keccak_256(
      Buffer.concat([
        Buffer.from([LEAF_DOMAIN]),
        new PublicKey(leaf.owner).toBuffer(),
        u32le(gameweekId),
        u32le(leaf.rank),
        u32le(leaf.finalPoints),
        u64le(leaf.amount),
      ]),
    ),
  );
}

function joinNodes(a: ProofNode, b: ProofNode): ProofNode {
  const [low, high] = Buffer.compare(a.hash, b.hash) <= 0 ? [a, b] : [b, a];
  return {
    hash: Buffer.from(
      keccak_256(
        Buffer.concat([
          Buffer.from([NODE_DOMAIN]),
          low.hash,
          u64le(low.sum),
          high.hash,
          u64le(high.sum),
        ]),
      ),
    ),
    sum: a.sum + b.sum,
  };
}

export function buildResultsTree(gameweekId: number, leaves: ResultLeaf[]): ResultsTree {
  if (leaves.length === 0) throw new Error("a results tree needs at least one leaf");

  const proofs: ProofNode[][] = leaves.map(() => []);
  let level: ProofNode[] = leaves.map((leaf) => ({
    hash: resultLeafHash(gameweekId, leaf),
    sum: leaf.amount,
  }));
  let covered: number[][] = leaves.map((_, index) => [index]);

  while (level.length > 1) {
    const next: ProofNode[] = [];
    const nextCovered: number[][] = [];
    for (let i = 0; i < level.length; i += 2) {
      // An odd node is promoted unchanged: duplicating it would double-count its sum.
      if (i + 1 === level.length) {
        next.push(level[i]);
        nextCovered.push(covered[i]);
        continue;
      }
      for (const leafIndex of covered[i]) proofs[leafIndex].push(level[i + 1]);
      for (const leafIndex of covered[i + 1]) proofs[leafIndex].push(level[i]);
      next.push(joinNodes(level[i], level[i + 1]));
      nextCovered.push([...covered[i], ...covered[i + 1]]);
    }
    level = next;
    covered = nextCovered;
  }

  return { root: level[0].hash, total: level[0].sum, proofs };
}

/**
 * Replays the on-chain check: folds the proof into a root and returns the prize
 * total the root commits to, or `null` when the proof does not reconstruct `root`.
 */
export function verifyResultProof(
  gameweekId: number,
  leaf: ResultLeaf,
  proof: readonly ProofNode[],
  root: Buffer,
): bigint | null {
  if (proof.length > MAX_PROOF_LEN) return null;
  let node: ProofNode = { hash: resultLeafHash(gameweekId, leaf), sum: leaf.amount };
  for (const sibling of proof) node = joinNodes(node, sibling);
  return node.hash.equals(root) ? node.sum : null;
}
