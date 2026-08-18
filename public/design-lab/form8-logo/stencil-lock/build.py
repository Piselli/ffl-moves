#!/usr/bin/env python3
"""form8 stencil mark — 180° construction.

Two bar-weight variants share the same module. Right half is the left
half rotated 180° around the canvas center.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / ".tmp-pydeps"))

from PIL import Image, ImageDraw
from shapely.affinity import rotate as shp_rotate
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

OUT = Path(__file__).resolve().parent

CX, CY = 500, 500
SIZE = 1000

W, H = 374, 570
L, T = CX - W // 2, CY - H // 2          # 313, 215
R, B = L + W, T + H                       # 687, 785

SV = 78
SH = 60
C = 60
CW = 45
GAP_H = 84

INNER_L = L + SV                          # 391
INNER_R = R - SV                          # 609

VARIANTS = {
    "a-waist": {
        "sm": 66,
        "label": "A  ·  mid 66  (heavier waist)",
    },
    "b-even": {
        "sm": 60,
        "label": "B  ·  mid 60  (all three bars equal)",
    },
}


def chamfered_rect(
    x0: float, y0: float, x1: float, y1: float,
    tl: float, tr: float, br: float, bl: float,
) -> Polygon:
    return Polygon(
        [
            (x0 + tl, y0),
            (x1 - tr, y0),
            (x1, y0 + tr),
            (x1, y1 - br),
            (x1 - br, y1),
            (x0 + bl, y1),
            (x0, y1 - bl),
            (x0, y0 + tl),
        ]
    )


def gap_strip() -> Polygon:
    y0, y1 = -400, 1400

    def xc(y: float) -> float:
        return (3 * CX + CY - y) / 3.0

    half = GAP_H / 2.0
    return Polygon(
        [
            (xc(y0) - half, y0),
            (xc(y0) + half, y0),
            (xc(y1) + half, y1),
            (xc(y1) - half, y1),
        ]
    )


def waist_v(side: str) -> Polygon:
    if side == "left":
        return Polygon([(L, CY - CW), (L + CW, CY), (L, CY + CW)])
    return Polygon([(R, CY - CW), (R - CW, CY), (R, CY + CW)])


def build_mark(sm: int) -> tuple[Polygon, Polygon]:
    mid_t = CY - sm // 2
    mid_b = CY + sm // 2
    body = chamfered_rect(L, T, R, B, C, C, C, C)
    body = body.difference(unary_union([waist_v("left"), waist_v("right")])).buffer(0)
    top_hole = box(INNER_L, T + SH, INNER_R, mid_t)
    bot_hole = box(INNER_L, mid_b, INNER_R, B - SH)
    body = body.difference(unary_union([top_hole, bot_hole])).buffer(0)
    body = body.difference(gap_strip()).buffer(0)
    geoms = list(body.geoms) if body.geom_type == "MultiPolygon" else [body]
    geoms = sorted(geoms, key=lambda g: g.centroid.x)
    if len(geoms) != 2:
        raise RuntimeError(f"expected 2 halves, got {len(geoms)}: {body.geom_type}")
    return geoms[0], geoms[1]


def coords(poly: Polygon) -> list[tuple[float, float]]:
    pts = list(poly.exterior.coords)[:-1]
    return [(round(x, 4), round(y, 4)) for x, y in pts]


def poly_to_svg_d(pts: list[tuple[float, float]]) -> str:
    parts = [f"M {pts[0][0]:.4f} {pts[0][1]:.4f}"]
    for x, y in pts[1:]:
        parts.append(f"L {x:.4f} {y:.4f}")
    parts.append("Z")
    return " ".join(parts)


def render(left: Polygon, right: Polygon, fill, bg, scale: int = 4) -> Image.Image:
    s = SIZE * scale
    im = Image.new("RGB", (s, s), bg)
    d = ImageDraw.Draw(im)
    for poly in (left, right):
        pts = [(x * scale, y * scale) for x, y in poly.exterior.coords]
        d.polygon(pts, fill=fill)
    return im.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def audit(left: Polygon, right: Polygon, sm: int) -> dict:
    mid_t = CY - sm // 2
    mid_b = CY + sm // 2
    mark = unary_union([left, right])
    rot = shp_rotate(mark, 180, origin=(CX, CY), use_radians=False)
    h = mark.hausdorff_distance(rot)
    return {
        "bars": {"top": SH, "mid": sm, "bottom": SH},
        "all_bars_equal": SH == sm,
        "holes": {
            "top": mid_t - (T + SH),
            "bottom": (B - SH) - mid_b,
        },
        "stem": SV,
        "rotation_180_hausdorff_px": round(h, 4),
        "rotation_180_ok": h < 0.05,
        "area_match": abs(left.area - right.area) < 0.5,
    }


def write_svg(path: Path, left: Polygon, right: Polygon, fill: str, bg: str) -> None:
    path.write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE}" height="{SIZE}">
  <rect width="{SIZE}" height="{SIZE}" fill="{bg}"/>
  <path fill="{fill}" d="{poly_to_svg_d(coords(left))}"/>
  <path fill="{fill}" d="{poly_to_svg_d(coords(right))}"/>
</svg>
''',
        encoding="utf-8",
    )


def save_variant(key: str, sm: int) -> tuple[Image.Image, dict]:
    left, right = build_mark(sm)
    stats = audit(left, right, sm)
    if not stats["rotation_180_ok"]:
        raise SystemExit(f"{key}: 180° failed hausdorff={stats['rotation_180_hausdorff_px']}")

    black = render(left, right, (255, 255, 255), (0, 0, 0))
    white = render(left, right, (0, 0, 0), (255, 255, 255))
    black.save(OUT / f"form8-{key}-on-black.png")
    white.save(OUT / f"form8-{key}-on-white.png")
    write_svg(OUT / f"form8-{key}-on-black.svg", left, right, "#fff", "#000")
    write_svg(OUT / f"form8-{key}-on-white.svg", left, right, "#000", "#fff")
    write_svg(OUT / f"form8-{key}.svg", left, right, "#000", "none")
    return black, stats


def choose_board(images: list[tuple[str, Image.Image]]) -> Image.Image:
    pad = 48
    label_h = 72
    cell = 640
    w = pad * 3 + cell * 2
    h = pad * 2 + label_h + cell
    board = Image.new("RGB", (w, h), (0, 0, 0))
    d = ImageDraw.Draw(board)
    for i, (label, im) in enumerate(images):
        x = pad + i * (cell + pad)
        y = pad + label_h
        tile = im.resize((cell, cell), Image.Resampling.LANCZOS)
        board.paste(tile, (x, y))
        d.text((x + 8, pad + 18), label, fill=(255, 255, 255))
    return board


def main() -> None:
    rendered: list[tuple[str, Image.Image]] = []
    all_stats = {}
    for key, spec in VARIANTS.items():
        img, stats = save_variant(key, spec["sm"])
        rendered.append((spec["label"], img))
        all_stats[key] = stats
        print(key, json.dumps(stats))

    # Keep previous filenames as alias of A (heavier waist).
    a_black = OUT / "form8-a-waist-on-black.png"
    a_white = OUT / "form8-a-waist-on-white.png"
    a_svg = OUT / "form8-a-waist.svg"
    Image.open(a_black).save(OUT / "form8-mark-on-black.png")
    Image.open(a_white).save(OUT / "form8-mark-on-white.png")
    (OUT / "form8-mark.svg").write_text(a_svg.read_text(encoding="utf-8"), encoding="utf-8")
    (OUT / "form8-mark-on-black.svg").write_text(
        (OUT / "form8-a-waist-on-black.svg").read_text(encoding="utf-8"), encoding="utf-8"
    )
    (OUT / "form8-mark-on-white.svg").write_text(
        (OUT / "form8-a-waist-on-white.svg").read_text(encoding="utf-8"), encoding="utf-8"
    )

    choose_board(rendered).save(OUT / "form8-choose.png")
    (OUT / "MEASURE.json").write_text(json.dumps(all_stats, indent=2) + "\n", encoding="utf-8")
    (OUT / "SYSTEM.json").write_text(
        json.dumps(
            {
                "symmetry": "180° around canvas center (500, 500)",
                "variants": {
                    "a-waist": "top=bottom=60, mid=66 (current / heavier waist)",
                    "b-even": "top=mid=bottom=60 (all three bars equal)",
                },
                "stats": all_stats,
            },
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )


if __name__ == "__main__":
    main()
