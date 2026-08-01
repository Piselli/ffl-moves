#!/usr/bin/env python3
"""
Extract bay-column kit overlays for locker-hero live pick.

Gens keep the locker room locked — we swap only garment pixels inside each
stall between chrome dividers. Empty plate owns cavity ceiling + chrome hooks
(visible seams lived there when Y0 sat at 20.5%).

Crop:
  - Y0 ≈ 25.5% — just below cavity LEDs / chrome wall hooks
  - Y1 — per-bay seat cushion top
  - Alpha — metal lock-blend (near-empty walls punch through) + garment core
    dilation + soft feather on top/bottom/sides

Divider X from kit/bay-refs/v20-divider-peaks.png (red lines).
Sources: kit/_picked.json → variants/download (1)/*.jpeg
Output: kit/hang-bay/t{N}/{bayId}.webp  (full-frame sparse RGBA)
"""

from __future__ import annotations

import json
from pathlib import Path

import cv2
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
EMPTY = ROOT / "public/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.png"
PEAKS = ROOT / "public/design-lab/locker-hero/kit/bay-refs/v20-divider-peaks.png"
DL = ROOT / "public/design-lab/locker-hero/variants/download (1)"
PICKS = ROOT / "public/design-lab/locker-hero/kit/_picked.json"
OUT = ROOT / "public/design-lab/locker-hero/kit/hang-bay"
REVIEW = ROOT / "public/design-lab/locker-hero/kit/_review"

# Empty plate keeps cavity ceiling + chrome hooks (mismatch band + visible seams).
Y0_PCT = 25.5
Y1_FALLBACK_PCT = 48.8
INSET_PX = 2
SEAT_PAD_PCT = 1.3

FEATHER_TOP_PX = 40
FEATHER_BOT_PX = 16
FEATHER_SIDE_PX = 7
# Whole-column metal lock: walls → empty; dilated high-diff core keeps jersey solid
LOCK_THR_LO = 5.0
LOCK_THR_HI = 18.0
CORE_DIFF = 14.0

BAY_IDS = [
    "h1", "h2", "h3", "h4", "h5", "h6", "h7", "h8", "h9", "h10", "h11",
    "hb1", "hb2", "hb3",
]

HOOKS_PCT = [
    5.42, 11.99, 18.6, 24.75, 30.76, 36.81, 42.73,
    48.52, 54.5, 60.68, 67.22, 84.59, 90.66, 96.11,
]


def detect_column_bounds(w: int, h: int) -> list[tuple[str, int, int]]:
    """Return (bayId, x0, x1) pixel ranges from red divider peaks."""
    peaks = np.array(Image.open(PEAKS).convert("RGB"))
    assert peaks.shape[1] == w and peaks.shape[0] == h, "peaks must match empty size"

    r, g, b = peaks[:, :, 0], peaks[:, :, 1], peaks[:, :, 2]
    red = (r > 180) & (g < 100) & (b < 100)
    band = red[int(0.30 * h) : int(0.50 * h), :]
    score = band.mean(axis=0)
    xs = np.where(score > 0.02)[0]
    clusters: list[tuple[int, int]] = []
    start = prev = int(xs[0])
    for x in xs[1:]:
        x = int(x)
        if x - prev > 8:
            clusters.append((start, prev))
            start = x
        prev = x
    clusters.append((start, prev))
    centers = [int((a + b) / 2) for a, b in clusters]
    pcts = [c / w * 100 for c in centers]

    edges: list[tuple[float, int]] = []
    for p, c in zip(pcts, centers):
        if min(abs(p - hk) for hk in HOOKS_PCT) < 1.2:
            continue  # bay-center paint, not a divider
        edges.append((p, c))

    left = [(p, c) for p, c in edges if p < 74]
    right = [(p, c) for p, c in edges if p > 80]
    if len(left) < 12 or len(right) < 4:
        raise SystemExit(f"bad divider count left={len(left)} right={len(right)}")

    left = left[:12]
    right = right[:4]
    cols: list[tuple[str, int, int]] = []
    for i, bid in enumerate(BAY_IDS[:11]):
        cols.append((bid, left[i][1], left[i + 1][1]))
    for i, bid in enumerate(BAY_IDS[11:]):
        cols.append((bid, right[i][1], right[i + 1][1]))

    # Extreme perspective: outermost jerseys spill past the end rails.
    # Extend h1/hb3 to the frame edge so sleeves aren't clipped.
    cols[0] = (cols[0][0], 0, cols[0][2])
    cols[-1] = (cols[-1][0], cols[-1][1], w)
    return cols


