#!/usr/bin/env node
/**
 * Aggregates a Movement chain snapshot into a per-wallet loyalty record:
 * tours entered, finishes, prizes won and anything still unclaimed.
 *
 *   npm run loyalty:snapshot                     # newest snapshot
 *   npm run loyalty:snapshot -- 2026-07-31       # a specific one
 *
 * Writes loyalty.json and loyalty.csv next to the source snapshot.
 *
 * Reads only the archive — Movement RPC is not required, so this keeps working
 * after the chain is sunset. Asset denomination comes from TOUR-ASSETS.md:
 * every EPL tour ran on MOVE, World Cup tours on USDCx.
 *
 * The keys here are Movement addresses. There is no derivation from a Movement
 * address to a Solana one — they are different curves. Rewarding this base on
 * Solana needs a claim flow where a player proves control of the old wallet.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const archiveRoot = path.join(root, "archive", "movement-snapshot");

/** Tours below this id are Premier League; above are World Cup. */
const WC_ID_FLOOR = 10_000;
/** Bracket metadata tour — never had squad entrants. */
const BRACKET_TOUR = 10_999;

const ASSETS = {
  MOVE: { decimals: 8, divisor: 1e8 },
  USDCx: { decimals: 6, divisor: 1e6 },
};

const assetFor = (tourId) => (tourId < WC_ID_FLOOR ? "MOVE" : "USDCx");
const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));

function resolveSnapshot() {
  const requested = process.argv[2];
  if (!fs.existsSync(archiveRoot)) {
    console.error(`No archive at ${archiveRoot}`);
    process.exit(1);
  }
  const available = fs
    .readdirSync(archiveRoot)
    .filter((d) => fs.statSync(path.join(archiveRoot, d)).isDirectory())
    .sort();
  if (available.length === 0) {
    console.error(`No snapshots under ${archiveRoot}`);
    process.exit(1);
  }
  const pick = requested ?? available[available.length - 1];
  if (!available.includes(pick)) {
    console.error(`Snapshot "${pick}" not found. Available: ${available.join(", ")}`);
    process.exit(1);
  }
  return path.join(archiveRoot, pick);
}

const snapshotDir = resolveSnapshot();
const tourIds = fs
  .readdirSync(path.join(snapshotDir, "gameweeks"))
  .filter((f) => f.endsWith(".json"))
  .map((f) => Number(f.replace(".json", "")))
  .sort((a, b) => a - b);

/** @type {Map<string, ReturnType<typeof blankRecord>>} */
const wallets = new Map();

function blankRecord(address) {
  return {
    address,
    toursEntered: 0,
    eplTours: 0,
    wcTours: 0,
    tours: [],
    bestRank: null,
    podiums: 0,
    topTen: 0,
    prizesWon: 0,
    prizeTotal: { MOVE: 0, USDCx: 0 },
    unclaimed: [],
    unclaimedTotal: { MOVE: 0, USDCx: 0 },
    bracketPrediction: false,
  };
}

const record = (address) => {
  if (!wallets.has(address)) wallets.set(address, blankRecord(address));
  return wallets.get(address);
};

const tourSummaries = [];

for (const tourId of tourIds) {
  if (tourId === BRACKET_TOUR) continue;

  const gameweek = readJson(path.join(snapshotDir, "gameweeks", `${tourId}.json`));
  const owners = gameweek.owners ?? [];
  if (owners.length === 0) continue;

  const asset = assetFor(tourId);
  const { divisor } = ASSETS[asset];

  const resultsPath = path.join(snapshotDir, "results", `${tourId}.json`);
  const results = fs.existsSync(resultsPath) ? readJson(resultsPath) : [];
  const byOwner = new Map(results.map((r) => [r.owner, r]));

  for (const owner of owners) {
    const entry = record(owner);
    entry.toursEntered += 1;
    if (tourId < WC_ID_FLOOR) entry.eplTours += 1;
    else entry.wcTours += 1;

    const result = byOwner.get(owner);
    const rank = result ? Number(result.rank) : null;
    const prizeRaw = result ? Number(result.prizeAmount) : 0;
    const prize = prizeRaw / divisor;
    const claimed = result?.claimed ?? false;

    entry.tours.push({
      tourId,
      asset,
      rank,
      finalPoints: result ? Number(result.finalPoints) : null,
      prize,
      claimed: prizeRaw > 0 ? claimed : null,
    });

    if (rank != null && rank > 0) {
      if (entry.bestRank == null || rank < entry.bestRank) entry.bestRank = rank;
      if (rank <= 3) entry.podiums += 1;
      if (rank <= 10) entry.topTen += 1;
    }

    if (prizeRaw > 0) {
      entry.prizesWon += 1;
      entry.prizeTotal[asset] += prize;
      if (!claimed) {
        entry.unclaimed.push({ tourId, asset, amount: prize });
        entry.unclaimedTotal[asset] += prize;
      }
    }
  }

  tourSummaries.push({
    tourId,
    asset,
    entrants: owners.length,
    prizePool: Number(gameweek.prizePool) / divisor,
    winners: results.filter((r) => Number(r.prizeAmount) > 0).length,
  });
}

