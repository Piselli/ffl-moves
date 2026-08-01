# Tour → entry/prize asset mapping

Movement `get_config` stores only the **current** `EntryFeeAssetConfig`. Historical
tours do not record which asset was used. This file fixes interpretation of raw
`prizeAmount` / `prizePool` values in the snapshot JSON.

> **Revised 2026-08-01 (phase 6).** The first version of this file labelled EPL
> tours 35–38 as USDCx. That was wrong by a factor of 10⁴ and is corrected below;
> the derivation is in §3. Anything written against the old mapping — prize
> totals, player-facing numbers — must be recomputed.

## 1. Decimals

| Asset | Decimals | Raw → human |
|-------|----------|-------------|
| MOVE (AptosCoin) | 8 | ÷ 10⁸ |
| USDCx | 6 | ÷ 10⁶ |

## 2. Mapping

| Tour IDs | Label | Asset | Entry fee |
|----------|-------|-------|-----------|
| 32–34 | EPL (internal tests) | MOVE | 0.8 MOVE |
| 35 | EPL | MOVE | 75 MOVE |
| 36 | EPL | MOVE | 100 MOVE |
| 37 | EPL | MOVE | ~200 MOVE |
| 38 | EPL | MOVE | 300 MOVE |
| 10001–10006 | WC fantasy rounds | USDCx | 4–5 USDCx |
| 10999 | WC bracket prize | — | CLOSED, 0 entrants; metadata only |

**Every EPL tour ran on MOVE. Only the World Cup tours ran on USDCx.** The
USDCx entry fee was introduced for the WC campaign and never applied to an EPL
tour before the migration.

Title and guild fees were always MOVE, separate from the squad entry asset.

## 3. How the mapping was derived

Pool ÷ entries for each tour, read against the two candidate decimal scales:

| Tour | Entries | Pool (raw) | Per entry | as MOVE | as USDCx |
|------|---------|-----------|-----------|---------|----------|
| 32 | 2 | 160 000 000 | 8.0e7 | 0.80 | 80 |
| 35 | 14 | 105 000 000 000 | 7.5e9 | 75 | 7 500 |
| 36 | 137 | 1 370 000 000 000 | 1.0e10 | 100 | 10 000 |
| 38 | 137 | 4 027 500 000 000 | 2.9e10 | ~294 | ~29 398 |
| 10001 | 21 | 105 000 000 | 5.0e6 | 0.05 | 5 |
| 10005 | 5 | 20 000 000 | 4.0e6 | 0.04 | 4 |

Reading tours 35–38 as USDCx gives a $7 500–29 400 entry fee and a $4 M prize
pool for 137 players. Reading them as MOVE gives 75–300 MOVE, which matches
`ENTRY_FEE_MOVE = 300` in `src/lib/constants.ts` at tag `movement-final` — the
last value before the migration, reached as the MOVE price fell.

WC tours land on exactly 4–5 × 10⁶, matching `ENTRY_FEE_USDCX = 5` with the pool
share applied. Those are USDCx.

Pools are slightly below `entries × fee` on tours 37–38 because refunds
(`close_entry`) return the entry's booked contribution and shrink the pool.

## 4. Unclaimed prizes (11 total)

Recomputed from `results/*.json` under the corrected mapping.

| Tour | Asset | Unclaimed | Amounts |
|------|-------|-----------|---------|
| GW 33 | MOVE | 1 | 0.36 |
| GW 35 | MOVE | 2 | 31.50, 63.00 |
| GW 36 | MOVE | 1 | 1 575.50 |
| GW 37 | MOVE | 1 | 855.75 |
| WC 10001 | USDCx | 3 | 1.05, 4.72, 8.40 |
| WC 10005 | USDCx | 3 | 3.00, 6.00, 3.20 |

**Totals: 2 526.11 MOVE across 5 prizes, 26.38 USDCx across 6 prizes.**

The MOVE side is the material one — a single GW36 winner is owed 1 575.50 MOVE.
Any sunset notice has to name both assets; the earlier "all USDCx-era" note was
a consequence of the mapping error.

Policy (2026-08-01): no claim deadline; prizes remain claimable on Movement
indefinitely. See `docs/solana-migration/HANDOFF.md`.

## 5. Bracket challenge (tour 10999)

Status CLOSED, 18 on-chain predictions, zero results published. Pool field holds
14 000 000 raw with zero entrants. Payout asset was planned as USDCx ($500 pool
per product copy); funding status is a separate open operational item.
