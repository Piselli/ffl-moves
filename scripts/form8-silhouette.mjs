import sharp from "sharp";
import fs from "fs";
import path from "path";

const dir = "/Users/piselli/Desktop/ffl-moves/public/design-lab/form8-logo/silhouette";
fs.mkdirSync(dir, { recursive: true });

/**
 * Thesis (research-locked):
 * One solid silhouette + one ownable twist. Product sense = empty place in the XI.
 * NO stick-figure / bathroom pictogram.
 *
 * A Empty slot — vertical capsule cut inside circle (place to fill)
 * B Jersey — kit silhouette with #8 cut (football, form, digit)
 * C Athlete — continuous athletic silhouette (NBA-adjacent craft)
 * D Slash mass — solid disk with trail cut (user mood + Simple Twist)
 * E Eight mass — solid 8 with empty slot capsule in lower loop
 */

function markSvg(body) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 320" fill="currentColor">
${body}
</svg>`;
}

const marks = {
  // A — empty slot (no person)
  "a-empty-slot": markSvg(`
  <defs>
    <mask id="m">
      <rect width="320" height="320" fill="white"/>
      <rect x="136" y="88" width="48" height="144" rx="24" fill="black"/>
    </mask>
  </defs>
  <circle cx="160" cy="160" r="132" mask="url(#m)"/>`),

  // B — football jersey silhouette + 8 cutout
  "b-jersey-8": markSvg(`
  <defs>
    <mask id="m">
      <rect width="320" height="320" fill="white"/>
      <text x="160" y="205" text-anchor="middle"
        font-family="Arial Black, Helvetica Neue, Arial, sans-serif"
        font-size="118" font-weight="900" fill="black">8</text>
    </mask>
  </defs>
  <!-- kit body -->
  <path mask="url(#m)" d="
    M110 70
    L78 98
    L78 130
    L108 122
    L108 268
    Q108 282 122 282
    L198 282
    Q212 282 212 268
    L212 122
    L242 130
    L242 98
    L210 70
    Q190 52 160 52
    Q130 52 110 70
    Z
  "/>`),

  // C — continuous athlete silhouette (side stance, ready)
  "c-athlete": markSvg(`
  <g transform="translate(12 8) scale(0.92)">
    <!-- head -->
    <ellipse cx="168" cy="58" rx="28" ry="30"/>
    <!-- torso + raised arm + standing leg as ONE silhouette via union of shapes -->
    <path d="
      M142 88
      C142 88 118 100 108 128
      C98 156 92 190 96 220
      L88 268
      L118 268
      L128 230
      L148 268
      L178 268
      L158 210
      C170 190 188 170 210 158
      C232 146 258 150 268 138
      C278 126 270 112 252 112
      C230 112 210 122 196 132
      C184 118 172 98 168 88
      C162 78 152 82 142 88
      Z
    "/>
  </g>`),

  // D — slash / trail cut in solid disk
  "d-slash-mass": markSvg(`
  <defs>
    <mask id="m">
      <rect width="320" height="320" fill="white"/>
      <path d="M92 70 L248 210 L220 238 L64 98 Z" fill="black"/>
    </mask>
  </defs>
  <circle cx="160" cy="160" r="132" mask="url(#m)"/>`),

  // E — solid 8 + empty slot capsule
  "e-eight-slot": markSvg(`
  <defs>
    <mask id="m">
      <rect width="320" height="320" fill="white"/>
      <rect x="140" y="188" width="40" height="88" rx="20" fill="black"/>
    </mask>
  </defs>
  <g mask="url(#m)">
    <circle cx="160" cy="100" r="78"/>
    <circle cx="160" cy="220" r="90"/>
  </g>`),

  // F — soft blob / unified mass with slot (user liked soft blob)
  "f-blob-slot": markSvg(`
  <defs>
    <mask id="m">
      <rect width="320" height="320" fill="white"/>
      <rect x="138" y="96" width="44" height="128" rx="22" fill="black"/>
    </mask>
  </defs>
  <path mask="url(#m)" d="
    M160 36
    C220 36 268 78 276 130
    C284 182 260 230 220 262
    C190 286 160 292 160 292
    C160 292 130 286 100 262
    C60 230 36 182 44 130
    C52 78 100 36 160 36
    Z
  "/>`),
};

async function sheetFixed(svg, bg, fg, out) {
  const colored = svg.replace(/currentColor/g, fg);
  const markPng = await sharp(Buffer.from(colored)).resize(520, 520).png().toBuffer();
  await sharp({
    create: { width: 800, height: 800, channels: 4, background: bg },
  })
    .composite([{ input: markPng, gravity: "centre" }])
    .toFile(out);
}

async function lockup(id, svg) {
  const colored = svg.replace(/currentColor/g, "#ffffff");
  const markBuf = await sharp(Buffer.from(colored)).resize(200, 200).png().toBuffer();
  const wm = `<?xml version="1.0"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="280">
  <rect width="900" height="280" fill="#0a0a0a"/>
  <text x="280" y="170" font-family="Arial Black, Helvetica Neue, Arial, sans-serif" font-size="92" font-weight="900" letter-spacing="-0.05em" fill="#fff">form</text>
  <text x="590" y="170" font-family="Arial Black, Helvetica Neue, Arial, sans-serif" font-size="92" font-weight="900" fill="#00f948">8</text>
</svg>`;
  const base = await sharp(Buffer.from(wm)).png().toBuffer();
  await sharp(base)
    .composite([{ input: markBuf, left: 48, top: 40 }])
    .toFile(path.join(dir, `lockup-${id}.png`));
}

// clean old stick-figure assets
for (const f of fs.readdirSync(dir)) {
  if (f.endsWith(".png") || f.endsWith(".svg")) fs.unlinkSync(path.join(dir, f));
}

const meta = [];
for (const [id, svg] of Object.entries(marks)) {
  fs.writeFileSync(path.join(dir, `${id}.svg`), svg);
  await sheetFixed(svg, "#0a0a0a", "#ffffff", path.join(dir, `${id}-on-black.png`));
  await sheetFixed(svg, "#ffffff", "#0a0a0a", path.join(dir, `${id}-on-white.png`));
  await sheetFixed(svg, "#0a0a0a", "#00f948", path.join(dir, `${id}-lime.png`));
  meta.push(id);
}

for (const id of Object.keys(marks)) {
  await lockup(id, marks[id]);
}

fs.writeFileSync(
  path.join(dir, "SYSTEM.json"),
  JSON.stringify(
    {
      thesis: "Simple Twist silhouette — solid mass + ownable cut. NO stick figure.",
      sense: "формування складу = empty place / kit / athlete you set",
      variants: {
        "a-empty-slot": "circle + empty capsule slot",
        "b-jersey-8": "kit silhouette + 8 cutout",
        "c-athlete": "continuous athletic silhouette",
        "d-slash-mass": "disk + slash trail",
        "e-eight-slot": "solid 8 + empty slot",
        "f-blob-slot": "soft mass + empty slot",
      },
      refs: [
        "VistaPrint 2026 Simple Twist",
        "ATP negative-space dual read",
        "CLUB / FC.APP geometric football apps",
        "Pinterest geometric B&W silhouette",
      ],
    },
    null,
    2
  )
);

console.log("ok", meta);