// Bracket predictors never appear in a gameweek owner list — the tour had zero
// squad entrants — so they are folded in separately.
const bracketPath = path.join(snapshotDir, "bracket.json");
if (fs.existsSync(bracketPath)) {
  for (const prediction of readJson(bracketPath).predictions ?? []) {
    record(prediction.owner).bracketPrediction = true;
  }
}

const round = (n) => Math.round(n * 1e6) / 1e6;
for (const entry of wallets.values()) {
  for (const asset of Object.keys(ASSETS)) {
    entry.prizeTotal[asset] = round(entry.prizeTotal[asset]);
    entry.unclaimedTotal[asset] = round(entry.unclaimedTotal[asset]);
  }
}

const ranked = [...wallets.values()].sort(
  (a, b) => b.toursEntered - a.toursEntered || (a.bestRank ?? 1e9) - (b.bestRank ?? 1e9),
);

const totals = ranked.reduce(
  (acc, w) => {
    acc.wallets += 1;
    if (w.toursEntered >= 2) acc.returning += 1;
    if (w.toursEntered >= 5) acc.core += 1;
    if (w.eplTours > 0 && w.wcTours > 0) acc.bothCampaigns += 1;
    if (w.unclaimed.length > 0) acc.withUnclaimed += 1;
    acc.unclaimedMOVE += w.unclaimedTotal.MOVE;
    acc.unclaimedUSDCx += w.unclaimedTotal.USDCx;
    if (w.bracketPrediction) acc.bracketPredictors += 1;
    return acc;
  },
  {
    wallets: 0,
    returning: 0,
    core: 0,
    bothCampaigns: 0,
    withUnclaimed: 0,
    unclaimedMOVE: 0,
    unclaimedUSDCx: 0,
    bracketPredictors: 0,
  },
);
totals.unclaimedMOVE = round(totals.unclaimedMOVE);
totals.unclaimedUSDCx = round(totals.unclaimedUSDCx);

const payload = {
  generatedAt: new Date().toISOString(),
  source: path.relative(root, snapshotDir),
  addressSpace: "movement",
  note:
    "Movement addresses. No cryptographic link to Solana wallets exists; " +
    "any reward must be claimed by proving control of the Movement key.",
  assets: Object.fromEntries(Object.entries(ASSETS).map(([k, v]) => [k, v.decimals])),
  totals,
  tours: tourSummaries,
  wallets: ranked,
};

const jsonPath = path.join(snapshotDir, "loyalty.json");
fs.writeFileSync(jsonPath, `${JSON.stringify(payload, null, 2)}\n`);

const columns = [
  "address",
  "toursEntered",
  "eplTours",
  "wcTours",
  "bestRank",
  "podiums",
  "topTen",
  "prizesWon",
  "prizeMOVE",
  "prizeUSDCx",
  "unclaimedMOVE",
  "unclaimedUSDCx",
  "bracketPrediction",
];
const csv = [
  columns.join(","),
  ...ranked.map((w) =>
    [
      w.address,
      w.toursEntered,
      w.eplTours,
      w.wcTours,
      w.bestRank ?? "",
      w.podiums,
      w.topTen,
      w.prizesWon,
      w.prizeTotal.MOVE,
      w.prizeTotal.USDCx,
      w.unclaimedTotal.MOVE,
      w.unclaimedTotal.USDCx,
      w.bracketPrediction ? "yes" : "",
    ].join(","),
  ),
].join("\n");

const csvPath = path.join(snapshotDir, "loyalty.csv");
fs.writeFileSync(csvPath, `${csv}\n`);

console.log(`Snapshot: ${path.relative(root, snapshotDir)}`);
console.log(`Tours aggregated: ${tourSummaries.length}\n`);
console.log(`Wallets                     ${totals.wallets}`);
console.log(`  played 2+ tours           ${totals.returning}`);
console.log(`  played 5+ tours           ${totals.core}`);
console.log(`  played both EPL and WC    ${totals.bothCampaigns}`);
console.log(`  submitted a bracket       ${totals.bracketPredictors}`);
console.log(`  have unclaimed prizes     ${totals.withUnclaimed}`);
console.log(
  `\nUnclaimed: ${totals.unclaimedMOVE} MOVE, ${totals.unclaimedUSDCx} USDCx`,
);
console.log(`\nWrote ${path.relative(root, jsonPath)}`);
console.log(`Wrote ${path.relative(root, csvPath)}`);
