"use client";

import { useEffect, useState } from "react";
import {
  getConfig,
  findHighestGameweekIdOnChain,
  findLatestResolvedGameweekId,
  getGameweekTeams,
  getTeamResult,
} from "@/lib/movement";
import { formatMOVE, shortenAddress } from "@/lib/utils";

type Winner = { address: string; rank: number; prizeAmount: number };
type TickerData = { gwId: number; winners: Winner[] };

const SESSION_KEY = "prize_ticker_v1";
const CACHE_TTL = 5 * 60 * 1000; // 5 min — same as server-side revalidate

function readCache(): TickerData | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as { data: TickerData; ts: number };
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: TickerData) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {}
}

async function fetchWinners(): Promise<TickerData | null> {
  const cached = readCache();
  if (cached) return cached;

  const cfg = await getConfig();
  if (!cfg) return null;

  const highestId = await findHighestGameweekIdOnChain(cfg);
  if (!highestId) return null;

  const resolvedGwId = await findLatestResolvedGameweekId(highestId);
  if (!resolvedGwId) return null;

  const addresses = await getGameweekTeams(resolvedGwId);
  if (!addresses.length) return null;

  const settled = await Promise.allSettled(
    addresses.map((addr) => getTeamResult(addr, resolvedGwId)),
  );

  const winners: Winner[] = settled
    .filter(
      (
        r,
      ): r is PromiseFulfilledResult<
        NonNullable<Awaited<ReturnType<typeof getTeamResult>>>
      > => r.status === "fulfilled" && r.value !== null && r.value.prizeAmount > 0,
    )
    .map((r) => ({
      address: r.value.owner,
      rank: r.value.rank,
      prizeAmount: r.value.prizeAmount,
    }))
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10);

  if (!winners.length) return null;
  const result = { gwId: resolvedGwId, winners };
  writeCache(result);
  return result;
}

const RANK_ACCENT: Record<number, string> = { 1: "#00f948", 2: "#a3e635", 3: "#86efac" };

export function PrizeTickerInline() {
  const [data, setData] = useState<TickerData | null>(null);
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  useEffect(() => {
    try {
      setNicknames(JSON.parse(localStorage.getItem("fflmove_nicknames") ?? "{}"));
    } catch {}

    let cancelled = false;
    fetchWinners()
      .then((d) => { if (!cancelled) setData(d); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  if (!data) return null;

  const displayName = (addr: string) =>
    nicknames[addr.toLowerCase()] ?? shortenAddress(addr);

  const items = [...data.winners, ...data.winners];

  return (
    <section className="w-full relative overflow-hidden border-y border-white/[0.07] bg-white/[0.015]">
      <style>{`@keyframes prize-ticker-inline { 0% { transform: translateX(0); } 100% { transform: translateX(-50%); } }`}</style>

      {/* Left: label badge — sits on top, gradient masks the scroll beneath it */}
      <div className="absolute left-0 top-0 bottom-0 z-10 flex items-center gap-2 pl-4 pr-10 bg-gradient-to-r from-[#0D0F12] via-[#0D0F12]/95 to-transparent pointer-events-none">
        <span className="w-1.5 h-1.5 rounded-full bg-[#00f948] shadow-[0_0_5px_rgba(0,249,72,0.9)] animate-pulse shrink-0" />
        <span className="text-[10px] font-black font-display uppercase tracking-[0.12em] text-white/45 whitespace-nowrap">
          GW {data.gwId} prizes
        </span>
      </div>

      {/* Scrolling track */}
      <div
        className="flex items-center h-10 will-change-transform"
        style={{ animation: "prize-ticker-inline 48s linear infinite" }}
      >
        {items.map((w, i) => (
          <span key={i} className="inline-flex items-center gap-1.5 whitespace-nowrap px-5 h-10">
            <span
              className="text-[10px] font-black font-display"
              style={{ color: RANK_ACCENT[w.rank] ?? "rgba(255,255,255,0.28)" }}
            >
              #{w.rank}
            </span>
            <span className="text-[11px] text-white/55">{displayName(w.address)}</span>
            <span
              className="text-[10px] font-bold px-1.5 py-px rounded"
              style={{
                color: "#00f948",
                background: "rgba(0,249,72,0.07)",
                border: "1px solid rgba(0,249,72,0.18)",
              }}
            >
              {formatMOVE(w.prizeAmount)} MOVE
            </span>
            <span className="text-white/10 mx-1">·</span>
          </span>
        ))}
      </div>

      {/* Right fade */}
      <div className="absolute right-0 top-0 bottom-0 w-20 bg-gradient-to-l from-[#0D0F12] to-transparent pointer-events-none" />
    </section>
  );
}
