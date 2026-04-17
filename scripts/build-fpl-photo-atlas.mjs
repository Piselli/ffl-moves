/**
 * Builds a single WebP sprite + manifest from FPL official headshots.
 * Run: node scripts/build-fpl-photo-atlas.mjs
 * Requires: sharp (devDependency)
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
const PHOTO_BASE =
  "https://resources.premierleague.com/premierleague/photos/players/250x250/p";

const COLS = 26;
const CELL = 64;

const FETCH_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "image/png,image/*;q=0.8,*/*;q=0.5",
  Referer: "https://fantasy.premierleague.com/",
};

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
  const url = `${PHOTO_BASE}${code}.png`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch(url, { headers: FETCH_HEADERS });
      if (!res.ok) {
        await new Promise((r) => setTimeout(r, 80 * (attempt + 1)));
        continue;
      }
      const buf = Buffer.from(await res.arrayBuffer());
      return sharp(buf).resize(CELL, CELL, { fit: "cover" }).png().toBuffer();
    } catch {
      await new Promise((r) => setTimeout(r, 120 * (attempt + 1)));
    }
  }
  return null;
}

async function main() {
  console.log("Fetching FPL bootstrap…");
  const data = await fetchBootstrap();
  const elements = data.elements.filter(
    (el) => el.can_select && el.status !== "u"
  );
  console.log(`Selectable players: ${elements.length}`);

  const frames = {};
  const composites = [];
  let ok = 0;

  const concurrency = 12;
  for (let i = 0; i < elements.length; i += concurrency) {
    const chunk = elements.slice(i, i + concurrency);
    const results = await Promise.all(
      chunk.map(async (el, j) => {
        const idx = i + j;
        const row = Math.floor(idx / COLS);
        const col = idx % COLS;
        const x = col * CELL;
        const y = row * CELL;
        const buf = await fetchOnePng(el.code);
        return { code: el.code, x, y, buf, idx };
      })
    );
    for (const r of results) {
      if (r.buf) {
        frames[String(r.code)] = { x: r.x, y: r.y };
        composites.push({ input: r.buf, left: r.x, top: r.y });
        ok++;
      }
    }
    process.stdout.write(`\rDownloaded ${Math.min(i + concurrency, elements.length)}/${elements.length}`);
  }
  console.log(`\nComposited tiles: ${ok}`);

  const totalRows = Math.ceil(elements.length / COLS);
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
    .webp({ quality: 82, effort: 4 })
    .toFile(OUT_IMG);

  const manifest = {
    cell: CELL,
    cols: COLS,
    width,
    height,
    count: ok,
    frames,
  };
  fs.writeFileSync(OUT_JSON, JSON.stringify(manifest));
  console.log("Wrote", OUT_IMG);
  console.log("Wrote", OUT_JSON);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
