---
name: form8-anti-slop
description: >-
  FORM8 / form8.football anti-AI-slop audit for product UI. Use when building,
  redesigning, or polishing any visible surface on this site (partners cabinet,
  locker, season, pool, modals, tables, CTAs), or when the user mentions slop,
  шислоп, neon, glow, generic UI, or "does this look AI".
---

# FORM8 anti-slop

Read before shipping UI on this repo. Pair with `refero-design` (research) and
`emil-design-eng` (motion) when those apply. This skill is the **product gate**.

## Brand lock (do not invent)

| Role | Value |
|------|--------|
| Page base | `#0D0F12` |
| Accent green | `#00f948` — **sparingly** (hero stat, live signal). Never as glow border soup. |
| Quiet CTA | Light plaque (`REGISTER_CTA_CLASS` / white–gray fill), not neon green fill |
| Display | `font-display` (Oswald), uppercase headlines |
| Labels | `text-white/60+` — never `white/30–38` for primary categories |
| Body / help | `text-white/50–55`, readable |

Existing chrome: `GlassPanel`, `SeasonPageWash`, `LockerLabNav`. Prefer them over new card systems.

## Hard bans (ship blockers)

1. **Neon glow stacks** — green border + green fill + green text + soft glow on the same control.
2. **Purple / indigo gradients**, mesh blobs, glow orbs.
3. **Muted-to-invisible type** — column headers, dates, tips at `white/30–40` when they must be scanned.
4. **Misaligned metric tables** — headers and values must share the same alignment axis (prefer HTML `table` + `text-center` for Clicks/Signups/Fee/CR).
5. **Bullet tip essays** with em-dashes (`Code — …`). Use ordered steps or path examples instead.
6. **Stacked modals** — a product sheet must not sit above the site login/wallet picker (`z-[210]` over `z-[200]`). Hide the sheet while `useLogin().open`.
7. **Welcome/Nickname on partner auth** — clear login intent on `/partners`; don't open Welcome after partner connect.
8. **Dashboard card farm** — one job per panel; no decorative stat pills in the hero of a cabinet.

## Audit checklist (run before handoff)

- [ ] Accent green used ≤1–2 times in the viewport (not on every chip)
- [ ] Primary actions match site plaque / quiet border buttons, not `#00f948` filled CTAs
- [ ] Section labels and table headers readable (`white/60–70`)
- [ ] Numbers sit under their headers (center or shared right edge — consistent)
- [ ] Side rails same width when they share a column rhythm
- [ ] No helper microcopy the user already rejected
- [ ] Modal stack: only one interactive overlay; wallet/login wins when connecting
- [ ] Motion: short ease-out only; no staggered neon pulses

## If slop is found

Fix in place. Do not add another explanatory paragraph under the UI. Prefer removing glow and raising contrast over adding decoration.
