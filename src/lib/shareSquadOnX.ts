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

const DEFAULT_PUBLIC_ORIGIN = "https://form8.football";
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

/** `form8.football/world-cup/squad` — cleaner in tweets than full https:// */
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

/**
 * Mobile + wallet in-app browsers (Phantom, Solflare, …).
 * Their WebViews break SVG foreignObject capture (html-to-image) — prefer html2canvas.
 */
function isConstrainedCaptureEnv(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent || "";
  const isIOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const isAndroid = /Android/i.test(ua);
  const isWalletUa =
    /Phantom|Solflare|Backpack|Trust\/|CoinbaseWallet|MetaMaskMobile|Rainbow/i.test(
      ua,
    );
  // Android WebView marker (`; wv)`) — common for wallet browsers.
  const isAndroidWebView = isAndroid && /(\bwv\b|; wv\)|Version\/[\d.]+)/.test(ua);
  return isIOS || isAndroid || isWalletUa || isAndroidWebView;
}

function exportPixelRatio(): number {
  if (!isConstrainedCaptureEnv()) return 2;
  // Lower scale avoids blank / OOM canvases in mobile WebViews.
  const dpr = typeof window !== "undefined" ? window.devicePixelRatio || 1 : 1;
  return Math.min(1.5, Math.max(1, dpr));
}

function waitForImages(root: HTMLElement, timeoutMs = 12_000): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  if (imgs.length === 0) return Promise.resolve();

  return Promise.all(
    imgs.map(
      (img) =>
        new Promise<void>((resolve) => {
          const finish = () => {
            img.style.opacity = "1";
            img.style.visibility = "visible";
            resolve();
          };
          if (img.complete && img.naturalHeight > 0) {
            const decoded =
              typeof img.decode === "function"
                ? img.decode().then(finish, finish)
                : null;
            if (decoded) return;
            finish();
            return;
          }
          img.addEventListener("load", finish, { once: true });
          img.addEventListener("error", finish, { once: true });
          window.setTimeout(finish, timeoutMs);
        }),
    ),
  ).then(() => undefined);
}

