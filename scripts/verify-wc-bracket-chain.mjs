#!/usr/bin/env node
/**
 * Verify WC bracket challenge is live on Movement mainnet.
 * Exit 0 = fully ready for user submissions; exit 1 = missing steps.
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
const BRACKET_GW = 10999;
const EXPECTED_POOL = 500_000_000;

const BRACKET_ENTRIES = [
  "register_bracket_prediction",
  "admin_init_bracket_challenge",
  "admin_close_bracket_challenge",
  "admin_resolve_bracket_challenge",
  "claim_bracket_prize",
];

async function view(fn, args = []) {
  const res = await fetch(`${RPC}/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      function: `${MODULE}::fantasy_epl::${fn}`,
      type_arguments: [],
      arguments: args,
    }),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.message || JSON.stringify(data));
  return data;
}

async function main() {
  console.log(`RPC:    ${RPC}`);
  console.log(`Module: ${MODULE}\n`);

  let ok = true;

  const modRes = await fetch(`${RPC}/accounts/${MODULE}/module/fantasy_epl`);
  if (!modRes.ok) {
    console.log("✗ fantasy_epl module not found");
    process.exit(1);
  }
  const mod = await modRes.json();
  const entries = new Set(
    (mod.abi?.exposed_functions ?? []).filter((f) => f.is_entry).map((f) => f.name),
  );

  for (const name of BRACKET_ENTRIES) {
    if (entries.has(name)) {
      console.log(`✓ entry ${name}`);
    } else {
      console.log(`✗ missing entry ${name} — run package upgrade first`);
      ok = false;
    }
  }

  let status = 255;
  try {
    status = Number((await view("bracket_challenge_status"))[0]);
  } catch {
    console.log("✗ bracket_challenge_status view failed");
    ok = false;
  }

  const statusLabel =
    status === 255 ? "not initialized" : status === 0 ? "OPEN" : status === 1 ? "CLOSED" : status === 2 ? "RESOLVED" : `unknown(${status})`;
  console.log(`\nBracket status: ${statusLabel} (${status})`);
  if (status !== 0) {
    console.log("  → run admin_init_bracket_challenge with module wallet");
    ok = false;
  }

  try {
    const entriesN = Number((await view("bracket_challenge_entries"))[0]);
    console.log(`Entries: ${entriesN}`);
  } catch {
    /* optional */
  }

  try {
    const gw = await view("get_gameweek", [String(BRACKET_GW)]);
    const pool = Number(gw[2] ?? 0);
    console.log(`\nGW ${BRACKET_GW} prize_pool: ${pool} micro-USDCx (expected ${EXPECTED_POOL})`);
    if (pool < EXPECTED_POOL) {
      console.log("  → create_gameweek(10999) + admin_sponsor_prize_pool(10999, 500000000)");
      ok = false;
    }
  } catch {
    console.log(`\n✗ GW ${BRACKET_GW} not found — run create_gameweek(${BRACKET_GW})`);
    ok = false;
  }

  console.log("");
  if (ok) {
    console.log("✓ Bracket challenge is LIVE — users can submit at /world-cup/bracket");
    process.exit(0);
  }
  console.log("✗ Not ready yet — follow scripts/deploy-wc-bracket-mainnet.sh or /admin Bracket section");
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
