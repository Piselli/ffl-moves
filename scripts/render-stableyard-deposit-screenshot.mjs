/**
 * Renders a demo screenshot of the Stableyard deposit flow for Twitter.
 * No live gameweek needed — static HTML mock.
 *
 * Run: node scripts/render-stableyard-deposit-screenshot.mjs
 */
import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { chromium } from "playwright";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const htmlPath = join(root, "scripts/marketing/stableyard-deposit-mock.html");
const htmlLinearEnPath = join(root, "scripts/marketing/stableyard-deposit-modal-linear-en.html");
const outDir = join(root, "public/marketing");

const outputs = [
  {
    slug: "stableyard-deposit-screenshot-modal",
    width: 1400,
    height: 900,
    file: htmlPath,
  },
  {
    slug: "stableyard-deposit-screenshot-panel",
    width: 1400,
    height: 900,
    file: htmlPath,
    hideModal: true,
  },
  {
    slug: "stableyard-deposit-modal-linear-en",
    width: 1400,
    height: 900,
    file: htmlLinearEnPath,
  },
];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

for (const spec of outputs) {
  await page.setViewportSize({ width: spec.width, height: spec.height });
  await page.goto(pathToFileURL(spec.file ?? htmlPath).href, { waitUntil: "networkidle" });

  if (spec.hideModal) {
    await page.evaluate(() => {
      const overlay = document.querySelector(".overlay");
      if (overlay) overlay.style.display = "none";
    });
  }

  // Let fonts settle
  await page.waitForTimeout(400);

  const outPng = join(outDir, `${spec.slug}.png`);
  await page.screenshot({ path: outPng, type: "png" });
  console.log(`Wrote ${outPng}`);
}

await browser.close();
