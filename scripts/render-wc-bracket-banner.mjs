#!/usr/bin/env node
/**
 * Render 1920×1080 WC bracket promo banner:
 * inverted stadium template (black center, green pitch curves) + site bracket grid.
 *
 * Usage: node scripts/render-wc-bracket-banner.mjs
 * Output: public/marketing/wc-bracket-twitter-banner-v2.png
 */

import { writeFileSync, readFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, "..");
const OUT = resolve(ROOT, "public/marketing/wc-bracket-twitter-banner-v2.png");
const FLAGS = resolve(ROOT, "public/flags/4x3");

const W = 1920;
const H = 1080;

const GROUPS = [
  { letter: "A", accent: "#22c55e", teams: ["mx", "za", "kr", "cz"] },
  { letter: "B", accent: "#f43f5e", teams: ["ca", "ba", "qa", "ch"] },
  { letter: "C", accent: "#f97316", teams: ["br", "ma", "ht", "gb-sct"] },
  { letter: "D", accent: "#3b82f6", teams: ["us", "py", "au", "tr"] },
  { letter: "E", accent: "#8b5cf6", teams: ["de", "cw", "ci", "ec"] },
  { letter: "F", accent: "#a3e635", teams: ["nl", "jp", "se", "tn"] },
  { letter: "G", accent: "#ec4899", teams: ["be", "eg", "ir", "nz"] },
  { letter: "H", accent: "#2dd4bf", teams: ["es", "cv", "sa", "uy"] },
  { letter: "I", accent: "#a78bfa", teams: ["fr", "sn", "iq", "no"] },
  { letter: "J", accent: "#06b6d4", teams: ["ar", "dz", "at", "jo"] },
  { letter: "K", accent: "#ef4444", teams: ["pt", "cd", "uz", "co"] },
  { letter: "L", accent: "#38bdf8", teams: ["gb-eng", "hr", "gh", "pa"] },
];

/** Left-pathway R32 → SF match codes (site tree). */
const LEFT_MATCHES = [
  ["M73", "M74", "M75", "M76", "M77", "M78", "M79", "M80"],
  ["M89", "M90", "M91", "M92"],
  ["M97", "M98"],
  ["M101"],
];

const RIGHT_MATCHES = [
  ["M81", "M82", "M83", "M84", "M85", "M86", "M87", "M88"],
  ["M93", "M94", "M95", "M96"],
  ["M99", "M100"],
  ["M102"],
];

const flagCache = new Map();
function flagHref(code) {
  if (!flagCache.has(code)) {
    const svg = readFileSync(resolve(FLAGS, `${code}.svg`));
    flagCache.set(code, `data:image/svg+xml;base64,${svg.toString("base64")}`);
  }
  return flagCache.get(code);
}

