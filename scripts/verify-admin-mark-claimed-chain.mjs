#!/usr/bin/env node
/**
 * Verify admin_mark_prize_claimed is in the on-chain fantasy_epl ABI.
 * Exit 0 = ready to mark wallets in /admin or via mark-md1 script.
 */

import { readFileSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, "..");

function loadEnvLocal() {
  const p = resolve(root, ".env.local");
  if (!existsSync(p)) return {};
  const out = {};
  for (const line of readFileSync(p, "utf8").split("\n")) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
    if (!m) continue;
    out[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return out;
}

const env = { ...loadEnvLocal(), ...process.env };
const RPC = (env.NEXT_PUBLIC_MOVEMENT_RPC_URL || "https://mainnet.movementnetwork.xyz/v1").replace(/\/$/, "");
const MODULE = (
  env.NEXT_PUBLIC_MODULE_ADDRESS || "0xf598f059a0353b0d9ea80c9fd9d1c3e15b71ff4535388dd79acf813b567c5b47"
).toLowerCase();

const FN = "admin_mark_prize_claimed";

async function main() {
  console.log(`RPC:    ${RPC}`);
  console.log(`Module: ${MODULE}\n`);

  const modRes = await fetch(`${RPC}/accounts/${MODULE}/module/fantasy_epl`);
  if (!modRes.ok) {
    console.log("✗ fantasy_epl module not found");
    process.exit(1);
  }
  const mod = await modRes.json();
  const entries = new Set(
    (mod.abi?.exposed_functions ?? []).filter((f) => f.is_entry).map((f) => f.name),
  );

  if (entries.has(FN)) {
    console.log(`✓ entry ${FN} is live on mainnet`);
    console.log("\nNext: npm run md1:mark-prior-claims   (CLI, 3 wallets)");
    console.log("  or /admin → «Mark prize already claimed» for each wallet");
    process.exit(0);
  }

  console.log(`✗ missing entry ${FN}`);
  console.log("\nRun package upgrade first:");
  console.log("  npm run md1:deploy-mark-claimed");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
