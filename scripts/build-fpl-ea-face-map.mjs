/**
 * Build FPL element.code → EA Sports FC resource id map for FC27 minifaces.
 *
 * Usage:
 *   node scripts/build-fpl-ea-face-map.mjs
 *
 * Sources:
 *   - FPL bootstrap-static (current squad)
 *   - EAFC26-DataHub players.csv (stable EA player_ids; faces update on FC27 CDN)
 *   - Verifies each face exists on https://cdn.futwiz.com/assets/img/fc27/faces/{id}.png
 *
 * Output: src/data/fpl-ea-face-map.json
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createWriteStream } from "fs";
import { pipeline } from "stream/promises";
import { Readable } from "stream";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT = path.join(ROOT, "src", "data", "fpl-ea-face-map.json");
const CACHE_CSV = path.join(ROOT, ".cache", "fc26-players.csv");

const FPL_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const FC26_CSV_URL =
  "https://raw.githubusercontent.com/ismailoksuz/EAFC26-DataHub/main/data/players.csv";
const FACE_CDN = "https://cdn.futwiz.com/assets/img/fc27/faces";

const POS = { 1: "GK", 2: "DEF", 3: "MID", 4: "FWD" };

/** FPL team short name → EA club_name variants */
const CLUB_ALIASES = {
  "Man City": ["Manchester City"],
  "Man Utd": ["Manchester United"],
  "Nott'm Forest": ["Nottingham Forest"],
  Spurs: ["Tottenham Hotspur", "Tottenham"],
  Newcastle: ["Newcastle United"],
  Wolves: ["Wolverhampton Wanderers"],
  "West Ham": ["West Ham United"],
  Brighton: ["Brighton & Hove Albion", "Brighton and Hove Albion"],
  Leicester: ["Leicester City"],
  Ipswich: ["Ipswich Town"],
  Leeds: ["Leeds United"],
  Hull: ["Hull City"],
  Coventry: ["Coventry City"],
  Sunderland: ["Sunderland"],
  Bournemouth: ["AFC Bournemouth", "Bournemouth"],
  Fulham: ["Fulham", "Fulham FC"],
};

/**
 * Manual FPL photo code → EA id (verified).
 * Use when automated name matching is ambiguous or wrong.
 */
const OVERRIDES = {
  223094: 239085, // Erling Haaland
  493250: 254088, // Amad Diallo (NOT 253437 — wrong 512px asset)
  448089: 273463, // João Gomes (Villa)
  494928: 264174, // Juanlu Sánchez
  561245: 272445, // Álvaro Rodríguez
  208706: 247851, // Bruno Guimarães (Arsenal)
  50175: 186146, // Danny Welbeck (Chelsea)
  448104: 256197, // Piero Hincapié
  500040: 264846, // Cristhian Mosquera
  245719: 252793, // Taylor Harwood-Bellis
  232892: 241436, // Calvin Bassey
  481624: 261336, // Jaden Philogene
  474120: 255434, // Julio Enciso
  173879: 231352, // Tammy Abraham
  226965: 241645, // Victor Torp
  242313: 259694, // Óscar Mingueza
  202993: 227535, // Rodrigo Bentancur
  154043: 225782, // Ainsley Maitland-Niles
  214285: 232223, // Kostas Tsimikas
  445087: 253163, // Ronald Araújo
  200834: 226166, // Nordi Mukiele
  201895: 240359, // Omar Alderete
  465680: 253444, // Arnaud Kalimuendo
  242893: 252937, // Yann Gboho
  624773: 76687, // Estêvão
  501390: 256051, // Marcelino Núñez
  496181: 260653, // Brooke Norton-Cuffy
  160817: 213697, // Paddy McNair
  183656: 232755, // Josh Dasilva
  570241: 267844, // Kim Ji-soo
  498444: 258371, // Pep Chavarría
  // FC27-only / missing from FC26 CSV — verified on Futwiz + FUT.GG / EA ratings
  465920: 246340, // Mykhailo Mudryk (Spurs)
  223723: 232938, // Takehiro Tomiyasu (Crystal Palace)
  499604: 83494, // Rayan (Bournemouth)
  40383: 172203, // Fraser Forster (Bournemouth)
  // From user wrong-photo screenshots — found in FC27 via FIFPlay
  567119: 77540, // Shumaira Mheuka (Chelsea)
  553783: 268599, // Óscar Zambrano (Hull)
  653481: 82968, // Alysson (Aston Villa)
  566213: 81538, // Stephen Mfuni (Coventry)
  696104: 85425, // Jules Ahoka (Sunderland)
  699989: 83236, // Jocelin Ta Bi (Sunderland)
  500033: 84290, // Manuel Ángel (Fulham)
};

const STOP = new Set([
  "jr",
  "ii",
  "iii",
  "de",
  "da",
  "do",
  "dos",
  "van",
  "von",
  "der",
  "den",
  "la",
  "le",
  "el",
]);

