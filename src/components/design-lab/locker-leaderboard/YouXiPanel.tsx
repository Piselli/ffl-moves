"use client";

import { useMemo, type ReactNode } from "react";
import { useReducedMotion } from "framer-motion";
import { useSiteMessages } from "@/i18n/LocaleProvider";
import { DEFAULT_FORMATION } from "@/lib/formation";
import { cn } from "@/lib/utils";
import { CrystalResultShare } from "./CrystalResultShare";
import type { LabLeaderboardRow } from "./mockData";
import {
  resolveYouXiVariantId,
  type YouXiVariantId,
} from "./youXiVariants";
import { groupSquadFormation } from "./xiBreakdownHelpers";

function XiShell({
  loading,
  empty,
  children,
  className,
}: {
  loading?: boolean;
  empty?: boolean;
  children: ReactNode;
  className?: string;
}) {
  if (loading) {
    return (
      <div className={cn("flex h-full items-center justify-center", className)}>
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-[#00F948]" />
      </div>
    );
  }
  if (empty) {
    return (
      <div className={cn("flex h-full items-center justify-center px-6", className)}>
        <p className="text-center text-[15px] text-white/45">Loading your squad…</p>
      </div>
    );
  }
  return (
    <div className={cn("flex h-full min-h-0 flex-col overflow-hidden", className)}>
      {children}
    </div>
  );
}

export function YouResultHero({
  manager,
  gameweek,
  counter,
  Counter,
}: {
  manager: LabLeaderboardRow;
  gameweek: number;
  counter?: boolean;
  Counter?: ({ value }: { value: number }) => ReactNode;
}) {
  return (
    <div className="flex shrink-0 items-center justify-between gap-2 px-1.5 py-0">
      <span className="text-[8px] font-medium text-white/35">GW {gameweek}</span>
      <div className="flex items-baseline gap-1.5">
        <span className="font-display text-[13px] font-black leading-none text-white">
          #{manager.rank}
        </span>
        <span className="text-[12px] font-semibold tabular-nums leading-none text-white">
          {counter && Counter ? (
            <Counter value={manager.finalPoints} />
          ) : (
            manager.finalPoints
          )}
          <span className="ml-0.5 text-[8px] font-normal text-white/35">pts</span>
        </span>
      </div>
    </div>
  );
}

export function YouXiPanel({
  manager,
  landKey,
  loadingXi,
  variantId,
  gameweek,
  className,
}: {
  manager?: LabLeaderboardRow;
  landKey: number;
  loadingXi?: boolean;
  variantId: YouXiVariantId;
  gameweek?: number;
  className?: string;
}) {
  useReducedMotion();
  const m = useSiteMessages();
  const gains = m.scoringGains;
  const starters = manager?.xi ?? [];
  const bench = manager?.bench ?? [];
  const formationId = manager?.formationId ?? DEFAULT_FORMATION;
  const groups = useMemo(
    () => groupSquadFormation(starters, bench, formationId),
    [starters, bench, formationId],
  );
  const loading = Boolean(loadingXi && starters.length === 0);
  const empty = !loading && starters.length === 0;
  const plate = resolveYouXiVariantId(variantId);

  void landKey;

  return (
    <XiShell loading={loading} empty={empty} className={className}>
      {manager ? (
        <div className="min-h-0 flex-1 px-2 pb-1 pt-0.5">
          <CrystalResultShare
            manager={manager}
            gameweek={gameweek ?? 0}
            groups={groups}
            gains={gains}
            plateId={plate}
          />
        </div>
      ) : null}
    </XiShell>
  );
}
