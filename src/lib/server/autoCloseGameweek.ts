import {
  buildCloseGameweek,
  findOpenGameweek,
  getGameweek,
} from "@/lib/chainClient";
import { signAndSendAsAdmin } from "@/lib/server/adminSigner";
import { resolveRegistrationDeadline } from "@/lib/server/fplRegistrationDeadline";

export type AutoCloseResult =
  | { action: "skipped"; reason: string; detail?: Record<string, unknown> }
  | {
      action: "closed";
      gameweekId: number;
      signature: string;
      deadlineIso: string | null;
      deadlineSource: string;
    }
  | { action: "dry_run_would_close"; gameweekId: number; detail: Record<string, unknown> };

/**
 * If an OPEN on-chain gameweek's registration deadline has passed, close it.
 * Lead: close this many ms *before* kickoff (0 = at kickoff). Env AUTO_CLOSE_LEAD_MS.
 */
export async function runAutoCloseGameweek(opts?: {
  dryRun?: boolean;
  nowMs?: number;
}): Promise<AutoCloseResult> {
  if (process.env.AUTO_CLOSE_ENABLED === "false") {
    return { action: "skipped", reason: "AUTO_CLOSE_ENABLED=false" };
  }

  const open = await findOpenGameweek();
  if (!open || open.status !== "open") {
    return { action: "skipped", reason: "no_open_gameweek" };
  }

  const deadline = await resolveRegistrationDeadline(open.id);
  if (deadline.deadlineEpochMs == null) {
    return {
      action: "skipped",
      reason: "no_deadline",
      detail: { gameweekId: open.id },
    };
  }

  const leadMs = Number(process.env.AUTO_CLOSE_LEAD_MS ?? "0");
  const closeAt = deadline.deadlineEpochMs - (Number.isFinite(leadMs) ? leadMs : 0);
  const now = opts?.nowMs ?? Date.now();

  if (now < closeAt) {
    return {
      action: "skipped",
      reason: "before_deadline",
      detail: {
        gameweekId: open.id,
        deadlineIso: deadline.deadlineIso,
        deadlineSource: deadline.deadlineSource,
        closeAtIso: new Date(closeAt).toISOString(),
        msUntilClose: closeAt - now,
      },
    };
  }

  // Re-check in case another process closed it.
  const fresh = await getGameweek(open.id);
  if (!fresh || fresh.status !== "open") {
    return {
      action: "skipped",
      reason: "already_closed_or_missing",
      detail: { gameweekId: open.id, status: fresh?.status ?? null },
    };
  }

  if (opts?.dryRun) {
    return {
      action: "dry_run_would_close",
      gameweekId: open.id,
      detail: {
        deadlineIso: deadline.deadlineIso,
        deadlineSource: deadline.deadlineSource,
        closeAtIso: new Date(closeAt).toISOString(),
      },
    };
  }

  const { loadAdminKeypair } = await import("@/lib/server/adminSigner");
  const admin = loadAdminKeypair();
  const ixs = await buildCloseGameweek(admin.publicKey.toBase58(), open.id);
  const { signature } = await signAndSendAsAdmin(ixs);

  return {
    action: "closed",
    gameweekId: open.id,
    signature,
    deadlineIso: deadline.deadlineIso,
    deadlineSource: deadline.deadlineSource,
  };
}