def detect_seat_tops(empty: np.ndarray, cols: list[tuple[str, int, int]]) -> dict[str, int]:
    """Per-bay Y just into the black seat cushion (cavity metal → near-black pad)."""
    h, w = empty.shape[:2]
    pad = int(SEAT_PAD_PCT / 100 * h)
    seats: dict[str, int] = {}
    for bid, x0, x1 in cols:
        xc = (x0 + x1) // 2
        found: int | None = None
        for y in range(int(0.45 * h), int(0.58 * h)):
            patch = empty[y : y + 12, max(0, xc - 12) : min(w, xc + 12)].mean()
            above = empty[y - 10 : y - 2, max(0, xc - 12) : min(w, xc + 12)].mean()
            if patch < 45 and above > 70:
                found = y
                break
        if found is None:
            found = int(Y1_FALLBACK_PCT / 100 * h) - pad
        seats[bid] = min(h - 1, found + pad)
    return seats


def softstep(x: np.ndarray, lo: float, hi: float) -> np.ndarray:
    t = np.clip((x - lo) / max(1e-6, hi - lo), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def column_alpha(
    filled_roi: np.ndarray,
    empty_roi: np.ndarray,
    feather_left: bool = True,
    feather_right: bool = True,
) -> np.ndarray:
    """Metal → empty; garment core stays solid; soft edge feathers."""
    rh, rw = filled_roi.shape[:2]
    diff = np.abs(
        filled_roi.astype(np.float32) - empty_roi.astype(np.float32)
    ).mean(axis=2)

    keep = softstep(diff, LOCK_THR_LO, LOCK_THR_HI)
    core = (diff > CORE_DIFF).astype(np.uint8) * 255
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    core = cv2.dilate(core, k, iterations=2)
    core = cv2.morphologyEx(
        core, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)), 2
    )
    core_f = cv2.GaussianBlur(core, (0, 0), 1.3).astype(np.float32) / 255.0
    alpha = np.clip(np.maximum(keep, core_f * 0.97), 0.0, 1.0) * 255.0

    ft = min(FEATHER_TOP_PX, rh)
    if ft > 0:
        alpha[:ft] *= np.linspace(0.0, 1.0, ft, dtype=np.float32)[:, None]
    fb = min(FEATHER_BOT_PX, rh)
    if fb > 0:
        alpha[-fb:] *= np.linspace(1.0, 0.0, fb, dtype=np.float32)[:, None]
    fs = min(FEATHER_SIDE_PX, max(1, rw // 4))
    if fs > 0:
        # Outer frame edges (h1 left / hb3 right): don't feather away spilled sleeves
        if feather_left:
            alpha[:, :fs] *= np.linspace(0.0, 1.0, fs, dtype=np.float32)[None, :]
        if feather_right:
            alpha[:, -fs:] *= np.linspace(1.0, 0.0, fs, dtype=np.float32)[None, :]

    return np.clip(np.rint(alpha), 0, 255).astype(np.uint8)


def extract_team(
    empty: np.ndarray,
    filled: np.ndarray,
    cols: list[tuple[str, int, int]],
    y0: int,
    seats: dict[str, int],
    team_id: int,
) -> list[str]:
    h, w = filled.shape[:2]
    team_dir = OUT / f"t{team_id}"
    team_dir.mkdir(parents=True, exist_ok=True)
    written: list[str] = []
    y1_fallback = int(Y1_FALLBACK_PCT / 100 * h)

    for bay_id, x0, x1 in cols:
        # Outer bays already extend to frame — skip inset on the outer side
        left_inset = 0 if x0 <= 0 else INSET_PX
        right_inset = 0 if x1 >= w else INSET_PX
        xa = min(w, max(0, x0 + left_inset))
        xb = min(w, max(0, x1 - right_inset))
        if xb <= xa:
            print(f"  skip {bay_id}: empty x range")
            continue

        y1 = max(y0 + 1, seats.get(bay_id, y1_fallback))

        fr = filled[y0:y1, xa:xb]
        er = empty[y0:y1, xa:xb]
        alpha = column_alpha(
            fr,
            er,
            feather_left=(xa > 0),
            feather_right=(xb < w),
        )

        rgba = np.zeros((h, w, 4), dtype=np.uint8)
        rgba[y0:y1, xa:xb, :3] = fr
        rgba[y0:y1, xa:xb, 3] = alpha

        path = team_dir / f"{bay_id}.webp"
        Image.fromarray(rgba).save(path, "WEBP", quality=93, method=4)
        written.append(f"t{team_id}/{bay_id}.webp")
        kept = float((alpha > 16).mean())
        print(
            f"  {bay_id}: x={xa}-{xb} ({(xb - xa) / w * 100:.2f}%) "
            f"y={y0}-{y1} ({y0 / h * 100:.1f}-{y1 / h * 100:.1f}%) "
            f"kept={kept:.1%}"
        )

    return written


def write_seam_proof(empty_im: Image.Image, cols: list[tuple[str, int, int]], y0: int, seats: dict[str, int]) -> None:
    """Green boxes = new seam crop; red = old flat 16.8–56.8%."""
    w, h = empty_im.size
    vis = empty_im.copy().convert("RGB")
    # draw via numpy for speed
    arr = np.array(vis)
    old_y0, old_y1 = int(0.168 * h), int(0.568 * h)
    arr[old_y0 : old_y0 + 2, :, :] = (220, 40, 40)
    arr[old_y1 : old_y1 + 2, :, :] = (220, 40, 40)
    arr[y0 : y0 + 2, :, :] = (40, 220, 120)
    for bay_id, x0, x1 in cols:
        y1 = seats[bay_id]
        xa, xb = x0 + INSET_PX, x1 - INSET_PX
        arr[y0 : y0 + 2, xa:xb] = (40, 255, 140)
        arr[y1 - 2 : y1, xa:xb] = (40, 255, 140)
        arr[y0:y1, xa : xa + 2] = (40, 255, 140)
        arr[y0:y1, xb - 2 : xb] = (40, 255, 140)
    REVIEW.mkdir(parents=True, exist_ok=True)
    out = REVIEW / "seam_crop_v2.jpg"
    Image.fromarray(arr).resize((1920, 1080), Image.Resampling.LANCZOS).save(out, quality=90)
    print(f"wrote {out}")


def main() -> None:
    picks = json.loads(PICKS.read_text())
    empty_im = Image.open(EMPTY).convert("RGB")
    ew, eh = empty_im.size
    empty = np.array(empty_im)
    cols = detect_column_bounds(ew, eh)
    seats = detect_seat_tops(empty, cols)
    y0 = int(Y0_PCT / 100 * eh)

    print(f"empty {ew}×{eh}  Y0={y0} ({Y0_PCT}%)  [cavity ceiling+hooks stay on empty]")
    for bid, x0, x1 in cols:
        y1 = seats[bid]
        print(
            f"  col {bid}: x={x0 / ew * 100:.2f}-{x1 / ew * 100:.2f}%  "
            f"seat_y1={y1 / eh * 100:.2f}%"
        )

    write_seam_proof(empty_im, cols, y0, seats)

    OUT.mkdir(parents=True, exist_ok=True)
    manifest = {
        "plate": "v25",
        "mode": "bay-columns-metal-lock",
        "source": "download (1)",
        "y0_pct": Y0_PCT,
        "y1_mode": "per-bay-seat",
        "y1_fallback_pct": Y1_FALLBACK_PCT,
        "feather_top_px": FEATHER_TOP_PX,
        "feather_bot_px": FEATHER_BOT_PX,
        "feather_side_px": FEATHER_SIDE_PX,
        "lock_thr": [LOCK_THR_LO, LOCK_THR_HI],
        "bays": BAY_IDS,
        "seat_y1_pct": {
            bid: round(seats[bid] / eh * 100, 2) for bid, _, _ in cols
        },
        "teams": {},
    }

    for tid_s, info in sorted(picks.items(), key=lambda x: int(x[0])):
        tid = int(tid_s)
        club = info["club"]
        src = DL / info["file"]
        if not src.exists():
            print(f"missing {src}")
            continue
        print(f"t{tid} {club}: {src.name}")
        filled = np.array(
            Image.open(src).convert("RGB").resize((ew, eh), Image.Resampling.LANCZOS)
        )
        files = extract_team(empty, filled, cols, y0, seats, tid)
        manifest["teams"][str(tid)] = {
            "club": club,
            "file": info["file"],
            "files": files,
        }

    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    team_ids = sorted(int(k) for k, v in manifest["teams"].items() if v.get("files"))
    gen = ROOT / "src/components/design-lab/locker-hero/hangBayPack.generated.ts"
    gen.write_text(
        "/** Auto-generated — bay-column cutouts. Do not edit. */\n"
        f"export const HANG_BAY_PACK_TEAM_IDS = {team_ids} as const;\n"
    )
    print(f"wrote {gen} teams={team_ids}")


if __name__ == "__main__":
    main()
