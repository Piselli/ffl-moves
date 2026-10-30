const fs = require("fs");
const path = require("path");
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
 * NEXT_PUBLIC_* when zsh exports old testnet values. Prefer `.env.local` when
 * present (local), then fall back to process.env (Vercel Production).
 * Webpack DefinePlugin below inlines these so the browser actually sees them.
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
    const fromFile = envLocal[k];
    if (fromFile != null && String(fromFile).trim().length > 0) {
      out[k] = String(fromFile).trim();
      continue;
    }
    const fromProcess = process.env[k];
    if (fromProcess != null && String(fromProcess).trim().length > 0) {
      out[k] = String(fromProcess).trim();
    }
  }
  return out;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "helius-wallet-kit",
    "@turnkey/react-wallet-kit",
    "@imgly/background-removal",
  ],
  env: publicEnvFromEnvLocal(),
  async redirects() {
    return [
      { source: "/gameweek", destination: "/", permanent: false },
      { source: "/classic", destination: "/", permanent: false },
      { source: "/leaderboard/classic", destination: "/leaderboard", permanent: false },
      { source: "/season-leaderboard/classic", destination: "/season-leaderboard", permanent: false },
      { source: "/titles", destination: "/", permanent: false },
    ];
  },
  async headers() {
    return [
      {
        source: "/sprites/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=86400, stale-while-revalidate=604800",
          },
        ],
      },
    ];
  },
  webpack: (config, { dev, isServer, webpack: webpackApi }) => {
    config.resolve.fallback = {
      fs: false,
      net: false,
      tls: false,
      buffer: require.resolve("buffer/"),
    };
    // Browser cutout (@imgly) — never pull Node ORT / sharp into the client bundle.
    // ort.node*.mjs also breaks Terser (import.meta / ESM outside module).
    config.resolve.alias = {
      ...(config.resolve.alias || {}),
      sharp$: false,
      "onnxruntime-node$": false,
      "onnxruntime-web/dist/ort.node.min.mjs": false,
      "onnxruntime-web/dist/ort.node.min.js": false,
    };
    config.plugins.push(
      new webpackApi.ProvidePlugin({
        Buffer: ["buffer", "Buffer"],
      }),
      new webpackApi.IgnorePlugin({
        resourceRegExp: /ort\.node\.(min\.)?(mjs|js)$/,
      }),
    );
    // onnxruntime-web ships prebundled ESM; Terser chokes on import.meta inside it.
    if (!dev && Array.isArray(config.optimization?.minimizer)) {
      for (const plugin of config.optimization.minimizer) {
        if (plugin?.constructor?.name !== "TerserPlugin") continue;
        const prev = plugin.options?.exclude;
        plugin.options = {
          ...plugin.options,
          exclude: [
            ...(Array.isArray(prev) ? prev : prev ? [prev] : []),
            /node_modules[\\/]onnxruntime-web[\\/]/,
          ],
        };
      }
    }
    if (!isServer) {
      config.externals = [
        ...(Array.isArray(config.externals)
          ? config.externals
          : config.externals
            ? [config.externals]
            : []),
        ({ request }, callback) => {
          if (request && /ort\.node\./.test(request)) {
            return callback(null, "commonjs " + request);
          }
          callback();
        },
      ];
    }
    // macOS часто дає EMFILE на нативному watch — polling зменшує кількість file descriptors
    if (dev) {
      config.watchOptions = {
        poll: 2000,
        aggregateTimeout: 300,
        ignored: ["**/node_modules/**", "**/.git/**"],
      };
    }
    // Next can still inline shell `process.env` for NEXT_PUBLIC_*; force file values last.
    const fromFile = publicEnvFromEnvLocal();
    if (Object.keys(fromFile).length > 0) {
      const defs = {};
      for (const [k, v] of Object.entries(fromFile)) {
        defs[`process.env.${k}`] = JSON.stringify(v);
      }
      config.plugins.push(new webpackApi.DefinePlugin(defs));
    }
    return config;
  },
};

module.exports = nextConfig;
