#!/usr/bin/env python3
"""
Build hanging club kit textures for locker-hero.

Tint the photoreal white jersey template (preserve weave + folds) instead of
painting soft colour blobs. Hard body/sleeve region masks drive patterns.

Outputs 500×820 RGBA PNGs:
  public/design-lab/locker-hero/kit/clubs/t{teamId}-home.png
  public/design-lab/locker-hero/kit/clubs/t{teamId}-gk.png

Also writes region masks (once):
  jersey-body-mask.png, jersey-sleeve-mask.png

Name/number panel stays clean for runtime canvas bake.

Run: python3 scripts/build-club-kit-textures.py
"""

from __future__ import annotations

from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
KIT_DIR = ROOT / "public" / "design-lab" / "locker-hero" / "kit"
OUT_DIR = KIT_DIR / "clubs"
TEMPLATE = KIT_DIR / "jersey-template.png"
ALBEDO = KIT_DIR / "jersey-albedo.png"
BODY_MASK_PATH = KIT_DIR / "jersey-body-mask.png"
SLEEVE_MASK_PATH = KIT_DIR / "jersey-sleeve-mask.png"

W, H = 500, 820

KitDef = dict

HOME: dict[int, KitDef] = {
    1: {
        "primary": (239, 1, 7),
        "secondary": (255, 255, 255),
        "pattern": "sleeves",
        "trim": (255, 255, 255),
    },
    2: {
        "primary": (103, 14, 54),
        "secondary": (149, 191, 229),
        "pattern": "sleeves",
        "trim": (149, 191, 229),
    },
    3: {
        "primary": (218, 41, 28),
        "secondary": (18, 18, 18),
        "pattern": "vstripes",
        "stripe_w": 22,
        "trim": (18, 18, 18),
    },
    4: {
        "primary": (227, 6, 19),
        "secondary": (255, 255, 255),
        "pattern": "vstripes",
        "stripe_w": 28,
        "trim": (251, 184, 0),
    },
    5: {
        "primary": (0, 87, 184),
        "secondary": (255, 255, 255),
        "pattern": "vstripes",
        "stripe_w": 26,
        "trim": (255, 255, 255),
    },
    6: {
        "primary": (3, 70, 148),
        "secondary": (255, 255, 255),
        "pattern": "solid",
        "trim": (255, 255, 255),
    },
    7: {
        "primary": (119, 191, 234),
        "secondary": (29, 53, 87),
        "pattern": "solid",
        "trim": (29, 53, 87),
    },
    8: {
        "primary": (27, 69, 143),
        "secondary": (196, 18, 46),
        "pattern": "vstripes",
        "stripe_w": 24,
        "trim": (255, 255, 255),
    },
    9: {
        "primary": (0, 51, 153),
        "secondary": (255, 255, 255),
        "pattern": "solid",
        "trim": (255, 255, 255),
    },
    10: {
        "primary": (248, 248, 248),
        "secondary": (20, 20, 20),
        "pattern": "solid",
        "trim": (20, 20, 20),
    },
    11: {
        "primary": (245, 161, 45),
        "secondary": (20, 20, 20),
        "pattern": "solid",
        "trim": (20, 20, 20),
    },
    12: {
        "primary": (0, 51, 160),
        "secondary": (255, 255, 255),
        "pattern": "solid",
        "trim": (255, 255, 255),
    },
    13: {
        "primary": (250, 250, 250),
        "secondary": (29, 66, 138),
        "pattern": "solid",
        "trim": (255, 205, 0),
    },
    14: {
        "primary": (200, 16, 46),
        "secondary": (255, 255, 255),
        "pattern": "solid",
        "trim": (255, 255, 255),
    },
    15: {
        "primary": (108, 171, 221),
        "secondary": (28, 44, 91),
        "pattern": "solid",
        "trim": (28, 44, 91),
    },
    16: {
        "primary": (218, 41, 28),
        "secondary": (251, 225, 34),
        "pattern": "solid",
        "trim": (20, 20, 20),
    },
    17: {
        "primary": (36, 31, 32),
        "secondary": (245, 245, 245),
        "pattern": "vstripes",
        "stripe_w": 24,
        "trim": (245, 245, 245),
    },
    18: {
        "primary": (221, 0, 0),
        "secondary": (255, 255, 255),
        "pattern": "solid",
        "trim": (255, 255, 255),
    },
    19: {
        "primary": (248, 248, 250),
        "secondary": (19, 34, 87),
        "pattern": "solid",
        "trim": (19, 34, 87),
    },
    20: {
        "primary": (235, 23, 43),
        "secondary": (255, 255, 255),
        "pattern": "vstripes",
        "stripe_w": 30,
        "trim": (255, 255, 255),
    },
}

