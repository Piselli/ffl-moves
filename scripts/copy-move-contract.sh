#!/usr/bin/env bash
# Скопіювати твій Aptos Move-пакет контракту в цей репозиторій і спробувати зібрати.
#
# Використання:
#   bash scripts/copy-move-contract.sh /повний/шлях/до/твого/Move/проєкту
#
# Приклад (macOS):
#   bash scripts/copy-move-contract.sh ~/Projects/fantasy-epl-move

set -euo pipefail

SRC="${1:-}"
if [[ -z "$SRC" ]]; then
  echo "Помилка: не вказано шлях до Move-проєкту."
  echo "Приклад: bash scripts/copy-move-contract.sh /Users/me/my-fantasy-contract"
  exit 1
fi

if [[ ! -d "$SRC" ]]; then
  echo "Помилка: папки не існує: $SRC"
  exit 1
fi

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DEST="$REPO_ROOT/move/fantasy-epl-contract"

echo "→ Копіюю з: $SRC"
echo "→        у: $DEST"
rm -rf "$DEST"
mkdir -p "$(dirname "$DEST")"
cp -R "$SRC" "$DEST"

if [[ ! -f "$DEST/Move.toml" ]]; then
  echo "Попередження: у $DEST немає Move.toml — перевір, що копіюєш корінь Move-пакета."
fi

if command -v movement >/dev/null 2>&1; then
  echo "→ movement move compile …"
  (cd "$DEST" && movement move compile)
  echo "Готово: compile пройшов."
elif command -v aptos >/dev/null 2>&1; then
  echo "→ aptos move compile …"
  (cd "$DEST" && aptos move compile)
  echo "Готово: compile пройшов."
else
  echo "Не знайдено movement ні aptos у PATH — пропускаю compile."
  echo "  Movement: https://docs.movementnetwork.xyz/devs/movementcli"
  echo "  cd \"$DEST\" && movement move compile   # або aptos move compile"
fi

echo ""
echo "Далі (у корені репо):"
echo "  git add move/fantasy-epl-contract"
echo "  git status"
echo "  git commit -m \"Add fantasy_epl Move sources\""
echo "Потім у чаті: «Додав move/fantasy-epl-contract — дороби ончейн»."
