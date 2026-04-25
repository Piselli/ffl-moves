#!/usr/bin/env bash
# Частина B: додати профіль CLI "mainnet" без ручного копіпасту ключів
# (клонує існуючий testnet-профіль — за замовчуванням testnet3 — і міняє лише RPC на mainnet).
#
# Запуск з кореня репо:
#   bash scripts/setup-movement-mainnet-profile.sh
#
# Інший джерельний профіль:
#   bash scripts/setup-movement-mainnet-profile.sh testnet2
#
# Перезаписати існуючий mainnet:
#   FORCE_MAINNET_PROFILE=1 bash scripts/setup-movement-mainnet-profile.sh

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC_PROFILE="${1:-testnet3}"
CONFIG="$ROOT/.movement/config.yaml"

if [[ ! -f "$CONFIG" ]]; then
  echo "Помилка: немає $CONFIG"
  echo "Спочатку: cd \"$ROOT\" && movement init (або скопіюй свій config у .movement/)"
  exit 1
fi

ruby "$ROOT/scripts/movement_merge_mainnet_profile.rb" "$CONFIG" "$SRC_PROFILE"
