/**
 * Registration-deadline reminder windows.
 *
 * Tightest matching window wins. A late tick at T-2h sends 3h and consumes
 * looser windows so we never spam "24 hours left" after the moment has passed.
 *
 * 24h / 12h start a little early: GitHub `schedule` and traffic pokes both jitter.
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
  { kind: "deadline_1h", fireWhenMsUntilAtMost: 1 * HOUR, label: "1h" },
  { kind: "deadline_3h", fireWhenMsUntilAtMost: 3 * HOUR, label: "3h" },
  { kind: "deadline_12h", fireWhenMsUntilAtMost: 12 * HOUR + 20 * MIN, label: "12h" },
  { kind: "deadline_24h", fireWhenMsUntilAtMost: 24 * HOUR + 30 * MIN, label: "24h" },
];

export function pickDeadlineWindow(msUntil: number): DeadlineWindow | null {
  if (!(msUntil > 0)) return null;
  const due = DEADLINE_WINDOWS.filter((w) => msUntil <= w.fireWhenMsUntilAtMost);
  if (due.length === 0) return null;
  return due.reduce((a, b) =>
    a.fireWhenMsUntilAtMost < b.fireWhenMsUntilAtMost ? a : b,
  );
}
