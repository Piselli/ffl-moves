"use client";

import { useEffect, useRef, useState } from "react";
import { getConfig, findOpenGameweek } from "@/lib/chainClient";
import type { Player } from "@/lib/types";

let playersCache: Player[] = [];

const PLAYERS_SS_KEY = "ffl_players_catalog_v2";
const PLAYERS_SS_TTL_MS = 10 * 60 * 1000;

function readPlayersSession(): Player[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(PLAYERS_SS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { at?: number; players?: Player[] };
    if (!parsed?.players?.length || typeof parsed.at !== "number") return null;
    if (Date.now() - parsed.at > PLAYERS_SS_TTL_MS) return null;
    return parsed.players;
  } catch {
    return null;
  }
}

function writePlayersSession(players: Player[]) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      PLAYERS_SS_KEY,
      JSON.stringify({ at: Date.now(), players }),
    );
  } catch {
    /* quota / private mode */
  }
}

function seedPlayersCache(): Player[] {
  if (playersCache.length) return playersCache;
  const fromSs = readPlayersSession();
  if (fromSs?.length) {
    playersCache = fromSs;
    return fromSs;
  }
  return [];
}

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
  const [players, setPlayers] = useState<Player[]>(() => seedPlayersCache());
  const [playersLoading, setPlayersLoading] = useState(
    () => seedPlayersCache().length === 0,
  );
  const fixturesRef = useRef<LockerFixturesPayload | null>(null);
  fixturesRef.current = fixtures;

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

  // Fixtures: first paint without waiting on Solana. Soft-refetch when openGwId lands.
  useEffect(() => {
    let cancelled = false;
    let pollId: ReturnType<typeof setInterval> | null = null;

    const load = (opts: { qs: string; soft: boolean }) => {
      if (!opts.soft) setFixturesLoading(true);
      return fetch(`/api/fixtures${opts.qs}`, { cache: "no-store" })
        .then((r) => r.json())
        .then((d: LockerFixturesPayload & { error?: string }) => {
          if (cancelled || d.error) return null;
          setFixtures(d);
          return d;
        })
        .catch(() => null)
        .finally(() => {
          if (!cancelled && !opts.soft) setFixturesLoading(false);
        });
    };

    const startPoll = (first: LockerFixturesPayload | null, qs: string) => {
      if (cancelled || !fixturesNeedLivePoll(first)) return;
      pollId = setInterval(() => {
        void load({ qs, soft: true }).then((next) => {
          if (!fixturesNeedLivePoll(next) && pollId) {
            clearInterval(pollId);
            pollId = null;
          }
        });
      }, FIXTURES_POLL_MS);
    };

    void load({ qs: "", soft: false }).then((first) => startPoll(first, ""));

    return () => {
      cancelled = true;
      if (pollId) clearInterval(pollId);
    };
  }, []);

  useEffect(() => {
    if (openGwId == null || !Number.isFinite(openGwId) || openGwId < 1) return;
    const current = fixturesRef.current;
    if (current?.gameweek?.id === openGwId) return;

    let cancelled = false;
    const qs = `?registrationGw=${openGwId}`;
    void fetch(`/api/fixtures${qs}`, { cache: "no-store" })
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
        writePlayersSession(list);
        if (!cancelled) setPlayers(list);
      })
      .catch(() => {
        if (playersCache.length > 0) {
          if (!cancelled) setPlayers(playersCache);
          return;
        }
        return import("@/data/players.json").then((m) => {
          playersCache = m.default as Player[];
          if (!cancelled) setPlayers(m.default as Player[]);
        });
      })
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
