"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { findOpenGameweek, getConfig } from "@/lib/chainClient";
import type { Player } from "@/lib/types";

type OpenGwPayload = {
  id: number;
  prizePool: bigint;
  totalEntries: number;
};

/**
 * Prefer browser→Helius (Allowed Domains / Origin) on the client.
 * Fall back to `/api/solana/config` when direct RPC fails — server now
 * sends Origin so Vercel is not 403'd by Helius domain ACL.
 */
async function loadOpenGameweek(): Promise<OpenGwPayload | null> {
  if (typeof window !== "undefined") {
    try {
      await getConfig();
      const gw = await findOpenGameweek();
      if (gw) {
        return {
          id: gw.id,
          prizePool: gw.prizePool,
          totalEntries: gw.totalEntries,
        };
      }
      return null;
    } catch (e) {
      console.warn("locker-hero direct RPC failed, trying server config:", e);
    }
  }

  try {
    const res = await fetch("/api/solana/config", { cache: "no-store" });
    if (res.ok) {
      const payload = (await res.json()) as {
        openGameweek?: {
          id?: number;
          prizePool?: string | number;
          totalEntries?: number;
        } | null;
      };
      const gw = payload.openGameweek;
      if (gw && typeof gw.id === "number" && gw.id > 0) {
        return {
          id: gw.id,
          prizePool: BigInt(String(gw.prizePool ?? 0)),
          totalEntries: Number(gw.totalEntries ?? 0),
        };
      }
      return null;
    }
  } catch {
    /* fall through */
  }

  if (typeof window === "undefined") {
    await getConfig();
    const gw = await findOpenGameweek();
    if (!gw) return null;
    return {
      id: gw.id,
      prizePool: gw.prizePool,
      totalEntries: gw.totalEntries,
    };
  }

  throw new Error("Could not load open gameweek from RPC or server.");
}

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
  const chainEpochRef = useRef(0);

  const applyOpenGw = (gw: OpenGwPayload | null) => {
    if (!gw) {
      setPrizePoolRaw(null);
      setEntries(null);
      setOpenGwId(null);
      return;
    }
    setPrizePoolRaw(gw.prizePool);
    setEntries(gw.totalEntries);
    setOpenGwId(gw.id);
  };

  const refreshOpenGameweek = useCallback(async () => {
    const epoch = ++chainEpochRef.current;
    try {
      const gw = await loadOpenGameweek();
      if (epoch !== chainEpochRef.current) return;
      applyOpenGw(gw);
    } catch (e) {
      console.error("locker-hero chain refresh:", e);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    let attempt = 0;
    const maxAttempts = 3;

    const run = async () => {
      attempt += 1;
      const epoch = ++chainEpochRef.current;
      try {
        const gw = await loadOpenGameweek();
        if (cancelled || epoch !== chainEpochRef.current) return;
        applyOpenGw(gw);
        setChainLoading(false);
      } catch (e) {
        console.error("locker-hero chain:", e);
        if (cancelled) return;
        if (attempt < maxAttempts) {
          window.setTimeout(() => {
            void run();
          }, 600 * attempt);
          return;
        }
        setChainLoading(false);
      }
    };

    void run();
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
    refreshOpenGameweek,
    fixtures,
    fixturesLoading,
    players,
    playersLoading,
  };
}
