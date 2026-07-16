/**
 * Extra MoveMatch × Stableyard partnership banners (logos only).
 * Does not overwrite movematch-stableyard-partnership.png
 * Run: node scripts/render-stableyard-partnership-variants.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1600;
const H = 900;
const marketing = join(root, "public/marketing");

const mmLogoB64 = readFileSync(join(root, "public/movematch_lockup_hires.png")).toString(
  "base64",
);
const syLogoB64 = readFileSync(join(marketing, "stableyard-logo-mark-dark.svg")).toString(
  "base64",
);

/** ~28% larger than the base partnership banner. */
const MM_LOCKUP_H = 118;
const MM_LOCKUP_W = Math.round((11081 / 2428) * MM_LOCKUP_H);
const SY_LOCKUP_H = 110;
const SY_LOCKUP_W = Math.round((412 / 92) * SY_LOCKUP_H);
const DIVIDER_W = 48;
const PARTNER_GAP = 58;

function logoLayer() {
  const rowW = MM_LOCKUP_W + PARTNER_GAP + DIVIDER_W + PARTNER_GAP + SY_LOCKUP_W;
  const rowX = Math.round((W - rowW) / 2);
  const rowY = Math.round((H - MM_LOCKUP_H) / 2);
  const dividerX = rowX + MM_LOCKUP_W + PARTNER_GAP + Math.round(DIVIDER_W / 2);
  const syX = rowX + MM_LOCKUP_W + PARTNER_GAP + DIVIDER_W + PARTNER_GAP;

  return `
  <image href="data:image/png;base64,${mmLogoB64}" x="${rowX}" y="${rowY}" width="${MM_LOCKUP_W}" height="${MM_LOCKUP_H}" preserveAspectRatio="xMidYMid meet"/>
  <text x="${dividerX}" y="${rowY + MM_LOCKUP_H - 24}" text-anchor="middle" fill="rgba(255,255,255,0.24)" font-family="Arial,Helvetica,sans-serif" font-size="50" font-weight="300">×</text>
  <image href="data:image/svg+xml;base64,${syLogoB64}" x="${syX}" y="${rowY + Math.round((MM_LOCKUP_H - SY_LOCKUP_H) / 2)}" width="${SY_LOCKUP_W}" height="${SY_LOCKUP_H}" preserveAspectRatio="xMidYMid meet"/>
  `;
}

const variants = [
  {
    slug: "movematch-stableyard-partnership-smoke",
    background: `
  <defs>
    <radialGradient id="spotTop" cx="50%" cy="18%" r="55%">
      <stop offset="0%" stop-color="#142318" stop-opacity="0.9"/>
      <stop offset="100%" stop-color="#050608" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fogL" cx="22%" cy="78%" r="48%">
      <stop offset="0%" stop-color="#00f948" stop-opacity="0.14"/>
      <stop offset="100%" stop-color="#00f948" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fogR" cx="78%" cy="76%" r="46%">
      <stop offset="0%" stop-color="#00f948" stop-opacity="0.11"/>
      <stop offset="100%" stop-color="#00f948" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="fogC" cx="50%" cy="88%" r="58%">
      <stop offset="0%" stop-color="#00f948" stop-opacity="0.16"/>
      <stop offset="55%" stop-color="#0a1810" stop-opacity="0.35"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="floor" x1="0%" y1="100%" x2="0%" y2="55%">
      <stop offset="0%" stop-color="#0f1a14" stop-opacity="0.95"/>
      <stop offset="100%" stop-color="#0f1a14" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="vig" cx="50%" cy="50%" r="72%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.72"/>
    </radialGradient>
    <filter id="blur30"><feGaussianBlur stdDeviation="30"/></filter>
    <filter id="blur60"><feGaussianBlur stdDeviation="60"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#060809"/>
  <rect width="${W}" height="${H}" fill="url(#spotTop)"/>
  <ellipse cx="320" cy="760" rx="420" ry="160" fill="url(#fogL)" filter="url(#blur60)"/>
  <ellipse cx="1280" cy="740" rx="400" ry="150" fill="url(#fogR)" filter="url(#blur60)"/>
  <ellipse cx="800" cy="820" rx="920" ry="220" fill="url(#fogC)" filter="url(#blur30)"/>
  <rect x="0" y="520" width="${W}" height="${H - 520}" fill="url(#floor)"/>
  <line x1="0" y1="812" x2="${W}" y2="812" stroke="#00f948" stroke-opacity="0.12" stroke-width="1"/>
  <line x1="0" y1="818" x2="${W}" y2="818" stroke="#00f948" stroke-opacity="0.06" stroke-width="2"/>
  <rect width="${W}" height="${H}" fill="url(#vig)"/>
    `,
  },
  {
    slug: "movematch-stableyard-partnership-flare",
    background: `
  <defs>
    <radialGradient id="bloom" cx="50%" cy="50%" r="38%">
      <stop offset="0%" stop-color="#00f948" stop-opacity="0.22"/>
      <stop offset="45%" stop-color="#00f948" stop-opacity="0.06"/>
      <stop offset="100%" stop-color="#00f948" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="streak" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f948" stop-opacity="0"/>
      <stop offset="18%" stop-color="#00f948" stop-opacity="0.08"/>
      <stop offset="50%" stop-color="#00f948" stop-opacity="0.85"/>
      <stop offset="82%" stop-color="#00f948" stop-opacity="0.08"/>
      <stop offset="100%" stop-color="#00f948" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="streakSoft" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f948" stop-opacity="0"/>
      <stop offset="50%" stop-color="#00f948" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#00f948" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="edgeVig" cx="50%" cy="50%" r="68%">
      <stop offset="55%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.78"/>
    </radialGradient>
    <filter id="glow"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="#020202"/>
  <rect width="${W}" height="${H}" fill="url(#bloom)"/>
  <rect x="0" y="448" width="${W}" height="28" fill="url(#streakSoft)"/>
  <rect x="0" y="456" width="${W}" height="3" fill="url(#streak)"/>
  <ellipse cx="800" cy="458" rx="90" ry="10" fill="#ffffff" fill-opacity="0.55" filter="url(#glow)"/>
  <ellipse cx="800" cy="458" rx="36" ry="5" fill="#00f948" fill-opacity="0.95"/>
  <rect width="${W}" height="${H}" fill="url(#edgeVig)"/>
    `,
  },
];

for (const variant of variants) {
  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  ${variant.background}
  ${logoLayer()}
</svg>`;

  const outSvg = join(marketing, `${variant.slug}.svg`);
  const outPng = join(marketing, `${variant.slug}.png`);

  writeFileSync(outSvg, svg);

  await sharp(Buffer.from(svg), { density: 144 })
    .resize(W, H)
    .png({ compressionLevel: 9 })
    .toFile(outPng);

  console.log(`Wrote ${outPng}`);
}
