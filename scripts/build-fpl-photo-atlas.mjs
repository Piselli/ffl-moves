/**
 * Builds a single WebP sprite + manifest from FPL official headshots.
 * Run: node scripts/build-fpl-photo-atlas.mjs
 * Requires: sharp (devDependency)
 *
 * Packs every selectable player into one image so the picker never fans out
 * to /api/player-photo. Missing tiles stay empty in the UI (silhouette).
 */
import sharp from "sharp";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const OUT_IMG = path.join(ROOT, "public", "sprites", "fpl-players.webp");
const OUT_JSON = path.join(ROOT, "src", "data", "fpl-photo-atlas.json");

const FPL_URL = "https://fantasy.premierleague.com/api/bootstrap-static/";
const PHOTO_HOST = "https://resources.premierleague.com/premierleague/photos/players";

const COLS = 26;
/** 80px: sharp enough for 54px list + ~76px pitch chips, still one small file. */
const CELL = 80;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/png,image/jpeg,image/*;q=0.8,*/*;q=0.5",
  Referer: "https://fantasy.premierleague.com/",
};

function photoUrls(code) {
  const file = `p${code}`;
  return [
    `${PHOTO_HOST}/110x140/${file}.png`,
    `${PHOTO_HOST}/110x140/${file}.jpg`,
    `${PHOTO_HOST}/250x250/${file}.png`,
    `${PHOTO_HOST}/250x250/${file}.jpg`,
  ];
}

async function fetchBootstrap() {
  const res = await fetch(FPL_URL, {
    headers: {
      "User-Agent": FETCH_HEADERS["User-Agent"],
      Accept: "application/json, text/plain, */*",
      Referer: "https://fantasy.premierleague.com/",
      Origin: "https://fantasy.premierleague.com",
    },
  });
  if (!res.ok) throw new Error(`bootstrap ${res.status}`);
  return res.json();
}

async function fetchOnePng(code) {
  for (const url of photoUrls(code)) {
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const res = await fetch(url, { headers: FETCH_HEADERS });
        if (!res.ok) {
          await new Promise((r) => setTimeout(r, 60 * (attempt + 1)));
          continue;
        }
        const type = res.headers.get("content-type") || "";
        if (type && !type.startsWith("image/")) continue;
        const buf = Buffer.from(await res.arrayBuffer());
        return sharp(buf)
          .resize(CELL, CELL, { fit: "cover", position: "top" })
          .png()
          .toBuffer();
      } catch {
        await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
      }
    }
  }
  return null;
}

async function main() {
  console.log("Fetching FPL bootstrap…");
  const data = await fetchBootstrap();
  const elements = data.elements.filter(
    (el) => el.can_select && el.status !== "u",
  );
  console.log(`Selectable players: ${elements.length}`);

  const downloaded = [];
  const concurrency = 10;
  for (let i = 0; i < elements.length; i += concurrency) {
    const chunk = elements.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (el) => ({
        code: el.code,
        buf: await fetchOnePng(el.code),
      })),
    );
    downloaded.push(...results);
    process.stdout.write(
      `\rDownloaded ${Math.min(i + concurrency, elements.length)}/${elements.length}`,
    );
  }

  const frames = {};
  const composites = [];
  let packed = 0;
  for (const r of downloaded) {
    if (!r.buf) continue;
    const col = packed % COLS;
    const row = Math.floor(packed / COLS);
    frames[String(r.code)] = { x: col * CELL, y: row * CELL };
    composites.push({ input: r.buf, left: col * CELL, top: row * CELL });
    packed++;
  }
  console.log(`\nComposited tiles: ${packed}`);

  const totalRows = Math.max(1, Math.ceil(packed / COLS));
  const width = COLS * CELL;
  const height = totalRows * CELL;

  fs.mkdirSync(path.dirname(OUT_IMG), { recursive: true });
  fs.mkdirSync(path.dirname(OUT_JSON), { recursive: true });

  await sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 10, g: 13, b: 20, alpha: 1 },
    },
  })
    .composite(composites)
    .webp({ quality: 72, effort: 6 })
    .toFile(OUT_IMG);

  const manifest = {
    cell: CELL,
    cols: COLS,
    width,
    height,
    count: packed,
    builtAt: new Date().toISOString().slice(0, 10),
    frames,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(manifest));
  const stat = fs.statSync(OUT_IMG);
  console.log("Wrote", OUT_IMG, `(${Math.round(stat.size / 1024)} KB)`);
  console.log("Wrote", OUT_JSON);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
