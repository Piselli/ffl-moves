/**
 * Renders MoveMatch × Stableyard partnership banner (1600×900, Twitter 16:9).
 * Logos only — no copy, no panels.
 * Run: node scripts/render-stableyard-partnership.mjs
 */
import sharp from "sharp";
import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const W = 1600;
const H = 900;
const outPng = join(root, "public/marketing/movematch-stableyard-partnership.png");
const outSvg = join(root, "public/marketing/movematch-stableyard-partnership.svg");

const mmLogoB64 = readFileSync(
  join(root, "public/movematch_lockup_hires.png"),
).toString("base64");

const syLogoB64 = readFileSync(
  join(root, "public/marketing/stableyard-logo-mark-dark.svg"),
).toString("base64");

const MM_LOCKUP_H = 92;
const MM_LOCKUP_W = Math.round((11081 / 2428) * MM_LOCKUP_H);
const SY_LOCKUP_H = 86;
const SY_LOCKUP_W = Math.round((412 / 92) * SY_LOCKUP_H);
const DIVIDER_W = 44;
const PARTNER_GAP = 52;
const PARTNER_ROW_W = MM_LOCKUP_W + PARTNER_GAP + DIVIDER_W + PARTNER_GAP + SY_LOCKUP_W;
const PARTNER_ROW_X = Math.round((W - PARTNER_ROW_W) / 2);
const PARTNER_ROW_Y = Math.round((H - MM_LOCKUP_H) / 2);
const DIVIDER_X = PARTNER_ROW_X + MM_LOCKUP_W + PARTNER_GAP + Math.round(DIVIDER_W / 2);
const SY_X = PARTNER_ROW_X + MM_LOCKUP_W + PARTNER_GAP + DIVIDER_W + PARTNER_GAP;

const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="pitch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
      <rect width="12" height="12" fill="#163d2a"/>
      <line x1="0" y1="0" x2="0" y2="12" stroke="#1f5238" stroke-width="2"/>
    </pattern>
    <pattern id="mesh" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M0 40 L40 0 M-10 10 L10 -10 M30 50 L50 30" stroke="rgba(255,255,255,0.025)" stroke-width="1"/>
    </pattern>
    <radialGradient id="centerGlow" cx="50%" cy="50%" r="48%">
      <stop offset="0%" stop-color="#00f948" stop-opacity="0.12"/>
      <stop offset="55%" stop-color="#00f948" stop-opacity="0.04"/>
      <stop offset="100%" stop-color="#00f948" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vignette" cx="50%" cy="50%" r="74%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.65"/>
    </radialGradient>
  </defs>

  <rect width="${W}" height="${H}" fill="#0D0F12"/>
  <path d="M0 0 L380 0 Q680 130 250 320 L0 240 Z" fill="url(#pitch)" opacity="0.72"/>
  <path d="M${W} 0 L${W - 380} 0 Q${W - 680} 130 ${W - 250} 320 L${W} 240 Z" fill="url(#pitch)" opacity="0.72"/>
  <path d="M0 ${H} L${W} ${H} L${W} ${H - 150} Q${W / 2} ${H - 195} 0 ${H - 150} Z" fill="url(#pitch)" opacity="0.45"/>
  <rect x="0" y="0" width="${W}" height="${H}" fill="url(#mesh)"/>
  <rect width="${W}" height="${H}" fill="url(#centerGlow)"/>

  <image href="data:image/png;base64,${mmLogoB64}" x="${PARTNER_ROW_X}" y="${PARTNER_ROW_Y}" width="${MM_LOCKUP_W}" height="${MM_LOCKUP_H}" preserveAspectRatio="xMidYMid meet"/>

  <text x="${DIVIDER_X}" y="${PARTNER_ROW_Y + MM_LOCKUP_H - 20}" text-anchor="middle" fill="rgba(255,255,255,0.22)" font-family="Arial,Helvetica,sans-serif" font-size="44" font-weight="300">×</text>

  <image href="data:image/svg+xml;base64,${syLogoB64}" x="${SY_X}" y="${PARTNER_ROW_Y + Math.round((MM_LOCKUP_H - SY_LOCKUP_H) / 2)}" width="${SY_LOCKUP_W}" height="${SY_LOCKUP_H}" preserveAspectRatio="xMidYMid meet"/>

  <rect width="${W}" height="${H}" fill="url(#vignette)"/>
</svg>`;

writeFileSync(outSvg, svg);

await sharp(Buffer.from(svg), { density: 144 })
  .resize(W, H)
  .png({ compressionLevel: 9 })
  .toFile(outPng);

console.log(`Wrote ${outSvg}`);
console.log(`Wrote ${outPng}`);
