/** Fields returned from `/api/fixtures` for `gameweek` (FPL bootstrap `deadline_time` + server-parsed epoch). */
export type FplGameweekDeadlineFields = {
  deadlineEpochMs?: number | null;
  deadlineTime?: string | null;
};

/**
 * Raw value for FPL squad deadline — same instant as «Дедлайн реєстрації» on `/fixtures`.
 * Prefer the canonical ISO `deadline_time` string from FPL so the client parses one source
 * (countdown + calendar line cannot diverge from a mismatched epoch field).
 */
export function resolveFplDeadlineRaw(
  gw: FplGameweekDeadlineFields | null | undefined
): string | number | null {
  if (!gw) return null;
  const dt = gw.deadlineTime;
  if (typeof dt === "string" && dt.trim().length > 0) return dt.trim();
  if (typeof gw.deadlineEpochMs === "number" && Number.isFinite(gw.deadlineEpochMs)) {
    return gw.deadlineEpochMs;
  }
  return null;
}

/** Single UTC instant (ms) for countdown and formatting. */
export function deadlineRawToUtcMs(raw: string | number): number {
  if (typeof raw === "number" && Number.isFinite(raw)) return raw;
  const s = String(raw).trim();
  if (/^\d{10,17}$/.test(s)) {
    const n = Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  const parsed = Date.parse(s);
  return Number.isFinite(parsed) ? parsed : NaN;
}

/** Same wall-clock line as the matches header (`uk-UA`). */
export function formatFplDeadlineUk(raw: string | number): string {
  const ms = deadlineRawToUtcMs(raw);
  if (!Number.isFinite(ms)) return "—";
  return new Date(ms).toLocaleString("uk-UA", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
