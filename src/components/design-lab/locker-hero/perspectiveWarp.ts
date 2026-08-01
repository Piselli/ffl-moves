/**
 * Corner-pin / homography helpers for nesting hang kits into locker bays.
 * Same technique used in VFX comps: map a rect onto a perspective quad.
 */

export type Pt = { x: number; y: number };

/** 4 corners: TL, TR, BR, BL */
export type Quad = [Pt, Pt, Pt, Pt];

function adj(m: number[][], i: number, j: number): number {
  const a: number[][] = [];
  for (let r = 0; r < 3; r++) {
    if (r === i) continue;
    const row: number[] = [];
    for (let c = 0; c < 3; c++) {
      if (c === j) continue;
      row.push(m[r]![c]!);
    }
    a.push(row);
  }
  return a[0]![0]! * a[1]![1]! - a[0]![1]! * a[1]![0]!;
}

function det3(m: number[][]): number {
  return (
    m[0]![0]! * adj(m, 0, 0) -
    m[0]![1]! * adj(m, 0, 1) +
    m[0]![2]! * adj(m, 0, 2)
  );
}

function inv3(m: number[][]): number[][] | null {
  const d = det3(m);
  if (Math.abs(d) < 1e-12) return null;
  const out: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      const sign = (i + j) % 2 === 0 ? 1 : -1;
      out[j]![i] = (sign * adj(m, i, j)) / d;
    }
  }
  return out;
}

function mul3(a: number[][], b: number[][]): number[][] {
  const out: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      out[i]![j] =
        a[i]![0]! * b[0]![j]! + a[i]![1]! * b[1]![j]! + a[i]![2]! * b[2]![j]!;
    }
  }
  return out;
}

function squareToQuad(q: Quad): number[][] | null {
  const [tl, tr, br, bl] = q;
  const px = [tl.x, tr.x, br.x, bl.x];
  const py = [tl.y, tr.y, br.y, bl.y];

  const dx1 = px[1]! - px[2]!;
  const dx2 = px[3]! - px[2]!;
  const dx3 = px[0]! - px[1]! + px[2]! - px[3]!;
  const dy1 = py[1]! - py[2]!;
  const dy2 = py[3]! - py[2]!;
  const dy3 = py[0]! - py[1]! + py[2]! - py[3]!;

  let s13: number;
  let s23: number;
  if (Math.abs(dx3) < 1e-12 && Math.abs(dy3) < 1e-12) {
    s13 = s23 = 0;
  } else {
    const den = dx1 * dy2 - dx2 * dy1;
    if (Math.abs(den) < 1e-12) return null;
    s13 = (dx3 * dy2 - dx2 * dy3) / den;
    s23 = (dx1 * dy3 - dx3 * dy1) / den;
  }

  return [
    [px[1]! - px[0]! + s13 * px[1]!, px[3]! - px[0]! + s23 * px[3]!, px[0]!],
    [py[1]! - py[0]! + s13 * py[1]!, py[3]! - py[0]! + s23 * py[3]!, py[0]!],
    [s13, s23, 1],
  ];
}

export function getHomography(src: Quad, dst: Quad): number[][] | null {
  const a = squareToQuad(src);
  const b = squareToQuad(dst);
  if (!a || !b) return null;
  const aInv = inv3(a);
  if (!aInv) return null;
  return mul3(b, aInv);
}

function applyH(H: number[][], x: number, y: number): Pt {
  const w = H[2]![0]! * x + H[2]![1]! * y + H[2]![2]!;
  return {
    x: (H[0]![0]! * x + H[0]![1]! * y + H[0]![2]!) / w,
    y: (H[1]![0]! * x + H[1]![1]! * y + H[1]![2]!) / w,
  };
}

