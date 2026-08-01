"""Scene-grade a locker plate so it reads as a room, not a flat JPEG.

Source renders are ~1536×1024. Upscaling to fake 4K + unsharp is what makes
them feel soft/JPEG. This pass:

  1. crops to 16:9 and lands at exact 2× (3072×1728) — real detail, no mush
  2. atmospheric perspective (far wall slightly less contrast)
  3. asymmetric key light (~15% darker on one side)
  4. soft edge DoF (~2–3% softness on peripheral lockers only)
  5. floor life: falloff, micro-grain, soft specular pool toward camera
  6. subtle ceiling volumetric wash from the cove / spots
  7. hangs a few kit silhouettes (sparse — lived-in, not cluttered)
  8. exports high-quality WebP + PNG

Run: python3 scripts/scene-grade-locker-plate.py
"""

from __future__ import annotations

import os

import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageEnhance, ImageFilter

ASSETS = os.path.expanduser(
    "~/.cursor/projects/Users-piselli-Desktop-ffl-moves/assets"
)
CAST_DIR = "public/design-lab/locker-hero/cast"
OUT_DIR = "public/design-lab/locker-hero/variants"

SRC_NAME = "locker-plate-v21-slate-navy.png"
OUT_STEM = "locker-plate-v22-slate-scene"

# Exact 2× of a 16:9 crop from 1536×1024 → no invented 4K mush.
TARGET_W, TARGET_H = 3072, 1728

# Sparse life — a few stalls only (percent of frame, jersey center).
KIT_PLACEMENTS = [
    # file, cx%, cy%, width%, brightness, name for log
    ("palmer.png", 12.5, 38.0, 4.8, 0.78, "Palmer"),
    ("gabriel.png", 24.8, 36.5, 4.2, 0.72, "Gabriel"),
    ("haaland.png", 42.5, 35.5, 3.9, 0.70, "Haaland"),
    ("son.png", 55.5, 36.0, 3.8, 0.68, "Son"),
    ("pickford.png", 86.5, 38.5, 5.0, 0.74, "Pickford"),
]


def crop_16x9(img: Image.Image) -> Image.Image:
    w, h = img.size
    target = 16 / 9
    if w / h > target:
        new_w = int(round(h * target))
        x0 = (w - new_w) // 2
        return img.crop((x0, 0, x0 + new_w, h))
    new_h = int(round(w / target))
    # Bias slightly upward so floor + seats stay in frame.
    y0 = max(0, int((h - new_h) * 0.42))
    return img.crop((0, y0, w, y0 + new_h))


def upscale_2x(img: Image.Image) -> Image.Image:
    """Land at TARGET with one clean Lanczos step — no multi-hop unsharp."""
    out = img.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    # Tiny clarity only — oversharpening screams upscale.
    return out.filter(ImageFilter.UnsharpMask(radius=0.9, percent=35, threshold=3))


def depth_weight(h: int, w: int) -> np.ndarray:
    """Approximate depth: vanishing point near mid-height of lockers."""
    ys = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    xs = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    # Distance from vanishing region (center lockers).
    dx = (xs - 0.50) / 0.62
    dy = (ys - 0.42) / 0.55
    dist = np.sqrt(dx * dx + dy * dy)
    # Near floor / side benches = closer (lower weight), far wall = higher.
    far = np.clip(dist, 0, 1.4) / 1.4
    # Also treat upper lockers near center as farther than foreground floor.
    far = np.clip(far * 0.55 + (1.0 - ys) * 0.25 + np.abs(xs - 0.5) * 0.35, 0, 1)
    return far.astype(np.float32)


def atmospheric_perspective(arr: np.ndarray) -> np.ndarray:
    """Drop contrast ~4% on the far wall — air between camera and lockers."""
    h, w = arr.shape[:2]
    far = depth_weight(h, w)[..., None]
    # Lift blacks slightly + pull highlights toward mid on far regions.
    haze = np.array([168.0, 170.0, 174.0], dtype=np.float32)
    amount = far * 0.055
    out = arr * (1.0 - amount) + haze * amount
    # Mild contrast crush with distance.
    mid = 140.0
    out = out + (mid - out) * far * 0.045
    return np.clip(out, 0, 255)


