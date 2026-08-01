#!/usr/bin/env bash
# Deploy movematch to Solana mainnet-beta.
#
# Prerequisites:
#   - target/deploy/movematch.so built with current INITIALIZER
#   - deployer.json funded with SOL (~3 SOL first deploy + buffer extend)
#
# Usage:
#   bash scripts/deploy-mainnet.sh
#
# After deploy:
#   MOVEMATCH_PROGRAM_ID=$(solana address -k solana/movematch/target/deploy/movematch-keypair.json) \
#   MOVEMATCH_ENTRY_FEE=100000 \
#   node solana/movematch/migrations/initialize-mainnet.mjs
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYPAIR="$ROOT/solana/movematch/.keys/deployer.json"
PROGRAM_SO="$ROOT/solana/movematch/target/deploy/movematch.so"
PROGRAM_ID_FILE="$ROOT/solana/movematch/target/deploy/movematch-keypair.json"
CLUSTER="${SOLANA_CLUSTER:-mainnet-beta}"
RPC="${SOLANA_RPC_URL:-}"

PROGRAM_ID="$(solana address -k "$PROGRAM_ID_FILE")"
SOL_BALANCE="$(solana balance -k "$KEYPAIR" --url "$CLUSTER" ${RPC:+--url "$RPC"} 2>/dev/null || echo "unknown")"

echo "== MoveMatch mainnet deploy =="
echo "Program id:  $PROGRAM_ID"
echo "Deployer:    $(solana address -k "$KEYPAIR")"
echo "Balance:     $SOL_BALANCE"
echo "Entry fee:   ${MOVEMATCH_ENTRY_FEE:-100000} micro-USDC (0.1 USDC pilot default)"
echo

if [[ ! -f "$PROGRAM_SO" ]]; then
  echo "Missing $PROGRAM_SO — build first:"
  echo "  cd solana/movematch && cargo-build-sbf --manifest-path programs/movematch/Cargo.toml --tools-version v1.52 --skip-tools-install --no-rustup-override --sbf-out-dir target/deploy"
  exit 1
fi

read -r -p "Deploy to mainnet-beta? [y/N] " confirm
[[ "$confirm" == [yY] ]] || exit 0

DEPLOY_ARGS=(--url "$CLUSTER" --keypair "$KEYPAIR" --program-id "$PROGRAM_ID_FILE" "$PROGRAM_SO")
[[ -n "$RPC" ]] && DEPLOY_ARGS=(--url "$RPC" --keypair "$KEYPAIR" --program-id "$PROGRAM_ID_FILE" "$PROGRAM_SO")

solana program deploy "${DEPLOY_ARGS[@]}"

echo "Extending program account for future upgrades…"
EXTEND_ARGS=(--url "$CLUSTER" --keypair "$KEYPAIR" "$PROGRAM_ID" 20000)
[[ -n "$RPC" ]] && EXTEND_ARGS=(--url "$RPC" --keypair "$KEYPAIR" "$PROGRAM_ID" 20000)
solana program extend "${EXTEND_ARGS[@]}"

echo
echo "Next:"
echo "  MOVEMATCH_PROGRAM_ID=$PROGRAM_ID MOVEMATCH_ENTRY_FEE=${MOVEMATCH_ENTRY_FEE:-100000} node solana/movematch/migrations/initialize-mainnet.mjs"
echo "  Set on Vercel: NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta, NEXT_PUBLIC_MOVEMATCH_PROGRAM_ID=$PROGRAM_ID"
echo "  NEXT_PUBLIC_USDC_MINT=EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v"
echo "  NEXT_PUBLIC_STATS_BASE_URL=https://<your-domain>/data/stats"
