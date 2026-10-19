import {
  telegramSetMyCommands,
  telegramSetMyDescription,
  telegramSetMyShortDescription,
} from "@/lib/server/telegram/api";
import { BOT_DESCRIPTION, BOT_SHORT_DESCRIPTION } from "@/lib/server/telegram/messages";

/** BotFather-style profile: what users see before tapping Start. */
export async function setupTelegramBotProfile(): Promise<{ ok: true }> {
  await telegramSetMyShortDescription(BOT_SHORT_DESCRIPTION);
  await telegramSetMyDescription(BOT_DESCRIPTION);
  await telegramSetMyCommands([
    { command: "start", description: "Turn on FORM8 alerts" },
    { command: "stop", description: "Turn off alerts" },
    { command: "help", description: "What this bot does" },
  ]);
  return { ok: true };
}
