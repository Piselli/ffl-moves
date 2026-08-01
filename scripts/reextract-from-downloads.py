#!/usr/bin/env python3
"""
Re-extract hang-bay cutouts from raw download gens (not locked plates).

Fixes:
- No soft lock-blend (was punching holes in white/sky kits)
- Morphology + largest CC so wall/hook noise drops
- Hook tip carved out (empty plate already has chrome hooks)
- RGB always from raw upscaled filled plate
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EMPTY = ROOT / "public/design-lab/locker-hero/variants/locker-plate-v20-slate-black.png"
DL = ROOT / "public/design-lab/locker-hero/variants/download"
PICKS = ROOT / "public/design-lab/locker-hero/kit/_picked.json"
OUT = ROOT / "public/design-lab/locker-hero/kit/hang-bay"

HANG_BAYS = [
    {"id": "h1", "left": 5.42, "top": 27.85, "width": 4.55},
    {"id": "h2", "left": 11.99, "top": 27.55, "width": 4.65},
    {"id": "h3", "left": 18.6, "top": 27.35, "width": 4.5},
    {"id": "h4", "left": 24.75, "top": 27.2, "width": 4.4},
    {"id": "h5", "left": 30.76, "top": 27.1, "width": 4.3},
    {"id": "h6", "left": 36.81, "top": 27.05, "width": 4.3},
    {"id": "h7", "left": 42.73, "top": 27.0, "width": 4.25},
    {"id": "h8", "left": 48.52, "top": 27.05, "width": 4.3},
    {"id": "h9", "left": 54.5, "top": 27.15, "width": 4.4},
    {"id": "h10", "left": 60.68, "top": 27.35, "width": 4.5},
    {"id": "h11", "left": 67.22, "top": 27.65, "width": 4.7},
    {"id": "hb1", "left": 84.59, "top": 28.25, "width": 4.55},
    {"id": "hb2", "left": 90.66, "top": 28.75, "width": 4.7},
    {"id": "hb3", "left": 96.11, "top": 29.45, "width": 4.25},
]

ASPECT = 820 / 500
PAD_X = 1.75
PAD_Y_TOP = 0.35
PAD_Y_BOT = 2.8
# Carve chrome hook (empty plate already has it)
HOOK_CARVE_Y = 0.10  # fraction of ROI height from top
DIFF_THR = 16.0
FEATHER = 1.1


def bay_roi(bay: dict, w: int, h: int) -> tuple[int, int, int, int]:
    cx = bay["left"] / 100.0 * w
    top = bay["top"] / 100.0 * h
    bw = bay["width"] / 100.0 * w * PAD_X
    sh = bay["width"] / 100.0 * w * ASPECT
    x0 = int(cx - bw / 2)
    x1 = int(cx + bw / 2)
    y0 = int(top - PAD_Y_TOP / 100.0 * h)
    y1 = int(top + sh + PAD_Y_BOT / 100.0 * h)
    return max(0, x0), max(0, y0), min(w, x1), min(h, y1)


def clean_mask(
    diff: np.ndarray,
    filled_roi: np.ndarray,
    empty_roi: np.ndarray,
    thr: float,
) -> np.ndarray:
    """Jersey mask: diff + drop near-metal pixels + morph + largest CC + erode."""
    # Drop pixels that still look like locker metal (low sat, mid lum, close to empty)
    elum = empty_roi.mean(axis=2)
    flum = filled_roi.mean(axis=2)
    fsat = filled_roi.std(axis=2)
    metalish = (fsat < 14) & (np.abs(flum - elum) < thr * 0.85) & (flum > 70) & (flum < 200)

    raw = ((diff > thr) & ~metalish).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5))
    raw = cv2.morphologyEx(raw, cv2.MORPH_CLOSE, k, iterations=2)
    raw = cv2.morphologyEx(raw, cv2.MORPH_OPEN, k, iterations=1)

    n, labels, stats, _ = cv2.connectedComponentsWithStats(raw, connectivity=8)
    if n <= 1:
        return np.zeros_like(raw)

    areas = stats[1:, cv2.CC_STAT_AREA]
    order = np.argsort(areas)[::-1]
    keep = np.zeros_like(raw)
    main = int(areas[order[0]])
    for idx in order:
        area = int(areas[idx])
        if area < max(120, main * 0.12):
            break
        keep[labels == (idx + 1)] = 255

    k2 = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    keep = cv2.morphologyEx(keep, cv2.MORPH_CLOSE, k2, iterations=2)
    # Pull off wall halo
    ke = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3))
    keep = cv2.erode(keep, ke, iterations=1)
    keep = cv2.dilate(keep, ke, iterations=1)
    return keep


def feather_alpha(mask: np.ndarray) -> np.ndarray:
    if mask.max() == 0:
        return mask
    return cv2.GaussianBlur(mask, (0, 0), FEATHER)


def extract_team(
    empty: np.ndarray,
    filled: np.ndarray,
    team_id: int,
    club: str,
) -> list[str]:
    h, w = empty.shape[:2]
    team_dir = OUT / f"t{team_id}"
    team_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []

    d_full = np.abs(filled.astype(np.float32) - empty.astype(np.float32)).mean(axis=2)

    for bay in HANG_BAYS:
        x0, y0, x1, y1 = bay_roi(bay, w, h)
        patch = d_full[y0:y1, x0:x1]
        fr = filled[y0:y1, x0:x1]
        er = empty[y0:y1, x0:x1]

        p90 = float(np.percentile(patch, 90))
        thr = DIFF_THR if p90 > 70 else max(11.0, DIFF_THR * 0.75)

        mask_roi = clean_mask(patch, fr, er, thr)
        carve = int(mask_roi.shape[0] * HOOK_CARVE_Y)
        if carve > 0:
            mask_roi[:carve, :] = 0
            fade = min(10, mask_roi.shape[0] - carve)
            if fade > 0:
                ramp = np.linspace(0, 1, fade, dtype=np.float32)[:, None]
                mask_roi[carve : carve + fade] = (
                    mask_roi[carve : carve + fade].astype(np.float32) * ramp
                ).astype(np.uint8)

        alpha_roi = feather_alpha(mask_roi)
        alpha = np.zeros((h, w), dtype=np.uint8)
        alpha[y0:y1, x0:x1] = alpha_roi

        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[:, :, :3] = filled
        rgba[:, :, 3] = alpha

        kept = float((alpha > 16).mean())
        if kept < 0.00005:
            print(f"  skip t{team_id}/{bay['id']}: empty")
            continue

        path = team_dir / f"{bay['id']}.webp"
        Image.fromarray(rgba, "RGBA").save(path, "WEBP", quality=92, method=4)
        written.append(f"t{team_id}/{bay['id']}.webp")
        print(f"  {bay['id']}: kept={kept:.3%} thr={thr:.1f}")

    return written


def main() -> None:
    picks = json.loads(PICKS.read_text())
    empty_im = Image.open(EMPTY).convert("RGB")
    empty = np.array(empty_im)
    ew, eh = empty_im.size
    print(f"empty {ew}×{eh}")

    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {"plate": "v20", "source": "downloads-raw", "bays": [b["id"] for b in HANG_BAYS], "teams": {}}

    for tid_s, info in sorted(picks.items(), key=lambda x: int(x[0])):
        tid = int(tid_s)
        club = info["club"]
        src = DL / info["file"]
        if not src.exists():
            print(f"missing {src}")
            continue
        print(f"t{tid} {club}: {src.name}")
        filled_im = Image.open(src).convert("RGB").resize((ew, eh), Image.Resampling.LANCZOS)
        files = extract_team(empty, np.array(filled_im), tid, club)
        manifest["teams"][str(tid)] = {"club": club, "file": info["file"], "files": files}

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    team_ids = sorted(int(k) for k, v in manifest["teams"].items() if v.get("files"))
    gen = ROOT / "src/components/design-lab/locker-hero/hangBayPack.generated.ts"
    gen.write_text(
        "/** Auto-generated by scripts/reextract-from-downloads.py — do not edit. */\n"
        f"export const HANG_BAY_PACK_TEAM_IDS = {team_ids} as const;\n"
    )
    print(f"wrote {gen} teams={team_ids}")


if __name__ == "__main__":
    main()
