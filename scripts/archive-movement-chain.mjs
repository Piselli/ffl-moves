#!/usr/bin/env node
/**
 * Snapshot all MoveMatch state from the Movement chain into local JSON.
 *
 * This is the only part of the Movement footprint that cannot be restored from
 * git: if the public RPC goes away, the tour history goes with it.
 *
 * Run: node scripts/archive-movement-chain.mjs
 * Env: NEXT_PUBLIC_MOVEMENT_RPC_URL, NEXT_PUBLIC_MODULE_ADDRESS (read from .env.local)
 * Options: --out <dir>  --max-gw <n>  --concurrency <n>
 */
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, "..");

function loadDotEnvLocal() {
  const p = path.join(root, ".env.local");
  if (!fs.existsSync(p)) return {};
  const out = {};
  for (const line of fs.readFileSync(p, "utf8").split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    let v = t.slice(i + 1).trim();
    if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) {
      v = v.slice(1, -1);
    }
    out[t.slice(0, i).trim()] = v;
  }
  return out;
}

function arg(name, fallback) {
  const i = process.argv.indexOf(`--${name}`);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : fallback;
}

const env = { ...loadDotEnvLocal(), ...process.env };
const RPC = (env.NEXT_PUBLIC_MOVEMENT_RPC_URL || env.NEXT_PUBLIC_APTOS_API || "").trim().replace(/\/$/, "");
const MODULE = (env.NEXT_PUBLIC_MODULE_ADDRESS || "").trim();
const MODNAME = (env.NEXT_PUBLIC_MODULE_NAME || "fantasy_epl").trim();

if (!/^https?:\/\//i.test(RPC)) {
  console.error("Set NEXT_PUBLIC_MOVEMENT_RPC_URL (https, ending in /v1).");
  process.exit(1);
}
if (!/^0x[a-fA-F0-9]{64}$/.test(MODULE)) {
  console.error("Set NEXT_PUBLIC_MODULE_ADDRESS (0x + 64 hex).");
  process.exit(1);
}

const CONCURRENCY = Number(arg("concurrency", "6"));
const MAX_EPL_GW = Number(arg("max-gw", "45"));
const WC_TOURS = [10001, 10002, 10003, 10004, 10005, 10006, 10007, 10008, 10999];

const stamp = new Date().toISOString().slice(0, 10);
const outDir = path.resolve(root, arg("out", path.join("archive", "movement-snapshot", stamp)));

const fn = (name) => `${MODULE}::${MODNAME}::${name}`;

let viewCalls = 0;
async function view(functionId, args = [], { optional = false } = {}) {
  viewCalls += 1;
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      const res = await fetch(`${RPC}/view`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ function: functionId, type_arguments: [], arguments: args }),
      });
      if (res.ok) return await res.json();
      const text = await res.text();
      // Missing resource / unknown function: nothing to archive, not a transport error.
      if (res.status === 400 && optional) return null;
      if (res.status >= 500 || res.status === 429) throw new Error(`${res.status} ${text.slice(0, 200)}`);
      if (optional) return null;
      throw new Error(`${functionId} → ${res.status} ${text.slice(0, 300)}`);
    } catch (err) {
      if (attempt === 3) {
        if (optional) return null;
        throw err;
      }
      await new Promise((r) => setTimeout(r, 400 * 2 ** attempt));
    }
  }
  return null;
}

async function mapPool(items, worker) {
  const out = new Array(items.length);
  let cursor = 0;
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, items.length) }, async () => {
      while (cursor < items.length) {
        const i = cursor++;
        out[i] = await worker(items[i], i);
      }
    }),
  );
  return out;
}