function sampleBilinear(
  data: Uint8ClampedArray,
  w: number,
  h: number,
  x: number,
  y: number,
): [number, number, number, number] {
  if (x < -0.5 || y < -0.5 || x > w - 0.5 || y > h - 0.5) {
    return [0, 0, 0, 0];
  }
  const x0 = Math.max(0, Math.min(w - 2, Math.floor(x)));
  const y0 = Math.max(0, Math.min(h - 2, Math.floor(y)));
  const fx = Math.max(0, Math.min(1, x - x0));
  const fy = Math.max(0, Math.min(1, y - y0));
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x1) * 4;
  const i01 = (y1 * w + x0) * 4;
  const i11 = (y1 * w + x1) * 4;
  const out: [number, number, number, number] = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    out[c] =
      data[i00 + c]! * (1 - fx) * (1 - fy) +
      data[i10 + c]! * fx * (1 - fy) +
      data[i01 + c]! * (1 - fx) * fy +
      data[i11 + c]! * fx * fy;
  }
  return out;
}

/** Alpha-bbox crop so empty canvas padding doesn’t shrink the garment. */
export function cropToAlpha(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  threshold = 20,
): { canvas: HTMLCanvasElement; width: number; height: number } | null {
  const data = ctx.getImageData(0, 0, w, h).data;
  let minX = w;
  let minY = h;
  let maxX = 0;
  let maxY = 0;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * 4 + 3]! > threshold) {
        if (x < minX) minX = x;
        if (y < minY) minY = y;
        if (x > maxX) maxX = x;
        if (y > maxY) maxY = y;
      }
    }
  }
  if (maxX < minX || maxY < minY) return null;
  const pad = 4;
  minX = Math.max(0, minX - pad);
  minY = Math.max(0, minY - pad);
  maxX = Math.min(w - 1, maxX + pad);
  maxY = Math.min(h - 1, maxY + pad);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const cctx = canvas.getContext("2d");
  if (!cctx) return null;
  cctx.drawImage(ctx.canvas, minX, minY, cw, ch, 0, 0, cw, ch);
  return { canvas, width: cw, height: ch };
}

/**
 * Trapezoid inside dest rect from wall yaw (degrees).
 * Positive yaw = left wall facing inward (far edge on the left).
 */
export function trapezoidFromYaw(
  width: number,
  height: number,
  yawDeg: number,
  nest = 0.04,
): Quad {
  const yaw = (yawDeg * Math.PI) / 180;
  const foreshorten = Math.min(0.5, Math.abs(Math.sin(yaw)) * 0.72);
  const topPull = Math.min(0.14, Math.abs(Math.sin(yaw)) * 0.18);
  const padX = width * nest;
  const padY = height * nest * 0.4;

  const left = padX;
  const right = width - padX;
  const top = padY;
  const bot = height - padY * 0.2;

  if (yawDeg >= 0) {
    const insetL = foreshorten * width * 0.62;
    const shrinkL = foreshorten * height * 0.28;
    return [
      { x: left + insetL, y: top + shrinkL + topPull * height },
      { x: right, y: top },
      { x: right, y: bot },
      { x: left + insetL * 0.8, y: bot - shrinkL * 0.4 },
    ];
  }
  const insetR = foreshorten * width * 0.62;
  const shrinkR = foreshorten * height * 0.28;
  return [
    { x: left, y: top },
    { x: right - insetR, y: top + shrinkR + topPull * height },
    { x: right - insetR * 0.8, y: bot - shrinkR * 0.4 },
    { x: left, y: bot },
  ];
}

export type ShadeProfile = {
  exposure: number;
  farEdge: number;
  topRecess: number;
  cool: number;
  wallAo: number;
};

/**
 * Warp source RGBA into dest size with perspective + bay lighting.
 * Returns a PNG data URL.
 */
