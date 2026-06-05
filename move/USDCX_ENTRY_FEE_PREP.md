# USDCx entry fee — live deployment

Squad registration and prizes use **USDCx** (Circle xReserve USDC on Movement, 6 decimals).
**5 USDCx** per entry = `5_000_000` on-chain.

Title & guild fees **stay MOVE** (`/titles` page unchanged).

## What changed

| Layer | Change |
|-------|--------|
| Contract | `entry_fee_asset` + `usdc_metadata_addr` on `Config`; FA transfers for entry / prize vault / claim |
| Admin entry | `set_entry_fee_asset(asset, usdc_metadata, entry_fee)` |
| View | `get_entry_fee_asset()` → `(u8, address)` |
| Frontend | `src/lib/entryFee.ts` — formatting; default asset USDCx |
| UI | Squad, leaderboards, homepage, WC, tickers, FAQ, admin sponsor/withdraw |
| Provider | `PrizeAssetProvider` in layout — one `getConfig` fetch |

## ⚠️ UI vs on-chain (read this first)

The frontend **must not** show USDCx until `get_entry_fee_asset` exists on the deployed module.
If only the site is deployed but the contract is **not** upgraded:

- UI may have shown **5.00 USDCx** while the wallet charged **MOVE** (`0x1::coin::WithdrawEvent`).
- `set_fees` with `5000000` on a **legacy** module = **0.05 MOVE** (8 decimals), not 5 USDCx.

**Fix:** publish upgrade → `set_entry_fee_asset(1, metadata, 5000000)` → redeploy frontend (reads live asset).

---

## Go live checklist

### 1. Tests & build

```bash
npm run move:test
npm run build
```

### 2. Publish contract upgrade

Publish upgraded package to the same module account (see `move/MAINNET_CHECKLIST.txt`).

New deploys init with USDCx defaults. **Existing deployments** must call admin (step 3).

### 3. Enable on-chain (admin wallet)

**Testnet** metadata:

`0x63f169ba69623ba6ccf34620857644feb46d0f87e1d7bbcf8c071d30c3d94bd6`

**Mainnet** metadata:

`0xba11833544a2f99eec743f41a228ca6ffa7f13c3b6b04681d5a79a8b75ff225e`

```bash
movement move run \
  --function-id '<MODULE>::fantasy_epl::set_entry_fee_asset' \
  --args u8:1 address:<USDCX_METADATA> u64:5000000
```

### 4. Void bad registrations (wrong fee window)

If players registered while the chain still charged MOVE (or a mis-set fee), reset the tour **before** `calculate_results`:

```bash
movement move run \
  --function-id '<MODULE>::fantasy_epl::admin_reset_gameweek_registrations' \
  --args u64:<GW_OR_TOUR_ID> \
  --profile mainnet
```

Clears on-chain entries + `UserTeams` for that id, sets `prize_pool` to 0, reopens the tour. Vault tokens already deposited are **not** auto-refunded — withdraw stray MOVE separately if needed.

### 5. Migrate prize vault (if switching mid-season)

Withdraw remaining MOVE from the prize vault (admin `admin_withdraw_prize_vault`), then sponsor USDCx before resolving the next gameweek.

### 6. Frontend deploy

- No preview env vars required.
- Redeploy site (reads `get_entry_fee_asset` from chain; falls back to USDCx if view missing).

### 7. Verify

- Squad page shows **5.00 USDCx** registration fee.
- Test registration with USDCx in Nightly wallet.
- Sponsor / claim / withdraw use USDCx in admin.

## Roll back to MOVE

```bash
movement move run \
  --function-id '<MODULE>::fantasy_epl::set_entry_fee_asset' \
  --args u8:0 address:0x0 u64:30000000000
```

(`30000000000` = 300 MOVE octas.)

Frontend will follow chain once `get_entry_fee_asset` returns `0`.

## Notes

- Users need **USDCx** in wallet — swap in **Nightly** (Swap tab) or on **[Yuzu](https://app.yuzu.finance/swap?tokenIn=0xa&tokenOut=0xba11833544a2f99eec743f41a228ca6ffa7f13c3b6b04681d5a79a8b75ff225e)** (official Movement DEX). Keep a little **MOVE** for network fees.
- Prize pool + claims use the **same asset** as entry fees.
- `NEXT_PUBLIC_PREVIEW_USDCX_ENTRY_FEE` removed — no longer used.