def asymmetric_light(arr: np.ndarray) -> np.ndarray:
    """Right side ~14% darker — breaks studio-even HDRI look."""
    h, w = arr.shape[:2]
    xs = np.linspace(0, 1, w, dtype=np.float32)
    # Soft ramp: left keyed, right falls off.
    ramp = 1.0 - 0.14 * np.clip((xs - 0.28) / 0.72, 0, 1)
    # Slight warm key on lit side, cool on falloff.
    warm = np.array([1.02, 1.005, 0.985], dtype=np.float32)
    cool = np.array([0.97, 0.985, 1.02], dtype=np.float32)
    t = np.clip((xs - 0.2) / 0.75, 0, 1)[None, :, None]
    tint = warm * (1 - t) + cool * t
    out = arr * ramp[None, :, None] * tint
    return np.clip(out, 0, 255)


def ceiling_volumetric(arr: np.ndarray) -> np.ndarray:
    """Soft shafts / haze under the cove — light that occupies space."""
    h, w = arr.shape[:2]
    ys = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    xs = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    # Horizontal cove band near top.
    cove = np.exp(-((ys - 0.10) ** 2) / (2 * 0.045**2))
    cove = cove * (0.55 + 0.45 * np.cos((xs - 0.5) * np.pi * 0.9) ** 2)
    # A few soft spot columns.
    spots = np.zeros((h, w), dtype=np.float32)
    for cx in (0.18, 0.34, 0.50, 0.66, 0.82):
        col = np.exp(-((xs - cx) ** 2) / (2 * 0.035**2))
        fall = np.clip(1.0 - (ys - 0.08) / 0.55, 0, 1) ** 1.4
        spots += col * fall
    spots = np.clip(spots / spots.max(), 0, 1) if spots.max() > 0 else spots
    wash = (cove * 0.55 + spots * 0.45)[..., None]
    light = np.array([255.0, 248.0, 236.0], dtype=np.float32)
    out = arr + wash * light * 0.045
    return np.clip(out, 0, 255)


def edge_dof(arr: np.ndarray) -> np.ndarray:
    """2–3% softness on peripheral lockers only — center stays tack-sharp."""
    h, w = arr.shape[:2]
    sharp = arr.astype(np.uint8)
    soft = cv2.GaussianBlur(sharp, (0, 0), sigmaX=1.35, sigmaY=1.35)
    ys = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    xs = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    # Ellipse clear in the product zone (tablet center).
    rx = ((xs - 0.50) / 0.42) ** 2
    ry = ((ys - 0.48) / 0.40) ** 2
    edge = np.clip(np.sqrt(rx + ry) - 0.55, 0, 1)
    edge = (edge / 0.55) ** 1.35
    # Floor near camera also slightly soft (foreground).
    floor = np.clip((ys - 0.72) / 0.28, 0, 1) ** 1.2
    mask = np.clip(np.maximum(edge * 0.85, floor * 0.55), 0, 1)[..., None]
    # Cap blend so we never lose locker readability.
    mask *= 0.55
    out = sharp.astype(np.float32) * (1 - mask) + soft.astype(np.float32) * mask
    return np.clip(out, 0, 255)


def floor_life(arr: np.ndarray) -> np.ndarray:
    """Sell perspective on the grey floor: falloff, grain, soft reflection pool."""
    h, w = arr.shape[:2]
    ys = np.linspace(0, 1, h, dtype=np.float32)[:, None]
    xs = np.linspace(0, 1, w, dtype=np.float32)[None, :]
    floor = np.clip((ys - 0.58) / 0.42, 0, 1)[..., None]

    # Darken toward camera (near field).
    near = np.clip((ys - 0.70) / 0.30, 0, 1)[..., None]
    out = arr * (1.0 - near * floor * 0.18)

    # Soft specular ellipse toward vanishing point — wet epoxy read.
    specular = np.exp(
        -(((xs - 0.50) / 0.22) ** 2 + ((ys - 0.78) / 0.10) ** 2) / 2.0
    )[..., None]
    out = out + specular * floor * np.array([210.0, 214.0, 220.0]) * 0.07

    # Micro surface noise on floor only.
    rng = np.random.default_rng(42)
    grain = rng.normal(0, 2.4, (h, w, 1)).astype(np.float32)
    out = out + grain * floor * 0.85

    return np.clip(out, 0, 255)


def film_grain(arr: np.ndarray, strength: float = 2.0) -> np.ndarray:
    rng = np.random.default_rng(7)
    noise = rng.normal(0, strength, arr.shape).astype(np.float32)
    return np.clip(arr + noise, 0, 255)


