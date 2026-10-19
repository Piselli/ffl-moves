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

/** Shown after /start (and if they tap Start again). */
export function msgWelcome(): string {
  // Keep lines short so they don't wrap mid-phrase on a phone.
  return [
    "FORM8 Alerts — you're in.",
    "",
    "I'll ping you when:",
    "• registration opens",
    "• deadlines (24h / 3h / 1h)",
    "• live points update",
    "• prizes are ready",
    "",
    "Turn on notifications for this chat.",
    "",
    SITE,
  ].join("\n");
}

export function msgHelp(): string {
  return [
    "FORM8 Alerts",
    "",
    "Tap Start (or send /start) to subscribe.",
    "Send /stop to unsubscribe.",
    "",
    SITE,
  ].join("\n");
}

export function msgUnsubscribed(): string {
  return ["Unsubscribed.", "", `Come back anytime: ${SITE}`].join("\n");
}

export function msgRegistrationOpen(
  gameweekId: number,
  deadlineIso: string | null,
  deadlineMs: number | null,
): string {
  return [
    `GW${gameweekId} is open — don't forget to register your team.`,
    "",
    `Deadline: ${fmtDeadline(deadlineIso, deadlineMs)}`,
    SITE,
  ].join("\n");
}

export function msgDeadlineReminder(
  gameweekId: number,
  label: "24h" | "3h" | "1h",
  deadlineIso: string | null,
  deadlineMs: number | null,
): string {
  const head =
    label === "1h"
      ? `Last hour to register for GW${gameweekId}.`
      : label === "3h"
        ? `3 hours left to register for GW${gameweekId}.`
        : `GW${gameweekId} deadline in 24 hours.`;
  const tip =
    label === "1h"
      ? "Miss this and you're out of the gameweek."
      : "Don't forget to register your team before kickoff.";
  return [head, "", tip, `Deadline: ${fmtDeadline(deadlineIso, deadlineMs)}`, SITE].join("\n");
}

export function msgClaimReady(gameweekId: number): string {
  return [
    `GW${gameweekId} results are in — claim if you placed.`,
    "",
    `${SITE}/leaderboard`,
  ].join("\n");
}

/** After auto-publish writes new live points for finished matches. */
export function msgStatsUpdate(gameweekId: number, fixtures: string[]): string {
  const fixtureLine =
    fixtures.length === 0
      ? "New match stats are on the leaderboard."
      : fixtures.length === 1
        ? `${fixtures[0]} — points updated.`
        : fixtures.length <= 3
          ? `${fixtures.join(" · ")} — points updated.`
          : `${fixtures.slice(0, 2).join(" · ")} +${fixtures.length - 2} more — points updated.`;
  return [`GW${gameweekId}: ${fixtureLine}`, "", `${SITE}/leaderboard`].join("\n");
}

export function msgStats(total: number): string {
  return `Subscribers: ${total}`;
}

export const WELCOME_INLINE_KEYBOARD: {
  inline_keyboard: Array<Array<{ text: string; url: string }>>;
} = {
  inline_keyboard: [[{ text: "Open FORM8", url: SITE }]],
};

/** Bot profile copy — shown before the user taps Start. */
export const BOT_SHORT_DESCRIPTION = "FORM8 alerts. Tap Start to subscribe.";

export const BOT_DESCRIPTION = [
  "You'll get pings for:",
  "• registration",
  "• deadlines",
  "• live points",
  "• claims",
  "",
  "Tap START below.",
  "",
  "Turn on notifications for this chat.",
].join("\n");
