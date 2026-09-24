#!/usr/bin/env node
/**
 * Prints Phantom-importable base58 secrets for ops keypairs.
 * Writes ONLY to solana/movematch/.keys/PHANTOM-IMPORT.txt (gitignored).
 *
 *   node scripts/print-phantom-import-keys.mjs
 *
 * Never paste the output into chat or commit it.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const keysDir = resolve(root, "solana/movematch/.keys");

const ALPH = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
function b58encode(bytes) {
  let n = 0n;
  for (const b of bytes) n = (n << 8n) + BigInt(b);
  let s = "";
  while (n > 0n) {
    const r = n % 58n;
    n /= 58n;
    s = ALPH[Number(r)] + s;
  }
  for (const b of bytes) {
    if (b === 0) s = "1" + s;
    else break;
  }
  return s || "1";
}

const roles = [
  ["ADMIN — /admin create/close/fees", "initializer.json"],
  ["ORACLE — commit/publish results", "oracle.json"],
  ["HOUSE — platform fee (20%), withdraw your earnings", "house.json"],
  ["DEPLOYER — program upgrades only", "deployer.json"],
];

const lines = [
  "SECRET — do not share, do not commit.",
  "Phantom → Add / Connect wallet → Import Private Key → paste private_key_base58",
  `Generated: ${new Date().toISOString()}`,
  "",
];

for (const [label, file] of roles) {
  const raw = Uint8Array.from(JSON.parse(readFileSync(resolve(keysDir, file), "utf8")));
  if (raw.length !== 64) throw new Error(`${file}: expected 64-byte secret keypair`);
  const pubkey = b58encode(raw.slice(32));
  lines.push(`=== ${label} ===`);
  lines.push(`file: ${file}`);
  lines.push(`address: ${pubkey}`);
  lines.push("private_key_base58:");
  lines.push(b58encode(raw));
  lines.push("");
}

const out = resolve(keysDir, "PHANTOM-IMPORT.txt");
writeFileSync(out, lines.join("\n"), { mode: 0o600 });
console.log(`Wrote ${out}`);
console.log("Open that file on your machine. Do not paste keys into chat.");
