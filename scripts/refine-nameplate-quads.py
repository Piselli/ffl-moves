#!/usr/bin/env python3
"""
Refine locker nameplate quads by snapping user seeds onto white door edges.

For each bay seed (TL,TR,BR,BL in % of plate), cast a ray from the panel
centroid through each corner and stop at the white→frame boundary. Writes:

  - kit/_review/nameplate-quads-v25-user.json       (seeds, if missing)
  - kit/_review/nameplate-quads-v25-refined.json
  - kit/_review/nameplate_refine_compare.jpg        (red=seed, green=refined)
  - kit/_review/nameplate_refine_band.jpg
  - src/.../nameplateQuads.generated.ts

Usage:
  python3 scripts/refine-nameplate-quads.py
  python3 scripts/refine-nameplate-quads.py --seeds path/to/calibration.json
"""

from __future__ import annotations

import argparse
import json
from datetime import datetime, timezone
from pathlib import Path

import cv2
import numpy as np
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
PLATE = (
    ROOT
    / "public/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.png"
)
REVIEW = ROOT / "public/design-lab/locker-hero/kit/_review"
GEN_TS = (
    ROOT / "src/components/design-lab/locker-hero/nameplateQuads.generated.ts"
)
DEFAULT_SEEDS = REVIEW / "nameplate-quads-v25-user.json"

BAY_IDS = [
    "h1",
    "h2",
    "h3",
    "h4",
    "h5",
    "h6",
    "h7",
    "h8",
    "h9",
    "h10",
    "h11",
    "hb1",
    "hb2",
    "hb3",
]

FALLBACK_SEEDS: dict[str, list[tuple[float, float]]] = {
    "h1": [(1.319, 6.987), (8.153, 10.536), (8.333, 16.636), (1.319, 13.641)],
    "h2": [(9.113, 10.869), (15.108, 13.420), (15.048, 19.076), (9.173, 16.969)],
    "h3": [(15.947, 13.863), (21.343, 15.860), (21.523, 20.850), (15.827, 19.409)],
    "h4": [(22.122, 15.860), (27.578, 17.301), (27.578, 22.181), (22.302, 21.072)],
    "h5": [(28.237, 17.523), (33.573, 18.410), (33.573, 23.068), (28.297, 22.070)],
    "h6": [(34.233, 18.521), (39.568, 19.298), (39.508, 23.734), (34.353, 23.068)],
    "h7": [(40.168, 19.409), (45.564, 19.741), (45.504, 24.067), (40.168, 23.623)],
    "h8": [(45.983, 19.519), (51.499, 19.741), (51.439, 24.177), (46.223, 24.288)],
    "h9": [(52.038, 19.630), (57.554, 19.519), (57.674, 24.067), (52.038, 24.177)],
    "h10": [(58.094, 19.298), (64.089, 19.187), (63.969, 23.734), (58.213, 24.177)],
    "h11": [(64.448, 19.076), (70.803, 17.967), (70.863, 23.068), (64.568, 23.623)],
    "hb1": [(82.374, 15.305), (87.650, 13.863), (87.530, 19.630), (82.374, 20.850)],
    "hb2": [(88.309, 13.420), (94.185, 10.758), (94.125, 17.301), (88.309, 19.187)],
    "hb3": [(94.844, 10.203), (99.940, 7.985), (99.820, 14.750), (94.784, 16.858)],
}


def load_seeds(path: Path | None) -> dict[str, list[tuple[float, float]]]:
    if path and path.exists():
        data = json.loads(path.read_text())
        quads = data.get("quads", data)
        out: dict[str, list[tuple[float, float]]] = {}
        for bay_id, corners in quads.items():
            pts = []
            for c in corners:
                if isinstance(c, dict):
                    pts.append((float(c["x"]), float(c["y"])))
                else:
                    pts.append((float(c[0]), float(c[1])))
            out[bay_id] = pts
        return out
    return {k: list(v) for k, v in FALLBACK_SEEDS.items()}


