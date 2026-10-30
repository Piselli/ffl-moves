# Partner cabinet (`/partners`)

Hidden web cabinet for referral partners. Not linked in nav/footer/sitemap; `noindex`. Access only via direct URL + whitelisted Google email.

## Setup

### 1. Partner config

```bash
REFERRAL_PARTNERS='[{"id":"acme","label":"Acme","key":"LONG_SECRET","codes":["acme"],"emails":["partner@gmail.com"]}]'
```

| Field | Purpose |
| --- | --- |
| `id` | Internal slug |
| `label` | Shown in the cabinet |
| `key` | Sheets / API export (`/api/referral/partner`) |
| `codes` | Their `?ref=` / `/r/` codes only |
| `emails` | Google / invite accounts for `/partners` (several emails → same cabinet) |

Redeploy after changing env.

### 2. Invite links (works without Google)

```bash
node --env-file=.env.local scripts/mint-partner-login.mjs broadbabyauthor@gmail.com youshibravo@gmail.com
```

Partner opens the printed URL once → session cookie → `/partners`. Use the **same** `PARTNERS_SESSION_SECRET` (or `CRON_SECRET`) on Vercel as locally when minting prod links.

### 3. Google OAuth (optional, nicer login modal)

1. [Google Cloud Console](https://console.cloud.google.com/apis/credentials) → Create OAuth client (Web application).
2. Authorized redirect URIs:
   - `http://localhost:3000/api/partners/auth/callback`
   - `https://www.form8.football/api/partners/auth/callback`
3. Set on Vercel / `.env.local`:

```bash
PARTNERS_GOOGLE_CLIENT_ID=...
PARTNERS_GOOGLE_CLIENT_SECRET=...
PARTNERS_GOOGLE_REDIRECT_URI=https://www.form8.football/api/partners/auth/callback
```

Until those are set, the cabinet modal points partners to their invite link.

### 4. Give the partner access

- Invite URL from the mint script, **or**
- `https://www.form8.football/partners` + Google (when configured)

## Local testing without Google

If Google is not configured and `NODE_ENV !== production`, the login modal shows a **Local preview** email field (must still be on `emails`). Or set `PARTNERS_ALLOW_DEV_LOGIN=true`.

## Isolation

- Session cookie is sealed (HMAC) with partner id + email.
- Every `/api/partners/stats` call re-checks the email whitelist after redeploy.
- Removing an email from `REFERRAL_PARTNERS` locks that account on next deploy.
- Multiple emails on one partner share the same cabinet.

## Related

- Sheets pull: [partner-referral-sheets.md](./partner-referral-sheets.md)
- Admin (all codes): `/admin/referrals` (local / key-gated)
