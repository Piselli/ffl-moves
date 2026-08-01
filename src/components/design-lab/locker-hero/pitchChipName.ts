/**
 * Pitch chip names — fit any surname on one line.
 * Prefer full name at readable size; abbreviate only when width demands it.
 * Never mid-word ellipsis.
 */

const PARTICLES = new Set([
  "van",
  "von",
  "de",
  "del",
  "della",
  "da",
  "di",
  "do",
  "dos",
  "das",
  "den",
  "der",
  "ten",
  "ter",
  "het",
  "la",
  "le",
  "el",
  "al",
  "mc",
  "mac",
  "st",
  "saint",
  "ben",
  "bin",
]);

function decodeEntities(s: string): string {
  return s
    .replace(/&apos;/gi, "'")
    .replace(/&#39;/g, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"');
}

function toReadableCase(label: string): string {
  const letters = label.replace(/[^A-Za-zА-Яа-яЁёІіЇїЄє]/g, "");
  if (!letters || letters !== letters.toUpperCase()) return label;
  return label
    .toLowerCase()
    .replace(/(^|[\s.\-'])([a-zа-яёіїє])/g, (_, p, c) => p + c.toUpperCase());
}

function surnameCluster(parts: string[]): string {
  let i = parts.length - 1;
  while (i > 0 && PARTICLES.has(parts[i - 1]!.toLowerCase().replace(/\./g, ""))) {
    i -= 1;
  }
  return parts.slice(i).join(" ") || parts[parts.length - 1]!;
}

function abbreviateHyphenated(label: string): string {
  const parts = label.split("-").filter(Boolean);
  if (parts.length < 2 || !parts[0]?.[0]) return label;
  return `${parts[0][0]!.toUpperCase()}.${parts.slice(1).join("-")}`;
}

function abbreviateSpaced(label: string): string {
  const parts = label.split(/\s+/).filter(Boolean);
  if (parts.length < 2) return label;
  const first = parts[0]!;
  if (first.includes(".")) return label;
  return `${first[0]!.toUpperCase()}.${parts.slice(1).join("")}`;
}

function normalizeRaw(raw: string): string {
  let label = toReadableCase(decodeEntities(raw).trim().replace(/\s+/g, " "));
  label = label.replace(/\.\s+/g, ".");
  const parts = label.split(" ");
  if (parts.length >= 3) label = surnameCluster(parts);
  return label;
}

/** Progressive shortenings — first that fits at readable size wins. */
export function pitchNameCandidates(raw: string): string[] {
  const base = normalizeRaw(raw);
  if (!base) return [""];

  const out: string[] = [base];
  const push = (s: string) => {
    if (s && !out.includes(s)) out.push(s);
  };

  if (base.includes("-")) {
    push(abbreviateHyphenated(base));
    const hy = base.split("-").filter(Boolean);
    if (hy.length >= 2 && hy[0]?.[0]) {
      push(`${hy[0][0]!.toUpperCase()}.${hy[hy.length - 1]}`);
    }
  }

  if (/\s/.test(base)) {
    push(abbreviateSpaced(base));
    push(base.split(/\s+/).pop()!);
  }

  // Extreme: initial + truncated surname tail (still no ellipsis mid-glyph)
  const compact = out[out.length - 1]!;
  if (compact.length > 12) {
    push(`${compact[0]}.${compact.slice(-8)}`);
  }

  return out;
}

/** @deprecated use fitPitchName — kept for simple callers */
export function pitchChipLabel(raw: string, maxLen = 12): string {
  const c = pitchNameCandidates(raw);
  for (const label of c) {
    if (label.length <= maxLen) return label;
  }
  return c[c.length - 1] ?? "";
}

let measureCtx: CanvasRenderingContext2D | null = null;

export function textWidthPx(
  text: string,
  fontCss: string,
  letterSpacingEm = 0,
  fontSizePx = 12,
): number {
  if (typeof document === "undefined") {
    const sizeMatch = /([\d.]+)px/.exec(fontCss);
    const size = sizeMatch ? Number(sizeMatch[1]) : fontSizePx;
    return text.length * size * 0.52 + Math.max(0, text.length - 1) * size * letterSpacingEm;
  }
  if (!measureCtx) {
    const c = document.createElement("canvas");
    measureCtx = c.getContext("2d");
  }
  if (!measureCtx) return text.length * 6;
  measureCtx.font = fontCss;
  // letterSpacing isn't in CanvasTextDrawingStyles everywhere — add manually
  const base = measureCtx.measureText(text).width;
  if (!letterSpacingEm || text.length < 2) return base;
  return base + (text.length - 1) * fontSizePx * letterSpacingEm;
}

function parseTrackingEm(tracking: string): number {
  const t = tracking.trim();
  if (!t || t === "0" || t === "normal") return 0;
  if (t.endsWith("em")) return Number.parseFloat(t) || 0;
  return 0;
}

function fontSizeForWidth(
  text: string,
  widthPx: number,
  fontFamily: string,
  weight: number,
  max: number,
  min: number,
  letterSpacingEm = 0,
): number {
  let lo = min;
  let hi = max;
  let best = min;
  for (let i = 0; i < 12; i++) {
    const mid = Math.round(((lo + hi) / 2) * 10) / 10;
    const w = textWidthPx(
      text,
      `${weight} ${mid}px ${fontFamily}`,
      letterSpacingEm,
      mid,
    );
    if (w <= widthPx) {
      best = mid;
      lo = mid + 0.1;
    } else {
      hi = mid - 0.1;
    }
  }
  return Math.max(min, Math.min(max, best));
}

/**
 * Fit full surname into width by scaling only.
 * Abbreviation is a last resort below hardMin — lab fonts should be judged on full names.
 */
export function fitPitchName(
  raw: string,
  {
    widthPx,
    fontFamily,
    weight = 700,
    maxSize = 13,
    preferMin = 9,
    hardMin = 7,
    allowAbbreviate = true,
    letterSpacing = "0",
    /** When set, never scale — pick shortest label that fits this size */
    fixedSize,
  }: {
    widthPx: number;
    fontFamily: string;
    weight?: number;
    maxSize?: number;
    preferMin?: number;
    hardMin?: number;
    allowAbbreviate?: boolean;
    letterSpacing?: string;
    fixedSize?: number;
  },
): { label: string; fontSize: number } {
  const trackingEm = parseTrackingEm(letterSpacing);
  const fitWidth = Math.max(24, widthPx - 2);

  if (fixedSize != null) {
    const size = fixedSize;
    const fits = (label: string) =>
      textWidthPx(
        label,
        `${weight} ${size}px ${fontFamily}`,
        trackingEm,
        size,
      ) <= fitWidth;

    const full = normalizeRaw(raw);
    if (fits(full) || !allowAbbreviate) {
      return { label: full, fontSize: size };
    }
    for (const label of pitchNameCandidates(raw)) {
      if (fits(label)) return { label, fontSize: size };
    }
    return {
      label: pitchNameCandidates(raw).at(-1) ?? full,
      fontSize: size,
    };
  }

  const measure = (label: string, min: number) =>
    fontSizeForWidth(
      label,
      fitWidth,
      fontFamily,
      weight,
      maxSize,
      min,
      trackingEm,
    );

  const full = normalizeRaw(raw);
  const fullSize = measure(full, hardMin);
  if (!allowAbbreviate || fullSize >= preferMin || full.length <= 8) {
    return { label: full, fontSize: fullSize };
  }

  const candidates = pitchNameCandidates(raw);
  for (const label of candidates) {
    const size = measure(label, hardMin);
    if (size >= preferMin) return { label, fontSize: size };
  }
  const label = candidates[candidates.length - 1] ?? full;
  return { label, fontSize: measure(label, hardMin) };
}

export function pitchNameFontSize(
  label: string,
  {
    max = 12,
    min = 8,
    widthPx = 78,
  }: { max?: number; min?: number; widthPx?: number; lines?: 1 | 2 } = {},
): number {
  return fontSizeForWidth(label, widthPx, "sans-serif", 700, max, min);
}