def order_tl_tr_br_bl(pts: np.ndarray) -> np.ndarray:
    pts = np.asarray(pts, dtype=np.float32)
    idx = np.argsort(pts[:, 1] + pts[:, 0] * 1e-4)
    top = pts[idx[:2]]
    bot = pts[idx[2:]]
    top = top[np.argsort(top[:, 0])]
    bot = bot[np.argsort(bot[:, 0])]
    return np.array([top[0], top[1], bot[1], bot[0]], dtype=np.float32)


def build_white_score(rgb: np.ndarray) -> np.ndarray:
    lab = cv2.cvtColor(rgb, cv2.COLOR_RGB2LAB).astype(np.float32)
    L, A, B = lab[:, :, 0], lab[:, :, 1], lab[:, :, 2]
    chroma = np.sqrt((A - 128.0) ** 2 + (B - 128.0) ** 2)
    white = np.clip((L - 150.0) / 40.0, 0, 1) * np.clip(
        1.0 - chroma / 18.0, 0, 1
    )
    return cv2.GaussianBlur(white, (5, 5), 0)


def sample(white: np.ndarray, x: float, y: float) -> float:
    h, w = white.shape
    xi = int(np.clip(round(x), 0, w - 1))
    yi = int(np.clip(round(y), 0, h - 1))
    return float(white[yi, xi])


def snap_corner(
    white: np.ndarray,
    cx: float,
    cy: float,
    sx: float,
    sy: float,
    max_out: float = 55,
    max_in: float = 25,
    thr: float = 0.42,
) -> tuple[float, float]:
    h, w = white.shape
    vx, vy = sx - cx, sy - cy
    dist = max(1e-3, float(np.hypot(vx, vy)))
    ux, uy = vx / dist, vy / dist
    start_d = max(0.0, dist - max_in)
    last_white = None
    steps = int(dist + max_out - start_d) + 1
    for t in np.linspace(start_d, dist + max_out, max(2, steps)):
        x = cx + ux * t
        y = cy + uy * t
        if not (0 <= x < w and 0 <= y < h):
            break
        if sample(white, x, y) >= thr:
            last_white = (x, y)
        elif last_white is not None:
            break
    bx, by = last_white if last_white is not None else (sx, sy)
    for _ in range(8):
        gxp = sample(white, bx + 1, by) - sample(white, bx - 1, by)
        gyp = sample(white, bx, by + 1) - sample(white, bx, by - 1)
        g = float(np.hypot(gxp, gyp) + 1e-6)
        val = sample(white, bx, by)
        if val < thr:
            bx += 0.8 * gxp / g
            by += 0.8 * gyp / g
        elif sample(white, bx + ux, by + uy) >= thr:
            bx += ux
            by += uy
        else:
            break
    return (
        float(np.clip(bx, 0, w - 1)),
        float(np.clip(by, 0, h - 1)),
    )


def refine_one(
    seed_pct: list[tuple[float, float]],
    white: np.ndarray,
    w: int,
    h: int,
) -> np.ndarray:
    seed = order_tl_tr_br_bl(
        np.array([[p[0] / 100 * w, p[1] / 100 * h] for p in seed_pct], np.float32)
    )
    cx = float(seed[:, 0].mean())
    cy = float(seed[:, 1].mean())
    if sample(white, cx, cy) < 0.35:
        cx = float(0.5 * (seed[0, 0] + seed[1, 0]))
        cy = float(
            0.5 * (seed[0, 1] + seed[1, 1])
            + (seed[3, 1] - seed[0, 1]) * 0.35
        )
    out = [
        snap_corner(white, cx, cy, float(sx), float(sy))
        for sx, sy in seed
    ]
    pts = order_tl_tr_br_bl(np.array(out, np.float32))
    c = pts.mean(axis=0)
    pts = order_tl_tr_br_bl(c + 0.94 * (pts - c))
    max_jump = 0.012 * w
    for i in range(4):
        d = pts[i] - seed[i]
        j = float(np.linalg.norm(d))
        if j > max_jump:
            pts[i] = seed[i] + d * (max_jump / j)
    return order_tl_tr_br_bl(pts)


