# 05 — Архів Movement і план відновлення

Принцип: **нічого не видаляємо до того, як Solana-версія відпрацює повний тур на
mainnet**. Movement-код лишається в git і в робочому стані; прибирання (фаза 5)
робиться окремим комітом, який легко відкотити.

## 1. Що де лежить

### Контракт і деплой

| Що | Шлях |
|----|------|
| Основний модуль | `move/fantasy-epl-contract/sources/fantasy_epl.move` (3230 рядків) |
| Move.toml | `move/fantasy-epl-contract/Move.toml` |
| Експеримент зі скорингом у ланцюгу | `move/onchain-scoring/sources/scoring.move` |
| Чеклист mainnet | `move/MAINNET_CHECKLIST.txt` |
| Підготовка USDCx entry fee | `move/USDCX_ENTRY_FEE_PREP.md` |
| Приклади профілів | `move/config-examples/` |
| Внутрішня інструкція | `move/ІНСТРУКЦІЯ_ДЛЯ_ТЕБЕ.txt` |

`move/**/build/` у `.gitignore` — артефакти перекомпілюються з джерел.

### Фронтенд і бібліотеки

`src/lib/movement.ts`, `src/lib/constants.ts` (адреса модуля й RPC),
`src/lib/walletNightly.ts`, `src/lib/usdcxBalance.ts`, `src/lib/stableyard.ts`,
`src/lib/stableyardClient.ts`, `src/lib/moveAddress.ts`,
`src/hooks/useStableyardDeposit.ts`, `src/components/WalletProvider.tsx`,
`src/components/MovementWalletRows.tsx`, `src/components/DevChainBanner.tsx`.

### Скрипти операцій

`scripts/setup-movement-mainnet-profile.sh`,
`scripts/movement_merge_mainnet_profile.rb`, `scripts/copy-move-contract.sh`,
`scripts/deploy-admin-mark-claimed-mainnet.sh`,
`scripts/deploy-wc-bracket-mainnet.sh`, `scripts/mark-md1-prior-claims-mainnet.sh`,
`scripts/preflight-mainnet.mjs`, `scripts/verify-chain.mjs`,
`scripts/verify-admin-mark-claimed-chain.mjs`,
`scripts/verify-legacy-move-withdraw-chain.mjs`,
`scripts/verify-wc-bracket-chain.mjs`, `scripts/fpl-oracle-gw.mjs`,
`scripts/audit-wc-*.ts`, `scripts/admin-mark-tour-claims.ts`.

### Ключові адреси й константи

- Модуль (за замовчуванням у `src/lib/constants.ts`):
  `0xf598f059a0353b0d9ea80c9fd9d1c3e15b71ff4535388dd79acf813b567c5b47`
- USDCx metadata (mainnet, у контракті):
  `0xba11833544a2f99eec743f41a228ca6ffa7f13c3b6b04681d5a79a8b75ff225e`
- RPC: `https://mainnet.movementnetwork.xyz/v1`, testnet `https://testnet.movementnetwork.xyz/v1`
- Stableyard chain id: `10002`
- Гаманці: Motion, Nightly

**Фактичні значення для продакшену — у `.env.local`, який не в git.** Зробити
його копію поза репозиторієм (менеджер паролів або зашифрований архів) разом із
CLI-профілем `~/.movement/config.yaml`. Без цих двох речей відновити операції
неможливо, навіть маючи весь код.

## 2. Три рівні архіву

### Рівень 1 — код (ризик нульовий)

Усе перелічене вище відстежується git. Мітка створена й запушена:

```
movement-final → 399fc8de (2026-07-20)
```

Відновлення: `git checkout movement-final` або `git revert` коміту прибирання.

### Рівень 2 — секрети й профілі (ризик середній)

Поза git: `.env.local`, `~/.movement/config.yaml`, приватні ключі адміна й
оракула, доступи до RPC-провайдера. Зберегти окремо **до** будь-якого прибирання.

### Рівень 3 — дані в ланцюгу (ризик найвищий)

Це єдине, що **не** відновлюється з репозиторію. Якщо Movement згорне публічні
RPC, історія турів стане недоступною назавжди. Код почекає, дані — ні.

Треба зняти локальні знімки, поки RPC живий:

- конфіг і адміни, оракул, ставки;
- усі gameweek: статус, prize pool, кількість учасників, список адрес;
- склади всіх учасників по кожному туру;
- результати: rank, base/final points, prize, claimed;
- статистика гравців по турах;
- bracket: стан, прогнози, результати, claim-и;
- сирі події для відтворення таймлайну.

Формат: JSON у `archive/movement-snapshot/<дата>/`, плюс контрольні суми.

