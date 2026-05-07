import { Suspense } from "react";
import { unstable_cache } from "next/cache";
import {
  getConfig,
  findHighestGameweekIdOnChain,
  findLatestResolvedGameweekId,
  getGameweekTeams,
  getTeamResult,
} from "@/lib/movement";
import { PrizeTickerStrip, type TickerWinner } from "./PrizeTickerStrip";

const fetchTickerData = unstable_cache(
  async (): Promise<{ gwId: number; winners: TickerWinner[] } | null> => {
    try {
      const cfg = await getConfig();
      if (!cfg) return null;

      const highestId = await findHighestGameweekIdOnChain(cfg);
      if (highestId < 1) return null;

      const resolvedGwId = await findLatestResolvedGameweekId(highestId);
      if (!resolvedGwId) return null;

      const addresses = await getGameweekTeams(resolvedGwId);
      if (!addresses.length) return null;

      const settled = await Promise.allSettled(
        addresses.map((addr) => getTeamResult(addr, resolvedGwId)),
      );

      const winners: TickerWinner[] = settled
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
      return { gwId: resolvedGwId, winners };
    } catch (e) {
      console.error("[PrizeTicker] fetch error:", e);
      return null;
    }
  },
  ["prize-ticker-winners"],
  { revalidate: 300 }, // cache 5 min — GW results don't change
);

async function PrizeTickerData() {
  const data = await fetchTickerData();
  return <PrizeTickerStrip data={data} />;
}

/** Always renders a 36px fixed strip at top-0. Suspense fallback keeps layout stable while data loads. */
export function PrizeTicker() {
  return (
    <Suspense fallback={<PrizeTickerStrip data={null} />}>
      <PrizeTickerData />
    </Suspense>
  );
}
