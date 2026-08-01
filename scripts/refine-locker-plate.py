"""Finish the refined slate-metal locker plates.

The two refined renders (blank nameplates, softer locker light, black / navy
seats) come out of the image model at 1536x1024 (3:2). This pass:

  1. center-crops each to a 16:9 cover frame (matches the v12 plate framing)
  2. upscales to 4K with a detail-preserving Lanczos + unsharp chain
  3. lands them in public/design-lab/locker-hero/variants/

Run: python3 scripts/refine-locker-plate.py
"""

import os

from PIL import Image, ImageEnhance, ImageFilter

ASSETS = os.path.expanduser(
    "~/.cursor/projects/Users-piselli-Desktop-ffl-moves/assets"
)
OUT_DIR = "public/design-lab/locker-hero/variants"

# source render -> published variant
JOBS = [
    ("locker-plate-v20-slate-black.png", "locker-plate-v20-slate-black.png"),
    ("locker-plate-v21-slate-navy.png", "locker-plate-v21-slate-navy.png"),
]

TARGET_W, TARGET_H = 3840, 2160


def crop_16x9(img):
    w, h = img.size
    target = 16 / 9
    if w / h > target:
        new_w = int(round(h * target))
        x0 = (w - new_w) // 2
        return img.crop((x0, 0, x0 + new_w, h))
    new_h = int(round(w / target))
    y0 = (h - new_h) // 2
    return img.crop((0, y0, w, y0 + new_h))


def upscale(img):
    out = img
    # Double up with Lanczos until we're just under target, then land exactly.
    while out.width * 2 <= TARGET_W:
        out = out.resize((out.width * 2, out.height * 2), Image.LANCZOS)
    out = out.resize((TARGET_W, TARGET_H), Image.LANCZOS)
    out = out.filter(ImageFilter.UnsharpMask(radius=1.7, percent=90, threshold=2))
    out = ImageEnhance.Contrast(out).enhance(1.03)
    return ImageEnhance.Sharpness(out).enhance(1.06)


def main():
    os.makedirs(OUT_DIR, exist_ok=True)
    for src_name, out_name in JOBS:
        src = os.path.join(ASSETS, src_name)
        img = Image.open(src).convert("RGB")
        img = crop_16x9(img)
        img = upscale(img)
        out = os.path.join(OUT_DIR, out_name)
        img.save(out)
        print(f"wrote {out} {img.size} ({os.path.getsize(out) / 1e6:.1f} MB)")


if __name__ == "__main__":
    main()
