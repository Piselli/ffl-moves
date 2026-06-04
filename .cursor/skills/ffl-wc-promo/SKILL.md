---
name: ffl-wc-promo
description: >-
  Design and implement World Cup 2026 promo surfaces for FFL Moves (MoveMatch).
  Use when building or redesigning WC banners, landing hero strips, or event CTAs
  on the homepage or world-cup routes.
---

# FFL Moves · World Cup 2026 Promo

## Design read

Event promo for crypto-native fantasy football players. Broadcast / stadium graphic language on a dark sports-tech canvas. Asymmetric layout, purposeful motion, zero generic “AI promo card” patterns.

**Dials:** DESIGN_VARIANCE 8 · MOTION_INTENSITY 6 · VISUAL_DENSITY 4

## Brand tokens (non-negotiable)

| Token | Value | Usage |
|-------|-------|--------|
| Background | `#0D0F12` | Page + promo surface base |
| Accent | `#00f948` | Highlights, stats, CTA — sparingly |
| Display font | `font-display` (Oswald) | Headlines, CTAs — uppercase, tight tracking |
| Body | default sans | Descriptions at `text-white/45–55` |
| Pitch green | `#388E3C` / `#2E7D32` | Decorative pitch stripes only |

## Host nations (2026)

USA, México, Canada — represent as **abstract tricolor vertical bars** (CSS), never emoji flags or stock football clipart.

## Anti-patterns (do NOT ship)

- Green gradient border card with pulse-dot badge + generic CTA (the old banner)
- Centered three-column feature grid inside the promo
- Full-width emerald gradient button as the only visual interest
- Inter/slate defaults, purple gradients, glassmorphism blobs
- Decorative football emoji or FIFA-style trophy stock art

## Required structure

1. **Left column:** eyebrow label, split headline (title + year), one-line description, footnote stats (round count, on-chain prizes)
2. **Right column:** decorative panel — pitch line SVG, oversized “2026” watermark, host-nation color bars
3. **CTA:** solid accent fill, press feedback (`active:scale`), arrow that translates on group-hover
4. **Motion:** staggered entrance (framer-motion), `prefers-reduced-motion` respected
5. **i18n:** all copy from `useSiteMessages().home` — never hardcode UA/EN strings in JSX

## Motion (Emil Kowalski)

- Entrance: `duration: 0.5`, ease `[0.22, 1, 0.36, 1]`, stagger 0.06s
- Hover on link card: subtle border brightening only on accent edge, not uniform glow
- CTA press: `scale(0.98)` on `:active`, release with spring feel via CSS transition

## Files

- Component: `src/components/WorldCupPromoBanner.tsx`
- Copy: `src/i18n/messages.ts` (`home.wcPromo*`)
- Data: `WC_ROUNDS.length` from `@/lib/worldcup`
