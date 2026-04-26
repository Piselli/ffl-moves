/** Fields returned from `/api/fixtures` for `gameweek` (FPL bootstrap `deadline_time` + server-parsed epoch). */
export type FplGameweekDeadlineFields = {
  deadlineEpochMs?: number | null;
  deadlineTime?: string | null;
};

/**
 * Same instant as the «Дедлайн реєстрації» block on `/fixtures`:
 * prefer finite `deadlineEpochMs`, else ISO `deadlineTime`.
 */
export function resolveFplDeadlineRaw(
  gw: FplGameweekDeadlineFields | null | undefined
): string | number | null {
  if (!gw) return null;
  if (typeof gw.deadlineEpochMs === "number" && Number.isFinite(gw.deadlineEpochMs)) {
    return gw.deadlineEpochMs;
  }
  return gw.deadlineTime ?? null;
}

/** Same formatting as `src/app/fixtures/page.tsx` deadline header. */
export function formatFplDeadlineUk(raw: string | number): string {
  return new Date(raw).toLocaleString("uk-UA", {
    day: "numeric",
    month: "long",
    hour: "2-digit",
    minute: "2-digit",
  });
}
