"use client";

import Link from "next/link";
import { MOVEMATCH_PROGRAM_ID, SOLANA_CLUSTER, SOLANA_RPC_URL } from "@/lib/constants";

/** Shows effective chain env in dev so misconfigured .env.local is obvious. */
export function DevChainBanner() {
  if (process.env.NODE_ENV !== "development") return null;

  // A mainnet RPC under a devnet cluster (or the reverse) is the misconfiguration
  // that silently shows an empty product instead of failing.
  const rpcMentionsMainnet = /mainnet/i.test(SOLANA_RPC_URL);
  const clusterMismatch =
    (SOLANA_CLUSTER === "mainnet-beta") !== rpcMentionsMainnet &&
    /mainnet|devnet/i.test(SOLANA_RPC_URL);

  return (
    <div className="border-b border-amber-500/40 bg-amber-950/40 px-3 py-2 text-center text-xs text-amber-100">
      <span className="font-mono text-[11px]">DEV</span>
      {" · "}
      <span className="font-mono break-all">{SOLANA_CLUSTER}</span>
      {" · "}
      <span className="font-mono break-all">RPC {SOLANA_RPC_URL}</span>
      {" · "}
      <span className="font-mono break-all">PROGRAM {MOVEMATCH_PROGRAM_ID}</span>
      {clusterMismatch && (
        <div className="mt-1 font-medium text-amber-300">
          RPC host does not match NEXT_PUBLIC_SOLANA_CLUSTER — check .env.local.
        </div>
      )}
      <div className="mt-1.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1">
        <Link
          href="/design-preview"
          className="font-semibold text-[#00f948] underline underline-offset-2 hover:text-[#00f948]/80"
        >
          Visual concepts →
        </Link>
        <Link
          href="/design-preview/homepage"
          className="font-semibold text-[#00f948] underline underline-offset-2 hover:text-[#00f948]/80"
        >
          Homepage nav redesign →
        </Link>
      </div>
    </div>
  );
}
