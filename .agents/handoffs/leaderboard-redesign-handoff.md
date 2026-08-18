# MoveMatch · Leaderboard redesign — handoff brief

## Open these files first

### Rules / taste
- `.cursor/rules/locker-design-family.mdc`
- `.agents/skills/refero-design/SKILL.md`

### Homepage diegetic gold standard
- `src/components/design-lab/locker-hero/LockerKits.tsx`
- `src/components/design-lab/locker-hero/HangIdentity.tsx`
- `src/components/design-lab/locker-hero/TabletScene.tsx`
- `src/components/design-lab/locker-hero/LockerTablet.tsx`
- `src/components/design-lab/locker-hero/GlassPanel.tsx`
- `src/components/design-lab/locker-hero/lockerPalettes.ts`

### Current leaderboard surface
- `src/app/leaderboard/page.tsx`
- `src/app/leaderboard/classic/page.tsx`
- `src/components/design-lab/locker-leaderboard/` (esp. `LeaderboardConceptsLab.tsx`, `ResultsRoomShell.tsx`)
- `src/components/design-lab/locker-leaderboard/diegetic/` (rejected — re-analyze, don’t polish)

### Prior research canvases (Cursor canvases folder)
- `~/.cursor/projects/Users-piselli-Desktop-ffl-moves/canvases/refero-styles-movematch.canvas.tsx`
- `~/.cursor/projects/Users-piselli-Desktop-ffl-moves/canvases/tripled-refero-proposal.canvas.tsx`
- `~/.cursor/projects/Users-piselli-Desktop-ffl-moves/canvases/leaderboard-refero-tripled.canvas.tsx`
- `~/.cursor/projects/Users-piselli-Desktop-ffl-moves/canvases/leaderboard-vibe-continuation.canvas.tsx`

### External references (re-study properly)
- TripleD: `https://ui.tripled.work/` + `/components`
- Refero Styles: `https://styles.refero.design/` — Active Theory, Linear, Authkit / Dimension, Sandclock / Phantom, Athletics

---

## Product
**MoveMatch** (repo: `ffl-moves`) — Solana fantasy football. Shipping homepage is locked.

## Homepage lock (DO NOT redesign)
- Route: `/` → `LockerHero` `variant="site"`
- Concept: **locker room photo + raise/lower 3D iPad**
- Room: `/design-lab/locker-hero/variants/locker-plate-v25-slate-hangers.png`
- Tablet: WebGL `TabletScene` + `LockerTablet` with **Obsidian Glass** (`LOCKER_PALETTE`, `GlassPanel`, Onest inside, Oswald outside)
- **Diegetic payoff (the bar for “interesting”):** lower tablet → hanging kits + nameplates appear / become interactive (`LockerKits`). Selection on tablet → world reacts.
- Brand: warm dark slate `#1a1816` / near-black, Oswald wordmark, **`#00f948` only as sparse live signal**, hairlines, frosted glass — not neon theme paint.
- Nav on spatial pages: lit type, no heavy bar (`LockerLabNav` / `ResultsPlaceNav`)

## Design rules file
`.cursor/rules/locker-design-family.mdc`
- Secondary pages may **leave the locker photo**
- Continuity = brand tokens + materials + restraint, **not** cloning hero background
- Banned: terminal/dev-tool UIs, kinetic-numeral portfolio pages, random genre packs

## Reference sites the user gave (MUST re-study properly)

### 1) TripleD — `https://ui.tripled.work/` + `/components`
User said: **this is literally our style**. Dark is locked; **green is NOT mandatory** (accent open: white / soft / chromatic later).

TripleD is the **component + motion vocabulary** (code is on the site — copy patterns, don’t invent empty metaphors):
- Native Dialog (spring scale + blur overlay, white glow CTA)
- Native Tabs (sliding pill)
- Native Button / Badge (glass, outline, glow, spring press)
- Hover Card / User Card / Avatar Expand
- Glass Wallet Card (balance + trend + actions)
- Profile Notch / Dynamic Island physics
- Bottom Modal
- Counter Up
- Flip Text / Marquee
- Animated List / Interactive Logs (expandable rows)
- Stocks / Dashboard density
- Magnetic / Liquid etc. — mostly skip for high-frequency product (noise)

