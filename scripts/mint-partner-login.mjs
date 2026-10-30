#!/usr/bin/env node
/**
 * Mint /partners invite URLs for whitelisted emails.
 *
 * Usage:
 *   node --env-file=.env.local scripts/mint-partner-login.mjs youshibravo@gmail.com
 *   node --env-file=.env.local scripts/mint-partner-login.mjs broadbabyauthor@gmail.com youshibravo@gmail.com
 */
import { createHmac } from "crypto";
import { readFileSync } from "fs";
import { resolve } from "path";

function loadEnvLocal() {
  try {
    const raw = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of raw.split("\n")) {
      const t = line.trim();
      if (!t || t.startsWith("#")) continue;
      const i = t.indexOf("=");
      if (i < 0) continue;
      const k = t.slice(0, i).trim();
      let v = t.slice(i + 1).trim();
      if (
        (v.startsWith("'") && v.endsWith("'")) ||
        (v.startsWith('"') && v.endsWith('"'))
      ) {
        v = v.slice(1, -1);
      }
      if (!(k in process.env)) process.env[k] = v;
    }
  } catch {
    /* optional */
  }
}

loadEnvLocal();

function b64url(buf) {
  const b = Buffer.isBuffer(buf) ? buf : Buffer.from(buf, "utf8");
  return b.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function normalizeEmail(raw) {
  const email = String(raw || "")
    .trim()
    .toLowerCase()
    .slice(0, 254);
  if (!email || !email.includes("@") || email.includes(" ")) return null;
  return email;
}

function parsePartners(raw) {
  if (!raw?.trim()) return [];
  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  return parsed
    .map((row) => {
      if (!row || typeof row !== "object") return null;
      const id = typeof row.id === "string" ? row.id.trim() : "";
      const emails = Array.isArray(row.emails)
        ? [...new Set(row.emails.map(normalizeEmail).filter(Boolean))]
        : [];
      if (!id || emails.length === 0) return null;
      return { id, label: row.label || id, emails };
    })
    .filter(Boolean);
}

const secret =
  process.env.PARTNERS_SESSION_SECRET?.trim() ||
  process.env.MATCHDAY_SESSION_SECRET?.trim() ||
  process.env.CRON_SECRET?.trim() ||
  "partners-dev-secret-change-me";

const base = (
  process.env.NEXT_PUBLIC_SITE_URL ||
  "https://www.form8.football"
).replace(/\/$/, "");

const partners = parsePartners(process.env.REFERRAL_PARTNERS);
const emails = process.argv.slice(2).map(normalizeEmail).filter(Boolean);

if (emails.length === 0) {
  console.error("Usage: node scripts/mint-partner-login.mjs <email> [email…]");
  process.exit(1);
}

const ttlMs = 1000 * 60 * 60 * 24 * 90;
const exp = Date.now() + ttlMs;

for (const email of emails) {
  const partner = partners.find((p) => p.emails.includes(email));
  if (!partner) {
    console.error(`✗ ${email} — not on REFERRAL_PARTNERS whitelist`);
    continue;
  }
  const payload = b64url(JSON.stringify({ email, partnerId: partner.id, exp }));
  const sig = b64url(createHmac("sha256", secret).update(payload).digest());
  const token = `${payload}.${sig}`;
  const url = `${base}/api/partners/auth/magic?t=${encodeURIComponent(token)}`;
  console.log(`\n${email} → ${partner.label} (${partner.id})`);
  console.log(url);
}

console.log(`\nExpires: ${new Date(exp).toISOString()} (90d)`);
