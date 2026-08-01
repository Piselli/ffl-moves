#!/usr/bin/env python3
"""Normalize style-lock bay photos → cavity crops for v20 locker fills.

Copies generated *-bay.jpg sources (or existing kit/bay/tN-home.jpg) into
kit/bay/tN-home.jpg and writes kit/bay-cavity/tN-home.webp crops that cover
only the locker opening (jersey + metal recess), ready to composite into
locker-plate-v20 openings.

Run:
  python3 scripts/process-bay-fills.py
  python3 scripts/process-bay-fills.py --src-dir ~/.cursor/projects/.../assets
"""

from __future__ import annotations

import argparse
import shutil
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SRC = Path.home() / ".cursor/projects/Users-piselli-Desktop-ffl-moves/assets"
BAY_DIR = ROOT / "public/design-lab/locker-hero/kit/bay"
CAVITY_DIR = ROOT / "public/design-lab/locker-hero/kit/bay-cavity"
STYLE_LOCK = BAY_DIR / "_style-lock.jpg"

# Cavity crop in style-lock / bay-photo normalized space (fractions of W,H).
# Tuned on _style-lock.jpg: left locker opening only.
CAVITY_BOX = (0.06, 0.195, 0.615, 0.695)

CLUBS = {
    1: "arsenal",
    2: "villa",
    3: "bournemouth",
    4: "brentford",
    5: "brighton",
    6: "chelsea",
    7: "coventry",
    8: "palace",
    9: "everton",
    10: "fulham",
    11: "hull",
    12: "ipswich",
    13: "leeds",
    14: "liverpool",
    15: "mancity",
    16: "manutd",
    17: "newcastle",
    18: "forest",
    19: "spurs",
    20: "sunderland",
}


def find_source(src_dir: Path, team_id: int, slug: str) -> Path | None:
    candidates = [
        src_dir / f"t{team_id}-{slug}-bay.jpg",
        src_dir / f"t{team_id}-{slug}-bay.png",
        BAY_DIR / f"t{team_id}-home.jpg",
        STYLE_LOCK if team_id == 1 else None,
    ]
    for p in candidates:
        if p and p.exists():
            return p
    return None


def crop_cavity(im: Image.Image) -> Image.Image:
    w, h = im.size
    l, t, r, b = CAVITY_BOX
    box = (int(l * w), int(t * h), int(r * w), int(b * h))
    return im.crop(box)


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--src-dir", type=Path, default=DEFAULT_SRC)
    args = ap.parse_args()

    BAY_DIR.mkdir(parents=True, exist_ok=True)
    CAVITY_DIR.mkdir(parents=True, exist_ok=True)

    for team_id, slug in CLUBS.items():
        src = find_source(args.src_dir, team_id, slug)
        if src is None:
            print(f"skip t{team_id}: no source")
            continue

        dst = BAY_DIR / f"t{team_id}-home.jpg"
        if src.resolve() != dst.resolve():
            im = Image.open(src).convert("RGB")
            # Keep style-lock native size when close; otherwise leave as-is
            im.save(dst, quality=92, optimize=True)
        else:
            im = Image.open(dst).convert("RGB")

        cavity = crop_cavity(im)
        out = CAVITY_DIR / f"t{team_id}-home.webp"
        cavity.save(out, quality=90, method=6)
        print(f"t{team_id:02d}  bay={dst.name}  cavity={cavity.size}  from={src.name}")


if __name__ == "__main__":
    main()
