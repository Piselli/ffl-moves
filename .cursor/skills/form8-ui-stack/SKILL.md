---
name: form8-ui-stack
description: >-
  Index of FORM8 design skills and when to load them. Use at the start of any
  partners cabinet or product UI redesign, or when the user asks which design
  skills exist / what to use for visual, motion, modals, copy, or slop checks.
---

# FORM8 UI skill stack

Load **FORM8-first**, then craft packs. Never load Anthropic `brand-guidelines`
(wrong brand).

## Always for partners / product UI

| Skill | Why |
|-------|-----|
| `form8-anti-slop` | Neon / contrast / stacking bans |
| `form8-product-ui` | Tables, rails, GlassPanel |
| `form8-copy` | Microcopy voice |
| `form8-visual-audit` | Ship gate |
| `form8-references` | Direction lock when Refero is down |
| `form8-modals` | If any overlay |
| `form8-motion` | If animating |

## Craft (install in `.agents/skills`)

| Skill | Use for |
|-------|---------|
| `refero-design` | Research / styles / screens |
| `emil-design-eng` | Motion philosophy |
| `review-animations` / `improve-animations` / `animation-vocabulary` | Motion QA |
| `design-taste-frontend` | Anti-templated frontend (landings) |
| `frontend-design` | General UI craft |
| `impeccable` | Design critique |
| `ui-ux-pro-max` | UX pattern breadth |
| `web-design-guidelines` | Web quality baseline |
| `copywriting` / `copy-editing` | Text craft |
| `vercel-react-view-transitions` | Route/view transitions |
| `apple-design` | Restraint / density taste (don't copy iOS chrome) |
| `ffl-wc-promo` | WC promo only |

## Order of work

1. Lock refs (`form8-references` or Refero)
2. Implement with product + anti-slop rules
3. Copy pass (`form8-copy`)
4. Motion pass if needed
5. `form8-visual-audit` → ship
