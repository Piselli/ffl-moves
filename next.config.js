const fs = require("fs");
const path = require("path");

/** Parse KEY=VAL lines (no export). */
function parseEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const raw = fs.readFileSync(filePath, "utf8");
  const out = {};
  for (const line of raw.split("\n")) {
    const t = line.trim();
    if (!t || t.startsWith("#")) continue;
    const i = t.indexOf("=");
    if (i === -1) continue;
    const k = t.slice(0, i).trim();
    let v = t.slice(i + 1).trim();
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1);
    }
    out[k] = v;
  }
  return out;
}

/**
 * Next.js gives shell `process.env` precedence over `.env.local`, which breaks
 * NEXT_PUBLIC_* when zsh exports old testnet values. Inject from `.env.local`
 * into the compiled `env` so file wins for these keys.
 */
function publicEnvFromEnvLocal() {
  const envLocal = parseEnvFile(path.join(__dirname, ".env.local"));
  const keys = [
    "NEXT_PUBLIC_MOVEMENT_RPC_URL",
    "NEXT_PUBLIC_MODULE_ADDRESS",
    "NEXT_PUBLIC_MODULE_NAME",
    "NEXT_PUBLIC_APTOS_API",
  ];
  const out = {};
  for (const k of keys) {
    const v = envLocal[k];
    if (v != null && String(v).trim().length > 0) out[k] = String(v).trim();
  }
  return out;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: publicEnvFromEnvLocal(),
  webpack: (config, { dev }) => {
    config.resolve.fallback = { fs: false, net: false, tls: false };
    // macOS часто дає EMFILE на нативному watch — polling зменшує кількість file descriptors
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules/**", "**/.git/**"],
      };
    }
    return config;
  },
};

module.exports = nextConfig;
