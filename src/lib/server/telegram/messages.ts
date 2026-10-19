const SITE = "https://www.form8.football";

function fmtDeadline(iso: string | null, epochMs: number | null): string {
  if (epochMs != null && Number.isFinite(epochMs)) {
    try {
      return new Date(epochMs).toUTCString().replace(/ GMT$/, " UTC");
    } catch {
      /* fall through */
    }
  }
  return iso ?? "soon";
}

export function msgWelcome(): string {
  return [
    "FORM8 Alerts — you're in.",
    "",
    "I'll ping you when:",
    "• registration opens",
    "• deadline is 24h / 3h / 1h away",
    "• prizes are ready to claim",
    "",
    `Play: ${SITE}`,
    "Stop anytime: /stop",
  ].join("\n");
}

export function msgAlreadySubscribed(): string {
  return "You're already subscribed. /stop to leave.";
}

export function msgUnsubscribed(): string {
  return "Unsubscribed. You can /start again anytime.";
}

export function msgNotSubscribed(): string {
  return "You're not subscribed. /start to get alerts.";
}

export function msgHelp(): string {
  return [
    "Commands:",
    "/start — subscribe",
    "/stop — unsubscribe",
    "/help — this message",
    "",
    `Site: ${SITE}`,
  ].join("\n");
}

export function msgRegistrationOpen(gameweekId: number, deadlineIso: string | null, deadlineMs: number | null): string {
  return [
    `GW${gameweekId} registration is OPEN.`,
    "",
    `Deadline: ${fmtDeadline(deadlineIso, deadlineMs)}`,
    `Lock your squad: ${SITE}/gameweek`,
  ].join("\n");
}

export function msgDeadlineReminder(
  gameweekId: number,
  label: "24h" | "3h" | "1h",
  deadlineIso: string | null,
  deadlineMs: number | null,
): string {
  const urgency =
    label === "1h" ? "Last hour" : label === "3h" ? "3 hours left" : "24 hours left";
  return [
    `${urgency} to lock GW${gameweekId}.`,
    "",
    `Deadline: ${fmtDeadline(deadlineIso, deadlineMs)}`,
    `Register now: ${SITE}/gameweek`,
  ].join("\n");
}

export function msgClaimReady(gameweekId: number): string {
  return [
    `GW${gameweekId} results are live — prizes ready to claim.`,
    "",
    `Leaderboard: ${SITE}/leaderboard`,
  ].join("\n");
}

export function msgStats(total: number): string {
  return `Subscribers: ${total}`;
}
