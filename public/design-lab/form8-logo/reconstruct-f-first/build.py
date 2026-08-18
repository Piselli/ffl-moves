#!/usr/bin/env python3
"""form8 — F is the left of one drawn 8.

Not a stock F. Not three bars. The crotches of the F ARE the 8's bowls,
already open. Closing them makes the 8. The slash was always the arm terminals.
"""
from __future__ import annotations

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(ROOT / ".tmp-pydeps"))

from PIL import Image, ImageDraw, ImageFont
from shapely.affinity import rotate, translate
from shapely.geometry import Point, Polygon, box
from shapely.ops import unary_union

OUT = Path(__file__).resolve().parent
CANVAS = 1000
QUAD = 64
CX = CY = 500.0

# Wide kit 8 so a real diagonal can miss the stem.
W, H = 540, 720
LEFT = (CANVAS - W) / 2  # 230
TOP = (CANVAS - H) / 2  # 140

S = 90
G = 48
SPINE = 90

S_TOP, S_WAIST, S_BOT, S_RIGHT = 86, 82, 86, 90

# Outer: tighter at F, opener on 8 bowls.
R_TL, R_TR, R_BR, R_BL = 42, 150, 150, 64

# Inner left of counters — small. The RIGHT of each counter is a full bowl.
R_INNER_LEFT = 28


def rr(x, y, w, h, tl, tr, br, bl) -> Polygon:
    tl, tr, br, bl = [min(r, w / 2 - 0.4, h / 2 - 0.4) for r in (tl, tr, br, bl)]
    return unary_union(
        [
            box(x + tl, y, x + w - tr, y + h),
            box(x, y + tl, x + w, y + h - max(bl, br)),
            box(x, y + tl, x + max(tl, bl), y + h - bl),
            box(x + w - max(tr, br), y + tr, x + w, y + h - br),
            box(x + bl, y + h - max(bl, br), x + w - br, y + h),
            Point(x + tl, y + tl).buffer(tl, quad_segs=QUAD),
            Point(x + w - tr, y + tr).buffer(tr, quad_segs=QUAD),
            Point(x + w - br, y + h - br).buffer(br, quad_segs=QUAD),
            Point(x + bl, y + h - bl).buffer(bl, quad_segs=QUAD),
        ]
    )


def hole_box():
    x = LEFT + SPINE
    w = W - SPINE - S_RIGHT
    y0 = TOP + S_TOP
    y1 = TOP + H - S_BOT
    stack = y1 - y0 - S_WAIST
    h_top = stack * 0.46
    h_bot = stack * 0.54
    return x, w, y0, h_top, y0 + h_top + S_WAIST, h_bot


def d_hole(x, y, w, h) -> Polygon:
    """Flat against the F stem, full bowl on the right — this IS the F crotch."""
    r = min(h * 0.5 - 0.2, w * 0.5)
    rect = rr(x, y, max(w - r + 2, 8), h, R_INNER_LEFT, 1, 1, R_INNER_LEFT)
    cap = Point(x + w - r, y + h / 2).buffer(r, quad_segs=QUAD)
    cap = cap.intersection(box(x + w - r - 2, y, x + w + 4, y + h))
    return unary_union([rect, cap])


def eight_closed() -> Polygon:
    x, w, y_top, h_top, y_bot, h_bot = hole_box()
    outer = rr(LEFT, TOP, W, H, R_TL, R_TR, R_BR, R_BL)
    return outer.difference(d_hole(x, y_top, w, h_top)).difference(d_hole(x, y_bot, w, h_bot)).buffer(0)


def slash_points():
    """TR meat of the top bar → bottom of lower bowl, right of the stem."""
    tr = (LEFT + W - S_RIGHT * 0.55, TOP + S_TOP * 0.50)
    bot = (LEFT + SPINE + G * 1.05, TOP + H - S_BOT * 0.48)
    return tr, bot


def slash_slot() -> Polygon:
    (x0, y0), (x2, y2) = slash_points()
    dx, dy = x2 - x0, y2 - y0
    length = 2.5 * math.hypot(dx, dy)
    angle = math.degrees(math.atan2(dy, dx))
    bar = box(-length / 2, -G / 2, length / 2, G / 2)
    bar = rotate(bar, angle, origin=(0, 0), use_radians=False)
    slot = translate(bar, (x0 + x2) / 2, (y0 + y2) / 2)
    return slot.difference(box(-40, -40, LEFT + SPINE, CANVAS + 40))