function n(s) {
  return String(s || "")
    .normalize("NFKD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

function tokens(name) {
  return String(name || "")
    .split(/[\s\-]+/)
    .map((p) => n(p))
    .filter((t) => t && t.length >= 2 && !STOP.has(t));
}

function lastToken(name) {
  const t = tokens(name);
  return t[t.length - 1] || "";
}

function firstToken(name) {
  const t = tokens(name);
  return t[0] || "";
}

/** Index keys for an EA row — short + every meaningful surname token. */
function nameIndexKeys(short, long) {
  const keys = new Set();
  for (const t of tokens(short)) {
    if (t.length >= 3) keys.add(t);
  }
  for (const t of tokens(long)) {
    if (t.length >= 3) keys.add(t);
  }
  const ns = n(short);
  if (ns.length >= 4) keys.add(ns);
  return keys;
}

function fifaBucket(pos) {
  const p = String(pos || "")
    .split(",")[0]
    .trim();
  if (p === "GK") return "GK";
  if (["CB", "LB", "RB", "LWB", "RWB"].includes(p)) return "DEF";
  if (["ST", "CF", "LF", "RF"].includes(p)) return "FWD";
  return "MID";
}

function clubNorms(team) {
  const names = CLUB_ALIASES[team] || [team];
  return new Set([...names, team].map(n));
}

async function fetchText(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (compatible; MoveMatchFaceMap/1.0; +https://form8.gg)",
      ...headers,
    },
  });
  if (!res.ok) throw new Error(`${url} → ${res.status}`);
  return res.text();
}

async function ensureCsv() {
  fs.mkdirSync(path.dirname(CACHE_CSV), { recursive: true });
  if (fs.existsSync(CACHE_CSV) && fs.statSync(CACHE_CSV).size > 1_000_000) {
    console.log("Using cached", CACHE_CSV);
    return;
  }
  console.log("Downloading FC26 players.csv…");
  const res = await fetch(FC26_CSV_URL, {
    headers: { "User-Agent": "MoveMatchFaceMap/1.0" },
  });
  if (!res.ok) throw new Error(`CSV download failed: ${res.status}`);
  await pipeline(Readable.fromWeb(res.body), createWriteStream(CACHE_CSV));
  console.log("Cached", CACHE_CSV);
}

function parseCsv(text) {
  const lines = text.split(/\r?\n/);
  const header = parseCsvLine(lines[0]);
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    if (!lines[i]) continue;
    const cols = parseCsvLine(lines[i]);
    if (cols.length < header.length) continue;
    const row = {};
    for (let j = 0; j < header.length; j++) row[header[j]] = cols[j];
    rows.push(row);
  }
  return rows;
}

/** Minimal CSV parser that handles quoted fields. */
function parseCsvLine(line) {
  const out = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQ) {
      if (ch === '"' && line[i + 1] === '"') {
        cur += '"';
        i++;
      } else if (ch === '"') {
        inQ = false;
      } else {
        cur += ch;
      }
    } else if (ch === '"') {
      inQ = true;
    } else if (ch === ",") {
      out.push(cur);
      cur = "";
    } else {
      cur += ch;
    }
  }
  out.push(cur);
  return out;
}

function scoreCandidate(p, c) {
  const webN = n(p.web);
  const firstN = n(p.first);
  const secondN = n(p.second);
  const fullN = n(`${p.first} ${p.second}`);
  const clubHit = clubNorms(p.team).has(c.nClub);
  let s = 0;

  if (fullN && fullN === c.nLong) s += 20;
  // Full second_name (may be multi-token) inside EA long name
  if (secondN && secondN.length >= 4 && c.nLong.includes(secondN)) s += 8;
  else {
    // Any FPL surname token inside EA long/short (Hispanic double surnames)
    for (const t of tokens(p.second)) {
      if (t.length >= 4 && (c.nLong.includes(t) || c.nShort.includes(t))) {
        s += 6;
        break;
      }
    }
  }

  if (webN) {
    if (webN === c.nShort || webN === c.nLong) s += 12;
    else if (c.nShort.includes(webN) || c.nLong.includes(webN)) s += 8;
    else if (webN.includes(c.last) || tokens(p.web).some((t) => t === c.last))
      s += 6;
  }

  if (firstN && firstN.length >= 3) {
    if (firstN === c.first || c.nLong.includes(firstN)) s += 6;
    else if (c.first && c.first[0] === firstN[0] && clubHit) s += 1;
    else s -= 4;
  }

  if (clubHit) s += 8;
  else if (c.isPl) s += 1;
  else s -= 1;

  if (c.pos === p.pos) s += 2;
  else if ((c.pos === "GK") !== (p.pos === "GK")) s -= 10;

  s += Math.min(c.overall, 95) / 100;
  return { score: s, clubHit };
}

async function faceExists(eaId) {
  const url = `${FACE_CDN}/${eaId}.png`;
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "image/png,*/*" },
    });
    if (!res.ok) return false;
    const buf = Buffer.from(await res.arrayBuffer());
    // Real FC minifaces are ~160×160 and a few KB. Reject full cards / wrong assets.
    if (buf.length < 500 || buf.length > 80_000) return false;
    if (buf[0] !== 0x89 || buf[1] !== 0x50) return false;
    if (buf.length >= 24) {
      // PNG: sig(8) + len(4) + "IHDR"(4) + width(4) + height(4)
      const w = buf.readUInt32BE(16);
      const h = buf.readUInt32BE(20);
      if (w < 96 || h < 96 || w > 256 || h > 256) return false;
    }
    return true;
  } catch {
    return false;
  }
}

