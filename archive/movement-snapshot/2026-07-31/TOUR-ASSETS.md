# Tour → entry/prize asset mapping

Movement `get_config` stores only the **current** `EntryFeeAssetConfig`. Historical
tours do not record which asset was used. This file fixes interpretation of raw
`prizeAmount` / `prizePool` values in the snapshot JSON.

## Decimals

| Asset | Decimals | Raw → human |
|-------|----------|-------------|
| MOVE (AptosCoin) | 8 | ÷ 10⁸ |
| USDCx | 6 | ÷ 10⁶ |

## Mapping (operational memory + prize magnitudes, snapshot 2026-07-31)

| Tour IDs | Label | Asset | Notes |
|----------|-------|-------|-------|
| 32–34 | EPL (internal) | MOVE | 2–3 participants, early mainnet tests |
| 35–38 | EPL | USDCx | Public EPL seasons; 5 USDCx entry |
| 10001–10006 | WC fantasy rounds | USDCx | 5 USDCx entry |
| 10999 | WC bracket prize | — | CLOSED, 0 entrants; bracket metadata only |

Title and guild fees were always MOVE (separate from squad entry/prize asset).

## Unclaimed prizes (11 total, all USDCx-era)

| Tour | Unclaimed |
|------|-----------|
| GW 33 | 1 |
| GW 35 | 2 |
| GW 36 | 1 |
| GW 37 | 1 |
| WC 10001 | 3 |
| WC 10005 | 3 |

Policy (2026-08-01): no claim deadline; prizes remain claimable on Movement
indefinitely. See `docs/solana-migration/HANDOFF.md`.

## Bracket challenge (tour 10999)

Status CLOSED, 18 on-chain predictions, zero results published. Asset for any
future payout was planned as USDCx ($500 pool per product copy); pool funding
status is a separate open operational item.
