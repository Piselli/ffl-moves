/**
 * Resolve registration deadline for an FPL gameweek id (= on-chain gameweek id for EPL).
 * Same rule as `/api/fixtures`: first kickoff of the event; fallback to FPL deadline_time.
 */
import bootstrapLite from "@/data/fpl-bootstrap-lite.json";

const FPL_FIXTURES = "https://fantasy.premierleague.com/api/fixtures/";

const FETCH_INIT: RequestInit = {
  headers: {
    "User-Agent":
      "Mozilla/5.0 (compatible; FORM8-auto-close/1.0; +https://form8.football)",
    Accept: "application/json",
  },
  cache: "no-store",
};

export type RegistrationDeadline = {
  gameweekId: number;
  deadlineEpochMs: number | null;
  deadlineSource: "first_kickoff" | "fpl_deadline_time" | "none";
  deadlineIso: string | null;
};

export async function resolveRegistrationDeadline(
  gameweekId: number,
): Promise<RegistrationDeadline> {
  let firstKickMs: number | null = null;
  try {
    const res = await fetch(`${FPL_FIXTURES}?event=${gameweekId}`, FETCH_INIT);
    if (res.ok) {
      const rows = (await res.json()) as Array<{
        event?: number | null;
        kickoff_time?: string | null;
      }>;
      const kicks = rows
        .filter((r) => r.event === gameweekId && typeof r.kickoff_time === "string")
        .map((r) => Date.parse(r.kickoff_time as string))
        .filter((ms) => Number.isFinite(ms))
        .sort((a, b) => a - b);
      if (kicks.length > 0) firstKickMs = kicks[0]!;
    }
  } catch (error) {
    console.warn("auto-close: FPL fixtures fetch failed", error);
  }

  if (firstKickMs != null) {
    return {
      gameweekId,
      deadlineEpochMs: firstKickMs,
      deadlineSource: "first_kickoff",
      deadlineIso: new Date(firstKickMs).toISOString(),
    };
  }

  const ev = (bootstrapLite.events as Array<{ id: number; deadline_time?: string | null }>).find(
    (e) => e.id === gameweekId,
  );
  const raw = ev?.deadline_time;
  const ms = typeof raw === "string" && raw.length > 0 ? Date.parse(raw) : NaN;
  if (Number.isFinite(ms)) {
    return {
      gameweekId,
      deadlineEpochMs: ms,
      deadlineSource: "fpl_deadline_time",
      deadlineIso: new Date(ms).toISOString(),
    };
  }

  return {
    gameweekId,
    deadlineEpochMs: null,
    deadlineSource: "none",
    deadlineIso: null,
  };
}
