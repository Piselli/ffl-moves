# Partner cabinet (`/partners`)

Cabinet for referral partners. Not in the public sitemap (`noindex`). The **Partners** nav tab appears only when the connected wallet is on the partner whitelist.

## Auth

Wallet only. Connect in FORM8 → sign a short message → session cookie.

```bash
REFERRAL_PARTNERS='[{"id":"acme","label":"Acme","key":"LONG_SECRET","codes":["acme"],"wallets":["SoLanaBase58…"]}]'
```

| Field | Purpose |
| --- | --- |
| `id` | Internal slug |
| `label` | Shown in the cabinet |
| `key` | Sheets / API export (`/api/referral/partner`) |
| `codes` | Seed `?ref=` / `/r/` codes |
| `wallets` | Solana wallets that may open `/partners` for this partner |

Multiple wallets on one partner share the same cabinet. Partners can create **extra codes** in the UI (stored in Redis).

## Code vs campaign

- **Code** — main referral id: `https://www.form8.football/r/bonus50`
- **Campaign** — creative under a code: `https://www.form8.football/r/bonus50/creo1`  
  Same partner ownership; splits clicks/signups by creative. No pre-registration.

Totals in the Codes table are per code. Campaign rows are that traffic split; sum of campaigns for one code ≈ that code’s clicks (including `(default)` bare links).

## Related

- Sheets pull: [partner-referral-sheets.md](./partner-referral-sheets.md)
- Admin (all codes): `/admin/referrals`