### 2) Refero Styles — `https://styles.refero.design/`
Taste / restraint (not “install this UI”). Best fits already mapped:
- **Active Theory** — scene shouts, chrome whispers (ghost pills, void black)
- **Linear** — dense midnight product UI; accent = flashlight
- **Authkit / Dimension** — frosted plates, inset hairlines
- **Sandclock / Phantom** — accent only on live/CTA
- **Athletics** — warmth in media/materials, cold mono UI
Skip: terminal/arcade/nebula/glow kits, Kippo-style

Refero MCP needs Pro (user may not have it). Skill installed: `.agents/skills/refero-design/`

### Existing canvases (research notes)
- `refero-styles-movematch.canvas.tsx`
- `tripled-refero-proposal.canvas.tsx`
- `leaderboard-refero-tripled.canvas.tsx`
- `leaderboard-vibe-continuation.canvas.tsx`

## What the user actually wants for `/leaderboard`
1. **Same vibe as homepage** (colors, materials, restraint, spatial presence) — **NOT the same locker background**
2. **Interesting interaction** = diegetic / world reacts (like kits on home), **NOT** tabs/dialogs/expand-row alone
3. User rejected: floating twin iPad in lounge photo; flat metaphor shells; “TripleD UI chrome” without scene payoff
4. User quote (paraphrase): previous concepts had **nothing interesting**; homepage has remove tablet → shirts + surnames appear

## Hard quality bar (from user)
Ask of every concept: **What happens in the room when I act?**  
If the answer is only “a panel opens / a modal springs” → fail.

Good examples of the bar:
- Lower UI → wall plaques light / kits-like objects appear
- Select manager → XI materializes **in the room** (hung plates), not only pitch-in-panel
- Claim → physical pulse in scene
- Find me → spotlight on your object in space

## What was already built (context only — don’t treat as success)
- Shipping `/leaderboard` became a **compare lab** (`LeaderboardConceptsLab`)
- Classic table: `/leaderboard/classic`
- Lounge TV + 3D iPad clone → rejected
- Metaphor concepts (Wall/Couch/Bar/Clipboard/Dugout) → weak
- Vibe A–E with TripleD micro-interactions → user: still nothing interesting
- Latest diegetic lab (Lower→Wall, Select→XI hang, Claim pulse, Find-me spotlight) under `src/components/design-lab/locker-leaderboard/diegetic/` — user called it crap; **re-analyze from sites + raise the bar**, don’t just polish these

Key paths:
- `src/app/leaderboard/page.tsx`
- `src/components/design-lab/locker-leaderboard/`
- Homepage diegetic reference: `LockerKits.tsx`, `HangIdentity.tsx`, `TabletScene.tsx`

## Working contract (user insisted)
- Propose **fresh composition metaphors from zero** before coding; use Refero/TripleD learning
- Don’t spam lab A/B chrome unless asked
- When implementing: shipping-quality + real interactions, not toy switchers for their own sake
- Prefer **one strong diegetic concept** over five empty variants — user asked for compares before, then rejected emptiness

## Recommended next approach for new chat
1. Re-open TripleD components + Refero Active Theory / Authkit / Linear; extract **interaction mechanics**, not aesthetics only
2. Study homepage `LockerKits` / raise-lower as the interaction gold standard
3. Design **1–2 leaderboard concepts** where:
   - Atmosphere continues Obsidian Glass / warm slate / Oswald / sparse accent
   - Background ≠ locker plate (or only as soft wash if justified)
   - Core loop = **action → world changes** (spatial objects, hang, light, spotlight)
   - TripleD used for craft *inside* the product surface (tabs/dialog/wallet) **as secondary**, not as the whole idea
4. Show brief + interaction story first; implement only after user picks
5. Avoid: floating identical iPad; dashboard tables in a photo; claim-as-only-modal

## Tone / language
User speaks Ukrainian/Russian mix; wants direct honesty, no bullshit, no fake “interesting” UI.
