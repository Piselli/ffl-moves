#!/usr/bin/env python3
"""
Generate locker-hero kit fill prompts — one plate per club.

Bay layout (matches live pick: position → шкафчик):
  h1          = GOALKEEPER kit for that club
  h2…h11+hb*  = HOME outfield kit for that club

Writes copy-paste-ready prompts:
  public/design-lab/locker-hero/kit/prompts/
    COPY_ALL.md          ← open this: all 20 in code blocks
    t{N}-{slug}.txt      ← one club, select-all → paste
    00-empty-plate-hangers.txt
    README.md
"""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public/design-lab/locker-hero/kit/prompts"
HOME_TS = ROOT / "src/components/design-lab/locker-hero/pl2627HomeKits.ts"
GK_TS = ROOT / "src/components/design-lab/locker-hero/pl2627GkKits.ts"

SLUG = {
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

SHORT = {
    1: "ARS",
    2: "AVL",
    3: "BOU",
    4: "BRE",
    5: "BHA",
    6: "CHE",
    7: "COV",
    8: "CRY",
    9: "EVE",
    10: "FUL",
    11: "HUL",
    12: "IPS",
    13: "LEE",
    14: "LIV",
    15: "MCI",
    16: "MUN",
    17: "NEW",
    18: "NFO",
    19: "TOT",
    20: "SUN",
}


def parse_kits(path: Path) -> dict[int, dict[str, str]]:
    text = path.read_text()
    blocks = re.findall(
        r"teamId:\s*(\d+),\s*club:\s*\"([^\"]+)\",.*?brief:\s*\n?\s*\"([^\"]+)\",\s*status:\s*\"([^\"]+)\"",
        text,
        flags=re.S,
    )
    out: dict[int, dict[str, str]] = {}
    for tid, club, brief, status in blocks:
        out[int(tid)] = {
            "club": club,
            "brief": " ".join(brief.split()),
            "status": status,
        }
    if len(out) != 20:
        raise SystemExit(f"{path.name}: expected 20 kits, got {len(out)}")
    return out


def fill_prompt(
    *,
    tid: int,
    club: str,
    short: str,
    slug: str,
    gk_brief: str,
    home_brief: str,
) -> str:
    """Single continuous block — select all in .txt and paste into the image model."""
    return f"""Attach locker-plate-v25-slate-hangers.png. Edit that photo ONLY — same camera, lockers, chrome hooks, matte-black plastic hangers, black seats, floor, ceiling lights, door. Do not redesign the room. Do not repaint upper locker doors or the cavity ceiling above the hooks. Do not change hanger shape, colour, or position.

Hang Premier League 2026/27 {club} ({short}) kits on all 14 hangers (back facing camera). Bay layout LEFT → RIGHT:

1) h1 (first locker, always GK): {gk_brief.rstrip(".")}. No name, no number, no sponsor text on the back.

2–14) h2 through h11, then hb1 hb2 hb3: {home_brief.rstrip(".")}. Same home shirt on every one of these 13 hangers. No name, no number, no sponsor text on the back.

SIZE LOCK: every shirt is the same adult medium — GK and home must match in scale (only colour/cut differ). Collar on the hanger bar with no gap. Hem clears the seat by about one fist on center bays. Same sleeve length and hem line relative to the seat on all hooks; only foreshortening changes on the sides. Do not make side shirts mini or oversized. Sleeves must not touch the chrome rails.

Keep every matte-black hanger identical to the empty plate. Soft contact shadow on the locker back. Cool overhead LED light. Photoreal, 16:9.

Save as: t{tid}-{slug}-plate.png
"""


PLATE_PROMPT = """Attach locker-plate-v20-slate-black.png (or the current empty slate locker plate). Edit that photo ONLY — same camera, lockers, chrome wall hooks, black seats, floor, ceiling lights, door. Do not redesign the room. Do not repaint upper doors or cavity ceilings.

Add identical matte-black plastic clothes hangers on ALL 14 chrome hooks (11 left of the door + 3 bench right): triangular shoulder bar, short neck looped over the chrome hook tip, no clips. Empty hangers — no jerseys. Same scale and hang angle on every hook; only perspective differs. Do not move the chrome hooks themselves.

Photoreal, 16:9, 3840×2160. Save as locker-plate-v25-slate-hangers.png.

STATUS: already published — only re-run if hangers need a redo.
"""


README = """# Kit prompts — copy/paste

**Відкрий [`COPY_ALL.md`](COPY_ALL.md)** — там усі 20 промптів у code blocks (кнопка copy в Markdown preview).

Або окремий файл команди: `t1-arsenal.txt` … `t20-sunderland.txt` → Cmd+A → Cmd+C.

Атач завжди: `variants/locker-plate-v25-slate-hangers.png`

| Bay | Kit |
|---|---|
| **h1** | GK тієї команди |
| h2…hb3 | HOME outfield |

```bash
python3 scripts/gen-kit-prompts.py
```
"""


def main() -> None:
    home = parse_kits(HOME_TS)
    gk = parse_kits(GK_TS)
    OUT.mkdir(parents=True, exist_ok=True)

    for p in OUT.glob("t*-1-gk.txt"):
        p.unlink()
    for p in OUT.glob("t*-2-home.txt"):
        p.unlink()

    (OUT / "README.md").write_text(README)
    (OUT / "00-empty-plate-hangers.txt").write_text(PLATE_PROMPT.strip() + "\n")
    (OUT / "_SHARED_LOCKS.txt").write_text(
        "Shared locks are inlined in each club prompt — see COPY_ALL.md\n"
    )

    copy_md: list[str] = [
        "# Copy-paste kit prompts",
        "",
        "Атач до кожного job: `locker-plate-v25-slate-hangers.png`",
        "",
        "h1 = GK · h2…hb3 = HOME · однаковий adult-medium розмір",
        "",
    ]

    for tid in range(1, 21):
        slug = SLUG[tid]
        h = home[tid]
        g = gk[tid]
        prompt = fill_prompt(
            tid=tid,
            club=h["club"],
            short=SHORT[tid],
            slug=slug,
            gk_brief=g["brief"],
            home_brief=h["brief"],
        )
        (OUT / f"t{tid}-{slug}.txt").write_text(prompt)
        copy_md.append(f"## t{tid} · {h['club']} ({SHORT[tid]})")
        copy_md.append("")
        copy_md.append("```")
        copy_md.append(prompt.rstrip())
        copy_md.append("```")
        copy_md.append("")
        print(f"t{tid} {slug}")

    (OUT / "COPY_ALL.md").write_text("\n".join(copy_md) + "\n")
    print(f"wrote {OUT}/COPY_ALL.md + 20 club prompts")


if __name__ == "__main__":
    main()