def write_ts(quads_pct: dict[str, list[tuple[float, float]]]) -> None:
    lines = [
        "/** Auto-calibrated nameplate door quads for locker-plate-v25.",
        " *  Corners: TL, TR, BR, BL as % of the 16:9 plate.",
        " *  Seeds: user clicks; refined by white-edge ray snap "
        "(scripts/refine-nameplate-quads.py).",
        " */",
        "",
        'import type { Pt } from "./perspectiveWarp";',
        "",
        "export type NameplateQuadPct = [Pt, Pt, Pt, Pt];",
        "",
        "export const NAMEPLATE_QUADS_V25: Record<string, NameplateQuadPct> = {",
    ]
    for bay_id in BAY_IDS:
        pts = quads_pct[bay_id]

        def fmt(p: tuple[float, float]) -> str:
            return f"{{ x: {p[0]:.3f}, y: {p[1]:.3f} }}"

        lines.append(
            f'  {json.dumps(bay_id)}: '
            f"[{fmt(pts[0])}, {fmt(pts[1])}, {fmt(pts[2])}, {fmt(pts[3])}],"
        )
    lines.append("};")
    lines.append("")
    GEN_TS.write_text("\n".join(lines))


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--seeds", type=Path, default=DEFAULT_SEEDS)
    args = ap.parse_args()

    seeds_path = args.seeds if args.seeds.exists() else None
    seeds = load_seeds(seeds_path)
    im = np.array(Image.open(PLATE).convert("RGB"))
    h, w = im.shape[:2]
    white = build_white_score(im)

    REVIEW.mkdir(parents=True, exist_ok=True)
    if not DEFAULT_SEEDS.exists():
        DEFAULT_SEEDS.write_text(
            json.dumps(
                {
                    "plateId": "v25",
                    "platePx": {"w": w, "h": h},
                    "quads": {
                        k: [{"x": x, "y": y} for x, y in v]
                        for k, v in seeds.items()
                    },
                },
                indent=2,
            )
        )

    refined: dict[str, list[tuple[float, float]]] = {}
    vis = Image.fromarray(im.copy())
    draw = ImageDraw.Draw(vis)

    for bay_id in BAY_IDS:
        seed = seeds[bay_id]
        pts = refine_one(seed, white, w, h)
        refined[bay_id] = [
            (float(p[0] / w * 100), float(p[1] / h * 100)) for p in pts
        ]
        sp = [(p[0] / 100 * w, p[1] / 100 * h) for p in seed]
        rp = [(float(p[0]), float(p[1])) for p in pts]
        draw.polygon(sp, outline=(255, 70, 70), width=2)
        draw.polygon(rp, outline=(40, 230, 130), width=3)
        jumps = [
            float(np.hypot(rp[i][0] - sp[i][0], rp[i][1] - sp[i][1]))
            for i in range(4)
        ]
        print(
            f"{bay_id}: mean jump {np.mean(jumps):.1f}px "
            f"max {np.max(jumps):.1f}px"
        )

    compare = REVIEW / "nameplate_refine_compare.jpg"
    vis.resize((1920, 1080), Image.Resampling.LANCZOS).save(compare, quality=92)
    band = vis.crop((0, int(0.04 * h), w, int(0.30 * h)))
    band_h = max(1, int(1920 * band.height / band.width))
    band.resize((1920, band_h), Image.Resampling.LANCZOS).save(
        REVIEW / "nameplate_refine_band.jpg", quality=92
    )

    calib = {
        "plateId": "v25",
        "platePx": {"w": w, "h": h},
        "quads": {
            k: [{"x": x, "y": y} for x, y in v] for k, v in refined.items()
        },
        "method": "white-ray-snap-v3",
        "updatedAt": datetime.now(timezone.utc).isoformat(),
    }
    (REVIEW / "nameplate-quads-v25-refined.json").write_text(
        json.dumps(calib, indent=2)
    )
    write_ts(refined)
    print(f"wrote {compare}")
    print(f"wrote {GEN_TS}")


if __name__ == "__main__":
    main()
