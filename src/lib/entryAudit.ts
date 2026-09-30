/**
 * Settlement-time integrity checks for on-chain entries.
 *
 * The program stores the `positions` and `clubs` the *client* sent and cannot know
 * the real ones, and it has no registration deadline of its own. Anyone who bypasses
 * the UI could therefore label a striker as a defender (more points per goal), put
 * more than three players from one club in a squad, or register after kickoff.
 * These checks run before results are published so the admin can see and refund such
 * entries (`close_entry` while the gameweek is CLOSED) instead of paying prizes on them.
 */

export type CatalogPlayer = { id: number; teamId: number; positionId: number };

export type AuditableEntry = {
  playerIds: number[];
  playerPositions: number[];
  clubs: number[];
  /** Unix seconds (on-chain `created_at`). */
  createdAt?: number;
};

export type EntryIssueKind =
  | "late_registration"
  | "club_limit_exceeded"
  | "position_mismatch"
  | "club_mismatch"
  | "unknown_player";

export type EntryIssue = { owner: string; kind: EntryIssueKind; detail: string };

/** Registrations within this many seconds of the deadline are tolerated (clock skew). */
export const LATE_GRACE_SECONDS = 60;

export function buildCatalogIndex(players: CatalogPlayer[]): Map<number, CatalogPlayer> {
  return new Map(players.map((p) => [p.id, p]));
}

export function auditEntry(
  owner: string,
  team: AuditableEntry,
  catalog: Map<number, CatalogPlayer>,
  deadlineSeconds: number | null,
): EntryIssue[] {
  const issues: EntryIssue[] = [];

  if (
    deadlineSeconds != null &&
    team.createdAt != null &&
    team.createdAt > deadlineSeconds + LATE_GRACE_SECONDS
  ) {
    issues.push({
      owner,
      kind: "late_registration",
      detail: `registered ${team.createdAt - deadlineSeconds}s after the deadline`,
    });
  }

  const realClubCount = new Map<number, number>();
  team.playerIds.forEach((id, index) => {
    const real = catalog.get(id);
    if (!real) {
      issues.push({ owner, kind: "unknown_player", detail: `player ${id} is not in the catalog` });
      return;
    }
    if (real.positionId !== team.playerPositions[index]) {
      issues.push({
        owner,
        kind: "position_mismatch",
        detail: `slot ${index}: player ${id} registered as position ${team.playerPositions[index]}, catalog says ${real.positionId}`,
      });
    }
    if (real.teamId !== team.clubs[index]) {
      issues.push({
        owner,
        kind: "club_mismatch",
        detail: `slot ${index}: player ${id} registered with club ${team.clubs[index]}, catalog says ${real.teamId}`,
      });
    }
    realClubCount.set(real.teamId, (realClubCount.get(real.teamId) ?? 0) + 1);
  });

  for (const [club, count] of realClubCount) {
    if (count > 3) {
      issues.push({
        owner,
        kind: "club_limit_exceeded",
        detail: `${count} players from club ${club} (max 3)`,
      });
    }
  }
  return issues;
}

/** Positions to score with: the catalog's real position where known, else as registered. */
export function correctedPositions(
  team: Pick<AuditableEntry, "playerIds" | "playerPositions">,
  catalog: Map<number, CatalogPlayer>,
): number[] {
  return team.playerIds.map((id, i) => catalog.get(id)?.positionId ?? team.playerPositions[i] ?? 2);
}

export function summarizeIssues(issues: EntryIssue[], maxLines = 12): string {
  const lines = issues.slice(0, maxLines).map((i) => `• ${i.owner.slice(0, 8)}… ${i.kind}: ${i.detail}`);
  if (issues.length > maxLines) lines.push(`…and ${issues.length - maxLines} more`);
  return lines.join("\n");
}
