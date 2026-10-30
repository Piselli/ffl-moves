# Partner referral → Google Sheets

Partners pull **only their** `?ref=` codes into a Google Sheet. No admin key, no other codes.

## 1. Configure the partner (Vercel / `.env`)

```bash
REFERRAL_PARTNERS='[{"id":"acme","label":"Acme","key":"REPLACE_WITH_LONG_RANDOM_SECRET","codes":["acme"],"wallets":["SoLanaBase58…"]}]'
```

| Field | Purpose |
| --- | --- |
| `id` | Internal slug |
| `label` | Shown in the sheet header |
| `key` | Secret the partner’s Apps Script uses (not the admin key) |
| `codes` | Their `?ref=` codes only |
| `wallets` | Whitelist for the [`/partners`](./partner-cabinet.md) cabinet (wallet sign-in) |

Redeploy after setting the env var.

## 2. Create the sheet (partner or you)

1. New Google Spreadsheet → share with the partner (Viewer or Editor).
2. **Extensions → Apps Script**.
3. Paste the script from [`partner-sheets-apps-script.js`](./partner-sheets-apps-script.js).
4. Set Script Properties:
   - `PARTNER_KEY` = the partner `key` from step 1
   - `API_BASE` = `https://www.form8.football` (optional; default in script)
5. Run `syncPartnerStats` once → approve permissions.
6. Run `installHourlyTrigger` once → auto-refresh every 5 minutes.

## 3. What the sheet contains

| Tab | Columns |
| --- | --- |
| **Summary** | code totals (all campaigns rolled up) |
| **Campaigns** | per-creative split: `?ref=CODE&c=CAMPAIGN` |
| **Conversions** | wallet, code, campaign |
| **Meta** | partner label, last sync time, totals |

### Campaign / creative links (short)

Webmaster-style paths (preferred):

```
https://www.form8.football/r/acme
https://www.form8.football/r/acme/creo1
https://www.form8.football/r/acme/creo2
https://www.form8.football/r/acme/stories-1
```

Classic query form still works: `/?ref=acme&c=creo1`.

No need to pre-register campaign names — first click creates the row. Spaces become `-`; Cyrillic OK.

Fee volume is an estimate for manual commission — partner refs do not award Season Points.

## 4. Manual check

```bash
curl -sS "https://www.form8.football/api/referral/partner?key=PARTNER_KEY" | jq .
# CSV:
curl -sS "https://www.form8.football/api/referral/partner?key=PARTNER_KEY&format=csv"
```
