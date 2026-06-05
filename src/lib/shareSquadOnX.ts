import html2canvas from "html2canvas";
import type { Player } from "@/lib/types";

export type SquadShareContext = "gameweek" | "world-cup";

const DEFAULT_PUBLIC_ORIGIN = "https://movematch.xyz";
const TWEET_CHAR_LIMIT = 280;

/** Public URL for tweets — never share localhost. */
export function shareSiteUrl(path: string): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  const publicOrigin = configured || DEFAULT_PUBLIC_ORIGIN;

  if (typeof window === "undefined") {
    return `${publicOrigin}${path}`;
  }

  const { origin, hostname } = window.location;
  const isLocal =
    hostname === "localhost" || hostname === "127.0.0.1" || hostname === "0.0.0.0";
  const base = isLocal ? publicOrigin : origin;
  return `${base}${path}`;
}

/** `movematch.xyz/world-cup/squad` — cleaner in tweets than full https:// */
export function tweetUrlDisplay(fullUrl: string): string {
  return fullUrl.replace(/^https?:\/\//, "");
}

/** "Group Stage · Matchday 1" → "Matchday 1"; "Груповий етап · Тур 1" → "Тур 1" */
export function wcRoundForTweet(roundLabel: string): string {
  const parts = roundLabel.split("·").map((s) => s.trim()).filter(Boolean);
  if (parts.length >= 2) return parts[parts.length - 1]!;
  return roundLabel.trim();
}

function displayName(p: Player): string {
  return p.webName || p.name.split(" ").pop() || p.name;
}

function formatSquadBlock(
  starters: Player[],
  bench: Player[],
  xiLabel: string,
  benchLabel: string,
): string {
  const xi = starters.map(displayName).join(", ");
  const subs = bench.map(displayName).join(", ");
  if (!subs) return `${xiLabel}: ${xi}`;
  return `${xiLabel}: ${xi}\n${benchLabel}: ${subs}`;
}

/** Shrink squad lines until the full tweet fits X's 280-char limit. */
function fitTweetLength(
  header: string,
  squadBlock: string,
  url: string,
  starters: Player[],
  bench: Player[],
  xiLabel: string,
  benchLabel: string,
): string {
  const assemble = (squad: string) => `${header}\n\n${squad}\n\n${url}`;

  let squad = squadBlock;
  let tweet = assemble(squad);
  if (tweet.length <= TWEET_CHAR_LIMIT) return tweet;

  // Drop bench line first — starters still listed in full.
  squad = `${xiLabel}: ${starters.map(displayName).join(", ")}`;
  tweet = assemble(squad);
  if (tweet.length <= TWEET_CHAR_LIMIT) return tweet;

  // Compact separator (saves a few chars vs ", ").
  squad = `${xiLabel}: ${starters.map(displayName).join(" · ")}`;
  tweet = assemble(squad);
  if (tweet.length <= TWEET_CHAR_LIMIT) return tweet;

  // Trim from the end of the XI list.
  const names = starters.map(displayName);
  for (let n = names.length - 1; n >= 4; n--) {
    const trimmed = `${xiLabel}: ${names.slice(0, n).join(" · ")}…`;
    tweet = assemble(trimmed);
    if (tweet.length <= TWEET_CHAR_LIMIT) return tweet;
  }

  return tweet.slice(0, TWEET_CHAR_LIMIT - 1) + "…";
}

export function buildSquadShareTweetText(opts: {
  context: SquadShareContext;
  tourLabel: string;
  starters: Player[];
  bench: Player[];
  sitePath: string;
  copy: {
    tweetXiLabel: string;
    tweetBenchLabel: string;
    tweetHeaderGw: (gwLabel: string) => string;
    tweetHeaderWc: (roundLabel: string) => string;
  };
}): string {
  const squadBlock = formatSquadBlock(
    opts.starters,
    opts.bench,
    opts.copy.tweetXiLabel,
    opts.copy.tweetBenchLabel,
  );
  const url = tweetUrlDisplay(shareSiteUrl(opts.sitePath));

  const header =
    opts.context === "gameweek"
      ? opts.copy.tweetHeaderGw(opts.tourLabel)
      : opts.copy.tweetHeaderWc(wcRoundForTweet(opts.tourLabel));

  return fitTweetLength(
    header,
    squadBlock,
    url,
    opts.starters,
    opts.bench,
    opts.copy.tweetXiLabel,
    opts.copy.tweetBenchLabel,
  );
}

export function xTweetIntentUrl(text: string): string {
  return `https://x.com/intent/tweet?text=${encodeURIComponent(text)}`;
}

export async function captureElementAsPng(element: HTMLElement): Promise<Blob> {
  const canvas = await html2canvas(element, {
    backgroundColor: "#0D0F12",
    scale: 2,
    useCORS: true,
    logging: false,
    imageTimeout: 8000,
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.92));
  if (!blob) throw new Error("Could not render squad image");
  return blob;
}

export type ShareSquadResult = "clipboard" | "download";

function downloadPng(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openXCompose(tweetText: string) {
  window.open(xTweetIntentUrl(tweetText), "_blank", "noopener,noreferrer");
}

/**
 * Opens x.com compose with pre-filled text. Image must be attached manually —
 * X Web Intent does not support file uploads (would need X API + OAuth).
 */
export async function shareSquadImageOnX(opts: {
  element: HTMLElement;
  tweetText: string;
  fileName: string;
}): Promise<ShareSquadResult> {
  const blob = await captureElementAsPng(opts.element);

  if (typeof navigator !== "undefined" && navigator.clipboard?.write && typeof ClipboardItem !== "undefined") {
    try {
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      openXCompose(opts.tweetText);
      return "clipboard";
    } catch {
      /* fall through to download */
    }
  }

  downloadPng(blob, opts.fileName);
  openXCompose(opts.tweetText);
  return "download";
}
