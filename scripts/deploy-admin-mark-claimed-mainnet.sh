#!/usr/bin/env bash
# Upgrade fantasy_epl on Movement mainnet — adds admin_mark_prize_claimed.
# After publish, mark MD1 wallets that already claimed before recalc:
#   npm run md1:mark-prior-claims
#
# Prerequisites:
#   - movement CLI 7.4.x (https://docs.movementnetwork.xyz/devs/movementcli)
#   - profile "mainnet" with module publisher key (0xf598…)
#   - MOVE on publisher account for gas
#
# Config: repo .movement/config.yaml  OR  ~/.movement/config.yaml
#   npm run setup:movement-mainnet-profile   (clone testnet profile → mainnet RPC)
#
# NEVER commit private keys.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PKG="$ROOT/move/fantasy-epl-contract"
MODULE_ADDR="${MODULE_ADDR:-0xf598f059a0353b0d9ea80c9fd9d1c3e15b71ff4535388dd79acf813b567c5b47}"
PROFILE="${MOVEMENT_PROFILE:-mainnet}"

export MOVEMENT_CONFIG="${MOVEMENT_CONFIG:-$ROOT/.movement/config.yaml}"

echo "== MD1 recovery — admin_mark_prize_claimed mainnet upgrade =="
echo "Module account: $MODULE_ADDR"
echo "CLI profile:    $PROFILE"
echo "Config file:    $MOVEMENT_CONFIG"
echo ""

if [[ ! -f "$MOVEMENT_CONFIG" && ! -f "$HOME/.movement/config.yaml" ]]; then
  echo "No Movement CLI config found."
  echo "  cd $ROOT && movement init"
  echo "  npm run setup:movement-mainnet-profile"
  exit 1
fi

cd "$PKG"

echo "→ compile"
movement move compile --dev

echo "→ test"
movement move test --dev

echo ""
read -r -p "Publish UPGRADE to mainnet now? [y/N] " confirm
case "$confirm" in
  y|Y|yes|Yes|YES) ;;
  *)
    echo ""
    echo "Skipped. Publish manually:"
    echo "  cd $PKG"
    echo "  movement move publish \\"
    echo "    --named-addresses fantasy_epl_addr=$MODULE_ADDR \\"
    echo "    --profile $PROFILE"
    exit 0
    ;;
esac

echo "→ publish (upgrade — same module address, new bytecode)"
movement move publish \
  --named-addresses "fantasy_epl_addr=$MODULE_ADDR" \
  --profile "$PROFILE"

echo ""
node "$ROOT/scripts/verify-admin-mark-claimed-chain.mjs"

echo ""
echo "== Mark 3 MD1 wallets that already claimed (no second payout) =="
echo "  npm run md1:mark-prior-claims"
echo ""
echo "Or /admin → «Mark prize already claimed» (tour 10001, each owner)."
echo "Then: npm run md1:audit-payouts"
