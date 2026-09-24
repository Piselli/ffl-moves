import { createHeliusRouteHandler } from "helius-wallet-kit/next";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Proxies WaaS bootstrap / RPC / send / plan. Server holds `HELIUS_API_KEY`
 * (paid Developer+ plan required for embedded wallets).
 */
export const { GET, POST } = createHeliusRouteHandler();