## 3. Знімок ланцюга — зроблено

`scripts/archive-movement-chain.mjs` читає ланцюг тими самими view-функціями, що
й `src/lib/movement.ts`, і складає:

```
archive/movement-snapshot/<date>/
  config.json                  // адміни, оракул, ставки, поточний тур, актив
  module-abi.json              // ABI опублікованого модуля
  gameweeks/<id>.json          // стан + список учасників
  teams/<id>.json              // склади всіх учасників туру
  results/<id>.json            // rank, base/final points, prize, claimed
  stats/<id>.json              // статистика гравців, що були в складах
  titles-guilds.json
  bracket.json
  owners.json
  MANIFEST.json                // ledger version, час, sha256 кожного файлу
```

Перший знімок: `archive/movement-snapshot/2026-07-31`, 1.2 МБ, 62 файли,
3169 view-викликів, ledger зафіксовано в `MANIFEST.json`.

**14 турів, 264 унікальні гаманці:**

| Тури | Учасників |
|------|-----------|
| EPL 32–34 (внутрішні) | 2–3 на тур |
| EPL 35 | 14 |
| EPL 36–38 | 137 / 126 / 137 |
| WC 10001–10006 | 21 → 2 (спадання по ходу турніру) |
| WC 10999 (bracket prize) | 0, статус CLOSED |

Повтор знімка перед самим прибиранням — це та сама команда, вона пише в папку з
новою датою.

### Що знімок показав (важливе для sunset)

1. **11 невитребуваних призів** у 6 турах: GW33 ×1, GW35 ×2, GW36 ×1, GW37 ×1,
   WC 10001 ×3, WC 10005 ×3. Ці гроші лежать у vault і чекають `claim_prize`.
   Перед відключенням Movement потрібна політика: або примусова виплата
   адміном, або дедлайн з попередженням гравців.
2. **Bracket-челендж закритий, але не резолвлений**: статус CLOSED, 18 прогнозів
   у ланцюгу, жодного результату. Тобто on-chain ці 18 людей формально не мають
   ні рангів, ні призів. Якщо призи за bracket обіцяні — це відкрите
   зобов'язання, яке треба або закрити через `admin_resolve_bracket_challenge`,
   або явно оголосити скасованим.
3. **Актив туру не відновлюється з ланцюга.** Контракт зберігає лише поточний
   `EntryFeeAssetConfig`, тому історичні суми в `results/*.json` — це сирі числа
   без позначки, чи це MOVE (8 знаків), чи USDCx (6 знаків). Ранні тури йшли на
   MOVE, WC-тури — на USDCx. Відповідність «тур → актив» треба зафіксувати
   вручну поруч зі знімком, поки її ще пам'ятають, інакше цифри стануть
   неінтерпретовними.

## 4. Що прибирати у фазі 5 і як це відкотити

Прибирання робиться **одним комітом** із назвою на кшталт
`chore: retire Movement integration` і торкається лише інтеграційного шару:
`movement.ts`, `walletNightly.ts`, `stableyard*`, `usdcxBalance.ts`,
Movement-specific компонентів і скриптів.

Каталог `move/` **не видаляти** — залишити як довідник, він нічого не важить у
збірці.

Відкат: `git revert <sha>` повертає інтеграцію повністю, разом із адресами й
RPC-налаштуваннями.

## 5. Чеклист перед прибиранням

- [x] Мітка `movement-final` створена й запушена
- [x] Знімок ланцюга знято, `MANIFEST.json` перевірено
- [ ] `.env.local` і `~/.movement/config.yaml` збережені поза репозиторієм
- [x] Зафіксовано відповідність «тур → актив» (MOVE чи USDCx) — `archive/movement-snapshot/2026-07-31/TOUR-ASSETS.md`, **виправлено у фазі 6**: усі EPL-тури йшли на MOVE, USDCx був лише на WC
- [x] Вирішено долю 11 невитребуваних призів — без дедлайну, claim лишається відкритим (HANDOFF 2026-08-01). Суми: 2 526.11 MOVE + 26.38 USDCx
- [x] Лояльна база зведена — `npm run loyalty:snapshot`, 264 гаманці
- [x] Чернетки повідомлень гравцям готові — `docs/solana-migration/07-sunset.md`
- [x] Вирішено долю bracket-челенджу — off-chain сторінка + ручні виплати (2026-08-01)
- [ ] Solana-версія відпрацювала повний тур на mainnet (реєстрація → сеттл → claim) — **фаза 6**
- [ ] Гравцям розіслано оголошення — після mainnet-туру, тексти в `07-sunset.md`
- [x] Невитребувані призи на Movement — політика: без строку, без примусової виплати
