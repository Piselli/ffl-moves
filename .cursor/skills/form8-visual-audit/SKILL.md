---
name: form8-visual-audit
description: >-
  Visual QA pass for FORM8 pages. Use when reviewing a screen for slop, contrast,
  alignment, type hierarchy, or before shipping partners/locker/season UI; or when
  the user asks to check design, audit, polish, or "does this look good".
---

# FORM8 visual audit

Run before calling a UI pass done. Output a short findings list (issue → fix),
then fix unless the user asked audit-only.

## Stack to load

1. `form8-anti-slop`
2. `form8-product-ui` (if cabinet/table)
3. `form8-modals` (if overlays)
4. `impeccable` + `frontend-design` for general craft
5. `refero-design` if inventing a new direction (MCP may be unavailable — still use bundled refs)

## Pass order

1. **Hierarchy** — can you name the #1 thing in 2 seconds?
2. **Contrast** — labels ≥ `white/60`, body ≥ `white/50`, dates ≥ `white/55`
3. **Alignment** — metrics under headers; side rails same width
4. **Accent budget** — `#00f948` ≤ 1–2 hits per viewport; no glow stacks
5. **Chrome** — GlassPanel/matte consistent; no random new card skins
6. **Copy** — run `form8-copy` bans
7. **Motion** — no loops on chrome; reduced-motion safe
8. **Modals** — one interactive layer; login above product sheet

## Report format

```text
Audit: [route or component]
Blockers: …
Nits: …
Ship: yes/no
```