function nextPaint(): Promise<void> {
  return new Promise((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function resolveCaptureCard(element: HTMLElement): HTMLElement {
  if (element.dataset.shareCard != null) return element;
  const card = element.querySelector("[data-share-card]");
  if (card instanceof HTMLElement) return card;
  throw new Error("No share card element found for capture");
}

/** Kill CSS filters — html-to-image stamps one filtered bust onto every chip. */
function stripCaptureFilters(node: HTMLElement) {
  node.style.setProperty("filter", "none", "important");
  node.style.setProperty("-webkit-filter", "none", "important");
}

/**
 * Soft box-shadows become solid offset blocks in foreignObject / WebView capture.
 * Keep only zero-blur rings when present; drop the rest.
 */
function flattenBoxShadow(node: HTMLElement) {
  const raw = node.style.boxShadow || window.getComputedStyle(node).boxShadow;
  if (!raw || raw === "none") {
    node.style.boxShadow = "none";
    return;
  }
  const rings = raw
    .split(/,(?![^(]*\))/)
    .map((part) => part.trim())
    .filter((part) => {
      return /^0(px)?\s+0(px)?\s+0(px)?\s+\d/.test(part);
    });
  node.style.boxShadow = rings.length > 0 ? rings.join(", ") : "none";
}

/**
 * Bake CSS transforms into left/top for absolutely positioned nodes.
 * html2canvas + wallet WebViews mis-place translate(-50%, …) pitch chips
 * (floating captain badge, drifted names).
 */
function flattenAbsoluteTransforms(root: HTMLElement) {
  const nodes = Array.from(root.querySelectorAll("*"));
  // Deepest first so parent transforms don't double-apply.
  nodes.reverse();
  nodes.forEach((node) => {
    if (!(node instanceof HTMLElement)) return;
    const cs = window.getComputedStyle(node);
    if (cs.position !== "absolute" && cs.position !== "fixed") return;
    if (!cs.transform || cs.transform === "none") return;

    let matrix: DOMMatrix;
    try {
      matrix = new DOMMatrix(cs.transform);
    } catch {
      node.style.transform = "none";
      return;
    }
    if (matrix.isIdentity) {
      node.style.transform = "none";
      return;
    }

    const left = Number.parseFloat(cs.left) || 0;
    const top = Number.parseFloat(cs.top) || 0;
    node.style.left = `${left + matrix.e}px`;
    node.style.top = `${top + matrix.f}px`;
    node.style.right = "auto";
    node.style.bottom = "auto";
    node.style.transform = "none";
    node.style.setProperty("-webkit-transform", "none");
  });
}

function absolutizeUrl(url: string): string {
  if (url.startsWith("data:") || url.startsWith("blob:")) return url;
  try {
    return new URL(url, window.location.href).href;
  } catch {
    return url;
  }
}

async function fetchAsDataUrl(url: string): Promise<string | null> {
  try {
    const res = await fetch(absolutizeUrl(url), { credentials: "same-origin" });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(reader.error);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Bake CSS background-image urls (pitch turf) — html-to-image often drops them.
 * Then swap to a real <img> — html2canvas paints <img> far more reliably than bg.
 */
async function embedBackgroundImagesAsDataUrls(root: HTMLElement): Promise<void> {
  const nodes = Array.from(
    root.querySelectorAll<HTMLElement>("[data-share-pitch-bg]"),
  );

  await Promise.all(
    nodes.map(async (node) => {
      const marked = node.getAttribute("data-share-pitch-bg");
      const styleBg = node.style.backgroundImage;
      const source = marked
        ? `url("${marked}")`
        : styleBg && styleBg !== "none"
          ? styleBg
          : window.getComputedStyle(node).backgroundImage;
      if (!source || source === "none") return;

      const match = source.match(/url\((['"]?)(.+?)\1\)/i);
      if (!match?.[2]) return;
      let url = match[2].trim();
      if (!url.startsWith("data:")) {
        const dataUrl = await fetchAsDataUrl(url);
        if (!dataUrl) return;
        url = dataUrl;
      }

      node.style.backgroundImage = "none";
      node.style.transform = "none";
      node.style.opacity = "1";
      node.style.visibility = "visible";

      const existing = node.querySelector("img[data-share-pitch-img]");
      if (existing) existing.remove();

      const img = document.createElement("img");
      img.setAttribute("data-share-pitch-img", "");
      img.alt = "";
      img.decoding = "sync";
      img.src = url;
      img.style.cssText = [
        "position:absolute",
        "inset:0",
        "width:100%",
        "height:100%",
        "object-fit:cover",
        "object-position:center",
        "opacity:1",
        "visibility:visible",
        "pointer-events:none",
        "display:block",
      ].join(";");
      node.appendChild(img);
    }),
  );
}

/**
 * Flatten capture-hostile styles.
 * CSS `filter` on cutout wrappers (brightness / drop-shadow) makes html-to-image
 * stamp one player bust onto every chip — strip all filters before export.
 * Soft box-shadows become hard gray slabs — flatten to hairline rings.
 * Also re-assert white chalk — Dark Reader (and similar) can invert border colors
 * in the live DOM before we clone for PNG.
 */
function prepareNodeForCapture(root: HTMLElement) {
  root.style.transform = "none";
  root.style.opacity = "1";
  root.style.visibility = "visible";
  stripCaptureFilters(root);

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

    // Always clear — do not trust getComputedStyle in offscreen hosts.
    stripCaptureFilters(node);
    flattenBoxShadow(node);

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

    node.style.userSelect = "none";

    if (node.tagName === "IMG") {
      node.style.opacity = "1";
      node.style.visibility = "visible";
    }

    // Pitch chalk — Dark Reader can invert white borders before PNG clone.
    if (node.closest("[data-share-chalk]") != null) {
      node.style.setProperty("border-color", "#FFFFFF", "important");
      if (node.hasAttribute("data-share-chalk-fill")) {
        node.style.setProperty("background", "#FFFFFF", "important");
        node.style.setProperty("background-color", "#FFFFFF", "important");
      } else {
        node.style.setProperty("background-color", "transparent", "important");
      }
    }
  });
}

/**
 * Bake each <img> to a unique data URL so foreignObject capture cannot
 * reuse one decoded bitmap across every filtered chip.
 */
async function embedImagesAsDataUrls(root: HTMLElement): Promise<void> {
  const imgs = Array.from(root.querySelectorAll("img"));
  await Promise.all(
    imgs.map(async (img) => {
      img.style.opacity = "1";
      img.style.visibility = "visible";
      const src = img.currentSrc || img.src;
      if (!src || src.startsWith("data:")) return;

      try {
        // Huge bitmaps (old form8-mark PNG was 3616×4944) OOM/fail canvas
        // embed and leave a broken square in the share card.
        const tooBig =
          img.complete &&
          img.naturalWidth * img.naturalHeight > 1_500_000;

        if (img.complete && img.naturalWidth > 0 && !tooBig) {
          try {
            const canvas = document.createElement("canvas");
            canvas.width = img.naturalWidth;
            canvas.height = img.naturalHeight;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0);
              const dataUrl = canvas.toDataURL("image/png");
              await new Promise<void>((resolve, reject) => {
                img.onload = () => resolve();
                img.onerror = () => reject(new Error("data url image failed"));
                img.src = dataUrl;
              });
              return;
            }
          } catch {
            /* tainted canvas — fall through to fetch */
          }
        }

        const dataUrl = await fetchAsDataUrl(src);
        if (!dataUrl) return;
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = () => reject(new Error("data url image failed"));
          img.src = dataUrl;
        });
      } catch {
        /* keep original src — capture may still work without embed */
      }
    }),
  );
}

/**
 * Capture host — keep in the viewport.
 * Phantom / WKWebView cull far-offscreen nodes (no image decode, blank cutouts).
 */
function mountExportClone(cardEl: HTMLElement): {
  clone: HTMLElement;
  host: HTMLElement;
} {
  const host = document.createElement("div");
  host.setAttribute("data-share-export-host", "");
  host.style.cssText = [
    "position:fixed",
    "left:0",
    "top:0",
    `width:${SQUAD_SHARE_CARD_WIDTH}px`,
    `height:${SQUAD_SHARE_CARD_HEIGHT}px`,
    "overflow:hidden",
    "pointer-events:none",
    "opacity:1",
    "visibility:visible",
    // Under share modal chrome; still painted by the WebView compositor.
    "z-index:1",
  ].join(";");

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

async function captureWithHtml2Canvas(
  clone: HTMLElement,
  scale: number,
): Promise<Blob> {
  const canvas = await html2canvas(clone, {
    backgroundColor: "#000000",
    scale,
    width: SQUAD_SHARE_CARD_WIDTH,
    height: SQUAD_SHARE_CARD_HEIGHT,
    windowWidth: SQUAD_SHARE_CARD_WIDTH,
    windowHeight: SQUAD_SHARE_CARD_HEIGHT,
    useCORS: true,
    allowTaint: false,
    logging: false,
    imageTimeout: 12_000,
    onclone: (_doc, cloned) => {
      prepareNodeForCapture(cloned as HTMLElement);
      flattenAbsoluteTransforms(cloned as HTMLElement);
      (cloned as HTMLElement).querySelectorAll("img").forEach((img) => {
        img.style.opacity = "1";
        img.style.visibility = "visible";
      });
    },
  });

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/png", 0.92),
  );
  if (!blob) throw new Error("Could not render squad image");
  return blob;
}

async function captureWithHtmlToImage(
  clone: HTMLElement,
  scale: number,
): Promise<Blob> {
  const filter = (node: HTMLElement) => {
    if (node.dataset?.shareOverlay != null) return false;
    return true;
  };
  const fontEmbedCSS = await getFontEmbedCSS(clone, { cacheBust: true });
  const blob = await toBlob(clone, {
    cacheBust: false,
    pixelRatio: scale,
    backgroundColor: "#000000",
    width: SQUAD_SHARE_CARD_WIDTH,
    height: SQUAD_SHARE_CARD_HEIGHT,
    fontEmbedCSS,
    filter,
  });
  if (!blob) throw new Error("html-to-image returned empty blob");
  return blob;
}

async function captureRawCardPng(cardEl: HTMLElement): Promise<Blob> {
  if (typeof document !== "undefined" && document.fonts?.ready) {
    await document.fonts.ready;
  }
  await waitForImages(cardEl);
  await nextPaint();
  void cardEl.offsetHeight;

  const { clone, host } = mountExportClone(cardEl);
  const constrained = isConstrainedCaptureEnv();
  const scale = exportPixelRatio();

  try {
    await waitForImages(clone);
    await Promise.all([
      embedImagesAsDataUrls(clone),
      embedBackgroundImagesAsDataUrls(clone),
    ]);
    prepareNodeForCapture(clone);
    flattenAbsoluteTransforms(clone);
    await waitForImages(clone);
    await nextPaint();
    // WKWebView / Phantom need a beat after data-URL swaps before paint settles.
    if (constrained) await sleep(120);

    if (constrained) {
      // foreignObject path is unreliable in wallet WebViews — html2canvas first.
      try {
        return await captureWithHtml2Canvas(clone, scale);
      } catch (err) {
        console.warn("html2canvas capture failed, trying html-to-image", err);
        return await captureWithHtmlToImage(clone, scale);
      }
    }

    try {
      return await captureWithHtmlToImage(clone, scale);
    } catch (err) {
      console.warn("html-to-image capture failed, falling back to html2canvas", err);
      return await captureWithHtml2Canvas(clone, scale);
    }
  } finally {
    host.remove();
  }
}

export async function captureElementAsPng(element: HTMLElement): Promise<Blob> {
  return captureRawCardPng(resolveCaptureCard(element));
}

export type ShareSquadResult = "clipboard" | "download" | "share";

/**
 * Save PNG — on mobile / wallet WebViews prefer the native share sheet
 * (`<a download>` is often ignored inside Phantom).
 */
async function savePng(blob: Blob, fileName: string): Promise<"share" | "download"> {
  const file = new File([blob], fileName, { type: "image/png" });

  if (
    typeof navigator !== "undefined" &&
    typeof navigator.share === "function" &&
    typeof navigator.canShare === "function"
  ) {
    try {
      if (navigator.canShare({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: "FORM8 squad",
        });
        return "share";
      }
    } catch (err) {
      // User dismissed the sheet — treat as success (they saw the image).
      if (err instanceof DOMException && err.name === "AbortError") {
        return "share";
      }
    }
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  // iOS WebView often ignores download — open the blob so the user can save.
  if (isConstrainedCaptureEnv()) {
    window.setTimeout(() => {
      try {
        window.open(url, "_blank", "noopener,noreferrer");
      } catch {
        /* ignore */
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    }, 250);
  } else {
    URL.revokeObjectURL(url);
  }

  return "download";
}

/** Download / share squad PNG — pass export root or `[data-share-card]`. */
export async function downloadSquadImage(opts: {
  element: HTMLElement;
  fileName: string;
}): Promise<ShareSquadResult> {
  const blob = await captureElementAsPng(opts.element);
  return savePng(blob, opts.fileName);
}

const COPY_CAPTURE_TIMEOUT_MS = 28_000;

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

  // Clipboard image write is flaky / missing in wallet WebViews — skip straight to share.
  if (
    !isConstrainedCaptureEnv() &&
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
      /* fall through */
    }
  }

  return savePng(blob, opts.fileName);
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
    !isConstrainedCaptureEnv() &&
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

  const result = await savePng(blob, opts.fileName);
  openXCompose(opts.tweetText);
  return result;
}
