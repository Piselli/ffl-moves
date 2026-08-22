"use client";

import { useEffect, useState } from "react";
import { getConfig, findOpenGameweek } from "@/lib/chainClient";
import type { Player } from "@/lib/types";

let playersCache: Player[] = [];

export type LockerFixture = {
  id: number;
  kickoffTime: string | null;
  teamH: { id: number; name: string; shortName: string; badge: string };
  teamA: { id: number; name: string; shortName: string; badge: string };
  finished?: boolean;
  started?: boolean;
  scoreH?: number | null;
  scoreA?: number | null;
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

const FIXTURES_POLL_MS = 45_000;

function fixturesNeedLivePoll(payload: LockerFixturesPayload | null): boolean {
  const list = payload?.fixtures;
  if (!list?.length) return false;
  return list.some((f) => f.started && !f.finished);
}

export function useLockerHeroData() {
  const [prizePoolRaw, setPrizePoolRaw] = useState<bigint | null>(null);
  const [entries, setEntries] = useState<number | null>(null);
  const [openGwId, setOpenGwId] = useState<number | null>(null);
  const [chainLoading, setChainLoading] = useState(true);
  const [fixtures, setFixtures] = useState<LockerFixturesPayload | null>(null);
  const [fixturesLoading, setFixturesLoading] = useState(true);
  const [players, setPlayers] = useState<Player[]>(playersCache);
  const [playersLoading, setPlayersLoading] = useState(playersCache.length === 0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await getConfig();
        const gw = await findOpenGameweek();
        if (cancelled) return;
        if (!gw) {
          setPrizePoolRaw(null);
          setEntries(null);
          setOpenGwId(null);
          return;
        }
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
    let pollId: ReturnType<typeof setInterval> | null = null;

    const load = (isPoll: boolean) => {
      if (!isPoll) setFixturesLoading(true);
      return fetch(`/api/fixtures${qs}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: LockerFixturesPayload & { error?: string }) => {
          if (cancelled || d.error) return null;
          setFixtures(d);
          return d;
        })
        .catch(() => null)
        .finally(() => {
          if (!cancelled && !isPoll) setFixturesLoading(false);
        });
    };

    void load(false).then((first) => {
      if (cancelled || !fixturesNeedLivePoll(first)) return;
      pollId = setInterval(() => {
        void load(true).then((next) => {
          if (!fixturesNeedLivePoll(next) && pollId) {
            clearInterval(pollId);
            pollId = null;
          }
        });
      }, FIXTURES_POLL_MS);
    });

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
    };
  }, [openGwId]);

  useEffect(() => {
    let cancelled = false;
    if (playersCache.length === 0) setPlayersLoading(true);
    fetch("/api/players")
      .then(async (r) => {
        if (!r.ok) throw new Error("players api unavailable");
        const data = await r.json();
        if (!Array.isArray(data)) throw new Error("players api invalid");
        return data as Player[];
      })
      .then((list) => {
        playersCache = list;
        if (!cancelled) setPlayers(list);
      })
      .catch(() =>
        import("@/data/players.json").then((m) => {
          playersCache = m.default as Player[];
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
    fixturesLoading,
    players,
    playersLoading,
  };
}
