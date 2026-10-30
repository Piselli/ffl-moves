/**
 * Registration-deadline reminder windows.
 *
 * Tightest matching window wins. A late tick at T-2h sends 3h and consumes
 * looser windows so we never spam "24 hours left" after the moment has passed.
 *
 * 3h / 1h fire on the exact mark. Near kickoff the cron self-chains every
 * ~minute, so we must not fake "early" — that reads as wrong time to players.
 *
 * 24h / 12h keep a small early band for a late first poke. Once any tick lands
 * inside DEADLINE_CHAIN_HORIZON_MS, self-chain keeps running through all marks
 * (24h → 12h → 3h → 1h) so we no longer depend on site traffic for those alerts.
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

/**
 * Exact reminder marks. Self-chain aims just past the next one so 24h/12h land
 * on time instead of waiting for the next traffic/GH poke.
 */
export const DEADLINE_ALERT_MARKS_MS = [
  24 * HOUR,
  12 * HOUR,
  3 * HOUR,
  1 * HOUR,
] as const;

/**
 * Arm self-chain slightly before the 24h early band. One GH/traffic poke inside
 * this window keeps ticks alive through every reminder (waitUntil ~55s steps).
 */
export const DEADLINE_CHAIN_HORIZON_MS = 24 * HOUR + 45 * MIN;
/**
 * Depth budget for ~55s ticks across the full horizon (+ headroom for retries).
 * 25h / 55s ≈ 1637; keep a buffer so a late start still reaches kickoff.
 */
export const TELEGRAM_DEADLINE_CHAIN_MAX_DEPTH = 1800;
/** Same horizon for auto-close self-chain before first kickoff. */
export const CLOSE_CHAIN_HORIZON_MS = 4 * HOUR;

export function pickDeadlineWindow(msUntil: number): DeadlineWindow | null {
  if (!(msUntil > 0)) return null;
  const due = DEADLINE_WINDOWS.filter((w) => msUntil <= w.fireWhenMsUntilAtMost);
  if (due.length === 0) return null;
  return due.reduce((a, b) =>
    a.fireWhenMsUntilAtMost < b.fireWhenMsUntilAtMost ? a : b,
  );
}

/**
 * ms until the next exact alert mark (24h / 12h / 3h / 1h), or until kickoff
 * once past the 1h mark. Used to tighten self-chain sleep near each reminder.
 */
export function msUntilNextDeadlineAlertMark(msUntilDeadline: unknown): number | null {
  if (
    typeof msUntilDeadline !== "number" ||
    !Number.isFinite(msUntilDeadline) ||
    msUntilDeadline <= 0
  ) {
    return null;
  }
  for (const mark of DEADLINE_ALERT_MARKS_MS) {
    if (msUntilDeadline > mark) return msUntilDeadline - mark;
  }
  return msUntilDeadline;
}

export function shouldChainDeadlineTicks(msUntil: unknown): boolean {
  return (
    typeof msUntil === "number" &&
    Number.isFinite(msUntil) &&
    msUntil > 0 &&
    msUntil <= DEADLINE_CHAIN_HORIZON_MS
  );
}

/** Keep telegram cron alive until reg_closed lands (or already claimed). */
export function shouldChainForRegClosed(regClosedPending: unknown): boolean {
  return regClosedPending === true;
}

export function shouldChainAutoClose(msUntilClose: unknown): boolean {
  return (
    typeof msUntilClose === "number" &&
    Number.isFinite(msUntilClose) &&
    msUntilClose > 0 &&
    msUntilClose <= CLOSE_CHAIN_HORIZON_MS
  );
}

/**
 * Keep close cron alive after kickoff when the tour is still OPEN but we could
 * not close yet (unverified deadline / missing deadline). Caps via chain depth.
 */
export function shouldRetryAutoClose(reason: unknown): boolean {
  return reason === "deadline_unverified" || reason === "no_deadline";
}