const files = [];
function writeJson(relPath, data) {
  const abs = path.join(outDir, relPath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  const body = `${JSON.stringify(data, null, 2)}\n`;
  fs.writeFileSync(abs, body);
  files.push({ path: relPath, bytes: Buffer.byteLength(body), sha256: crypto.createHash("sha256").update(body).digest("hex") });
}

async function ledgerInfo() {
  const res = await fetch(`${RPC}/`);
  if (!res.ok) throw new Error(`ledger info ${res.status}`);
  return res.json();
}

async function moduleAbi() {
  const res = await fetch(`${RPC}/accounts/${MODULE}/module/${encodeURIComponent(MODNAME)}`);
  if (!res.ok) return null;
  return res.json();
}

async function archiveGameweek(id, ownerAccumulator) {
  const gw = await view(fn("get_gameweek"), [String(id)], { optional: true });
  if (!gw) return null;
  const [gwId, status, prizePool, totalEntries] = gw;
  const teams = (await view(fn("get_gameweek_teams"), [String(id)], { optional: true })) ?? [[]];
  const owners = Array.isArray(teams[0]) ? teams[0] : [];
  owners.forEach((o) => ownerAccumulator.add(o));

  const squads = await mapPool(owners, async (owner) => {
    const team = await view(fn("get_user_team"), [owner, String(id)], { optional: true });
    if (!team) return null;
    return { owner, playerIds: team[0], positions: team[1] };
  });

  const results = await mapPool(owners, async (owner) => {
    const r = await view(fn("get_team_result"), [owner, String(id)], { optional: true });
    if (!r) return null;
    return {
      owner,
      basePoints: r[0],
      ratingBonus: r[1],
      ratingBonusNegative: r[2],
      titleTriggered: r[3],
      titleMultiplier: r[4],
      guildTriggered: r[5],
      guildMultiplier: r[6],
      finalPoints: r[7],
      rank: r[8],
      prizeAmount: r[9],
      claimed: r[10],
    };
  });

  const playerIds = [...new Set(squads.filter(Boolean).flatMap((s) => s.playerIds.map(String)))];
  const stats = await mapPool(playerIds, async (playerId) => {
    const s = await view(fn("get_player_stats"), [String(id), playerId], { optional: true });
    if (!s) return null;
    return {
      playerId,
      position: s[0],
      minutesPlayed: s[1],
      goals: s[2],
      assists: s[3],
      cleanSheet: s[4],
      saves: s[5],
      penaltiesSaved: s[6],
      penaltiesMissed: s[7],
      ownGoals: s[8],
      yellowCards: s[9],
      redCards: s[10],
      rating: s[11],
      tackles: s[12],
      interceptions: s[13],
      successfulDribbles: s[14],
      freeKickGoals: s[15],
      goalsConceded: s[16],
      fplBonus: s[17],
      fplCleanSheet: s[18],
    };
  });

  writeJson(`gameweeks/${id}.json`, {
    id: Number(gwId),
    status: Number(status),
    prizePool: String(prizePool),
    totalEntries: Number(totalEntries),
    owners,
  });
  writeJson(`teams/${id}.json`, squads.filter(Boolean));
  writeJson(`results/${id}.json`, results.filter(Boolean));
  writeJson(`stats/${id}.json`, stats.filter(Boolean));

  return { id: Number(gwId), status: Number(status), owners: owners.length, results: results.filter(Boolean).length };
}

async function main() {
  console.log(`RPC     ${RPC}`);
  console.log(`module  ${MODULE}::${MODNAME}`);
  console.log(`out     ${outDir}\n`);

  const ledger = await ledgerInfo();
  const abi = await moduleAbi();
  if (!abi) {
    console.error("Module not found on this RPC — check network and module address.");
    process.exit(1);
  }

  const config = await view(fn("get_config"));
  const entryAsset = await view(fn("get_entry_fee_asset"), [], { optional: true });
  writeJson("config.json", {
    admins: config[0],
    oracle: config[1],
    entryFee: String(config[2]),
    titleFee: String(config[3]),
    guildFee: String(config[4]),
    prizePoolPercent: Number(config[5]),
    currentGameweek: Number(config[6]),
    entryFeeAsset: entryAsset ? { asset: Number(entryAsset[0]), usdcMetadata: entryAsset[1] } : null,
  });
  writeJson("module-abi.json", abi);

  const candidates = [...Array.from({ length: MAX_EPL_GW }, (_, i) => i + 1), ...WC_TOURS];
  const owners = new Set();
  const summary = [];
  for (const id of candidates) {
    const exists = await view(fn("gameweek_exists"), [String(id)], { optional: true });
    if (!exists || exists[0] !== true) continue;
    const info = await archiveGameweek(id, owners);
    if (info) {
      summary.push(info);
      console.log(`gw ${String(info.id).padStart(5)}  status ${info.status}  owners ${info.owners}  results ${info.results}`);
    }
  }

  const ownerList = [...owners].sort();
  const titles = await mapPool(ownerList, async (owner) => {
    const [title, guild] = await Promise.all([
      view(fn("get_user_title"), [owner], { optional: true }),
      view(fn("get_user_guild"), [owner], { optional: true }),
    ]);
    if (!title && !guild) return null;
    return {
      owner,
      title: title ? { type: Number(title[0]), multiplier: String(title[1]), season: String(title[2]) } : null,
      guild: guild ? { multiplier: String(guild[0]), season: String(guild[1]) } : null,
    };
  });
  writeJson("titles-guilds.json", titles.filter(Boolean));

  const bracketStatus = await view(fn("bracket_challenge_status"), [], { optional: true });
  const bracketEntries = await view(fn("bracket_challenge_entries"), [], { optional: true });
  const predictions = await mapPool(ownerList, async (owner) => {
    const pred = await view(fn("get_bracket_prediction"), [owner], { optional: true });
    if (!pred) return null;
    const result = await view(fn("get_bracket_result"), [owner], { optional: true });
    return {
      owner,
      groupRanks: pred[0],
      thirdPlaceOrder: pred[1],
      knockoutWinners: pred[2],
      submittedAt: pred[3] != null ? String(pred[3]) : null,
      result: result ? { score: String(result[0]), rank: Number(result[1]), prizeAmount: String(result[2]), claimed: result[3] } : null,
    };
  });
  writeJson("bracket.json", {
    status: bracketStatus ? Number(bracketStatus[0]) : null,
    totalEntries: bracketEntries ? Number(bracketEntries[0]) : null,
    predictions: predictions.filter(Boolean),
  });

  writeJson("owners.json", ownerList);

  const manifest = {
    takenAt: new Date().toISOString(),
    rpc: RPC,
    module: `${MODULE}::${MODNAME}`,
    chainId: ledger.chain_id,
    ledgerVersion: ledger.ledger_version,
    ledgerTimestamp: ledger.ledger_timestamp,
    gameweeks: summary,
    owners: ownerList.length,
    viewCalls,
    files,
    notes: [
      "Module events (event::emit) are not readable over the REST API and are not included.",
      "Derived state (gameweeks, squads, results, claim flags, stats, bracket) is complete.",
    ],
  };
  fs.writeFileSync(path.join(outDir, "MANIFEST.json"), `${JSON.stringify(manifest, null, 2)}\n`);

  console.log(`\n${summary.length} gameweeks, ${ownerList.length} owners, ${files.length + 1} files, ${viewCalls} view calls`);
  console.log(`Snapshot written to ${outDir}`);
}

main().catch((err) => {
  console.error(`\nFailed: ${err.message}`);
  process.exit(1);
});
