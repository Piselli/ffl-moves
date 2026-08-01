"use client";

import { useEffect, useState } from "react";
import { getConfig, findActiveGameweek } from "@/lib/chainClient";
import type { Player } from "@/lib/types";

export type LockerFixture = {
  id: number;
  kickoffTime: string | null;
  teamH: { id: number; name: string; shortName: string; badge: string };
  teamA: { id: number; name: string; shortName: string; badge: string };
};

export type LockerFixturesPayload = {
  gameweek: {
    id: number;
    name?: string;
    deadlineTime: string | null;
    deadlineEpochMs?: number | null;
  };
  fixtures: LockerFixture[];
};

export function useLockerHeroData() {
  const [prizePoolRaw, setPrizePoolRaw] = useState<bigint | null>(null);
  const [entries, setEntries] = useState<number | null>(null);
  const [openGwId, setOpenGwId] = useState<number | null>(null);
  const [chainLoading, setChainLoading] = useState(true);
  const [fixtures, setFixtures] = useState<LockerFixturesPayload | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [playersLoading, setPlayersLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const cfg = await getConfig();
        const gw = await findActiveGameweek();
        if (cancelled || !gw) return;
        setPrizePoolRaw(gw.prizePool);
        setEntries(gw.totalEntries);
        setOpenGwId(gw.id);
      } catch (e) {
        console.error("locker-hero chain:", e);
      } finally {
        if (!cancelled) setChainLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const qs =
      openGwId != null && Number.isFinite(openGwId) && openGwId >= 1
        ? `?registrationGw=${openGwId}`
        : "";
    let cancelled = false;
    fetch(`/api/fixtures${qs}`, { cache: "no-store" })
      .then((r) => r.json())
      .then((d: LockerFixturesPayload & { error?: string }) => {
        if (cancelled || d.error) return;
        setFixtures(d);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [openGwId]);

  useEffect(() => {
    let cancelled = false;
    setPlayersLoading(true);
    fetch("/api/players")
      .then(async (r) => {
        if (!r.ok) throw new Error("players api unavailable");
        const data = await r.json();
        if (!Array.isArray(data)) throw new Error("players api invalid");
        return data as Player[];
      })
      .then((list) => {
        if (!cancelled) setPlayers(list);
      })
      .catch(() =>
        import("@/data/players.json").then((m) => {
          if (!cancelled) setPlayers(m.default as Player[]);
        }),
      )
      .finally(() => {
        if (!cancelled) setPlayersLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return {
    prizePoolRaw,
    entries,
    openGwId,
    chainLoading,
    fixtures,
    players,
    playersLoading,
  };
}
