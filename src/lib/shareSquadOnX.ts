import { getFontEmbedCSS, toBlob } from "html-to-image";
import html2canvas from "html2canvas";
import type { Player } from "@/lib/types";
import {
  SQUAD_SHARE_CARD_HEIGHT,
  SQUAD_SHARE_CARD_WIDTH,
  SHARE_CARD_BORDER,
  SHARE_CARD_CORNER_RADIUS_PX,
} from "@/components/share/shareCardTypes";

export type SquadShareContext = "gameweek" | "world-cup";

const DEFAULT_PUBLIC_ORIGIN = "https://form8.app";
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

  squad = `${xiLabel}: ${starters.map(displayName).join(", ")}`;
  tweet = assemble(squad);
  if (tweet.length <= TWEET_CHAR_LIMIT) return tweet;

  squad = `${xiLabel}: ${starters.map(displayName).join(" · ")}`;
  tweet = assemble(squad);
  if (tweet.length <= TWEET_CHAR_LIMIT) return tweet;

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

function waitForImages(root: HTMLElement, timeoutMs = 12_000): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();

  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          if (img.complete && img.naturalHeight > 0) {
            img.style.opacity = "1";
            resolve();
            return;
          }
          const done = () => {
            img.style.opacity = "1";
            resolve();
          };
          img.addEventListener("load", done, { once: true });
          img.addEventListener("error", done, { once: true });
          window.setTimeout(done, timeoutMs);
        }),
    ),
  ).then(() => undefined);
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

const EXPORT_PIXEL_RATIO = 2;

function resolveCaptureCard(element: HTMLElement): HTMLElement {
  if (element.dataset.shareCard != null) return element;
  const card = element.querySelector("[data-share-card]");
  if (card instanceof HTMLElement) return card;
  throw new Error("No share card element found for capture");
}

/**
 * Flatten capture-hostile styles.
 * CSS `filter` on cutout wrappers (brightness / drop-shadow) makes html-to-image
 * stamp one player bust onto every chip — strip all filters before export.
 */
function prepareNodeForCapture(root: HTMLElement) {
  root.style.transform = "none";
  root.style.opacity = "1";
  root.style.visibility = "visible";
  root.style.filter = "none";

  if (root.dataset.shareCard != null) {
    root.style.background = "#000000";
    root.style.backgroundColor = "#000000";
    root.style.borderRadius = `${SHARE_CARD_CORNER_RADIUS_PX}px`;
    root.style.boxSizing = "border-box";
    root.style.border = SHARE_CARD_BORDER;
    root.style.boxShadow = "none";
  } else {
    root.style.boxShadow = "none";
  }

  const nodes = root.querySelectorAll("*");
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const cs = window.getComputedStyle(node);

    // html2canvas splits glyphs when letter-spacing is set — reset for export.
    node.style.letterSpacing = "normal";
    node.style.wordSpacing = "normal";
    node.style.fontKerning = "auto";
    node.style.textRendering = "geometricPrecision";

    if (cs.backdropFilter && cs.backdropFilter !== "none") {
      node.style.backdropFilter = "none";
      node.style.setProperty("-webkit-backdrop-filter", "none");
      if (
        !cs.backgroundColor ||
        cs.backgroundColor === "transparent" ||
        cs.backgroundColor === "rgba(0, 0, 0, 0)"
      ) {
        node.style.backgroundColor = "rgba(255,255,255,0.08)";
      }
    }

    if (cs.mixBlendMode && cs.mixBlendMode !== "normal") {
      node.style.mixBlendMode = "normal";
    }

    // Any non-none filter breaks cutout uniqueness in html-to-image.
    if (cs.filter && cs.filter !== "none") {
      node.style.filter = "none";
    }

    node.style.userSelect = "none";

    if (node.tagName === "IMG") {
      node.style.opacity = "1";
      node.style.visibility = "visible";
    }
  });
}

