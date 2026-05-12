import type { CSSProperties } from "react";
import atlas from "@/data/fpl-photo-atlas.json";

export const FPL_SPRITE_URL = "/sprites/fpl-players.webp";

type Frame = { x: number; y: number };

type AtlasFile = {
  cell: number;
  cols: number;
  width: number;
  height: number;
  count: number;
  frames: Record<string, Frame>;
};

const data = atlas as AtlasFile;

export function getFplPhotoFrame(
  code: number | string | undefined | null
): Frame | null {
  if (code === undefined || code === null) return null;
  const key = String(code);
  return data.frames[key] ?? null;
}

export function getFplAtlasMeta() {
  return {
    cell: data.cell,
    width: data.width,
    height: data.height,
  };
}

export function hasFplAtlas(): boolean {
  return data.count > 0 && Object.keys(data.frames).length > 0;
}

/** FPL headshot URL pattern: .../p{code}.png | .jpg (bootstrap uses png; bundled fallback JSON uses jpg). */
export function fplPhotoCodeFromUrl(url?: string | null): string | null {
  if (!url) return null;
  const m = url.match(/\/p(\d+)\.(?:png|jpg)\b/i);
  return m ? m[1] : null;
}

/** e.g. `p111234.png` / `p111234.jpg` or full PL URL → numeric FPL element code */
export function fplPhotoCodeFromFilenameOrUrl(s: string): number | null {
  const fromUrl = fplPhotoCodeFromUrl(s);
  if (fromUrl) return Number(fromUrl);
  const m = s.match(/p(\d+)\.(?:png|jpg)\b/i);
  return m ? Number(m[1]) : null;
}

/**
 * Inline styles for a square avatar showing one cell from the sprite.
 */
export function fplSpriteStyle(
  frame: Frame,
  displaySizePx: number
): CSSProperties {
  const { cell, width, height } = data;
  const scale = displaySizePx / cell;
  return {
    backgroundImage: `url(${FPL_SPRITE_URL})`,
    backgroundRepeat: "no-repeat",
    backgroundSize: `${width * scale}px ${height * scale}px`,
    backgroundPosition: `-${frame.x * scale}px -${frame.y * scale}px`,
    width: displaySizePx,
    height: displaySizePx,
  };
}
