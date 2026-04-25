#!/usr/bin/env node
/**
 * Read RPC + module from .env.local (or process.env) and print on-chain get_config / get_gameweek.
 * Run: node scripts/verify-chain.mjs
 * Or with Vercel-style env: NEXT_PUBLIC_MOVEMENT_RPC_URL=... NEXT_PUBLIC_MODULE_ADDRESS=... node scripts/verify-chain.mjs
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
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    out[k] = v;
  }
  return out;
}

const env = { ...loadDotEnvLocal(), ...process.env };
const RPC = (env.NEXT_PUBLIC_MOVEMENT_RPC_URL || env.NEXT_PUBLIC_APTOS_API || "").trim();
const MODULE = (env.NEXT_PUBLIC_MODULE_ADDRESS || "").trim();
const MODNAME = (env.NEXT_PUBLIC_MODULE_NAME || "fantasy_epl").trim();

if (!/^https?:\/\//i.test(RPC)) {
  console.error("Set NEXT_PUBLIC_MOVEMENT_RPC_URL (must include https and …/v1).");
  process.exit(1);
}
if (!/^0x[a-fA-F0-9]{64}$/.test(MODULE)) {
  console.error("Set NEXT_PUBLIC_MODULE_ADDRESS (0x + 64 hex).");
  process.exit(1);
}

async function view(functionId, args = []) {
  const url = `${RPC.replace(/\/$/, "")}/view`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      function: functionId,
      type_arguments: [],
      arguments: args,
    }),
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`${res.status} ${text.slice(0, 400)}`);
  }
  return JSON.parse(text);
}

const addr = MODULE.startsWith("0x") ? MODULE.slice(2) : MODULE;
const fn = (name) => `0x${addr}::${MODNAME}::${name}`;

try {
  console.log("RPC:", RPC);
  console.log("MODULE:", MODULE);
  console.log("");

  const cfg = await view(fn("get_config"));
  console.log("get_config raw:", JSON.stringify(cfg));
  const currentGw = Number(cfg?.[6]);
  console.log("current_gameweek (index 6):", Number.isFinite(currentGw) ? currentGw : "(parse failed)");

  const from = Math.max(1, (Number.isFinite(currentGw) ? currentGw : 1) - 1);
  const to = (Number.isFinite(currentGw) ? currentGw : 1) + 5;
  console.log("\nget_gameweek(id) for ids", from, "..", to);
  for (let id = from; id <= to; id++) {
    try {
      const g = await view(fn("get_gameweek"), [String(id)]);
      const status = Number(g?.[1]);
      const label = status === 0 ? "OPEN" : status === 1 ? "CLOSED" : status === 2 ? "RESOLVED" : `raw_status=${g?.[1]}`;
      console.log(`  GW ${id}: ${label} entries=${g?.[3]} pool=${g?.[2]}`);
    } catch (e) {
      console.log(`  GW ${id}: (missing or error) ${String(e.message).slice(0, 120)}`);
    }
  }
} catch (e) {
  console.error("Failed:", e.message);
  process.exit(1);
}
