/**
 * After publishing `admin_mark_prize_claimed` on-chain, mark wallets that already
 * received MD1 payout so `claim_prize` aborts on-chain (not just UI).
 *
 * Usage (admin wallet connected via CLI or run from admin with wallet):
 *   npx tsx scripts/admin-mark-tour-claims.ts 10001 0xabc… 0xdef…
 *
 * MD1 known prior claimants (2026-06-18):
 *   0x9c65963eb8f79c29301a5585416730bff7e0172cd7fcea343a408d15353cc038
 *   0xc40d711f94276d4b11a5ff701b249448df5252e969008653980e34c0408a1589
 *   0xc6b20dcf3360646c3354a8bdf9c735bbd51bf5b0fd006f7bf2a342250b193d6b
 *   0x1edde68e12c62c1cd1dcf96ccd48f4f985d90d48966076a790555f5a1a79fd6d
 *   0x7ad9f5da6ca1ee06741e2294e6541d12be3e9e8fe46c66b31bb6935baff695b2
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

async function main() {
  const tourId = Number(process.argv[2]);
  const owners = process.argv.slice(3);
  if (!Number.isFinite(tourId) || owners.length === 0) {
    console.error("Usage: npx tsx scripts/admin-mark-tour-claims.ts <tourId> <owner0x…> …");
    process.exit(1);
  }

  const { hasAdminMarkPrizeClaimedOnChain } = await import("../src/lib/movement");
  const onChain = await hasAdminMarkPrizeClaimedOnChain();
  if (!onChain) {
    console.error("admin_mark_prize_claimed is NOT on mainnet yet — publish contract upgrade first.");
    process.exit(1);
  }

  console.log(`Tour ${tourId}: mark claimed for ${owners.length} wallet(s)`);
  console.log("Submit each via admin panel or Movement CLI entry function admin_mark_prize_claimed.");
  for (const owner of owners) {
    console.log(`  admin_mark_prize_claimed(${tourId}, ${owner})`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
