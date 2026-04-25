#!/usr/bin/env node
/**
 * Local checks before pointing the app at Movement mainnet.
 * Run: npm run preflight:mainnet
 * Optional: put values in .env.local (same keys as Vercel / .env.example).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadDotEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const raw = fs.readFileSync(p, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

const env = { ...process.env, ...loadDotEnvLocal() };

const RPC = (env.NEXT_PUBLIC_MOVEMENT_RPC_URL || env.NEXT_PUBLIC_APTOS_API || "").trim();
const ADDR = (env.NEXT_PUBLIC_MODULE_ADDRESS || "").trim();
const NAME = (env.NEXT_PUBLIC_MODULE_NAME || "fantasy_epl").trim();

const addrOk = /^0x[a-fA-F0-9]{64}$/.test(ADDR);
const rpcOk = RPC.length > 0 && /^https?:\/\//i.test(RPC);
const rpcLooksTestnet = /testnet|porto\.movementlabs/i.test(RPC);

let exit = 0;
const warn = (m) => console.warn(`⚠️  ${m}`);
const ok = (m) => console.log(`✓ ${m}`);
const fail = (m) => {
  console.error(`✗ ${m}`);
  exit = 1;
};

console.log("Preflight (mainnet readiness)\n");

if (!fs.existsSync(path.join(root, ".env.local"))) {
  warn("No .env.local — using only process.env (e.g. in CI). For local checks, copy .env.example → .env.local.");
}

if (rpcOk) ok(`RPC set (${RPC.slice(0, 48)}…)`);
else fail("Set NEXT_PUBLIC_MOVEMENT_RPC_URL (or NEXT_PUBLIC_APTOS_API) to the mainnet fullnode REST base (…/v1).");

if (addrOk) ok(`NEXT_PUBLIC_MODULE_ADDRESS looks like a 32-byte hex account`);
else fail("NEXT_PUBLIC_MODULE_ADDRESS must be 0x + 64 hex chars (Movement account / package address).");

if (NAME) ok(`NEXT_PUBLIC_MODULE_NAME=${NAME}`);
else warn("NEXT_PUBLIC_MODULE_NAME empty — default fantasy_epl will be used");

if (rpcLooksTestnet && /mainnet/i.test(process.argv.join(" "))) {
  /* no-op: reserved for future --strict-mainnet flag */
}

if (rpcOk && rpcLooksTestnet) {
  warn(
    "RPC URL looks like TESTNET. For mainnet use primary RPC from Movement docs: https://mainnet.movementnetwork.xyz/v1 (Chain ID 126).",
  );
}

if (exit === 0) {
  console.log("\nNext: movement move publish (mainnet profile), then set the same NEXT_PUBLIC_* on Vercel and redeploy.");
  console.log("Endpoints reference: https://docs.movementnetwork.xyz/devs/networkEndpoints");
  console.log("CLI reference: https://docs.movementnetwork.xyz/devs/movementcli");
}

process.exit(exit);
