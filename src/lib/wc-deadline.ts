import { deadlineRawToUtcMs } from "@/lib/fpl-deadline";

/** Resolve registration deadline (first kickoff) from `/api/wc-fixtures` payload. */
export function resolveWcDeadlineMs(payload: {
  deadlineTime?: string | null;
  deadlineEpochMs?: number | null;
} | null | undefined): number | null {
  if (!payload) return null;
  if (typeof payload.deadlineEpochMs === "number" && Number.isFinite(payload.deadlineEpochMs)) {
    return payload.deadlineEpochMs;
  }
  const ms = deadlineRawToUtcMs(payload.deadlineTime ?? "");
  return Number.isFinite(ms) ? ms : null;
}

export async function fetchWcTourDeadlineMs(tourId: number): Promise<number | null> {
  try {
    const res = await fetch(`/api/wc-fixtures?tour=${tourId}`, { cache: "no-store" });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      deadlineTime?: string | null;
      deadlineEpochMs?: number | null;
    };
    return resolveWcDeadlineMs(data);
  } catch {
    return null;
  }
}
