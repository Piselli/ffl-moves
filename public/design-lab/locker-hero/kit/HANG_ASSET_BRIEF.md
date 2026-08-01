# Locked-plate bay cutouts (live pick, photoreal)

## How live pick maps

| Bay | Slot | Kit on each club plate |
|---|---|---|
| **h1** | starter 1 — always **GK** | that club’s **GK** shirt |
| h2…h11 | starters 2–11 | that club’s **HOME** outfield |
| hb1…hb3 | bench | same **HOME** outfield |

Runtime: `teamId` + bay → cutout. No separate all-GK plate.

## Approach (v25 hangers)

1. **Empty plate WITH identical hangers** — locked background.  
   Source master: `variants/_masters/v25-hangers-src-2752.jpg`  
   Published 4K: [`variants/locker-plate-v25-slate-hangers.png`](../variants/locker-plate-v25-slate-hangers.png) (3840×2160)  
   Prompt (for regenerating hangers): [`kit/prompts/00-empty-plate-hangers.txt`](prompts/00-empty-plate-hangers.txt)

2. **20 filled plates** (one per club) — attach **v25** every time.  
   Prompts: [`kit/prompts/t{N}-*.txt`](prompts/)  
   - Bay **1 / h1** = GK  
   - Bays **2–14** = home outfield  
   Same adult-medium size for GK and home (only colour/cut differ).

3. Room + hanger pixels must stay identical to empty. Only jersey fabric changes.

4. Extract:

```bash
python3 scripts/extract-bay-columns.py
```

   → `kit/hang-bay/t{N}/h1.webp` (GK) + `h2…hb3.webp` (home)

5. Live pick: empty v25 + overlay `t{teamId}/{bayId}.webp`

## Why hangers on the empty plate

Stops AI inventing different hang styles / scales. One hanger geometry; fills only add fabric.

## Prompts

```bash
python3 scripts/gen-kit-prompts.py
```

| Job | File |
|---|---|
| 0 · empty + hangers | `00-empty-plate-hangers.txt` |
| Club fill (h1=GK, rest=home) | `t{N}-{slug}.txt` |

Shared locks: [`_SHARED_LOCKS.txt`](prompts/_SHARED_LOCKS.txt)

### Size lock (reject if broken)

| Anchor | Lock |
|---|---|
| Hanger | Same matte-black plastic as empty plate |
| Collar | On hanger bar — no float, no bury |
| Hem | ~1 fist above seat |
| Scale | Adult medium on **all 14**, including h1 GK |
| Width | ~70–80% of bay; sleeves clear chrome rails |

### Must not

- Regenerate the whole room from scratch
- Put home kit on h1, or GK on h2–hb3
- Bake names/numbers
- Vary jersey scale “for interest”
- Repaint upper doors / cavity ceiling strip

## Pilot

1. Generate **v25 hangers** → all 14 hangers match  
2. Arsenal fill → h1 green/GK, h2–hb3 red home, same size  
3. Extract → `/design-lab/locker-hero?kits=1`  
4. If flush → other 19 clubs
