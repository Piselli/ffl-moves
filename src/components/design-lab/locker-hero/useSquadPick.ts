"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Player } from "@/lib/types";
import { FORMATION, MAX_PER_CLUB } from "@/lib/constants";
import {
  DEFAULT_FORMATION,
  loadFormationId,
  remapStartersToFormation,
  saveFormationId,
  slotPosition,
  type FormationId,
} from "@/lib/formation";
import { buildRandomPopularSquad } from "@/lib/randomSquad";

function firstEmptyStarter(
  starters: (Player | null)[],
  position: Player["position"],
  formationId: FormationId,
): number | null {
  for (let i = 0; i < 11; i++) {
    if (!starters[i] && slotPosition(i, formationId) === position) return i;
  }
  return null;
}

function firstEmptyBench(bench: (Player | null)[]): number | null {
  for (let i = 0; i < bench.length; i++) {
    if (!bench[i]) return i;
  }
  return null;
}

export function useSquadPick() {
  const [formationId, setFormationIdState] =
    useState<FormationId>(DEFAULT_FORMATION);
  const [starters, setStarters] = useState<(Player | null)[]>(Array(11).fill(null));
  const [bench, setBench] = useState<(Player | null)[]>(Array(FORMATION.BENCH).fill(null));
  const [activeSlot, setActiveSlot] = useState<number | null>(null);

  useEffect(() => {
    setFormationIdState(loadFormationId());
  }, []);

  const setFormationId = useCallback((id: FormationId) => {
    setFormationIdState(id);
    saveFormationId(id);
    setStarters((prev) => remapStartersToFormation(prev, id));
    setActiveSlot(null);
  }, []);

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
  const squadTotal = FORMATION.TOTAL;

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
      if (selectedIds.has(player.id)) {
        return { ok: false as const, reason: "already" as const };
      }

      const clubN = clubCounts[player.teamId] ?? 0;
      if (clubN >= MAX_PER_CLUB) {
        return { ok: false as const, reason: "club" as const };
      }

      // Active bench slot (indices 11–13) — any position.
      if (activeSlot != null && activeSlot >= 11) {
        const bi = activeSlot - 11;
        if (bi < 0 || bi >= bench.length || bench[bi]) {
          return { ok: false as const, reason: "full" as const };
        }
        setBench((prev) => {
          const next = [...prev];
          next[bi] = player;
          return next;
        });
        setActiveSlot(null);
        return { ok: true as const };
      }

      // Active empty starter slot matching position.
      if (
        activeSlot != null &&
        activeSlot < 11 &&
        !starters[activeSlot] &&
        slotPosition(activeSlot, formationId) === player.position
      ) {
        setStarters((prev) => {
          const next = [...prev];
          next[activeSlot] = player;
          return next;
        });
        setActiveSlot(null);
        return { ok: true as const };
      }

      // Auto: first empty starter of that position, else first empty bench.
      const starterIdx = firstEmptyStarter(
        starters,
        player.position,
        formationId,
      );
      if (starterIdx != null) {
        setStarters((prev) => {
          const next = [...prev];
          next[starterIdx] = player;
          return next;
        });
        setActiveSlot(null);
        return { ok: true as const };
      }

      const benchIdx = firstEmptyBench(bench);
      if (benchIdx == null) {
        return { ok: false as const, reason: "full" as const };
      }
      setBench((prev) => {
        const next = [...prev];
        next[benchIdx] = player;
        return next;
      });
      setActiveSlot(null);
      return { ok: true as const };
    },
    [activeSlot, bench, clubCounts, formationId, selectedIds, starters],
  );

  const reset = useCallback(() => {
    setStarters(Array(11).fill(null));
    setBench(Array(FORMATION.BENCH).fill(null));
    setActiveSlot(null);
  }, []);

  const randomize = useCallback(
    (players: Player[]) => {
      const squad = buildRandomPopularSquad(players, 12, formationId);
      if (!squad) return false;
      setStarters(squad.starters);
      setBench(squad.bench);
      setActiveSlot(null);
      return true;
    },
    [formationId],
  );

  return {
    formationId,
    setFormationId,
    starters,
    bench,
    activeSlot,
    setActiveSlot,
    selectedIds,
    filledCount,
    squadTotal,
    clearSlot,
    pickPlayer,
    reset,
    randomize,
  };
}
