"use client";

import { useState, useCallback, useEffect } from "react";

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

export function useNickname(address?: string | null) {
  const [nicknames, setNicknames] = useState<Record<string, string>>({});

  useEffect(() => {
    setNicknames(readAll());
  }, []);

  const getNickname = useCallback(
    (addr: string): string => {
      const key = addressKey(addr);
      const stored = nicknames[key];
      if (stored) return stored;
      return key.length > 10 ? `${key.slice(0, 4)}...${key.slice(-4)}` : key;
    },
    [nicknames]
  );

  const setNickname = useCallback((addr: string, name: string) => {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    const all = readAll();
    all[addressKey(addr)] = trimmed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setNicknames({ ...all });
  }, []);

  const hasNickname = useCallback(
    (addr: string): boolean => !!nicknames[addressKey(addr)],
    [nicknames]
  );

  const myNickname = address ? nicknames[addressKey(address)] ?? null : null;

  return { getNickname, setNickname, hasNickname, myNickname };
}
