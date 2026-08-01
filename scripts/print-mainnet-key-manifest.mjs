/**
 * Print mainnet key roles (pubkeys only). Key files live in solana/movematch/.keys/
 * and are gitignored — back them up offline before mainnet deploy.
 *
 *   node scripts/print-mainnet-key-manifest.mjs
 */
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { Keypair } from "@solana/web3.js";

const keysDir = resolve(dirname(fileURLToPath(import.meta.url)), "../solana/movematch/.keys");

async function pubkey(name) {
  try {
    const secret = JSON.parse(await readFile(resolve(keysDir, name), "utf8"));
    return Keypair.fromSecretKey(Uint8Array.from(secret)).publicKey.toBase58();
  } catch {
    return "(missing — generate with solana-keygen)";
  }
}

const [deployer, initializer, house, oracle] = await Promise.all([
  pubkey("deployer.json"),
  pubkey("initializer.json"),
  pubkey("house.json"),
  pubkey("oracle.json"),
]);

console.log("MoveMatch mainnet key manifest (pubkeys only)\n");
console.log("| Role | File | Pubkey |");
console.log("|------|------|--------|");
console.log(`| Deployer (BPF upload) | deployer.json | ${deployer} |`);
console.log(`| INITIALIZER (lib.rs) | initializer.json | ${initializer} |`);
console.log(`| house_wallet | house.json | ${house} |`);
console.log(`| oracle | oracle.json | ${oracle} |`);
console.log(`| Upgrade authority | Squads multisig | (create at squads.so, then set-upgrade-authority) |`);
console.log("\nAfter initialize: add Squads as admin via add_admin, then transfer upgrade authority.");
console.log("See docs/solana-migration/08-multisig-checklist.md");
