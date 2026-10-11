/** Shared (client + server) nickname rules and the message a wallet signs to claim one. */

export const NICKNAME_MIN = 2;
export const NICKNAME_MAX = 20;
/** A signed claim is only accepted this long after its timestamp. */
export const NICKNAME_SIGN_TTL_MS = 10 * 60 * 1000;

const WALLET_LIKE = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

/** Trim, collapse whitespace, drop control / bidi / zero-width characters. */
export function sanitizeNickname(raw: string): string {
  return raw
    .normalize("NFKC")
    .replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u202a-\u202e\u2066-\u2069\ufeff]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, NICKNAME_MAX);
}

/** Returns an error string, or null when the nickname is acceptable. */
export function validateNickname(nick: string): string | null {
  if (nick.length < NICKNAME_MIN) return "Nickname is too short.";
  if (nick.length > NICKNAME_MAX) return "Nickname is too long.";
  if (WALLET_LIKE.test(nick)) return "Nickname cannot look like a wallet address.";
  if (/https?:\/\/|www\./i.test(nick)) return "Nickname cannot contain links.";
  return null;
}

/** Case/accent-insensitive key used to keep nicknames unique. */
export function nicknameKey(nick: string): string {
  return nick
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ");
}

/** Human-readable text the wallet shows when asking to sign (also what the server verifies). */
export function nicknameClaimMessage(wallet: string, nickname: string, ts: number): string {
  return [
    "FORM8 nickname",
    `Set the nickname "${nickname}" for this wallet.`,
    "",
    `wallet: ${wallet}`,
    `time: ${new Date(ts).toISOString()}`,
  ].join("\n");
}
