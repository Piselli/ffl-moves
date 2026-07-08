/**
 * Verify admin_withdraw_legacy_move_from_vault exists on the deployed module ABI.
 * Usage: node scripts/verify-legacy-move-withdraw-chain.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadDotEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
    if (!(k in process.env)) process.env[k] = v;
  }
}

loadDotEnvLocal();

const rpc = (process.env.NEXT_PUBLIC_MOVEMENT_RPC_URL ?? "https://mainnet.movementnetwork.xyz/v1").replace(/\/$/, "");
const moduleAddr =
  process.env.NEXT_PUBLIC_MODULE_ADDRESS ??
  "0xf598f059a0353b0d9ea80c9fd9d1c3e15b71ff4535388dd79acf813b567c5b47";
const moduleName = process.env.NEXT_PUBLIC_MODULE_NAME ?? "fantasy_epl";

async function main() {
  const url = `${rpc}/accounts/${moduleAddr}/module/${encodeURIComponent(moduleName)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Module fetch failed: ${res.status}`);
  const data = await res.json();
  const funcs = data.abi?.exposed_functions ?? [];
  const ok = funcs.some((f) => f.is_entry && f.name === "admin_withdraw_legacy_move_from_vault");
  console.log(`RPC: ${rpc}`);
  console.log(`Module: ${moduleAddr}::${moduleName}`);
  console.log(`admin_withdraw_legacy_move_from_vault: ${ok ? "YES" : "NO"}`);
  if (!ok) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
