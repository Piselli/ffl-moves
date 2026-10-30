---
name: form8-motion
description: >-
  FORM8 motion rules for product and promo UI. Use when adding framer-motion,
  CSS transitions, hover/press feedback, page enters, or when the user asks to
  polish animation / motion / feel on form8.football.
---

# FORM8 motion

Primary craft reference: project skill `emil-design-eng` (always follow its
decision framework). This file only adds **product constraints**.

## Defaults for product UI (partners, locker, season)

| Interaction | Motion |
|-------------|--------|
| Table/list row enter | opacity + 4–6px y, ≤220ms, stagger ≤40ms |
| Button press | `active:scale-[0.97]`, ~150ms |
| Modal open | spring or 180ms ease-out; exit faster |
| Hover on chips | border/background only — no scale bounce |

## Never on product chrome

- Looping pulse / glow on badges, Copy buttons, or neon borders
- `transition: all`
- Large scale-from-0 enters
- Stagger > 8 items on dense tables (cap delay or skip)

## Promo / WC surfaces

Use `ffl-wc-promo` + `emil-design-eng`. Promo may use higher motion intensity;
cabinets stay quiet.

## Reduced motion

Honor `useReducedMotion()` — snap opacity only, no y/scale travel.