def jersey_crop(cast: Image.Image) -> Image.Image:
    """Upper-body jersey crop with soft alpha — hangs like kit, not a cutout player."""
    w, h = cast.size
    # Torso band.
    crop = cast.crop((int(w * 0.18), int(h * 0.12), int(w * 0.82), int(h * 0.48)))
    cw, ch = crop.size
    # Soft vignette alpha so edges dissolve into locker shadow.
    alpha = crop.split()[-1]
    mask = Image.new("L", (cw, ch), 0)
    draw = ImageDraw.Draw(mask)
    draw.rounded_rectangle(
        (int(cw * 0.06), int(ch * 0.02), int(cw * 0.94), int(ch * 0.98)),
        radius=int(cw * 0.12),
        fill=255,
    )
    mask = mask.filter(ImageFilter.GaussianBlur(max(2, cw // 28)))
    # Combine with original alpha.
    a = np.minimum(np.array(alpha, dtype=np.float32), np.array(mask, dtype=np.float32))
    crop = crop.convert("RGBA")
    crop.putalpha(Image.fromarray(a.astype(np.uint8)))
    return crop


def hang_kits(base: Image.Image) -> Image.Image:
    """Sparse hanging kits — hint the room is used, not a furniture showroom."""
    out = base.convert("RGBA")
    W, H = out.size
    for filename, cx_pct, cy_pct, width_pct, bright, label in KIT_PLACEMENTS:
        path = os.path.join(CAST_DIR, filename)
        if not os.path.exists(path):
            print(f"  skip kit {label}: missing {path}")
            continue
        cast = Image.open(path).convert("RGBA")
        jersey = jersey_crop(cast)
        target_w = max(24, int(W * width_pct / 100))
        aspect = jersey.height / max(1, jersey.width)
        target_h = int(target_w * aspect)
        jersey = jersey.resize((target_w, target_h), Image.LANCZOS)

        # Match room exposure — kits sit in locker shadow.
        rgb = ImageEnhance.Brightness(jersey.convert("RGB")).enhance(bright)
        rgb = ImageEnhance.Contrast(rgb).enhance(0.92)
        rgb = ImageEnhance.Color(rgb).enhance(0.88)
        jersey = Image.merge(
            "RGBA",
            (*rgb.split(), jersey.split()[-1].point(lambda p: int(p * 0.92))),
        )

        # Soft contact shadow inside the bay.
        shadow = Image.new("RGBA", (target_w + 16, target_h + 20), (0, 0, 0, 0))
        sdraw = ImageDraw.Draw(shadow)
        sdraw.ellipse(
            (4, target_h // 3, target_w + 8, target_h + 12),
            fill=(0, 0, 0, 55),
        )
        shadow = shadow.filter(ImageFilter.GaussianBlur(7))

        cx = int(W * cx_pct / 100)
        cy = int(H * cy_pct / 100)
        x0 = cx - target_w // 2
        y0 = cy - target_h // 2
        out.alpha_composite(shadow, (x0 - 6, y0 - 4))
        out.alpha_composite(jersey, (x0, y0))
        print(f"  hung {label} @ {cx_pct:.0f}%,{cy_pct:.0f}%")
    return out.convert("RGB")


def main() -> None:
    src = os.path.join(ASSETS, SRC_NAME)
    print(f"source {src}")
    img = Image.open(src).convert("RGB")
    print(f"  raw {img.size}")
    img = crop_16x9(img)
    print(f"  crop16x9 {img.size}")
    img = upscale_2x(img)
    print(f"  upscale {img.size}")

    arr = np.array(img).astype(np.float32)
    arr = atmospheric_perspective(arr)
    arr = asymmetric_light(arr)
    arr = ceiling_volumetric(arr)
    arr = floor_life(arr)
    arr = edge_dof(arr)
    arr = film_grain(arr, strength=1.6)
    img = Image.fromarray(arr.astype(np.uint8))

    # Slight overall photographic grade.
    img = ImageEnhance.Contrast(img).enhance(0.97)
    img = ImageEnhance.Color(img).enhance(0.94)

    # Photographic grade only — hanging kits need a baked render (cutouts look fake).
    # Keep KIT_PLACEMENTS in this file for a future plate that ships real jerseys.

    os.makedirs(OUT_DIR, exist_ok=True)
    png_path = os.path.join(OUT_DIR, f"{OUT_STEM}.png")
    webp_path = os.path.join(OUT_DIR, f"{OUT_STEM}.webp")
    img.save(png_path, optimize=True)
    img.save(webp_path, "WEBP", quality=97, method=6)
    print(
        f"wrote {png_path} ({os.path.getsize(png_path)/1e6:.1f} MB) "
        f"and {webp_path} ({os.path.getsize(webp_path)/1e6:.1f} MB)"
    )


if __name__ == "__main__":
    main()
