"use client";

import { useState, useCallback, useEffect } from "react";

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
      const stored = nicknames[addr.toLowerCase()];
      if (stored) return stored;
      return addr.slice(0, 6) + "..." + addr.slice(-4);
    },
    [nicknames]
  );

  const setNickname = useCallback((addr: string, name: string) => {
    const trimmed = name.trim().slice(0, 20);
    if (!trimmed) return;
    const all = readAll();
    all[addr.toLowerCase()] = trimmed;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(all));
    setNicknames({ ...all });
  }, []);

  const hasNickname = useCallback(
    (addr: string): boolean => !!nicknames[addr.toLowerCase()],
    [nicknames]
  );

  const myNickname = address ? nicknames[address.toLowerCase()] ?? null : null;

  return { getNickname, setNickname, hasNickname, myNickname };
}
