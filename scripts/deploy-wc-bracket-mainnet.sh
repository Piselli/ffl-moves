#!/usr/bin/env bash
# Upgrade fantasy_epl on Movement mainnet with WC bracket challenge entrypoints,
# then verify ABI. Post-publish admin steps: admin panel → Bracket Challenge,
# or run the movement move run commands printed at the end.
#
# Prerequisites:
#   - movement CLI installed (https://docs.movementnetwork.xyz/devs/movementcli)
#   - profile "mainnet" with the module publisher key (0xf598…)
#   - MOVE on that account for gas
#   - USDCx on admin wallet for prize pool sponsor ($500)
#
# NEVER commit private keys or paste them in chat.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/move/fantasy-epl-contract"
MODULE_ADDR="${MODULE_ADDR:-0xf598f059a0353b0d9ea80c9fd9d1c3e15b71ff4535388dd79acf813b567c5b47}"
PROFILE="${MOVEMENT_PROFILE:-mainnet}"
RPC="${MOVEMENT_RPC:-https://mainnet.movementnetwork.xyz/v1}"
BRACKET_GW=10999
SPONSOR_MICRO=500000000

echo "== WC Bracket — mainnet package upgrade =="
echo "Module account: $MODULE_ADDR"
echo "CLI profile:    $PROFILE"
echo ""

cd "$PKG"

echo "→ compile"
movement move compile --dev

echo ""
read -r -p "Publish upgrade to mainnet now? [y/N] " confirm
case "$confirm" in
  y|Y|yes|Yes|YES) ;;
  *)
    echo "Skipped publish. Run manually:"
    echo "  cd $PKG"
    echo "  movement move publish \\"
    echo "    --named-addresses fantasy_epl_addr=$MODULE_ADDR \\"
    echo "    --profile $PROFILE"
    exit 0
    ;;
esac

echo "→ publish (upgrade)"
movement move publish \
  --named-addresses "fantasy_epl_addr=$MODULE_ADDR" \
  --profile "$PROFILE"

echo ""
echo "→ verify bracket ABI on-chain"
node "$ROOT/scripts/verify-wc-bracket-chain.mjs"

echo ""
echo "== Post-publish admin (order matters) =="
echo ""
echo "1) Create prize gameweek 10999:"
echo "   movement move run \\"
echo "     --function-id '${MODULE_ADDR}::fantasy_epl::create_gameweek' \\"
echo "     --args u64:$BRACKET_GW \\"
echo "     --profile $PROFILE"
echo ""
echo "2) Sponsor \$500 USDCx prize pool:"
echo "   movement move run \\"
echo "     --function-id '${MODULE_ADDR}::fantasy_epl::admin_sponsor_prize_pool' \\"
echo "     --args u64:$BRACKET_GW u64:$SPONSOR_MICRO \\"
echo "     --profile $PROFILE"
echo ""
echo "3) Open bracket challenge (first init MUST use module publisher wallet):"
echo "   movement move run \\"
echo "     --function-id '${MODULE_ADDR}::fantasy_epl::admin_init_bracket_challenge' \\"
echo "     --profile $PROFILE"
echo ""
echo "Or use /admin → Bracket Challenge after connecting the module wallet."
echo "Frontend: redeploy Vercel if needed (MODULE_ADDRESS unchanged)."
