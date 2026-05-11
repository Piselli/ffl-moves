/**
 * Compare on-chain TeamResult vs naive XI sum vs contract-style preview for one wallet + GW.
 *
 * Usage:
 *   npx tsx scripts/diag-wallet-gw.ts 0x... 36
 *
 * Loads `.env.local` into process.env before importing movement (env is read at module init).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadDotEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return;
  const raw = fs.readFileSync(p, "utf8");
  for (const line of raw.split("\n")) {
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
  const wallet = process.argv[2];
  const gw = Number(process.argv[3] || "36");
  if (!wallet || !/^0x[a-fA-F0-9]{64}$/.test(wallet)) {
    console.error("Usage: npx tsx scripts/diag-wallet-gw.ts 0x<64hex> [gwId]");
    process.exit(1);
  }

  const { getConfig, getGameweek, getTeamResult, getUserTeam, getGameweekStats } = await import(
    "../src/lib/movement",
  );
  const { calculateFantasyPointsWithRating } = await import("../src/lib/scoring");
  const { previewTourPointsFromRegisteredTeam } = await import("../src/lib/chainAlignedScoring");

  const cfg = await getConfig();
  console.log("RPC/module from env (see constants): loaded movement client");
  console.log("get_config.currentGameweek:", cfg?.currentGameweek);
  const g = await getGameweek(gw);
  console.log("get_gameweek:", g);

  const tr = await getTeamResult(wallet, gw);
  console.log("\nget_team_result:", tr);

  const team = await getUserTeam(wallet, gw);
  if (!team?.playerIds?.length) {
    console.log("\nNo get_user_team — stop.");
    process.exit(0);
  }

  console.log("\nplayerIds (14 slots):", team.playerIds.join(","));
  console.log("playerPositions:", team.playerPositions.join(","));

  const statsMap = await getGameweekStats(gw, team.playerIds);
  const chainRecord: Record<string, Record<string, unknown>> = {};
  for (const id of team.playerIds) {
    const row = statsMap[id];
    if (row) chainRecord[String(id)] = row as Record<string, unknown>;
  }

  let naiveXi = 0;
  for (let i = 0; i < 11; i++) {
    const pid = team.playerIds[i];
    const posId = team.playerPositions[i] ?? 2;
    const s = statsMap[pid];
    const pts = s ? calculateFantasyPointsWithRating({ positionId: posId }, s as Record<string, unknown>) : 0;
    naiveXi += pts;
    console.log(`  slot ${i} id=${pid} pos=${posId} naive+fantasyPts=${pts}`);
  }

  const preview = previewTourPointsFromRegisteredTeam(team, chainRecord);

  console.log("\n--- Summary ---");
  console.log("Naive sum (per-player fantasy+cards):", naiveXi);
  console.log("previewTourPointsFromRegisteredTeam (Move pre-mult):", preview);
  console.log("On-chain finalPoints:", tr?.finalPoints ?? "(null)");
  console.log("On-chain basePoints:", tr?.basePoints, "ratingBonus:", tr?.ratingBonus);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
