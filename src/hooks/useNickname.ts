"use client";

import { useState, useCallback, useEffect } from "react";
import {
  NICK_EVENT,
  getRemoteNicknames,
  loadRemoteNicknames,
} from "@/lib/nicknamesClient";

const STORAGE_KEY = "fflmove_nicknames";

/**
 * Solana addresses are case-sensitive base58, so they are their own canonical
 * form. The Move normalizer used here before lowercased them and prefixed `0x`,
 * which both collided distinct wallets and rendered `0xbjcb…` in the UI.
 */
function addressKey(address: string): string {
  return address.trim();
}

function readAll(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}");
  } catch {
    return {};
  }
}

/** Sync read — safe for welcome auto-open before React nick state settles. */
export function hasStoredNickname(address: string): boolean {
  const key = addressKey(address);
  if (!key) return false;
  return Boolean(readAll()[key] || getRemoteNicknames()[key]);
}

export function useNickname(address?: string | null) {
  // Hydrate synchronously so first paint knows stored nicks (avoids false welcome).
  const [local, setLocal] = useState<Record<string, string>>(readAll);
  const [remote, setRemote] = useState<Record<string, string>>(getRemoteNicknames);
  // Server nicknames (signed by each wallet) win; this device's own entry is the fallback.
  const nicknames = { ...local, ...remote };

  useEffect(() => {
    // Keep state identity stable when nothing changed, so consumers (and the board
    // fetches that depend on getNickname) do not re-run on every sync event.
    const same = (a: Record<string, string>, b: Record<string, string>) => {
      const ka = Object.keys(a);
      return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
    };
    const sync = () => {
      const l = readAll();
      const r = getRemoteNicknames();
      setLocal((prev) => (same(prev, l) ? prev : l));
      setRemote((prev) => (same(prev, r) ? prev : r));
    };
    sync();
    void loadRemoteNicknames();
    window.addEventListener(NICK_EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(NICK_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const getNickname = useCallback(
    (addr: string): string => {
      const key = addressKey(addr);
      const stored = remote[key] ?? local[key];
      if (stored) return stored;
      return key.length > 10 ? `${key.slice(0, 4)}...${key.slice(-4)}` : key;
    },
    [local, remote]
  );

  const setNickname = useCallback((addr: string, name: string) => {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    const all = readAll();
    all[addressKey(addr)] = trimmed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setLocal({ ...all });
    window.dispatchEvent(new Event(NICK_EVENT));
  }, []);

  const hasNickname = useCallback(
    (addr: string): boolean => !!(remote[addressKey(addr)] ?? local[addressKey(addr)]),
    [local, remote]
  );

  const myNickname = address ? nicknames[addressKey(address)] ?? null : null;

  return { getNickname, setNickname, hasNickname, myNickname };
}
