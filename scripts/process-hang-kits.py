#!/usr/bin/env python3
"""Pack plate-matched hang sprites → kit/hang/tN-home.png (500×820 RGBA).

Sources (Cursor assets or --src-dir): t{1-20}-*-hang.png

Plate-matched pack rules (see public/design-lab/locker-hero/kit/HANG_ASSET_BRIEF.md):
  - Prefer sources already cut out with soft wall-contact shadow in alpha
  - Leave air in the canvas so runtime bay width can sit inside the opening
  - Use --skip-rembg when the source is already RGBA (rembg eats soft shadows)

Run:
  NUMBA_CACHE_DIR=.numba_cache python3 scripts/process-hang-kits.py
  NUMBA_CACHE_DIR=.numba_cache python3 scripts/process-hang-kits.py --skip-rembg
"""

from __future__ import annotations

import argparse
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = Path.home() / ".cursor/projects/Users-piselli-Desktop-ffl-moves/assets"
OUT = ROOT / "public/design-lab/locker-hero/kit/hang"

MAP = {
    f"t{i}-{n}-hang.png": f"t{i}-home.png"
    for i, n in [
        (1, "arsenal"),
        (2, "villa"),
        (3, "bournemouth"),
        (4, "brentford"),
        (5, "brighton"),
        (6, "chelsea"),
        (7, "coventry"),
        (8, "palace"),
        (9, "everton"),
        (10, "fulham"),
        (11, "hull"),
        (12, "ipswich"),
        (13, "leeds"),
        (14, "liverpool"),
        (15, "mancity"),
        (16, "manutd"),
        (17, "newcastle"),
        (18, "forest"),
        (19, "spurs"),
        (20, "sunderland"),
    ]
}

TW, TH = 500, 820
# Leave margin so garment doesn't fill the whole bay at runtime.
PACK_FILL = 0.88


def pack(cut: Image.Image) -> Image.Image:
    arr = np.array(cut)
    alpha = arr[:, :, 3]
    # Include soft shadow fringe (low alpha), not only solid fabric.
    ys, xs = np.where(alpha > 8)
    if len(xs) == 0:
        return Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
    pad = 10
    x0, x1 = max(0, int(xs.min()) - pad), min(arr.shape[1], int(xs.max()) + pad)
    y0, y1 = max(0, int(ys.min()) - pad), min(arr.shape[0], int(ys.max()) + pad)
    crop = cut.crop((x0, y0, x1, y1))
    cw, ch = crop.size
    scale = min(TW / cw, TH / ch) * PACK_FILL
    nw, nh = max(1, int(cw * scale)), max(1, int(ch * scale))
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGBA", (TW, TH), (0, 0, 0, 0))
    ox = (TW - nw) // 2
    # Collar near top — hangs from chrome hook on the plate.
    oy = max(4, int(TH * 0.02))
    canvas.paste(resized, (ox, oy), resized)
    return canvas


def load_cutout(src: Path, skip_rembg: bool) -> Image.Image:
    img = Image.open(src).convert("RGBA")
    if skip_rembg:
        return img
    from rembg import remove

    return remove(img)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src-dir", type=Path, default=DEFAULT_SRC)
    ap.add_argument(
        "--skip-rembg",
        action="store_true",
        help="Source already has transparent BG + soft shadow (preferred for plate-matched packs)",
    )
    args = ap.parse_args()

    OUT.mkdir(parents=True, exist_ok=True)
    for src_name, dst_name in MAP.items():
        src = args.src_dir / src_name
        if not src.exists():
            print(f"skip missing {src_name}")
            continue
        cut = load_cutout(src, args.skip_rembg)
        packed = pack(cut)
        packed.save(OUT / dst_name, optimize=True)
        kept = float((np.array(packed)[:, :, 3] > 8).mean())
        print(f"{dst_name}: kept={kept:.0%}")


if __name__ == "__main__":
    main()
