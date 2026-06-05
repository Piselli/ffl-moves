const STORAGE_KEY = "fflmove_x_handle";

export function getStoredXHandle(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const trimmed = raw.trim().replace(/^@+/, "");
    return trimmed || null;
  } catch {
    return null;
  }
}

export function saveXHandle(handle: string): void {
  if (typeof window === "undefined") return;
  const trimmed = handle.trim().replace(/^@+/, "");
  try {
    if (!trimmed) {
      localStorage.removeItem(STORAGE_KEY);
    } else {
      localStorage.setItem(STORAGE_KEY, trimmed.slice(0, 15));
    }
  } catch {
    /* ignore quota */
  }
}

export function formatXHandleForTweet(handle: string | null | undefined): string | null {
  if (!handle) return null;
  const trimmed = handle.trim().replace(/^@+/, "");
  return trimmed ? `@${trimmed}` : null;
}