function groupCard(g, x, y, w, h, side) {
  const fs = 11;
  const flagW = 28;
  const flagH = 21;
  const pad = 6;
  const inner = g.teams
    .map((code, i) => {
      const fx = x + pad + (i % 2) * (flagW + 4);
      const fy = y + pad + 14 + Math.floor(i / 2) * (flagH + 3);
      return `<image href="${flagHref(code)}" x="${fx}" y="${fy}" width="${flagW}" height="${flagH}" preserveAspectRatio="xMidYMid slice"/>`;
    })
    .join("");
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="8" fill="#0a0c0f" stroke="${g.accent}" stroke-width="2"/>
    <text x="${x + w / 2}" y="${y + h - 8}" text-anchor="middle" fill="${g.accent}" font-family="Arial,sans-serif" font-size="${fs}" font-weight="700">GROUP ${g.letter}</text>
    ${inner}
  `;
}

function matchNode(id, x, y, w, h) {
  return `
    <rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="#0a0c0f" stroke="#00f948" stroke-width="1" opacity="0.85"/>
    <text x="${x + w / 2}" y="${y + h / 2 + 4}" text-anchor="middle" fill="#00f948" font-family="Arial,sans-serif" font-size="9" font-weight="700">${id}</text>
  `;
}

function bracketColumn(codes, x, yStart, yEnd, boxW, boxH) {
  const n = codes.length;
  const gap = (yEnd - yStart - n * boxH) / Math.max(n - 1, 1);
  let out = "";
  codes.forEach((id, i) => {
    const y = yStart + i * (boxH + gap);
    out += matchNode(id, x, y, boxW, boxH);
  });
  return { svg: out, positions: codes.map((id, i) => ({ id, x: x + boxW / 2, y: yStart + i * (boxH + gap) + boxH / 2 })) };
}

function connect(a, b) {
  return `<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="rgba(255,255,255,0.12)" stroke-width="1"/>`;
}

function buildSvg() {
  const leftGroups = GROUPS.slice(0, 6);
  const rightGroups = GROUPS.slice(6, 12);

  let groupsSvg = "";
  leftGroups.forEach((g, i) => {
    groupsSvg += groupCard(g, 24, 120 + i * 148, 118, 132);
  });
  rightGroups.forEach((g, i) => {
    groupsSvg += groupCard(g, W - 142, 120 + i * 148, 118, 132);
  });

  const boxW = 52;
  const boxH = 22;
  const y0 = 130;
  const y1 = 920;

  const colsL = LEFT_MATCHES.map((codes, ci) => bracketColumn(codes, 168 + ci * 72, y0, y1, boxW, boxH));
  const colsR = RIGHT_MATCHES.map((codes, ci) => bracketColumn(codes, W - 168 - boxW - ci * 72, y0, y1, boxW, boxH));

  let lines = "";
  for (let ci = 0; ci < colsL.length - 1; ci++) {
    const src = colsL[ci].positions;
    const dst = colsL[ci + 1].positions;
    src.forEach((s, si) => {
      const di = Math.floor(si / 2);
      if (dst[di]) lines += connect(s, dst[di]);
    });
  }
  for (let ci = 0; ci < colsR.length - 1; ci++) {
    const src = colsR[ci].positions;
    const dst = colsR[ci + 1].positions;
    src.forEach((s, si) => {
      const di = Math.floor(si / 2);
      if (dst[di]) lines += connect(s, dst[di]);
    });
  }

  const cx = W / 2;
  const finalsSvg = `
    ${matchNode("M103", cx - 60, 380, 56, 22)}
    ${matchNode("M104", cx - 60, 640, 56, 22)}
    <text x="${cx}" y="360" text-anchor="middle" fill="rgba(255,255,255,0.35)" font-family="Arial,sans-serif" font-size="10" font-weight="700" letter-spacing="3">3RD PLACE</text>
    <text x="${cx}" y="620" text-anchor="middle" fill="#00f948" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="4">FINAL</text>
    <text x="${cx}" y="520" text-anchor="middle" fill="rgba(255,255,255,0.04)" font-family="Arial,sans-serif" font-size="220" font-weight="900">26</text>
  `;

  const bracketSvg = colsL.map((c) => c.svg).join("") + colsR.map((c) => c.svg).join("") + lines + finalsSvg;

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <pattern id="pitch" width="12" height="12" patternUnits="userSpaceOnUse" patternTransform="rotate(12)">
      <rect width="12" height="12" fill="#163d2a"/>
      <line x1="0" y1="0" x2="0" y2="12" stroke="#1f5238" stroke-width="2"/>
    </pattern>
    <pattern id="mesh" width="40" height="40" patternUnits="userSpaceOnUse">
      <path d="M0 40 L40 0 M-10 10 L10 -10 M30 50 L50 30" stroke="rgba(255,255,255,0.03)" stroke-width="1"/>
    </pattern>
    <radialGradient id="vignette" cx="50%" cy="50%" r="70%">
      <stop offset="0%" stop-color="#000" stop-opacity="0"/>
      <stop offset="100%" stop-color="#000" stop-opacity="0.75"/>
    </radialGradient>
  </defs>

  <!-- base -->
  <rect width="${W}" height="${H}" fill="#050608"/>

  <!-- stadium pitch corners (inverted white template) -->
  <path d="M0 0 L520 0 Q${W * 0.45} 180 340 420 L0 320 Z" fill="url(#pitch)"/>
  <path d="M${W} 0 L${W - 520} 0 Q${W * 0.55} 180 ${W - 340} 420 L${W} 320 Z" fill="url(#pitch)"/>
  <path d="M0 ${H} L${W} ${H} L${W} ${H - 280} Q${W / 2} ${H - 420} 0 ${H - 280} Z" fill="url(#pitch)"/>

  <!-- center mesh + faint trophy silhouette -->
  <rect x="280" y="80" width="${W - 560}" height="${H - 160}" fill="url(#mesh)"/>
  <ellipse cx="${cx}" cy="520" rx="90" ry="200" fill="rgba(255,255,255,0.025)"/>
  <path d="M${cx - 35} 680 L${cx - 20} 420 Q${cx} 360 ${cx + 20} 420 L${cx + 35} 680 Z" fill="rgba(255,255,255,0.03)"/>
  <rect x="${cx - 55}" y="675" width="110" height="18" rx="4" fill="rgba(255,255,255,0.025)"/>

  <!-- bracket grid overlay -->
  <g opacity="0.92">${bracketSvg}</g>

  <!-- group columns -->
  <g opacity="0.95">${groupsSvg}</g>

  <!-- vignette -->
  <rect width="${W}" height="${H}" fill="url(#vignette)"/>

  <!-- promo copy -->
  <rect x="${cx - 155}" y="36" width="310" height="28" rx="14" fill="rgba(0,249,72,0.12)" stroke="rgba(0,249,72,0.35)"/>
  <text x="${cx}" y="55" text-anchor="middle" fill="#00f948" font-family="Arial,sans-serif" font-size="11" font-weight="700" letter-spacing="2">● BRACKET CHALLENGE · ON-CHAIN</text>

  <text x="${cx}" y="98" text-anchor="middle" fill="#ffffff" font-family="Arial Black,Arial,sans-serif" font-size="42" font-weight="900" letter-spacing="1">WORLD CUP 2026</text>
  <text x="${cx}" y="128" text-anchor="middle" fill="#c9a227" font-family="Arial,sans-serif" font-size="14" font-weight="700" letter-spacing="4">USA · MÉXICO · CANADA</text>

  <rect x="80" y="${H - 88}" width="${W - 160}" height="56" rx="12" fill="rgba(0,0,0,0.55)" stroke="rgba(255,255,255,0.08)"/>
  <text x="${cx}" y="${H - 54}" text-anchor="middle" fill="#ffffff" font-family="Arial Black,Arial,sans-serif" font-size="26" font-weight="900">$500 USDCx PRIZE POOL</text>
  <text x="${cx}" y="${H - 28}" text-anchor="middle" fill="rgba(255,255,255,0.55)" font-family="Arial,sans-serif" font-size="13" font-weight="600">FREE ENTRY · GAS ONLY · movematch.xyz/world-cup/bracket</text>
  <text x="${cx - 280}" y="${H - 28}" text-anchor="start" fill="#FFD700" font-family="Arial,sans-serif" font-size="12" font-weight="700">+$300 perfect bracket</text>
</svg>`;
}

async function main() {
  const svg = buildSvg();
  const svgPath = resolve(ROOT, "public/marketing/wc-bracket-twitter-banner-v2.svg");
  writeFileSync(svgPath, svg);

  await sharp(Buffer.from(svg)).resize(W, H).png().toFile(OUT);

  console.log("Wrote:", OUT);
  console.log("SVG:  ", svgPath);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