export function warpKitToBay(opts: {
  source: CanvasImageSource;
  srcW: number;
  srcH: number;
  destW: number;
  destH: number;
  yawDeg: number;
  shade: ShadeProfile;
  nest?: number;
}): string {
  const { srcW, srcH, destW, destH, yawDeg, shade } = opts;
  const srcCanvas = document.createElement("canvas");
  srcCanvas.width = srcW;
  srcCanvas.height = srcH;
  const sctx = srcCanvas.getContext("2d", { willReadFrequently: true });
  if (!sctx) return "";
  sctx.clearRect(0, 0, srcW, srcH);
  sctx.drawImage(opts.source, 0, 0, srcW, srcH);
  const srcData = sctx.getImageData(0, 0, srcW, srcH).data;

  const dest = document.createElement("canvas");
  dest.width = destW;
  dest.height = destH;
  const dctx = dest.getContext("2d", { willReadFrequently: true });
  if (!dctx) return "";
  const out = dctx.createImageData(destW, destH);
  const dst = out.data;

  const srcQuad: Quad = [
    { x: 0, y: 0 },
    { x: srcW - 1, y: 0 },
    { x: srcW - 1, y: srcH - 1 },
    { x: 0, y: srcH - 1 },
  ];
  const dstQuad = trapezoidFromYaw(destW, destH, yawDeg, opts.nest ?? 0.04);
  // Inverse map: dest pixel → source
  const H = getHomography(dstQuad, srcQuad);
  if (!H) return "";

  const yawSign = yawDeg >= 0 ? 1 : -1;

  for (let y = 0; y < destH; y++) {
    const v = y / Math.max(1, destH - 1);
    for (let x = 0; x < destW; x++) {
      const u = x / Math.max(1, destW - 1);
      const p = applyH(H, x, y);
      const [r0, g0, b0, a0] = sampleBilinear(srcData, srcW, srcH, p.x, p.y);
      if (a0 < 1) continue;

      const far = yawSign >= 0 ? 1 - u : u;
      const edge = Math.pow(far, 1.35);
      const top = Math.pow(1 - v, 1.8);
      const mul =
        shade.exposure *
        (1 - shade.farEdge * edge * 0.6) *
        (1 - shade.topRecess * top * 0.5);

      let r = r0 * mul;
      let g = g0 * mul;
      let b = b0 * mul;

      if (shade.cool > 0) {
        const c = shade.cool;
        r = r * (1 - c * 0.14) + 145 * c * 0.05;
        g = g * (1 - c * 0.05) + 155 * c * 0.05;
        b = b * (1 - c * 0.02) + 170 * c * 0.09;
      }

      const aoX = (u - 0.5) / 0.38;
      const aoY = (v - 0.28) / 0.55;
      const ao = Math.exp(-(aoX * aoX + aoY * aoY)) * shade.wallAo;
      const aoMul = 1 - ao * 0.32;
      r *= aoMul;
      g *= aoMul;
      b *= aoMul;

      const i = (y * destW + x) * 4;
      dst[i] = Math.max(0, Math.min(255, r));
      dst[i + 1] = Math.max(0, Math.min(255, g));
      dst[i + 2] = Math.max(0, Math.min(255, b));
      dst[i + 3] = a0 > 240 ? a0 : a0 * 0.94;
    }
  }

  dctx.putImageData(out, 0, 0);

  const composed = document.createElement("canvas");
  composed.width = destW;
  composed.height = destH;
  const cctx = composed.getContext("2d");
  if (!cctx) return dest.toDataURL("image/png");

  cctx.clearRect(0, 0, destW, destH);
  const g = cctx.createRadialGradient(
    destW * 0.5,
    destH * 0.2,
    destW * 0.04,
    destW * 0.5,
    destH * 0.38,
    destW * 0.5,
  );
  g.addColorStop(0, `rgba(0,0,0,${0.36 * shade.wallAo})`);
  g.addColorStop(0.55, `rgba(0,0,0,${0.14 * shade.wallAo})`);
  g.addColorStop(1, "rgba(0,0,0,0)");
  cctx.fillStyle = g;
  cctx.fillRect(0, 0, destW, destH);
  cctx.drawImage(dest, 0, 0);

  return composed.toDataURL("image/png");
}