/** Offscreen clone so we can strip filters without flashing the live poster. */
function mountExportClone(cardEl: HTMLElement): {
  clone: HTMLElement;
  host: HTMLElement;
} {
  const host = document.createElement("div");
  host.setAttribute("data-share-export-host", "");
  host.style.cssText =
    "position:fixed;left:-10000px;top:0;width:0;height:0;overflow:hidden;pointer-events:none;opacity:0;";

  const clone = cardEl.cloneNode(true) as HTMLElement;
  clone.style.width = `${SQUAD_SHARE_CARD_WIDTH}px`;
  clone.style.height = `${SQUAD_SHARE_CARD_HEIGHT}px`;
  clone.style.transform = "none";
  clone.style.opacity = "1";
  clone.style.visibility = "visible";
  host.appendChild(clone);
  document.body.appendChild(host);
  prepareNodeForCapture(clone);
  return { clone, host };
}

async function captureRawCardPng(cardEl: HTMLElement): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  await waitForImages(cardEl);
  await nextPaint();
  void cardEl.offsetHeight;

  const { clone, host } = mountExportClone(cardEl);
  await waitForImages(clone);
  await nextPaint();

  const filter = (node: HTMLElement) => {
    if (node.dataset?.shareOverlay != null) return false;
    return true;
  };

  try {
    try {
      const fontEmbedCSS = await getFontEmbedCSS(clone, { cacheBust: true });
      const blob = await toBlob(clone, {
        cacheBust: true,
        pixelRatio: EXPORT_PIXEL_RATIO,
        backgroundColor: "#000000",
        width: SQUAD_SHARE_CARD_WIDTH,
        height: SQUAD_SHARE_CARD_HEIGHT,
        fontEmbedCSS,
        filter,
      });
      if (blob) return blob;
    } catch (err) {
      console.warn("html-to-image capture failed, falling back to html2canvas", err);
    }

    const canvas = await html2canvas(clone, {
      backgroundColor: "#000000",
      scale: EXPORT_PIXEL_RATIO,
      width: SQUAD_SHARE_CARD_WIDTH,
      height: SQUAD_SHARE_CARD_HEIGHT,
      useCORS: true,
      allowTaint: false,
      logging: false,
      imageTimeout: 12_000,
      onclone: (_doc, cloned) => {
        prepareNodeForCapture(cloned as HTMLElement);
        (cloned as HTMLElement).querySelectorAll("img").forEach((img) => {
          img.style.opacity = "1";
        });
      },
    });

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/png", 0.92),
    );
    if (!blob) throw new Error("Could not render squad image");
    return blob;
  } finally {
    host.remove();
  }
}

export async function captureElementAsPng(element: HTMLElement): Promise<Blob> {
  return captureRawCardPng(resolveCaptureCard(element));
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

/** Download squad PNG — pass export root or `[data-share-card]`. */
export async function downloadSquadImage(opts: {
  element: HTMLElement;
  fileName: string;
}): Promise<void> {
  const blob = await captureElementAsPng(opts.element);
  downloadPng(blob, opts.fileName);
}

const COPY_CAPTURE_TIMEOUT_MS = 20_000;

/** Copy squad PNG — pass export root or `[data-share-card]`. */
export async function copySquadImage(opts: {
  element: HTMLElement;
  fileName: string;
}): Promise<ShareSquadResult> {
  const capture = captureElementAsPng(opts.element);

  const blob = await Promise.race([
    capture,
    new Promise<never>((_, reject) => {
      window.setTimeout(
        () => reject(new Error("Squad image capture timed out")),
        COPY_CAPTURE_TIMEOUT_MS,
      );
    }),
  ]);

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.write &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
      return "clipboard";
    } catch {
      /* fall through to download */
    }
  }

  downloadPng(blob, opts.fileName);
  return "download";
}

function openXCompose(tweetText: string) {
  window.open(xTweetIntentUrl(tweetText), "_blank", "noopener,noreferrer");
}

/**
 * @deprecated Prefer copySquadImage — X Web Intent cannot attach files.
 */
export async function shareSquadImageOnX(opts: {
  element: HTMLElement;
  tweetText: string;
  fileName: string;
}): Promise<ShareSquadResult> {
  const blob = await captureElementAsPng(opts.element);

  if (
    typeof navigator !== "undefined" &&
    navigator.clipboard?.write &&
    typeof ClipboardItem !== "undefined"
  ) {
    try {
      await navigator.clipboard.write([
        new ClipboardItem({ "image/png": blob }),
      ]);
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