async function main() {
  await ensureCsv();
  const csvText = fs.readFileSync(CACHE_CSV, "utf8");
  const eaRows = parseCsv(csvText);
  console.log("EA rows", eaRows.length);

  const byKey = new Map();
  for (const row of eaRows) {
    const eaId = Number(row.player_id);
    if (!Number.isFinite(eaId) || eaId <= 0) continue;
    const short = row.short_name || "";
    const long = row.long_name || "";
    const club = row.club_name || "";
    const last = lastToken(short) || lastToken(long);
    if (!last) continue;
    const rec = {
      eaId,
      short,
      long,
      club,
      pos: fifaBucket(row.player_positions),
      nShort: n(short),
      nLong: n(long),
      last,
      first: firstToken(long),
      nClub: n(club),
      isPl: (row.league_name || "") === "Premier League",
      overall: Number(row.overall) || 0,
    };
    for (const key of nameIndexKeys(short, long)) {
      if (!byKey.has(key)) byKey.set(key, []);
      byKey.get(key).push(rec);
    }
  }

  const boot = JSON.parse(
    await fetchText(FPL_URL, {
      Accept: "application/json",
      Referer: "https://fantasy.premierleague.com/",
    }),
  );
  const teams = Object.fromEntries(boot.teams.map((t) => [t.id, t.name]));
  const fpl = boot.elements
    .filter((el) => el.status !== "u")
    .map((el) => ({
      code: el.code,
      web: el.web_name,
      first: el.first_name || "",
      second: el.second_name || "",
      team: teams[el.team] || "",
      pos: POS[el.element_type] || "MID",
    }));
  console.log("FPL players", fpl.length);

  const matched = {};
  const unmatched = [];

  for (const p of fpl) {
    if (OVERRIDES[p.code]) {
      matched[String(p.code)] = OVERRIDES[p.code];
      continue;
    }

    const lookupKeys = nameIndexKeys(p.web, `${p.first} ${p.second}`);
    const cands = [];
    const seen = new Set();
    for (const key of lookupKeys) {
      for (const c of byKey.get(key) || []) {
        if (seen.has(c.eaId)) continue;
        seen.add(c.eaId);
        cands.push(c);
      }
    }

    const scored = cands
      .map((c) => {
        const { score, clubHit } = scoreCandidate(p, c);
        return { score, clubHit, c };
      })
      .sort((a, b) => b.score - a.score);

    if (!scored.length) {
      unmatched.push(p);
      continue;
    }

    const best = scored[0];
    // High bar without club; slightly lower with club + name.
    const minScore = best.clubHit ? 12 : 18;
    if (best.score < minScore) {
      unmatched.push(p);
      continue;
    }

    let top = scored.filter((x) => Math.abs(x.score - best.score) < 0.05);
    if (top.length > 1) {
      const clubHit = top.filter((x) => x.clubHit);
      const pool = (clubHit.length ? clubHit : top).sort(
        (a, b) => b.c.overall - a.c.overall || a.c.eaId - b.c.eaId,
      );
      if (
        pool.length > 1 &&
        pool[0].c.overall === pool[1].c.overall &&
        !pool[0].clubHit
      ) {
        unmatched.push(p);
        continue;
      }
      top = [pool[0]];
    }

    matched[String(p.code)] = top[0].c.eaId;
  }

  console.log(
    `Matched ${Object.keys(matched).length}/${fpl.length}; unmatched ${unmatched.length}`,
  );

  // Verify faces (concurrency-limited)
  const entries = Object.entries(matched);
  const verified = {};
  let ok = 0;
  let fail = 0;
  const CONCURRENCY = 16;
  for (let i = 0; i < entries.length; i += CONCURRENCY) {
    const slice = entries.slice(i, i + CONCURRENCY);
    const results = await Promise.all(
      slice.map(async ([code, eaId]) => [code, eaId, await faceExists(eaId)]),
    );
    for (const [code, eaId, exists] of results) {
      if (exists) {
        verified[code] = eaId;
        ok++;
      } else {
        fail++;
        console.warn("Missing FC27 face", eaId, "for FPL", code);
      }
    }
    if ((i / CONCURRENCY) % 5 === 0) {
      console.log(`Verified ${Math.min(i + CONCURRENCY, entries.length)}/${entries.length}`);
    }
  }
  console.log(`Faces ok=${ok} fail=${fail}`);

  const out = {
    builtAt: new Date().toISOString().slice(0, 10),
    game: "fc27",
    faceUrlTemplate: `${FACE_CDN}/{eaId}.png`,
    count: Object.keys(verified).length,
    byCode: verified,
  };
  fs.writeFileSync(OUT, JSON.stringify(out) + "\n");
  console.log("Wrote", OUT);

  if (unmatched.length) {
    console.log(
      "Unmatched sample:",
      unmatched.slice(0, 25).map((p) => `${p.web} (${p.team})`).join(", "),
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
