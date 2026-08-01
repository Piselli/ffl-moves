"use client";

import { useCallback, useMemo, useState } from "react";
import type { Player } from "@/lib/types";
import { FORMATION, MAX_PER_CLUB } from "@/lib/constants";
import { buildRandomPopularSquad } from "@/lib/randomSquad";

function slotPosition(index: number): Player["position"] {
  if (index === 0) return "GK";
  if (index <= 4) return "DEF";
  if (index <= 7) return "MID";
  return "FWD";
}

function firstEmptySlot(
  starters: (Player | null)[],
  position: Player["position"],
): number | null {
  for (let i = 0; i < 11; i++) {
    if (!starters[i] && slotPosition(i) === position) return i;
  }
  return null;
}

export function useSquadPick() {
  const [starters, setStarters] = useState<(Player | null)[]>(Array(11).fill(null));
  const [bench, setBench] = useState<(Player | null)[]>(Array(FORMATION.BENCH).fill(null));
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  const selectedIds = useMemo(() => {
    const ids = new Set<number>();
    for (const p of starters) if (p) ids.add(p.id);
    for (const p of bench) if (p) ids.add(p.id);
    return ids;
  }, [starters, bench]);

  const clubCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    for (const p of [...starters, ...bench]) {
      if (!p) continue;
      counts[p.teamId] = (counts[p.teamId] ?? 0) + 1;
    }
    return counts;
  }, [starters, bench]);

  const filledCount = selectedIds.size;

  const clearSlot = useCallback((index: number) => {
    if (index < 11) {
      setStarters((prev) => {
        const next = [...prev];
        next[index] = null;
        return next;
      });
    } else {
      const bi = index - 11;
      setBench((prev) => {
        const next = [...prev];
        if (bi >= 0 && bi < next.length) next[bi] = null;
        return next;
      });
    }
    setActiveSlot(null);
  }, []);

  const pickPlayer = useCallback(
    (player: Player) => {
      if (selectedIds.has(player.id)) return { ok: false as const, reason: "already" as const };

      const clubN = clubCounts[player.teamId] ?? 0;
      if (clubN >= MAX_PER_CLUB) return { ok: false as const, reason: "club" as const };

      setStarters((prev) => {
        const next = [...prev];
        const target =
          activeSlot != null &&
          !next[activeSlot] &&
          slotPosition(activeSlot) === player.position
            ? activeSlot
            : firstEmptySlot(next, player.position);

        if (target == null) return prev;
        next[target] = player;
        return next;
      });
      setActiveSlot(null);
      return { ok: true as const };
    },
    [activeSlot, clubCounts, selectedIds],
  );

  const reset = useCallback(() => {
    setStarters(Array(11).fill(null));
    setBench(Array(FORMATION.BENCH).fill(null));
    setActiveSlot(null);
  }, []);

  const randomize = useCallback((players: Player[]) => {
    const squad = buildRandomPopularSquad(players);
    if (!squad) return false;
    setStarters(squad.starters);
    setBench(squad.bench);
    setActiveSlot(null);
    return true;
  }, []);

  return {
    starters,
    bench,
    activeSlot,
    setActiveSlot,
    selectedIds,
    filledCount,
    clearSlot,
    pickPlayer,
    reset,
    randomize,
  };
}
