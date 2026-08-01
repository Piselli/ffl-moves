"""Builds the locker-hero background plate from the generated room render.

Three passes on top of the raw render:
  1. neutralize cool LED spill so the room stays black/white/wood
  2. clone a fifth kit into the empty left bay
  3. replace the render's scribbled tactics board with a real 4-3-3 diagram

Run: python3 scripts/build-locker-plate.py
"""

import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter, ImageFont

SRC = os.path.expanduser(
    "~/.cursor/projects/Users-piselli-Desktop-ffl-moves/assets/plate-alive-bw-v2.jpg"
)
OUT = "public/design-lab/locker-hero/plate-alive.jpg"

FONT_NAME = "/System/Library/Fonts/Supplemental/DIN Condensed Bold.ttf"
FONT_NUMBER = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

KIT_TEXT = (240, 232, 216)


def neutralize_cool_light(img):
    arr = np.array(img).astype(np.float32)
    r, g, b = arr[:, :, 0], arr[:, :, 1], arr[:, :, 2]
    luma = 0.299 * r + 0.587 * g + 0.114 * b
    cool = (b > r + 8) & (b > g + 4) & (b > 40)
    amount = np.clip((b - np.maximum(r, g)) / 40.0, 0, 1) * cool
    arr[:, :, 0] = r * (1 - amount) + np.clip(luma * 1.05, 0, 255) * amount
    arr[:, :, 1] = g * (1 - amount) + np.clip(luma * 0.98, 0, 255) * amount
    arr[:, :, 2] = b * (1 - amount) + np.clip(luma * 0.88, 0, 255) * amount
    arr[:, :, 0] = np.clip(arr[:, :, 0] * 1.02, 0, 255)
    arr[:, :, 2] = np.clip(arr[:, :, 2] * 0.96, 0, 255)
    return Image.fromarray(arr.astype(np.uint8))


# Source kit (KENT) and the empty bay next to it, in render pixel coords.
KIT_BOX = (360, 244, 426, 420)
KIT_SILHOUETTE = [
    (30, 4), (33, 4), (33, 14),
    (56, 30), (58, 34), (62, 62), (54, 68), (50, 48),
    (50, 168), (16, 168), (16, 48),
    (12, 68), (4, 62), (8, 34), (10, 30), (30, 14),
]
KIT_NAME_BOX = (14, 48, 52, 66)
KIT_NUMBER_BOX = (18, 66, 48, 116)


def clone_kit(img):
    """Copy the KENT kit into the empty bay, restyled as a different player."""
    x0, y0, x1, y1 = KIT_BOX
    kit = img.crop(KIT_BOX).convert("RGB")
    kw, kh = kit.size

    # Wipe the printed name and number with clean fabric from the hem.
    fabric = kit.crop((16, 124, 50, 160)).filter(ImageFilter.GaussianBlur(2.4))
    for box in (KIT_NAME_BOX, KIT_NUMBER_BOX):
        bw, bh = box[2] - box[0], box[3] - box[1]
        patch = fabric.resize((bw, bh), Image.LANCZOS)
        soft = Image.new("L", (bw, bh), 0)
        ImageDraw.Draw(soft).rectangle((2, 2, bw - 3, bh - 3), fill=255)
        kit.paste(patch, (box[0], box[1]), soft.filter(ImageFilter.GaussianBlur(2)))

    draw = ImageDraw.Draw(kit)
    name_font = ImageFont.truetype(FONT_NAME, 17)
    number_font = ImageFont.truetype(FONT_NUMBER, 46)
    draw.text((kw / 2, 50), "MOSS", font=name_font, fill=KIT_TEXT, anchor="ma")
    draw.text((kw / 2, 64), "6", font=number_font, fill=KIT_TEXT, anchor="ma")

    mask = Image.new("L", (kw, kh), 0)
    ImageDraw.Draw(mask).polygon(KIT_SILHOUETTE, fill=255)
    mask = mask.filter(ImageFilter.GaussianBlur(1.1))

    # The empty bay sits further from camera: slightly smaller and lower.
    scale_x, scale_y = 0.86, 0.92
    dest = (int(kw * scale_x), int(kh * scale_y))
    kit = kit.resize(dest, Image.LANCZOS)
    mask = mask.resize(dest, Image.LANCZOS)

    # And deeper in shadow than the kits facing the camera.
    kit = ImageEnhance.Brightness(kit).enhance(0.74)

    img.paste(kit, (434, 266), mask)
    return img


BOARD_QUAD = np.float32([[1327, 218], [1513, 174], [1513, 578], [1330, 541]])

# 4-3-3, attacking up the board. Normalized inside the pitch rectangle.
FORMATION = [
    (0.50, 0.895),
    (0.13, 0.75), (0.37, 0.78), (0.63, 0.78), (0.87, 0.75),
    (0.50, 0.62), (0.28, 0.45), (0.72, 0.45),
    (0.16, 0.24), (0.50, 0.13), (0.84, 0.24),
]

