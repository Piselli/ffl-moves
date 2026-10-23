/**
 * Registration-deadline reminder windows.
 *
 * Tightest matching window wins. A late tick at T-2h sends 3h and consumes
 * looser windows so we never spam "24 hours left" after the moment has passed.
 *
 * Windows start a little early: GitHub `schedule` often lags hours, and traffic
 * pokes jitter. Early fire still reads as "about N hours left".
 */
const HOUR = 60 * 60_000;
const MIN = 60_000;

export type DeadlineWindowLabel = "24h" | "12h" | "3h" | "1h";

export type DeadlineWindow = {
  kind: "deadline_24h" | "deadline_12h" | "deadline_3h" | "deadline_1h";
  /** Fire when 0 < msUntil <= this. */
  fireWhenMsUntilAtMost: number;
  label: DeadlineWindowLabel;
};

export const DEADLINE_WINDOWS: readonly DeadlineWindow[] = [
  { kind: "deadline_1h", fireWhenMsUntilAtMost: 1 * HOUR + 15 * MIN, label: "1h" },
  { kind: "deadline_3h", fireWhenMsUntilAtMost: 3 * HOUR + 25 * MIN, label: "3h" },
  { kind: "deadline_12h", fireWhenMsUntilAtMost: 12 * HOUR + 20 * MIN, label: "12h" },
  { kind: "deadline_24h", fireWhenMsUntilAtMost: 24 * HOUR + 30 * MIN, label: "24h" },
];

/** While inside this horizon, cron self-chains every ~minute so GH lag cannot skip 3h/1h. */
export const DEADLINE_CHAIN_HORIZON_MS = 4 * HOUR;

export function pickDeadlineWindow(msUntil: number): DeadlineWindow | null {
  if (!(msUntil > 0)) return null;
  const due = DEADLINE_WINDOWS.filter((w) => msUntil <= w.fireWhenMsUntilAtMost);
  if (due.length === 0) return null;
  return due.reduce((a, b) =>
    a.fireWhenMsUntilAtMost < b.fireWhenMsUntilAtMost ? a : b,
  );
}

export function shouldChainDeadlineTicks(msUntil: unknown): boolean {
  return typeof msUntil === "number" && Number.isFinite(msUntil) && msUntil > 0 && msUntil <= DEADLINE_CHAIN_HORIZON_MS;
}
