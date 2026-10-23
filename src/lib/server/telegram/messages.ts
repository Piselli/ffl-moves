import { formatPoolCompact } from "@/lib/entryFee";

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
    "• deadlines (24h / 12h / 3h / 1h)",
    "• registration closes",
    "• live points update",
    "• prizes are ready",
    "",
    // Two short intentional lines — avoid one long sentence wrapping mid-arrow.
    "Turn on notifications for this chat.",
    "Bot name → Notifications → On.",
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
  label: "24h" | "12h" | "3h" | "1h",
  deadlineIso: string | null,
  deadlineMs: number | null,
): string {
  const head =
    label === "1h"
      ? `Last hour to register for GW${gameweekId}.`
      : label === "3h"
        ? `3 hours left to register for GW${gameweekId}.`
        : label === "12h"
          ? `GW${gameweekId} deadline in 12 hours.`
          : `GW${gameweekId} deadline in 24 hours.`;
  const tip =
    label === "1h"
      ? "Miss this and you're out of the gameweek."
      : "Don't forget to register your team before kickoff.";
  return [head, "", tip, `Deadline: ${fmtDeadline(deadlineIso, deadlineMs)}`, SITE].join("\n");
}

/** After on-chain registration close (once per gameweek). */
export function msgRegistrationClosed(
  managers: number,
  rewardPoolRaw: number | bigint,
): string {
  const n = Number.isFinite(managers) ? Math.max(0, Math.floor(managers)) : 0;
  const managersLine = n === 1 ? "1 manager" : `${n} managers`;
  const pool = formatPoolCompact(rewardPoolRaw);
  return [
    "Registration for this tour is closed.",
    "",
    "Good luck to your squads.",
    "Enjoy the English Premier League with FORM8.",
    "",
    `${managersLine} · $${pool} USDC reward pool`,
    "",
    `${SITE}/leaderboard`,
  ].join("\n");
}

export function msgClaimReady(gameweekId: number): string {
  return [
    `GW${gameweekId} results are in — claim if you placed.`,
    "",
    `${SITE}/leaderboard`,
  ].join("\n");
}

/** One-shot feature news: tour injury flags on the picker. */
export function msgInjuryFlagsLaunch(): string {
  return [
    "New on FORM8 — injury flags on every player.",
    "",
    "✚ Out — won't play this round",
    "? Doubtful — still under question",
    "",
    "Check before you lock your squad.",
    SITE,
  ].join("\n");
}

export const INJURY_FLAGS_OUT_IMG = `${SITE}/marketing/tg-injury-out.png`;
export const INJURY_FLAGS_DOUBT_IMG = `${SITE}/marketing/tg-injury-doubt.png`;

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
  "• registration opens & closes",
  "• deadlines",
  "• live points",
  "• claims",
  "",
  "Tap START below.",
  "",
  "Turn on notifications for this chat.",
].join("\n");
