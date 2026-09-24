import sharp from "sharp";

/** Near-white plate detection (API-Sports / some PL portraits). */
const WHITE_LUMA_MIN = 232;
const WHITE_CHROMA_MAX = 28;
/** Soft fringe for anti-aliased plate edges. */
const SOFT_LUMA_MIN = 210;

function isPlatePixel(r: number, g: number, b: number, lumaMin: number): boolean {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const luma = 0.299 * r + 0.587 * g + 0.114 * b;
  return luma >= lumaMin && max - min <= WHITE_CHROMA_MAX;
}

/**
 * Remove flat white/light-gray studio plates by flood-filling from the image
 * edges. Interior near-white (eyes, kit stripes) stays intact.
 */
export async function stripWhitePhotoBackground(
  input: Buffer,
): Promise<{ buffer: Buffer; contentType: "image/png" } | null> {
  const pipeline = sharp(input, { failOn: "none" }).ensureAlpha();
  const meta = await pipeline.metadata();
  const width = meta.width ?? 0;
  const height = meta.height ?? 0;
  if (width < 8 || height < 8) return null;

  // Already a real cutout with substantial alpha — leave alone (EA / PL 110×140).
  if (meta.hasAlpha) {
    const sample = await sharp(input)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });
    let transparent = 0;
    const raw = sample.data;
    for (let i = 3; i < raw.length; i += 4) {
      if (raw[i]! < 240) transparent++;
    }
    if (transparent > width * height * 0.2) {
      return null;
    }
  }

  const { data, info } = await pipeline.raw().toBuffer({ resolveWithObject: true });
  const w = info.width;
  const h = info.height;
  if (info.channels < 4) return null;

  const total = w * h;
  const visited = new Uint8Array(total);
  const queue = new Int32Array(total);
  let qh = 0;
  let qt = 0;

  const idx = (x: number, y: number) => y * w + x;
  const enqueue = (x: number, y: number, lumaMin: number) => {
    const i = idx(x, y);
    if (visited[i]) return;
    const o = i * 4;
    if (!isPlatePixel(data[o]!, data[o + 1]!, data[o + 2]!, lumaMin)) return;
    visited[i] = 1;
    queue[qt++] = i;
  };

  for (let x = 0; x < w; x++) {
    enqueue(x, 0, WHITE_LUMA_MIN);
    enqueue(x, h - 1, WHITE_LUMA_MIN);
  }
  for (let y = 0; y < h; y++) {
    enqueue(0, y, WHITE_LUMA_MIN);
    enqueue(w - 1, y, WHITE_LUMA_MIN);
  }

  // Corners only slightly off-white (JPEG) — still treat as plate seeds.
  if (qt === 0) {
    for (let x = 0; x < w; x++) {
      enqueue(x, 0, SOFT_LUMA_MIN);
      enqueue(x, h - 1, SOFT_LUMA_MIN);
    }
    for (let y = 0; y < h; y++) {
      enqueue(0, y, SOFT_LUMA_MIN);
      enqueue(w - 1, y, SOFT_LUMA_MIN);
    }
  }

  if (qt === 0) return null;

  // Bail if edge white is tiny (not a studio plate).
  const edgeSamples = 2 * (w + h);
  if (qt < Math.max(8, edgeSamples * 0.04)) return null;

  while (qh < qt) {
    const i = queue[qh++]!;
    const x = i % w;
    const y = (i / w) | 0;
    data[i * 4 + 3] = 0;

    const neighbors: Array<[number, number]> = [
      [x - 1, y],
      [x + 1, y],
      [x, y - 1],
      [x, y + 1],
    ];
    for (const [nx, ny] of neighbors) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const ni = idx(nx, ny);
      if (visited[ni]) continue;
      const no = ni * 4;
      if (!isPlatePixel(data[no]!, data[no + 1]!, data[no + 2]!, SOFT_LUMA_MIN)) {
        continue;
      }
      visited[ni] = 1;
      queue[qt++] = ni;
    }
  }

  const out = await sharp(data, {
    raw: { width: w, height: h, channels: 4 },
  })
    .png({ compressionLevel: 8 })
    .toBuffer();

  return { buffer: out, contentType: "image/png" };
}

/** Hosts that often ship opaque white studio plates behind the bust. */
export function hostNeedsWhiteBgStrip(hostname: string): boolean {
  return (
    hostname === "media.api-sports.io" ||
    hostname === "resources.premierleague.com"
  );
}
