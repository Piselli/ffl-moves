#!/usr/bin/env bash
# Call admin_mark_prize_claimed(10001, owner) for wallets that already received MD1 payout
# before reopen/recalc reset on-chain claimed=false.
#
# Requires: npm run md1:deploy-mark-claimed completed successfully.
# Signs with module admin wallet (profile mainnet).

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODULE_ADDR="${MODULE_ADDR:-0xf598f059a0353b0d9ea80c9fd9d1c3e15b71ff4535388dd79acf813b567c5b47}"
PROFILE="${MOVEMENT_PROFILE:-mainnet}"
TOUR_ID=10001

export MOVEMENT_CONFIG="${MOVEMENT_CONFIG:-$ROOT/.movement/config.yaml}"

OWNERS=(
  "0x9c65963eb8f79c29301a5585416730bff7e0172cd7fcea343a408d15353cc038"
  "0xc40d711f94276d4b11a5ff701b249448df5252e969008653980e34c0408a1589"
  "0xc6b20dcf3360646c3354a8bdf9c735bbd51bf5b0fd006f7bf2a342250b193d6b"
)

echo "== Mark MD1 prior claimants (claimed=true, no transfer) =="
node "$ROOT/scripts/verify-admin-mark-claimed-chain.mjs" || exit 1

echo ""
read -r -p "Submit ${#OWNERS[@]} admin_mark_prize_claimed txs on tour $TOUR_ID? [y/N] " confirm
case "$confirm" in
  y|Y|yes|Yes|YES) ;;
  *) echo "Aborted."; exit 0 ;;
esac

for owner in "${OWNERS[@]}"; do
  echo ""
  echo "→ admin_mark_prize_claimed($TOUR_ID, ${owner:0:10}…)"
  movement move run \
    --function-id "${MODULE_ADDR}::fantasy_epl::admin_mark_prize_claimed" \
    --args "u64:$TOUR_ID" "address:$owner" \
    --profile "$PROFILE"
done

echo ""
echo "Done. Verify:"
echo "  npm run md1:audit-payouts"