GK: dict[int, KitDef] = {
    1: {"primary": (0, 60, 40), "secondary": (200, 255, 180), "pattern": "solid", "trim": (200, 255, 180)},
    2: {"primary": (20, 40, 90), "secondary": (180, 220, 255), "pattern": "solid", "trim": (180, 220, 255)},
    3: {"primary": (30, 90, 70), "secondary": (180, 255, 200), "pattern": "solid", "trim": (180, 255, 200)},
    4: {"primary": (20, 70, 55), "secondary": (255, 220, 80), "pattern": "solid", "trim": (255, 220, 80)},
    5: {"primary": (255, 120, 40), "secondary": (20, 20, 20), "pattern": "solid", "trim": (20, 20, 20)},
    6: {"primary": (255, 140, 0), "secondary": (20, 20, 20), "pattern": "solid", "trim": (20, 20, 20)},
    7: {"primary": (255, 200, 50), "secondary": (20, 40, 100), "pattern": "solid", "trim": (20, 40, 100)},
    8: {"primary": (255, 200, 50), "secondary": (20, 40, 100), "pattern": "solid", "trim": (20, 40, 100)},
    9: {"primary": (255, 90, 20), "secondary": (255, 255, 255), "pattern": "solid", "trim": (255, 255, 255)},
    10: {"primary": (40, 160, 100), "secondary": (255, 255, 255), "pattern": "solid", "trim": (255, 255, 255)},
    11: {"primary": (30, 100, 180), "secondary": (255, 205, 0), "pattern": "solid", "trim": (255, 205, 0)},
    12: {"primary": (0, 90, 70), "secondary": (200, 255, 180), "pattern": "solid", "trim": (200, 255, 180)},
    13: {"primary": (30, 100, 180), "secondary": (255, 205, 0), "pattern": "solid", "trim": (255, 205, 0)},
    14: {"primary": (0, 90, 70), "secondary": (200, 255, 180), "pattern": "solid", "trim": (200, 255, 180)},
    15: {"primary": (255, 100, 40), "secondary": (28, 44, 91), "pattern": "solid", "trim": (28, 44, 91)},
    16: {"primary": (20, 80, 55), "secondary": (251, 225, 34), "pattern": "solid", "trim": (251, 225, 34)},
    17: {"primary": (0, 140, 100), "secondary": (245, 245, 245), "pattern": "solid", "trim": (245, 245, 245)},
    18: {"primary": (30, 50, 100), "secondary": (255, 255, 255), "pattern": "solid", "trim": (255, 255, 255)},
    19: {"primary": (255, 90, 30), "secondary": (19, 34, 87), "pattern": "solid", "trim": (19, 34, 87)},
    20: {"primary": (20, 110, 90), "secondary": (255, 255, 255), "pattern": "solid", "trim": (255, 255, 255)},
}


def hex_ok(c: tuple[int, int, int]) -> tuple[int, int, int]:
    return tuple(int(max(0, min(255, v))) for v in c)  # type: ignore[return-value]


def load_rgba(path: Path) -> np.ndarray:
    img = Image.open(path).convert("RGBA")
    if img.size != (W, H):
        img = img.resize((W, H), Image.Resampling.LANCZOS)
    return np.array(img).astype(np.float32)


