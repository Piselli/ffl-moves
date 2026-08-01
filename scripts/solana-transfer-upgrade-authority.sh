#!/usr/bin/env bash
# Transfer program upgrade authority to Squads multisig vault.
# Usage:
#   MOVEMATCH_PROGRAM_ID=<id> SQUADS_UPGRADE_AUTHORITY=<vault> \
#     bash scripts/solana-transfer-upgrade-authority.sh
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PROGRAM_ID="${MOVEMATCH_PROGRAM_ID:?Set MOVEMATCH_PROGRAM_ID}"
SQUADS="${SQUADS_UPGRADE_AUTHORITY:?Set SQUADS_UPGRADE_AUTHORITY}"
KEYPAIR="${SOLANA_DEPLOYER_KEYPAIR:-$ROOT/solana/movematch/.keys/deployer.json}"
CLUSTER="${SOLANA_CLUSTER:-mainnet-beta}"

echo "Program:  $PROGRAM_ID"
echo "New UA:   $SQUADS"
echo "Cluster:  $CLUSTER"
echo "Signer:   $KEYPAIR"
echo
read -r -p "Transfer upgrade authority? [y/N] " confirm
[[ "$confirm" == [yY] ]] || exit 0

solana program set-upgrade-authority "$PROGRAM_ID" \
  --url "$CLUSTER" \
  --new-upgrade-authority "$SQUADS" \
  --keypair "$KEYPAIR"

solana program show "$PROGRAM_ID" --url "$CLUSTER"
echo
echo "Run: npm run preflight:solana"
