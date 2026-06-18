/**
 * Audit MD1 (10001) prize payouts: on-chain owed vs prior claim txs vs vault balance.
 * Usage: npx tsx scripts/audit-wc-md1-payouts.ts
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");
const TOUR_ID = 10001;

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

function fmt(raw: number): string {
  return (raw / 1_000_000).toFixed(2);
}

function short(a: string): string {
  const t = a.toLowerCase();
  return `${t.slice(0, 6)}…${t.slice(-4)}`;
}

async function main() {
  const {
    getGameweek,
    getGameweekTeams,
    getTeamResult,
    hasAdminMarkPrizeClaimedOnChain,
    getConfig,
  } = await import("../src/lib/movement");
  const { fetchOwnersWithClaimPrizeTx, normTourOwnerAddr } = await import("../src/lib/tourClaimHistory");
  const { MODULE_ADDRESS, USDCX_METADATA_MAINNET } = await import("../src/lib/constants");

  const rpc = (process.env.NEXT_PUBLIC_MOVEMENT_RPC_URL ?? "").replace(/\/$/, "");
  const adminMark = await hasAdminMarkPrizeClaimedOnChain();
  console.log(`RPC: ${rpc}`);
  console.log(`admin_mark_prize_claimed on-chain: ${adminMark ? "YES" : "NO"}\n`);

  const gw = await getGameweek(TOUR_ID);
  if (!gw) throw new Error(`Tour ${TOUR_ID} not found`);
  console.log(`Tour ${TOUR_ID}: status=${gw.status}, entries=${gw.totalEntries}, prizePool=${fmt(gw.prizePool)} USDCx`);

  const cfg = await getConfig();
  console.log(`Config currentGameweek: ${cfg?.currentGameweek}\n`);

  const addresses = await getGameweekTeams(TOUR_ID);
  const results = (
    await Promise.all(addresses.map((addr) => getTeamResult(addr, TOUR_ID)))
  ).filter((r): r is NonNullable<typeof r> => r !== null && r.prizeAmount > 0);

  results.sort((a, b) => a.rank - b.rank || b.finalPoints - a.finalPoints);

  const priorClaimed = await fetchOwnersWithClaimPrizeTx(TOUR_ID, addresses);

  // Prize vault = TreasuryAuth resource account (see on-chain module resources)
  const vaultAddr = "0xac081691b6cde5194bceabcefae3e3e91b26cd3d0632474ef21f8e9a584d1ca4";
  console.log(`Prize vault address: ${vaultAddr}`);

  let vaultBalance = 0;
  try {
    const res = await fetch(`${rpc}/accounts/${vaultAddr}/balance/${USDCX_METADATA_MAINNET}`);
    if (res.ok) {
      const text = await res.text();
      vaultBalance = Number(text.replace(/"/g, "").trim() || 0);
    }
  } catch (e) {
    console.warn("Could not read vault balance:", e);
  }
  console.log(`Vault USDCx balance: ${fmt(vaultBalance)} USDCx\n`);

  const totalOwed = results.reduce((s, r) => s + r.prizeAmount, 0);
  let totalPaidOnChain = 0;
  let totalPaidViaTx = 0;
  let unclaimedOwed = 0;

  console.log("Rank | Wallet        | Pts | Prize   | on-chain claimed | prior claim tx | action");
  console.log("-----|---------------|-----|---------|------------------|----------------|-------");

  const needMark: string[] = [];

  for (const r of results) {
    const norm = normTourOwnerAddr(r.owner);
    const hadTx = priorClaimed.has(norm);
    const effectiveClaimed = r.claimed || hadTx;

    if (r.claimed) totalPaidOnChain += r.prizeAmount;
    if (hadTx) totalPaidViaTx += r.prizeAmount;
    if (!effectiveClaimed) unclaimedOwed += r.prizeAmount;

    let action = "—";
    if (hadTx && !r.claimed) {
      action = "MARK in admin";
      needMark.push(r.owner);
    } else if (effectiveClaimed) {
      action = "done";
    } else {
      action = "awaiting claim";
    }

    console.log(
      `#${String(r.rank).padStart(2)} | ${short(r.owner).padEnd(13)} | ${String(r.finalPoints).padStart(3)} | ${fmt(r.prizeAmount).padStart(7)} | ${String(r.claimed).padEnd(16)} | ${String(hadTx).padEnd(14)} | ${action}`,
    );
  }

  console.log("\n--- Summary ---");
  console.log(`Total prize pool (top-10): ${fmt(totalOwed)} USDCx`);
  console.log(`On-chain claimed flag sum: ${fmt(totalPaidOnChain)} USDCx`);
  console.log(`Wallets with claim_prize tx: ${priorClaimed.size} (${fmt(totalPaidViaTx)} USDCx at current prize amounts)`);
  console.log(`Still unclaimed (current amounts): ${fmt(unclaimedOwed)} USDCx`);
  console.log(`Vault balance: ${fmt(vaultBalance)} USDCx`);

  const shortfall = unclaimedOwed - vaultBalance;
  if (shortfall > 0) {
    console.log(`\n⚠️  Vault shortfall for remaining claims: ~${fmt(shortfall)} USDCx`);
  } else {
    console.log(`\n✓ Vault covers remaining claims (surplus ~${fmt(-shortfall)} USDCx)`);
  }

  // Overpayment: people who claimed pre-recalc at higher amounts
  console.log("\n--- Wallets to mark in Admin (Mark prize already claimed) ---");
  if (!adminMark) {
    console.log("Deploy contract with admin_mark_prize_claimed first, then mark these in /admin:");
  } else {
    console.log("Admin → section «Mark prize already claimed» (GW + owner):");
  }
  if (needMark.length === 0) {
    console.log("(none — all prior claimants already have on-chain claimed=true)");
  } else {
    const unique = [...new Set(needMark.map((a) => a.toLowerCase()))];
    for (const addr of unique) {
      console.log(`  tour=${TOUR_ID}  owner=${addr}`);
    }
  }

  // Also list ALL prior claim tx wallets even if on-chain claimed=true
  console.log("\n--- All wallets with successful claim_prize tx for tour ---");
  for (const addr of [...priorClaimed].sort()) {
    const r = results.find((x) => normTourOwnerAddr(x.owner) === addr);
    console.log(`  ${addr}  rank=#${r?.rank ?? "?"}  prize=${r ? fmt(r.prizeAmount) : "?"} USDCx  on-chain claimed=${r?.claimed ?? "?"}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