def fabric_luma(template: np.ndarray, albedo: np.ndarray | None) -> np.ndarray:
    """Normalized luminance that preserves weave/folds when used as multiply."""
    src = albedo if albedo is not None else template
    luma = (0.299 * src[:, :, 0] + 0.587 * src[:, :, 1] + 0.114 * src[:, :, 2]) / 255.0
    alpha = template[:, :, 3] / 255.0
    solid = alpha > 0.08
    mean = float(luma[solid].mean()) if solid.any() else 0.85
    # Keep relative fold contrast; clamp extremes so dark kits stay readable
    return np.clip(luma / max(mean, 0.25), 0.42, 1.38)


def build_region_masks(alpha: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """
    Hard body vs sleeve masks from the jersey silhouette.

    Sleeves = left/right hanging wing polygons (armhole → cuff).
    Body = full silhouette minus sleeves (full torso neck→hem).
    """
    sil = np.clip(alpha / 255.0, 0.0, 1.0)

    # Sleeve wings tuned to jersey-template.png (500×820 back view)
    left_sleeve = [
        (int(W * 0.02), int(H * 0.16)),
        (int(W * 0.22), int(H * 0.12)),
        (int(W * 0.255), int(H * 0.20)),
        (int(W * 0.24), int(H * 0.38)),
        (int(W * 0.20), int(H * 0.55)),
        (int(W * 0.08), int(H * 0.58)),
        (int(W * 0.01), int(H * 0.42)),
    ]
    right_sleeve = [
        (int(W * 0.98), int(H * 0.16)),
        (int(W * 0.78), int(H * 0.12)),
        (int(W * 0.745), int(H * 0.20)),
        (int(W * 0.76), int(H * 0.38)),
        (int(W * 0.80), int(H * 0.55)),
        (int(W * 0.92), int(H * 0.58)),
        (int(W * 0.99), int(H * 0.42)),
    ]

    sleeve_img = Image.new("L", (W, H), 0)
    sd = ImageDraw.Draw(sleeve_img)
    sd.polygon(left_sleeve, fill=255)
    sd.polygon(right_sleeve, fill=255)
    # 1px seam AA only — keeps a crisp armhole, not a soft colour wash
    sleeve_img = sleeve_img.filter(ImageFilter.GaussianBlur(radius=0.7))
    sleeve = np.clip((np.array(sleeve_img).astype(np.float32) / 255.0) * sil, 0.0, 1.0)
    body = np.clip(sil - sleeve, 0.0, 1.0)

    Image.fromarray((body * 255).astype(np.uint8)).save(BODY_MASK_PATH, optimize=True)
    Image.fromarray((sleeve * 255).astype(np.uint8)).save(SLEEVE_MASK_PATH, optimize=True)
    return body, sleeve


def colour_field(defn: KitDef, body: np.ndarray, sleeve: np.ndarray) -> np.ndarray:
    """Per-pixel RGB colour map from kit recipe + region masks."""
    primary = np.array(hex_ok(defn["primary"]), dtype=np.float32)
    secondary = np.array(hex_ok(defn["secondary"]), dtype=np.float32)
    trim = np.array(hex_ok(defn.get("trim", secondary)), dtype=np.float32)
    pattern = defn.get("pattern", "solid")
    stripe_w = int(defn.get("stripe_w", 24))

    field = np.zeros((H, W, 3), dtype=np.float32)
    field[:] = primary

    if pattern in ("vstripes", "hstripes"):
        if pattern == "vstripes":
            xs = np.arange(W)[None, :]
            stripe = ((xs // stripe_w) % 2).astype(np.float32)
            stripe = np.broadcast_to(stripe, (H, W))
        else:
            ys = np.arange(H)[:, None]
            stripe = ((ys // stripe_w) % 2).astype(np.float32)
            stripe = np.broadcast_to(stripe, (H, W))
        # Full-shirt stripes (body + sleeves) — matches Brighton / Newcastle etc.
        field = primary * (1.0 - stripe)[..., None] + secondary * stripe[..., None]
    elif pattern == "sleeves":
        # Full torso primary; only sleeve wings secondary (hard armhole seam)
        b = body[..., None]
        s = sleeve[..., None]
        field = primary * b + secondary * s

    # Collar / neck trim — light tint on upper torso, not a blurred oval wash
    yy, xx = np.mgrid[0:H, 0:W]
    collar = (
        (yy < H * 0.14)
        & (xx > W * 0.30)
        & (xx < W * 0.70)
        & (body > 0.15)
    ).astype(np.float32)
    collar_fall = np.clip(1.0 - (yy.astype(np.float32) / (H * 0.14)), 0.0, 1.0)
    collar_w = (collar * collar_fall * 0.45)[..., None]
    field = field * (1.0 - collar_w) + trim * collar_w

    # Cuff hint on sleeve tips
    cuff = (
        (sleeve > 0.35)
        & (yy > H * 0.48)
        & (yy < H * 0.62)
    ).astype(np.float32) * 0.28
    field = field * (1.0 - cuff[..., None]) + trim * cuff[..., None]

    return field


def tint_fabric(
    template: np.ndarray,
    luma: np.ndarray,
    colour: np.ndarray,
    alpha: np.ndarray,
) -> Image.Image:
    """Multiply colour map by fabric luminance; keep template alpha."""
    out = np.zeros((H, W, 4), dtype=np.float32)
    for c in range(3):
        out[:, :, c] = np.clip(colour[:, :, c] * luma, 0, 255)
    out[:, :, 3] = alpha
    return Image.fromarray(out.astype(np.uint8))


def soften_name_panel(img: Image.Image, primary: tuple[int, int, int], body: np.ndarray) -> Image.Image:
    """Slightly even the centre back for lettering — no soft sticker oval."""
    arr = np.array(img).astype(np.float32)
    yy, xx = np.mgrid[0:H, 0:W]
    panel = (
        (xx > W * 0.28)
        & (xx < W * 0.72)
        & (yy > H * 0.22)
        & (yy < H * 0.58)
        & (body > 0.4)
    ).astype(np.float32)
    # Feather panel edge ~2px via blur
    panel_img = Image.fromarray((panel * 255).astype(np.uint8))
    panel_img = panel_img.filter(ImageFilter.GaussianBlur(radius=2.2))
    w = (np.array(panel_img).astype(np.float32) / 255.0) * 0.12

    # Lift dark kits / mute very bright ones toward a clean print panel
    target = np.array(hex_ok(primary), dtype=np.float32)
    if sum(primary) < 420:
        target = target * 0.92 + np.array([255.0, 255.0, 255.0]) * 0.08
    else:
        target = target * 0.94 + np.array([0.0, 0.0, 0.0]) * 0.06

    for c in range(3):
        arr[:, :, c] = arr[:, :, c] * (1.0 - w) + target[c] * w
    return Image.fromarray(arr.astype(np.uint8))


def build_one(
    team_id: int,
    defn: KitDef,
    suffix: str,
    template: np.ndarray,
    luma: np.ndarray,
    body: np.ndarray,
    sleeve: np.ndarray,
) -> Path:
    colour = colour_field(defn, body, sleeve)
    alpha = template[:, :, 3]
    img = tint_fabric(template, luma, colour, alpha)
    img = soften_name_panel(img, hex_ok(defn["primary"]), body)
    out = OUT_DIR / f"t{team_id}-{suffix}.png"
    img.save(out, optimize=True)
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    template = load_rgba(TEMPLATE)
    albedo = load_rgba(ALBEDO) if ALBEDO.exists() else None
    luma = fabric_luma(template, albedo)
    body, sleeve = build_region_masks(template[:, :, 3])

    written: list[Path] = []
    for tid, defn in sorted(HOME.items()):
        written.append(build_one(tid, defn, "home", template, luma, body, sleeve))
        gk = GK.get(tid)
        if gk:
            written.append(build_one(tid, gk, "gk", template, luma, body, sleeve))

    print(f"Wrote {len(written)} kit textures → {OUT_DIR.relative_to(ROOT)}")
    print(f"Region masks → {BODY_MASK_PATH.name}, {SLEEVE_MASK_PATH.name}")
    for p in written[:6]:
        print(f"  {p.name}")
    if len(written) > 6:
        print(f"  … +{len(written) - 6} more")


if __name__ == "__main__":
    main()
