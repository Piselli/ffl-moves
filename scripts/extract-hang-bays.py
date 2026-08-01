#!/usr/bin/env python3
"""
Extract per-bay jersey cutouts from locked-background club plates.

Input: 20 filled plates (same pixels as empty v20 except jerseys) + empty plate.
Output: kit/hang-bay/t{N}/{bayId}.webp — full-frame 3840×2160 sparse RGBA.

Diff mask keeps only pixels that changed vs empty, restricted to each bay ROI
so side kits keep correct geometry/lighting without CSS yaw.

Sources in --src-dir named: t{N}-{club}-plate.png (see kit/HANG_ASSET_BRIEF.md)

Run:
  python3 scripts/extract-hang-bays.py
  python3 scripts/extract-hang-bays.py --src-dir ~/Desktop/kit-plates --team 1
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EMPTY = ROOT / "public/design-lab/locker-hero/variants/locker-plate-v20-slate-black.png"
OUT = ROOT / "public/design-lab/locker-hero/kit/hang-bay"
DEFAULT_SRC = Path.home() / ".cursor/projects/Users-piselli-Desktop-ffl-moves/assets"

# Mirrors hangBays.ts — hook center + sprite box (percent of plate).
# ROI padded so contact shadow on the bay wall is included.
HANG_BAYS = [
    {"id": "h1", "left": 5.42, "top": 27.85, "width": 4.55, "yaw": 32},
    {"id": "h2", "left": 11.99, "top": 27.55, "width": 4.65, "yaw": 26},
    {"id": "h3", "left": 18.6, "top": 27.35, "width": 4.5, "yaw": 20},
    {"id": "h4", "left": 24.75, "top": 27.2, "width": 4.4, "yaw": 14},
    {"id": "h5", "left": 30.76, "top": 27.1, "width": 4.3, "yaw": 9},
    {"id": "h6", "left": 36.81, "top": 27.05, "width": 4.3, "yaw": 5},
    {"id": "h7", "left": 42.73, "top": 27.0, "width": 4.25, "yaw": 1},
    {"id": "h8", "left": 48.52, "top": 27.05, "width": 4.3, "yaw": -4},
    {"id": "h9", "left": 54.5, "top": 27.15, "width": 4.4, "yaw": -9},
    {"id": "h10", "left": 60.68, "top": 27.35, "width": 4.5, "yaw": -15},
    {"id": "h11", "left": 67.22, "top": 27.65, "width": 4.7, "yaw": -21},
    {"id": "hb1", "left": 84.59, "top": 28.25, "width": 4.55, "yaw": -32},
    {"id": "hb2", "left": 90.66, "top": 28.75, "width": 4.7, "yaw": -38},
    {"id": "hb3", "left": 96.11, "top": 29.45, "width": 4.25, "yaw": -44},
]

CLUBS = [
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

# Jersey hangs below hook; box taller than wide (plate aspect 16:9).
ASPECT_H_OVER_W = 820 / 500
PAD_X = 1.35  # multiply width for shadow / sleeve bleed
PAD_Y_TOP = 0.4  # % of plate height above hook
PAD_Y_BOT = 2.0  # extra % below hem estimate
DIFF_THR = 18.0  # per-channel mean abs diff (0–255)
ALPHA_FEATHER = 1.2


def bay_roi(bay: dict, w: int, h: int) -> tuple[int, int, int, int]:
    """Pixel AABB (x0,y0,x1,y1) around a hang bay, padded."""
    cx = bay["left"] / 100.0 * w
    top = bay["top"] / 100.0 * h
    bw = bay["width"] / 100.0 * w * PAD_X
    # Same aspect as legacy hang pack (500×820), in plate pixels.
    sprite_h = (bay["width"] / 100.0 * w) * ASPECT_H_OVER_W
    x0 = int(cx - bw / 2)
    x1 = int(cx + bw / 2)
    y0 = int(top - PAD_Y_TOP / 100.0 * h)
    y1 = int(top + sprite_h + PAD_Y_BOT / 100.0 * h)
    return (
        max(0, x0),
        max(0, y0),
        min(w, x1),
        min(h, y1),
    )


def diff_alpha(empty: np.ndarray, filled: np.ndarray) -> np.ndarray:
    """Uint8 alpha from RGB difference (locked BG → jersey-only mask)."""
    d = np.abs(filled.astype(np.float32) - empty.astype(np.float32)).mean(axis=2)
    a = np.clip((d - DIFF_THR) / (DIFF_THR * ALPHA_FEATHER), 0, 1)
    return (a * 255).astype(np.uint8)


def extract_team(
    empty_rgb: np.ndarray,
    filled_rgb: np.ndarray,
    team_id: int,
    out_root: Path,
) -> list[str]:
    h, w = empty_rgb.shape[:2]
    alpha_full = diff_alpha(empty_rgb, filled_rgb)
    changed = float((alpha_full > 16).mean())
    if changed < 0.001:
        print(f"  warn t{team_id}: almost no diff vs empty ({changed:.4%}) — BG lock failed?")
    if changed > 0.35:
        print(f"  warn t{team_id}: huge diff ({changed:.1%}) — plate BG may have shifted")

    team_dir = out_root / f"t{team_id}"
    team_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []

    for bay in HANG_BAYS:
        x0, y0, x1, y1 = bay_roi(bay, w, h)
        mask = np.zeros((h, w), dtype=np.uint8)
        mask[y0:y1, x0:x1] = alpha_full[y0:y1, x0:x1]

        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[:, :, :3] = filled_rgb
        rgba[:, :, 3] = mask

        # Drop near-empty bays (generation missed a hook).
        if (mask > 16).mean() < 0.00005:
            print(f"  skip t{team_id}/{bay['id']}: empty ROI")
            continue

        path = team_dir / f"{bay['id']}.webp"
        Image.fromarray(rgba, "RGBA").save(path, "WEBP", quality=90, method=4)
        written.append(f"t{team_id}/{bay['id']}.webp")
        kept = float((mask > 16).mean())
        print(f"  {bay['id']}: kept={kept:.3%} → {path.name}")

    return written


def find_source(src_dir: Path, team_id: int, club: str) -> Path | None:
    candidates = [
        src_dir / f"t{team_id}-{club}-plate.png",
        src_dir / f"t{team_id}-{club}-plate.jpg",
        src_dir / f"t{team_id}-{club}-plate.webp",
        src_dir / f"t{team_id}-plate.png",
    ]
    for p in candidates:
        if p.exists():
            return p
    return None


def main() -> None:
    global DIFF_THR

    ap = argparse.ArgumentParser()
    ap.add_argument("--src-dir", type=Path, default=DEFAULT_SRC)
    ap.add_argument("--empty", type=Path, default=EMPTY)
    ap.add_argument("--out", type=Path, default=OUT)
    ap.add_argument("--team", type=int, default=0, help="Only this teamId (0 = all)")
    ap.add_argument("--thr", type=float, default=18.0, help="Diff threshold")
    args = ap.parse_args()

    DIFF_THR = args.thr

    empty_im = Image.open(args.empty).convert("RGB")
    empty_rgb = np.array(empty_im)
    eh, ew = empty_rgb.shape[:2]
    print(f"empty: {args.empty.name} {ew}×{eh}")

    args.out.mkdir(parents=True, exist_ok=True)
    man_path = args.out / "manifest.json"
    if man_path.exists():
        try:
            manifest = json.loads(man_path.read_text())
        except json.JSONDecodeError:
            manifest = {}
    else:
        manifest = {}
    manifest.setdefault("plate", "v20")
    manifest.setdefault("teams", {})
    manifest["bays"] = [b["id"] for b in HANG_BAYS]

    for team_id, club in CLUBS:
        if args.team and team_id != args.team:
            continue
        src = find_source(args.src_dir, team_id, club)
        if not src:
            print(f"skip missing t{team_id}-{club}-plate.*")
            continue
        filled_im = Image.open(src).convert("RGB")
        if filled_im.size != empty_im.size:
            print(f"  resize {src.name} {filled_im.size} → {empty_im.size}")
            filled_im = filled_im.resize(empty_im.size, Image.Resampling.LANCZOS)
        print(f"t{team_id} {club}: {src.name}")
        files = extract_team(empty_rgb, np.array(filled_im), team_id, args.out)
        manifest["teams"][str(team_id)] = {"club": club, "files": files}

    man_path.write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"wrote {man_path}")

    # Keep runtime team set in sync with extracted packs.
    team_ids = sorted(
        int(k)
        for k, v in manifest["teams"].items()
        if isinstance(v, dict) and v.get("files")
    )
    gen_ts = (
        ROOT
        / "src/components/design-lab/locker-hero/hangBayPack.generated.ts"
    )
    gen_ts.write_text(
        "/** Auto-generated by scripts/extract-hang-bays.py — do not edit. */\n"
        f"export const HANG_BAY_PACK_TEAM_IDS = {team_ids} as const;\n"
    )
    print(f"wrote {gen_ts} teams={team_ids}")


if __name__ == "__main__":
    main()
