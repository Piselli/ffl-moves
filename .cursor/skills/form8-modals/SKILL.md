---
name: form8-modals
description: >-
  FORM8 modal, dialog, and overlay stacking rules. Use when editing LoginModal,
  NicknameModal, PartnerLoginModal, deposit/funds modals, Turnkey/Helius sheets,
  or any fixed inset overlay / z-index / createPortal dialog on form8.football.
---

# FORM8 modals

## Z-index stack (keep stable)

| Layer | z | Examples |
|-------|---|---------|
| Nav shell | `80` | `LockerLabNav` |
| App sheets | `200` | `LoginModal`, `NicknameModal` |
| Blocking product sheets | `210` | Rare — only when login is **not** also open |
| Turnkey / OTP | `400` | `.tk-modal` (+ parent) in `globals.css` |

Never invent `z-[9999]`. If a sheet fights login, **hide the sheet** while login is open instead of raising z forever.

## Partner cabinet login

1. `PartnerLoginModal` portals to `document.body`.
2. While `useLogin().open`, partner sheet must be **not visible** (`open && !loginOpen`).
3. On Connect: `openLogin()` then `clearLoginIntent()` so Welcome/Nickname does not stack after wallet connect.
4. On `/partners`, disable `useWelcomeModalAutoOpen` in nav.

## Rules

- One interactive overlay at a time whenever possible.
- Body scroll lock only while that overlay is the top interactive layer.
- Closing login without connect must restore the previous sheet if still required.
- Prefer site `LoginModal` for wallet pick — do not rebuild a second wallet grid.
- Sign-message / OTP must never render under an opaque product sheet.

## Anti-patterns

- Partner (or any) sheet at `z-[210]` left open while Login opens at `200`
- Opening Welcome + Partner + Login together
- Backdrop that eats pointer events for a modal underneath