# The board hangs on a wall raking away from camera, so its projected quad is
# far narrower than the board really is. Draw the texture at true proportions.
BOARD_ASPECT = 0.70


def tactics_board(width, height, supersample=2):
    width, height = width * supersample, height * supersample
    board = Image.new("RGB", (width, height), (238, 236, 231))
    grain = np.random.default_rng(11).normal(0, 1.8, (height, width, 3))
    board = Image.fromarray(
        np.clip(np.array(board).astype(np.float32) + grain, 0, 255).astype(np.uint8)
    )
    draw = ImageDraw.Draw(board)

    pad_x = int(width * 0.10)
    pad_y = int(height * 0.06)
    left, top = pad_x, pad_y
    right, bottom = width - pad_x, height - pad_y
    pw, ph = right - left, bottom - top
    ink = (26, 26, 26)
    line = max(2, width // 220)

    draw.rectangle((left, top, right, bottom), outline=ink, width=line + 1)
    mid = top + ph // 2
    draw.line((left, mid, right, mid), fill=ink, width=line)
    radius = int(pw * 0.155)
    cx = left + pw // 2
    draw.ellipse((cx - radius, mid - radius, cx + radius, mid + radius), outline=ink, width=line)
    draw.ellipse((cx - line, mid - line, cx + line, mid + line), fill=ink)

    def rect(y0, y1, x0, x1):
        return (
            left + int(pw * x0), top + int(ph * y0),
            left + int(pw * x1), top + int(ph * y1),
        )

    for penalty, six in (((0.0, 0.155), (0.0, 0.062)), ((0.845, 1.0), (0.938, 1.0))):
        draw.rectangle(rect(penalty[0], penalty[1], 0.22, 0.78), outline=ink, width=line)
        draw.rectangle(rect(six[0], six[1], 0.38, 0.62), outline=ink, width=line)

    magnet = int(pw * 0.055)
    for nx, ny in FORMATION:
        x = left + int(pw * nx)
        y = top + int(ph * ny)
        draw.ellipse((x - magnet + 2, y - magnet + 3, x + magnet + 2, y + magnet + 3), fill=(196, 194, 188))
        draw.ellipse((x - magnet, y - magnet, x + magnet, y + magnet), fill=(20, 20, 20))
        draw.ellipse((x - magnet, y - magnet, x + magnet, y + magnet), outline=(64, 64, 64), width=max(1, line // 2))
        draw.ellipse((x - magnet // 2, y - magnet // 2 - 2, x - 1, y - 1), fill=(74, 74, 74))

    return board.resize((width // supersample, height // supersample), Image.LANCZOS)


def paste_board(img, scale=1.0):
    quad = BOARD_QUAD * scale
    tex_h = 1600
    tex_w = int(round(tex_h * BOARD_ASPECT))
    board = tactics_board(tex_w, tex_h)

    w, h = img.size
    src = np.float32([[0, 0], [tex_w - 1, 0], [tex_w - 1, tex_h - 1], [0, tex_h - 1]])
    matrix = cv2.getPerspectiveTransform(src, quad)
    base = cv2.cvtColor(np.array(img), cv2.COLOR_RGB2BGR)
    warped = cv2.warpPerspective(
        cv2.cvtColor(np.array(board), cv2.COLOR_RGB2BGR), matrix, (w, h), flags=cv2.INTER_LANCZOS4
    )

    mask = np.zeros((h, w), np.float32)
    cv2.fillConvexPoly(mask, quad.astype(np.int32), 1.0)
    mask = cv2.GaussianBlur(mask, (5, 5), 0)[..., None]

    # The wall falls away to the left of the board, so shade the near edge.
    span = np.ptp(quad[:, 0]) or 1
    ramp = np.clip((np.arange(w) - quad[:, 0].min()) / span, 0, 1)
    shade = (0.90 + 0.10 * ramp)[None, :, None]

    blend = base.astype(np.float32) * (1 - mask) + warped.astype(np.float32) * shade * mask
    return Image.fromarray(cv2.cvtColor(np.clip(blend, 0, 255).astype(np.uint8), cv2.COLOR_BGR2RGB))


def upscale(img, width=3840, height=2560):
    out = img
    while out.width * 2 <= width:
        out = out.resize((out.width * 2, out.height * 2), Image.LANCZOS)
    out = out.resize((width, height), Image.LANCZOS)
    out = out.filter(ImageFilter.UnsharpMask(radius=1.6, percent=85, threshold=2))
    out = ImageEnhance.Contrast(out).enhance(1.04)
    return ImageEnhance.Sharpness(out).enhance(1.08)


def main():
    plate = Image.open(SRC).convert("RGB")
    source_width = plate.width
    plate = neutralize_cool_light(plate)
    plate = clone_kit(plate)
    plate = upscale(plate)
    # Board goes on last, at full size: its hairlines alias badly if drawn
    # into the render before the upscale.
    plate = paste_board(plate, scale=plate.width / source_width)
    plate.save(OUT, quality=92, optimize=True, progressive=True)
    print(f"wrote {OUT} ({os.path.getsize(OUT) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
