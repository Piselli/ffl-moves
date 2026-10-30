---
name: form8-product-ui
description: >-
  FORM8 product and dashboard UI craft (partners cabinet, locker, season, pool,
  admin analytics tables). Use for dense data layouts, side rails, GlassPanel
  cabinets, stats rows, and in-product help blocks — not marketing landings.
---

# FORM8 product UI

For landings/promos use `design-taste-frontend` / `ffl-wc-promo` + `refero-design`.
For product surfaces use this skill + `form8-anti-slop` + `emil-design-eng`.

## Layout

- Prefer `GlassPanel matte` + `SeasonPageWash` over new card skins.
- Two-column rhythm: `lg:grid-cols-[minmax(0,1fr)_17rem]` when a side rail mirrors another (e.g. Your codes ↔ How links work).
- One job per panel. Stats strip ≠ tips ≠ create form.

## Tables

- Use semantic `<table class="w-full table-fixed">` for metric grids.
- Metric columns (`Clicks`, `Signups`, `Fee`, `CR`): **center** header and value.
- Identity columns (`Code`, `Creative`): left. `Last`: right, `whitespace-nowrap`.
- Headers: `text-white/70`, values: `text-white` / `white/85`, dates: `white/55` minimum.

## Help / legend blocks

- Ordered steps or path samples (`/r/code`, `/r/code/creative`), not bullet essays.
- Label → mono path → one short sentence. Fee note last, quieter.
- Match adjacent rail width; don't widen tips alone.

## Controls

- Primary quiet: border `white/15`, fill `white/[0.06]`, hover brighter — or `REGISTER_CTA_CLASS` for hard CTAs.
- Selected chip: `border-white/30 bg-white/[0.08]`, mono `text-white/90` — not green glow.
- Accent `#00f948` only for a single live/hero figure when needed.

## Motion

- Row enter: opacity + 4–6px y, ≤220ms, light stagger.
- No looping pulses on cabinet chrome. Respect `useReducedMotion`.
