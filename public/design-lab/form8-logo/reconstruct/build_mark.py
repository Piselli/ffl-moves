#!/usr/bin/env python3
"""form8 mark — professional reconstruction of the existing concept.

Upright geometric 8 + hidden F on the left + one diagonal slash.
Not a new logo. Rebuilt from a locked module instead of stacked Canva primitives.
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
from shapely.geometry import MultiPolygon, Polygon, box

OUT = Path(__file__).resolve().parent

# ---------------------------------------------------------------------------
# Locked construction (v3)
#
# One outer rounded-rect + two related loop counters + one constant-width
# slash. Angle is the box diagonal. Inner radii scale with each counter so
# both loops stay the same species (rounded-rect, not circle vs square).
# ---------------------------------------------------------------------------
CANVAS = 1000
M = 40

# 11 × 17 modules. Angle = arctan(17/11), not an arbitrary 56°.
W = 11 * M  # 440
H = 17 * M  # 680
ANGLE = math.degrees(math.atan(H / W))  # 57.0948…

# Wall / slash. ~2.5:1 so the cut is a stripe, not a hairline.
S = 86
G = 40

# Outer corners. Not concentric with the wall (that would be Ro = Ri + S).
R_OUTER = 112
R_INNER = 96  # cap; actual inner radius is 0.47 × counter height

# Optical walls: horizontals slightly thinner (they read heavier).
S_VERT = 86
S_CAP = 84
S_WAIST = 82

# Upper counter: same width, same left edge, slightly shorter.
UPPER_H_RATIO = 0.475

# Slash is the diagonal of an inset box, then shifted toward bottom-right
# so the F stem is not amputated and the left crossbar stays longer.
INSET = 58
SLASH_SHIFT = 12

QUAD_SEGS = 56

CX = CANVAS / 2
CY = CANVAS / 2
LEFT = CX - W / 2
TOP = CY - H / 2


def rounded_rect(x: float, y: float, w: float, h: float, r: float) -> Polygon:
    r = min(r, w / 2.0 - 0.05, h / 2.0 - 0.05)
    return box(x + r, y + r, x + w - r, y + h - r).buffer(
        r, quad_segs=QUAD_SEGS, cap_style=1, join_style=1
    )


def hole_metrics():
    hole_x = LEFT + S_VERT
    hole_w = W - 2 * S_VERT
    y0 = TOP + S_CAP
    y1 = TOP + H - S_CAP
    stack = y1 - y0 - S_WAIST
    h_top = stack * UPPER_H_RATIO
    h_bot = stack * (1.0 - UPPER_H_RATIO)
    y_top = y0
    y_bot = y0 + h_top + S_WAIST
    return hole_x, hole_w, y_top, h_top, y_bot, h_bot


def inner_radius(hole_w: float, hole_h: float) -> float:
    """Same species for both loops: rounded-rect with a short inner straight.

    0.40 × height keeps a visible F stem (inner left is not a full semicircle)
    while still reading as an 8-loop, not a digital window.
    """
    return min(R_INNER, hole_w / 2 - 0.5, hole_h * 0.47)


def counters():
    hole_x, hole_w, y_top, h_top, y_bot, h_bot = hole_metrics()
    top_w = hole_w * 0.96  # optical: shorter counter looks wider if widths match
    top = rounded_rect(hole_x, y_top, top_w, h_top, inner_radius(top_w, h_top))
    bot = rounded_rect(hole_x, y_bot, hole_w, h_bot, inner_radius(hole_w, h_bot))
    return top, bot


def slash_slot() -> Polygon:
    """Backslash through the inset box, TR → BL, constant width G."""
    x0 = LEFT + INSET
    y0 = TOP + INSET
    bw = W - 2 * INSET
    bh = H - 2 * INSET
    length = 2.4 * math.hypot(bw, bh)
    bar = box(-length / 2, -G / 2, length / 2, G / 2)
    # y-down: TR→BL is atan2(+bh, -bw)
    angle_screen = math.degrees(math.atan2(bh, -bw))
    bar = rotate(bar, angle_screen, origin=(0, 0), use_radians=False)
    vx, vy = -bw, bh
    mag = math.hypot(vx, vy)
    px, py = vy / mag, -vx / mag
    if px < 0:
        px, py = -px, -py
    bar = translate(bar, CX + px * SLASH_SHIFT, CY + py * SLASH_SHIFT)
    return bar


def boolean_mark(s_vert, s_cap, s_waist, g, r_out, r_in, inset, shift, upper_ratio):
    global S_VERT, S_CAP, S_WAIST, G, R_OUTER, R_INNER, INSET, SLASH_SHIFT, UPPER_H_RATIO
    S_VERT, S_CAP, S_WAIST = s_vert, s_cap, s_waist
    G, R_OUTER, R_INNER = g, r_out, r_in
    INSET, SLASH_SHIFT, UPPER_H_RATIO = inset, shift, upper_ratio
    outer = rounded_rect(LEFT, TOP, W, H, R_OUTER)
    hole_top, hole_bot = counters()
    body = outer.difference(hole_top).difference(hole_bot)
    mark = body.difference(slash_slot()).buffer(0)
    if mark.is_empty:
        raise RuntimeError("boolean collapsed")
    return mark, outer, hole_top, hole_bot, slash_slot()


def build_display():
    return boolean_mark(
        s_vert=86,
        s_cap=84,
        s_waist=82,
        g=40,
        r_out=112,
        r_in=96,
        inset=56,
        shift=12,
        upper_ratio=0.475,
    )


def build_small():
    """16–32px master: slash almost as thick as the wall, more open loops."""
    return boolean_mark(
        s_vert=72,
        s_cap=70,
        s_waist=68,
        g=80,
        r_out=108,
        r_in=88,
        inset=48,
        shift=8,
        upper_ratio=0.48,
    )


def iter_polys(geom):
    if geom is None or geom.is_empty:
        return
    if isinstance(geom, Polygon):
        yield geom
        return
    if isinstance(geom, MultiPolygon) or hasattr(geom, "geoms"):
        for g in geom.geoms:
            yield from iter_polys(g)


def ring_to_d(coords) -> str:
    pts = list(coords)
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts = pts[:-1]
    return "M " + " L ".join(f"{x:.2f} {y:.2f}" for x, y in pts) + " Z"


def geom_to_d(geom) -> str:
    return " ".join(
        ring_to_d(p.exterior.coords) + "".join(" " + ring_to_d(h.coords) for h in p.interiors)
        for p in iter_polys(geom)
    )


def tight_viewbox(geom, pad=28):
    minx, miny, maxx, maxy = geom.bounds
    return minx - pad, miny - pad, (maxx - minx) + 2 * pad, (maxy - miny) + 2 * pad


def write_svg(path: Path, geom, fill: str, bg: str | None, vb):
    x, y, w, h = vb
    bg_rect = f'<rect width="100%" height="100%" fill="{bg}"/>' if bg else ""
    path.write_text(
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{x:.2f} {y:.2f} {w:.2f} {h:.2f}">\n'
        f"  {bg_rect}\n"
        f'  <path fill="{fill}" fill-rule="nonzero" d="{geom_to_d(geom)}"/>\n'
        "</svg>\n"
    )


def mask_paste(canvas: Image.Image, geom, fg, origin, scale):
    ox, oy = origin
    mask = Image.new("L", canvas.size, 0)
    md = ImageDraw.Draw(mask)
    for poly in iter_polys(geom):
        ext = [((x - ox) * scale, (y - oy) * scale) for x, y in poly.exterior.coords]
        md.polygon(ext, fill=255)
        for interior in poly.interiors:
            md.polygon(
                [((x - ox) * scale, (y - oy) * scale) for x, y in interior.coords],
                fill=0,
            )
    canvas.paste(Image.new("RGB", canvas.size, fg), mask=mask)


def render_png(path: Path, geom, fg, bg, size=2000, view=None):
    img = Image.new("RGB", (size, size), bg)
    if view is None:
        mask_paste(img, geom, fg, (0, 0), size / CANVAS)
    else:
        x, y, w, h = view
        side = max(w, h)
        mask_paste(img, geom, fg, (x, y), size / side)
    img.save(path, "PNG")
    return img


def font(size: int, bold=False):
    p = (
        "/System/Library/Fonts/Supplemental/Arial Bold.ttf"
        if bold
        else "/System/Library/Fonts/Supplemental/Arial Unicode.ttf"
    )
    try:
        return ImageFont.truetype(p, size)
    except OSError:
        return ImageFont.load_default()


def xy(x, y, origin, scale, offset):
    return (x - origin[0]) * scale + offset[0], (y - origin[1]) * scale + offset[1]


def wire(draw, geom, origin, scale, offset, color, width=2):
    for poly in iter_polys(geom):
        ext = [xy(x, y, origin, scale, offset) for x, y in poly.exterior.coords]
        draw.line(ext + [ext[0]], fill=color, width=width)
        for interior in poly.interiors:
            hole = [xy(x, y, origin, scale, offset) for x, y in interior.coords]
            draw.line(hole + [hole[0]], fill=color, width=width)


def render_board(mark, outer, hole_top, hole_bot, slot, path: Path):
    Wimg, Himg = 2400, 3000
    img = Image.new("RGB", (Wimg, Himg), (0, 0, 0))
    draw = ImageDraw.Draw(img)

    hero_h = 1680
    hero = Image.new("RGB", (Wimg, hero_h), (0, 0, 0))
    scale = 1.72
    ox = CX - Wimg / scale / 2
    oy = CY - hero_h / scale / 2 + 12
    mask_paste(hero, mark, (255, 255, 255), (ox, oy), scale)
    img.paste(hero, (0, 0))

    draw.line([(140, 1740), (2260, 1740)], fill=(255, 255, 255), width=2)

    panels = [
        ("МОДУЛЬ", "40 · бокс 11×17"),
        ("РАДІУСИ", "Ro 112  Ri ≈ 0.47h"),
        ("ДІАГОНАЛЬ", f"arctan(17/11)  {ANGLE:.1f}°"),
        ("ТАЛІЯ", "один брус · один зріз"),
        ("ОПТИКА", "верх 47.5/52.5  зсув 12"),
    ]
    gap = 28
    pw = (2400 - 140 * 2 - gap * 4) / 5
    ph = 1040
    py0 = 1800
    f_title = font(22, True)
    f_sub = font(15)
    mark_disp, outer_d, ht, hb, sl = build_display()

    for i, (title, sub) in enumerate(panels):
        px = 140 + i * (pw + gap)
        draw.rectangle([px, py0, px + pw, py0 + ph], outline=(64, 64, 64), width=1)
        dx, dy = px + 20, py0 + 28
        dw, dh = pw - 40, 680
        s = min(dw, dh) / 720
        origin = (CX - dw / s / 2, CY - dh / s / 2)
        off = (dx, dy)

        if i == 0:
            for g in range(int(LEFT) - M, int(LEFT + W) + M + 1, M):
                draw.line(
                    [xy(g, TOP - 16, origin, s, off), xy(g, TOP + H + 16, origin, s, off)],
                    fill=(40, 40, 40),
                    width=1,
                )
            for g in range(int(TOP) - M, int(TOP + H) + M + 1, M):
                draw.line(
                    [xy(LEFT - 16, g, origin, s, off), xy(LEFT + W + 16, g, origin, s, off)],
                    fill=(40, 40, 40),
                    width=1,
                )
            draw.rectangle(
                [xy(LEFT, TOP, origin, s, off), xy(LEFT + W, TOP + H, origin, s, off)],
                outline=(120, 120, 120),
                width=1,
            )
            wire(draw, mark_disp, origin, s, off, (255, 255, 255), 2)
        elif i == 1:
            wire(draw, outer_d, origin, s, off, (70, 70, 70), 1)
            ocx, ocy = LEFT + W - R_OUTER, TOP + R_OUTER
            draw.ellipse(
                [
                    xy(ocx - R_OUTER, ocy - R_OUTER, origin, s, off),
                    xy(ocx + R_OUTER, ocy + R_OUTER, origin, s, off),
                ],
                outline=(150, 150, 150),
                width=1,
            )
            hole_x, hole_w, y_top, h_top, _, _ = hole_metrics()
            icx = hole_x + hole_w - R_INNER
            icy = y_top + R_INNER
            draw.ellipse(
                [
                    xy(icx - R_INNER, icy - R_INNER, origin, s, off),
                    xy(icx + R_INNER, icy + R_INNER, origin, s, off),
                ],
                outline=(150, 150, 150),
                width=1,
            )
            wire(draw, mark_disp, origin, s, off, (255, 255, 255), 2)
        elif i == 2:
            wire(draw, outer_d, origin, s, off, (60, 60, 60), 1)
            bw, bh = W - 2 * INSET, H - 2 * INSET
            mag = math.hypot(bw, bh)
            dxv, dyv = -bw / mag, bh / mag
            px, py = dyv, -dxv
            if px < 0:
                px, py = -px, -py
            sx, sy = CX + px * SLASH_SHIFT, CY + py * SLASH_SHIFT
            draw.line(
                [
                    xy(sx - dxv * 460, sy - dyv * 460, origin, s, off),
                    xy(sx + dxv * 460, sy + dyv * 460, origin, s, off),
                ],
                fill=(170, 170, 170),
                width=2,
            )
            wire(draw, mark_disp, origin, s, off, (255, 255, 255), 2)
        elif i == 3:
            _, _, y_top, h_top, y_bot, _ = hole_metrics()
            y1, y2 = y_top + h_top, y_bot
            draw.rectangle(
                [
                    xy(LEFT + S_VERT, y1, origin, s, off),
                    xy(LEFT + W - S_VERT, y2, origin, s, off),
                ],
                outline=(255, 255, 255),
                width=2,
            )
            wire(draw, mark_disp, origin, s, off, (255, 255, 255), 2)
        else:
            for yv, col in (
                (TOP, (55, 55, 55)),
                (TOP + H, (55, 55, 55)),
                (CY, (55, 55, 55)),
            ):
                draw.line(
                    [
                        xy(LEFT - 24, yv, origin, s, off),
                        xy(LEFT + W + 24, yv, origin, s, off),
                    ],
                    fill=col,
                    width=1,
                )
            _, _, y_top, h_top, y_bot, _ = hole_metrics()
            yw = (y_top + h_top + y_bot) / 2
            draw.line(
                [
                    xy(LEFT - 24, yw, origin, s, off),
                    xy(LEFT + W + 24, yw, origin, s, off),
                ],
                fill=(150, 150, 150),
                width=1,
            )
            wire(draw, mark_disp, origin, s, off, (255, 255, 255), 2)

        tb = draw.textbbox((0, 0), title, font=f_title)
        draw.text(
            (px + (pw - (tb[2] - tb[0])) / 2, py0 + ph - 124),
            title,
            font=f_title,
            fill=(255, 255, 255),
        )
        sb = draw.textbbox((0, 0), sub, font=f_sub)
        draw.text(
            (px + (pw - (sb[2] - sb[0])) / 2, py0 + ph - 84),
            sub,
            font=f_sub,
            fill=(150, 150, 150),
        )

    img.save(path, "PNG")


def render_scale_strip(display, small, path: Path):
    sizes = [(16, small), (32, small), (64, display), (128, display), (256, display)]
    pad, gap = 40, 36
    width = pad * 2 + sum(s for s, _ in sizes) + gap * (len(sizes) - 1)
    height = pad * 2 + 256 + 48
    img = Image.new("RGB", (width, height), (0, 0, 0))
    draw = ImageDraw.Draw(img)
    x = pad
    f = font(14)
    for s, geom in sizes:
        tile = Image.new("RGB", (s, s), (0, 0, 0))
        mask_paste(tile, geom, (255, 255, 255), (0, 0), s / CANVAS)
        img.paste(tile, (x, pad + (256 - s)))
        label = f"{s}px"
        lb = draw.textbbox((0, 0), label, font=f)
        draw.text(
            (x + (s - (lb[2] - lb[0])) / 2, pad + 256 + 12),
            label,
            font=f,
            fill=(160, 160, 160),
        )
        x += s + gap
    img.save(path, "PNG")


def main():
    mark, outer, ht, hb, slot = build_display()
    small, *_ = build_small()
    pieces = list(iter_polys(mark))
    print(f"display pieces={len(pieces)} angle={ANGLE:.4f}")
    for i, p in enumerate(pieces):
        print(f"  piece {i} area={p.area:.0f} bounds={tuple(round(v,1) for v in p.bounds)}")

    vb = tight_viewbox(mark)
    write_svg(OUT / "form8-mark.svg", mark, "currentColor", None, vb)
    write_svg(OUT / "form8-mark-on-black.svg", mark, "#fff", "#000", (0, 0, CANVAS, CANVAS))
    write_svg(OUT / "form8-mark-on-white.svg", mark, "#111", "#fff", (0, 0, CANVAS, CANVAS))
    write_svg(OUT / "form8-mark-small.svg", small, "currentColor", None, tight_viewbox(small))

    render_png(OUT / "form8-mark-on-black.png", mark, (255, 255, 255), (0, 0, 0), 2200)
    render_png(OUT / "form8-mark-on-white.png", mark, (17, 17, 17), (255, 255, 255), 2200)
    render_png(OUT / "form8-mark-small-on-black.png", small, (255, 255, 255), (0, 0, 0), 1200)
    for px in (16, 32, 64, 128):
        g = small if px <= 32 else mark
        render_png(OUT / f"form8-mark-{px}.png", g, (255, 255, 255), (0, 0, 0), px)

    render_board(mark, outer, ht, hb, slot, OUT / "form8-construct-board.png")
    render_scale_strip(mark, small, OUT / "form8-scale-strip.png")

    # App-icon crop: mark optically centered in a rounded-square field
    icon = Image.new("RGB", (1024, 1024), (0, 0, 0))
    mask_paste(icon, mark, (255, 255, 255), (0, 0), 1024 / CANVAS)
    icon.save(OUT / "form8-app-icon-on-black.png", "PNG")

    spec = {
        "version": 4,
        "concept": "upright geometric 8, hidden F on the left, one diagonal slash",
        "not": ["new logo", "infinity", "sideways 8", "extra symbols"],
        "module": M,
        "box": {"modules": "11×17", "ratio": "11:17", "w": W, "h": H},
        "angle_deg": round(ANGLE, 4),
        "angle_rule": "arctan(17/11) of the 11×17 module box",
        "stroke": 86,
        "slash": 40,
        "stroke_slash_ratio": "43:20",
        "radii": {
            "outer": 112,
            "inner_rule": "0.47 × counter height, capped; upper counter 96% width, left-aligned",
            "note": "not concentric; concentric would be Ri+S=Ro",
        },
        "optical": {
            "upper_counter_height_ratio": 0.475,
            "upper_counter_width_ratio": 0.96,
            "counters_left_aligned": True,
            "cap": 84,
            "waist": 82,
            "slash_inset": 56,
            "slash_shift": 12,
        },
        "pieces": len(pieces),
    }
    (OUT / "SYSTEM.json").write_text(json.dumps(spec, indent=2, ensure_ascii=False) + "\n")
    print("wrote", OUT)


if __name__ == "__main__":
    main()
