"use client";

import { MOVEMENT_RPC_URL, MODULE_ADDRESS } from "@/lib/constants";

/** Shows effective chain env in dev so misconfigured .env.local is obvious. */
export function DevChainBanner() {
  if (process.env.NODE_ENV !== "development") return null;

  const isNightly = /movement\.nightly\.app|nightly\.app\/.*movement/i.test(MOVEMENT_RPC_URL);
  const isDefaultTestnet3Module =
    MODULE_ADDRESS.toLowerCase() ===
    "0xc9f5444ab989c2a7ef73b1eab58b66947c4c5788e25d997d649c7d6ddfbeb5a1".toLowerCase();

  return (
    <div className="border-b border-amber-500/40 bg-amber-950/40 px-3 py-2 text-center text-xs text-amber-100">
      <span className="font-mono text-[11px]">DEV</span>
      {" · "}
      <span className="font-mono break-all">RPC {MOVEMENT_RPC_URL}</span>
      {" · "}
      <span className="font-mono break-all">MODULE {MODULE_ADDRESS}</span>
      {(isNightly || (isDefaultTestnet3Module && MOVEMENT_RPC_URL.includes("mainnet"))) && (
        <div className="mt-1 font-medium text-amber-300">
          Перевір .env.local і Nightly: не nightly RPC і не дефолтна адреса testnet3 на mainnet.
        </div>
      )}
    </div>
  );
}
