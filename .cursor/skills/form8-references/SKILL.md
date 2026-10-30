---
name: form8-references
description: >-
  Curated visual references for FORM8 product UI (partner dashboards, dense
  sports-tech cabinets, referral analytics). Use before redesigning partners or
  similar product surfaces when Refero MCP is unavailable or as a starting lock.
---

# FORM8 references

Do **not** copy one site. Lock a direction from 2–3 refs, then adapt to FORM8
tokens (`#0D0F12`, sparse `#00f948`, Oswald display, GlassPanel).

## Product / partner cabinet (primary)

| Ref | Steal | Avoid |
|-----|-------|-------|
| [Linear](https://linear.app) issues list | Quiet density, label contrast, no neon CTAs | Soft purple brand accents |
| [Vercel Dashboard](https://vercel.com/dashboard) | Table rhythm, muted meta, plaque CTAs | Generic SaaS empty illustrations |
| [Stripe Dashboard](https://dashboard.stripe.com) | Metric strip + detail table, calm help text | Over-documentation sidebars |
| [Dune](https://dune.com) | Crypto-native data seriousness | Chart candy / rainbow series |
| [Hyperliquid](https://app.hyperliquid.xyz) | Dark trading density, tabular nums | Aggressive green glow everywhere |

## Sports / broadcast energy (secondary, sparingly)

| Ref | Steal | Avoid |
|-----|-------|-------|
| [FotMob](https://www.fotmob.com) | Score clarity, tight type | Consumer-app rounded fluff |
| Broadcast lower-thirds (Sky/ESPN) | Uppercase micro labels | Literal TV chrome in web UI |

## Modal / connect patterns

| Ref | Steal |
|-----|-------|
| Site `LoginModal` (FORM8) | Wallet grid, plaque CTA, single sheet |
| Turnkey OTP | Must win z-index (`400`) — never trap under product sheet |

## Workflow

1. Pick **one dominant** ref for density/type.
2. Optionally one secondary for a single detail (e.g. table header weight).
3. Write a 3-bullet lock, then implement.
4. Gate with `form8-visual-audit` + `form8-anti-slop`.
