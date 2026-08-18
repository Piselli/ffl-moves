#!/usr/bin/env python3
"""Spread the two stencil halves apart — new images only.

Does not touch stencil-lock/. Same A-waist module, 180° around (500, 500).
Left piece translates −dx, right +dx. F drawing is unchanged; only the air
between the two elements grows, so the mark gets a bit squarer.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / ".tmp-pydeps"))

from PIL import Image, ImageDraw, ImageFont
from shapely.affinity import rotate as shp_rotate
from shapely.affinity import translate as shp_translate
from shapely.geometry import Polygon, box
from shapely.ops import unary_union

LOCK = Path(__file__).resolve().parent.parent / "stencil-lock"
OUT = Path(__file__).resolve().parent

CX, CY = 500, 500
SIZE = 1000
W, H = 374, 570
L, T = CX - W // 2, CY - H // 2
R, B = L + W, T + H
SV, SH, C, CW, GAP_H = 78, 60, 60, 45, 84
SM = 66  # locked A
INNER_L, INNER_R = L + SV, R - SV

# Modest spreads, px per half. Total width += 2 * dx.
SPREADS = (12, 18)


def chamfered_rect(x0, y0, x1, y1, tl, tr, br, bl) -> Polygon:
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


def build_halves() -> tuple[Polygon, Polygon]:
    mid_t, mid_b = CY - SM // 2, CY + SM // 2
    body = chamfered_rect(L, T, R, B, C, C, C, C)
    body = body.difference(
        unary_union(
            [
                Polygon([(L, CY - CW), (L + CW, CY), (L, CY + CW)]),
                Polygon([(R, CY - CW), (R - CW, CY), (R, CY + CW)]),
            ]
        )
    ).buffer(0)
    body = body.difference(
        unary_union(
            [box(INNER_L, T + SH, INNER_R, mid_t), box(INNER_L, mid_b, INNER_R, B - SH)]
        )
    ).buffer(0)
    body = body.difference(gap_strip()).buffer(0)
    geoms = list(body.geoms) if body.geom_type == "MultiPolygon" else [body]
    geoms = sorted(geoms, key=lambda g: g.centroid.x)
    if len(geoms) != 2:
        raise RuntimeError(f"expected 2 halves, got {len(geoms)}")
    return geoms[0], geoms[1]


def spread(left: Polygon, right: Polygon, dx: float) -> tuple[Polygon, Polygon]:
    if dx == 0:
        return left, right
    return shp_translate(left, xoff=-dx), shp_translate(right, xoff=dx)


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


def render_rgba(left: Polygon, right: Polygon, scale: int = 4) -> Image.Image:
    s = SIZE * scale
    im = Image.new("RGBA", (s, s), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for poly in (left, right):
        pts = [(x * scale, y * scale) for x, y in poly.exterior.coords]
        d.polygon(pts, fill=(255, 255, 255, 255))
    return im.resize((SIZE, SIZE), Image.Resampling.LANCZOS)


def crop_mark(im: Image.Image, pad: int = 24) -> Image.Image:
    bbox = im.split()[-1].getbbox() if im.mode == "RGBA" else im.convert("L").point(
        lambda p: 255 if p > 12 else 0
    ).getbbox()
    if bbox is None:
        return im
    x0, y0, x1, y1 = bbox
    x0, y0 = max(0, x0 - pad), max(0, y0 - pad)
    x1, y1 = min(im.width, x1 + pad), min(im.height, y1 + pad)
    return im.crop((x0, y0, x1, y1))


def audit(left: Polygon, right: Polygon, dx: int) -> dict:
    mark = unary_union([left, right])
    rot = shp_rotate(mark, 180, origin=(CX, CY), use_radians=False)
    minx, miny, maxx, maxy = mark.bounds
    bw, bh = maxx - minx, maxy - miny
    return {
        "dx_per_half": dx,
        "width": round(bw, 2),
        "height": round(bh, 2),
        "ratio_w_over_h": round(bw / bh, 4),
        "rotation_180_hausdorff_px": round(mark.hausdorff_distance(rot), 4),
        "rotation_180_ok": mark.hausdorff_distance(rot) < 0.05,
        "area_match": abs(left.area - right.area) < 0.5,
    }


def write_svg(path: Path, left: Polygon, right: Polygon, fill: str, bg: str) -> None:
    bg_rect = (
        f'  <rect width="{SIZE}" height="{SIZE}" fill="{bg}"/>\n' if bg != "none" else ""
    )
    path.write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {SIZE} {SIZE}" width="{SIZE}" height="{SIZE}">
{bg_rect}  <path fill="{fill}" d="{poly_to_svg_d(coords(left))}"/>
  <path fill="{fill}" d="{poly_to_svg_d(coords(right))}"/>
</svg>
''',
        encoding="utf-8",
    )


def try_font(size: int):
    for p in (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf",
        "/System/Library/Fonts/Helvetica.ttc",
        "/Library/Fonts/Arial Bold.ttf",
    ):
        try:
            return ImageFont.truetype(p, size)
        except OSError:
            continue
    return ImageFont.load_default()


def save_dx(left0: Polygon, right0: Polygon, dx: int) -> tuple[Image.Image, dict]:
    left, right = spread(left0, right0, dx)
    stats = audit(left, right, dx)
    if not stats["rotation_180_ok"]:
        raise SystemExit(f"dx={dx}: 180° failed hausdorff={stats['rotation_180_hausdorff_px']}")

    tag = f"dx{dx}" if dx else "lock"
    black = render(left, right, (255, 255, 255), (0, 0, 0))
    white = render(left, right, (0, 0, 0), (255, 255, 255))
    black.save(OUT / f"form8-{tag}-on-black.png")
    white.save(OUT / f"form8-{tag}-on-white.png")
    write_svg(OUT / f"form8-{tag}-on-black.svg", left, right, "#fff", "#000")
    write_svg(OUT / f"form8-{tag}-on-white.svg", left, right, "#000", "#fff")
    write_svg(OUT / f"form8-{tag}.svg", left, right, "#000", "none")

    rgba = render_rgba(left, right)
    cropped = crop_mark(rgba, pad=20)
    cropped.save(OUT / f"form8-{tag}-transparent.png")

    # Small-size masters — crop then downscale, on black.
    for px in (24, 32, 48, 64):
        ratio = cropped.width / cropped.height
        w = max(1, round(px * ratio))
        small = cropped.resize((w, px), Image.Resampling.LANCZOS)
        tile = Image.new("RGB", (px + 16, px + 16), (0, 0, 0))
        tile.paste(small, ((tile.width - w) // 2, 8), small)
        tile.save(OUT / f"form8-{tag}-{px}.png")

    return black, stats


def compare_board(rows: list[tuple[str, Image.Image, Image.Image]]) -> Image.Image:
    """Hero + 32px + 64px for lock vs spreads."""
    font = try_font(22)
    font_s = try_font(14)
    pad, label_h, cell = 36, 56, 420
    micro_h = 96
    cols = len(rows)
    w = pad * (cols + 1) + cell * cols
    h = pad * 3 + label_h + cell + micro_h
    board = Image.new("RGB", (w, h), (0, 0, 0))
    d = ImageDraw.Draw(board)
    for i, (label, hero, tiny) in enumerate(rows):
        x = pad + i * (cell + pad)
        d.text((x, pad + 12), label, fill=(255, 255, 255), font=font)
        tile = hero.resize((cell, cell), Image.Resampling.LANCZOS)
        board.paste(tile, (x, pad + label_h))
        # micro row
        my = pad + label_h + cell + pad
        board.paste(tiny, (x, my + (micro_h - tiny.height) // 2))
        d.text((x + tiny.width + 12, my + 28), "32 / 64", fill=(160, 160, 160), font=font_s)
    return board


def micro_pair(tag: str) -> Image.Image:
    a = Image.open(OUT / f"form8-{tag}-32.png")
    b = Image.open(OUT / f"form8-{tag}-64.png")
    im = Image.new("RGB", (a.width + 12 + b.width, max(a.height, b.height)), (0, 0, 0))
    im.paste(a, (0, (im.height - a.height) // 2))
    im.paste(b, (a.width + 12, (im.height - b.height) // 2))
    return im


def crop_frame(left: Polygon, right: Polygon, pad: float = 24.0) -> tuple[float, float, float, float]:
    minx, miny, maxx, maxy = unary_union([left, right]).bounds
    return minx - pad, miny - pad, (maxx - minx) + 2 * pad, (maxy - miny) + 2 * pad


def write_cropped_svg(path: Path, left: Polygon, right: Polygon, fill: str) -> None:
    ox, oy, vw, vh = crop_frame(left, right)
    def shifted(poly: Polygon) -> list[tuple[float, float]]:
        return [(round(x - ox, 4), round(y - oy, 4)) for x, y in coords(poly)]
    path.write_text(
        f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {vw:.4f} {vh:.4f}" width="{vw:.0f}" height="{vh:.0f}" fill="none">
  <path fill="{fill}" d="{poly_to_svg_d(shifted(left))}"/>
  <path fill="{fill}" d="{poly_to_svg_d(shifted(right))}"/>
</svg>
''',
        encoding="utf-8",
    )


def render_on_black_hi(left: Polygon, right: Polygon, scale: int) -> Image.Image:
    s = SIZE * scale
    im = Image.new("RGB", (s, s), (0, 0, 0))
    d = ImageDraw.Draw(im)
    for poly in (left, right):
        pts = [(x * scale, y * scale) for x, y in poly.exterior.coords]
        d.polygon(pts, fill=(255, 255, 255))
    return im


def render_transparent_hi(left: Polygon, right: Polygon, scale: int, pad: float = 24.0) -> Image.Image:
    ox, oy, vw, vh = crop_frame(left, right, pad)
    w, h = round(vw * scale), round(vh * scale)
    im = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    for poly in (left, right):
        pts = [((x - ox) * scale, (y - oy) * scale) for x, y in poly.exterior.coords]
        d.polygon(pts, fill=(255, 255, 255, 255))
    return im


def export_dx15() -> None:
    """Hero masters: vector SVG (infinite zoom) + 8× raster, no downsample."""
    dx = 15
    scale = 8
    left, right = spread(*build_halves(), dx)
    stats = audit(left, right, dx)
    if not stats["rotation_180_ok"]:
        raise SystemExit(f"dx=15: 180° failed hausdorff={stats['rotation_180_hausdorff_px']}")

    tag = "dx15"
    black = render_on_black_hi(left, right, scale)
    trans = render_transparent_hi(left, right, scale)
    black.save(OUT / f"form8-{tag}-on-black.png", "PNG")
    trans.save(OUT / f"form8-{tag}-transparent.png", "PNG")
    write_svg(OUT / f"form8-{tag}-on-black.svg", left, right, "#fff", "#000")
    write_cropped_svg(OUT / f"form8-{tag}.svg", left, right, "#fff")

    print(tag, json.dumps(stats))
    print("on-black png", black.size)
    print("transparent png", trans.size)


def main() -> None:
    left0, right0 = build_halves()
    all_stats = {}
    board_rows: list[tuple[str, Image.Image, Image.Image]] = []

    for dx in (0, *SPREADS):
        img, stats = save_dx(left0, right0, dx)
        tag = f"dx{dx}" if dx else "lock"
        all_stats[tag] = stats
        print(tag, json.dumps(stats))
        if dx == 0:
            label = f"lock  ·  {stats['width']:.0f}×{stats['height']:.0f}"
        else:
            label = f"+{dx}px each  ·  {stats['width']:.0f}×{stats['height']:.0f}"
        board_rows.append((label, img, micro_pair(tag)))

    compare_board(board_rows).save(OUT / "form8-spread-compare.png")
    (OUT / "MEASURE.json").write_text(json.dumps(all_stats, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "dx15":
        export_dx15()
    else:
        main()

