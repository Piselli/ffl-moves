"use client";

import { useState, useCallback, useEffect } from "react";
import { normalizeMoveAccountAddress } from "@/lib/moveAddress";

const STORAGE_KEY = "fflmove_nicknames";

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
      const key = normalizeMoveAccountAddress(addr);
      const stored = nicknames[key] ?? nicknames[addr.toLowerCase()];
      if (stored) return stored;
      const short = normalizeMoveAccountAddress(addr);
      return short.slice(0, 6) + "..." + short.slice(-4);
    },
    [nicknames]
  );

  const setNickname = useCallback((addr: string, name: string) => {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    const all = readAll();
    all[normalizeMoveAccountAddress(addr)] = trimmed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setNicknames({ ...all });
  }, []);

  const hasNickname = useCallback(
    (addr: string): boolean => !!nicknames[normalizeMoveAccountAddress(addr)],
    [nicknames]
  );

  const myNickname = address ? nicknames[normalizeMoveAccountAddress(address)] ?? null : null;

  return { getNickname, setNickname, hasNickname, myNickname };
}
