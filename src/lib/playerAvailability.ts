/**
 * Tour availability from API-Sports `/injuries` (per-fixture).
 * No FPL status — intentional; we already pay for API-Sports and own the mapping.
 */

export type AvailabilityKind = "out" | "doubt" | "suspended";

export type PlayerAvailability = {
  kind: AvailabilityKind;
  /** API-Sports player.type, e.g. "Missing Fixture" / "Questionable". */
  type: string;
  /** Human reason, e.g. "Thigh Injury" / "Suspended". */
  reason: string;
};

export type TourInjuriesPayload = {
  gameweekId: number;
  fetchedAt: string;
  /** Keyed by API-Sports player id. */
  byApiId: Record<string, PlayerAvailability>;
};

const SUSPEND_RE =
  /suspend|red\s*card|yellow\s*cards?|match\s*ban|disciplinary|sent\s*off/i;

const KIND_RANK: Record<AvailabilityKind, number> = {
  suspended: 3,
  out: 2,
  doubt: 1,
};

export function isSuspensionReason(reason: string, type = ""): boolean {
  return SUSPEND_RE.test(reason) || SUSPEND_RE.test(type);
}

/** Map one API-Sports injury row → our kind (or null if not actionable). */
export function classifyInjuryRow(type: string, reason: string): AvailabilityKind | null {
  const t = (type || "").trim();
  const r = (reason || "").trim();
  if (!t && !r) return null;

  if (isSuspensionReason(r, t)) return "suspended";

  const lower = t.toLowerCase();
  if (lower.includes("missing") || lower === "out" || lower.includes("injured")) {
    return "out";
  }
  if (
    lower.includes("questionable") ||
    lower.includes("doubt") ||
    lower.includes("uncertain")
  ) {
    return "doubt";
  }

  // Fallback: any non-empty "will miss" style type without doubt → out
  if (t.length > 0 && !lower.includes("available")) return "out";
  return null;
}

/** Prefer the more severe mark when a player appears on multiple rows. */
export function preferAvailability(
  a: PlayerAvailability | undefined,
  b: PlayerAvailability,
): PlayerAvailability {
  if (!a) return b;
  return KIND_RANK[b.kind] > KIND_RANK[a.kind] ? b : a;
}