def f_halfplane() -> Polygon:
    (x0, y0), (x2, y2) = slash_points()
    dx, dy = x2 - x0, y2 - y0
    nx, ny = -dy, dx
    mag = math.hypot(nx, ny) or 1
    nx, ny = nx / mag, ny / mag
    sx, sy = LEFT + SPINE / 2, CY
    mx, my = (x0 + x2) / 2, (y0 + y2) / 2
    if (sx - mx) * nx + (sy - my) * ny < 0:
        nx, ny = -nx, -ny
    L = 5000
    p1 = (x0 - dx * 5, y0 - dy * 5)
    p2 = (x2 + dx * 5, y2 + dy * 5)
    return Polygon(
        [
            p1,
            p2,
            (p2[0] + nx * L, p2[1] + ny * L),
            (p1[0] + nx * L, p1[1] + ny * L),
        ]
    )


def clean(geom, min_area=200):
    ps = [p for p in iter_polys(geom) if p.area >= min_area]
    if not ps:
        return geom
    return unary_union(ps) if len(ps) > 1 else ps[0]


def stage_f() -> Polygon:
    """Drawn F: bowl crotches (the 8 already biting), designed slash terminals, no foot-cut."""
    x, w, y_top, h_top, y_bot, h_bot = hole_box()
    (x0, y0), (x2, y2) = slash_points()
    stem = rr(LEFT, TOP, SPINE, H, R_TL, 8, 8, R_BL)
    # Top arm ends at the slash — no orphan chip.
    top_w = max(x0 - LEFT - G * 0.45, SPINE * 2.4)
    top = rr(LEFT, TOP, top_w, S_TOP, R_TL, 36, 18, 10)
    mid_w = max((x0 + x2) / 2 - LEFT - G * 0.2, SPINE * 2.0)
    mid = rr(LEFT, y_top + h_top, mid_w, S_WAIST, 24, 30, 30, 24)
    f = unary_union([stem, top, mid])
    # The 8's bowls bite the F now — circles bigger than the gap, so they
    # eat the arms. This is a cup, not a 90° fillet.
    gap_u = h_top
    gap_l = h_bot
    cu = Point(LEFT + SPINE + gap_u * 0.22, y_top + h_top / 2).buffer(gap_u * 0.58, quad_segs=QUAD)
    cl = Point(LEFT + SPINE + gap_l * 0.22, y_bot + h_bot / 2).buffer(gap_l * 0.58, quad_segs=QUAD)
    f = f.difference(cu).difference(cl)
    arms = box(LEFT + SPINE * 0.85, TOP - 8, CANVAS + 20, y_bot - 4)
    f = f.difference(slash_slot().intersection(arms))
    return clean(f.buffer(0))


def stage_eight() -> Polygon:
    return eight_closed()


def stage_slash() -> Polygon:
    return eight_closed().difference(slash_slot()).buffer(0)


def iter_polys(geom):
    if geom is None or geom.is_empty:
        return
    if hasattr(geom, "geoms"):
        for g in geom.geoms:
            yield from iter_polys(g)
        return
    yield geom


def ring_d(coords) -> str:
    pts = list(coords)
    if pts and pts[0] == pts[-1]:
        pts = pts[:-1]
    return "M " + " L ".join(f"{x:.2f} {y:.2f}" for x, y in pts) + " Z"


def geom_d(geom) -> str:
    out = []
    for p in iter_polys(geom):
        out.append(ring_d(p.exterior.coords))
        for h in p.interiors:
            out.append(ring_d(h.coords))
    return " ".join(out)


def write_svg(path, geom, fill, bg):
    path.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {CANVAS} {CANVAS}">\n'
        f'  <rect width="100%" height="100%" fill="{bg}"/>\n'
        f'  <path fill="{fill}" fill-rule="nonzero" d="{geom_d(geom)}"/>\n'
        "</svg>\n"
    )


def mask_paste(canvas, geom, fg, origin, scale):
    ox, oy = origin
    mask = Image.new("L", canvas.size, 0)
    md = ImageDraw.Draw(mask)
    for poly in iter_polys(geom):
        md.polygon([((x - ox) * scale, (y - oy) * scale) for x, y in poly.exterior.coords], fill=255)
        for interior in poly.interiors:
            md.polygon([((x - ox) * scale, (y - oy) * scale) for x, y in interior.coords], fill=0)
    canvas.paste(Image.new("RGB", canvas.size, fg), mask=mask)


def render_png(path, geom, fg, bg, size=2000):
    img = Image.new("RGB", (size, size), bg)
    mask_paste(img, geom, fg, (0, 0), size / CANVAS)
    img.save(path, "PNG")


def font(size, bold=False):
    p = (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
        if bold
        else "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
    )
    try:
        return ImageFont.truetype(p, size)
    except OSError:
        return ImageFont.load_default()


def render_sequence(f, eight, slashed, path):
    Wimg, Himg = 2400, 1100
    img = Image.new("RGB", (Wimg, Himg), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    fnt, sub = font(28, True), font(18)
    panels = [
        (f, "1. F", "пахви вже чаші 8"),
        (eight, "2. 8", "чаші замикаються"),
        (slashed, "3. Діагональ", "кінці полиць, ніжка ціла"),
    ]
    gap, pad = 40, 80
    pw = (Wimg - pad * 2 - gap * 2) / 3
    ph = 820
    for i, (geom, title, caption) in enumerate(panels):
        px = pad + i * (pw + gap)
        py = 80
        tile = Image.new("RGB", (int(pw), int(ph)), (0, 0, 0))
        scale = min(pw, ph) / 920
        ox = CX - (pw / scale) / 2
        oy = CY - (ph / scale) / 2
        mask_paste(tile, geom, (255, 255, 255), (ox, oy), scale)
        img.paste(tile, (int(px), py))
        tb = draw.textbbox((0, 0), title, font=fnt)
        draw.text((px + (pw - (tb[2] - tb[0])) / 2, py + ph + 16), title, font=fnt, fill=(255, 255, 255))
        cb = draw.textbbox((0, 0), caption, font=sub)
        draw.text((px + (pw - (cb[2] - cb[0])) / 2, py + ph + 54), caption, font=sub, fill=(150, 150, 150))
    img.save(path, "PNG")


def main():
    (x0, y0), (x2, y2) = slash_points()
    angle = math.degrees(math.atan2(abs(y2 - y0), abs(x2 - x0)))
    print(f"slash ({x0:.0f},{y0:.0f})→({x2:.0f},{y2:.0f})  {angle:.1f}°")
    print(f"stem {LEFT:.0f}–{LEFT+SPINE:.0f}  bot_clear {x2 - (LEFT+SPINE):.0f}")

    f, eight, mark = stage_f(), stage_eight(), stage_slash()
    print("F pieces", len(list(iter_polys(f))), "mark pieces", len(list(iter_polys(mark))))

    write_svg(OUT / "form8-mark-on-black.svg", mark, "#fff", "#000")
    write_svg(OUT / "form8-mark-on-white.svg", mark, "#111", "#fff")
    write_svg(OUT / "form8-stage-f.svg", f, "#fff", "#000")
    write_svg(OUT / "form8-stage-eight.svg", eight, "#fff", "#000")
    write_svg(OUT / "form8-mark.svg", mark, "currentColor", "#000")

    render_png(OUT / "form8-stage-f.png", f, (255, 255, 255), (0, 0, 0), 1800)
    render_png(OUT / "form8-stage-eight.png", eight, (255, 255, 255), (0, 0, 0), 1800)
    render_png(OUT / "form8-mark-on-black.png", mark, (255, 255, 255), (0, 0, 0), 2200)
    render_png(OUT / "form8-mark-on-white.png", mark, (17, 17, 17), (255, 255, 255), 2200)
    render_sequence(f, eight, mark, OUT / "form8-sequence.png")

    (OUT / "SYSTEM.json").write_text(
        json.dumps({"W": W, "H": H, "S": S, "G": G, "angle": round(angle, 2)}, indent=2) + "\n"
    )


if __name__ == "__main__":
    main()
