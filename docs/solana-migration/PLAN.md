# MoveMatch → Solana: план міграції

Мета: перенести продукт з Movement (Aptos Move) на Solana новим сезоном.
On-chain state з Movement **не мігрує** — новий деплой, новий сезон, стара мережа
переходить у read-only архів.

Джерело істини по бізнес-логіці лишається в TypeScript
(`src/lib/scoring.ts`, `chainAlignedScoring.ts`, `prize-distribution.ts`,
`worldcup.ts`, `wcBracketPrediction.ts`) — це не переписується.

## Протокол передачі між моделями

Кожна фаза виконується конкретною моделлю. Наприкінці фази модель:

1. дописує запис у `HANDOFF.md` (що зроблено, де файли, що лишилось відкритим);
2. виводить у чат рядок `STOP — перемикай на <модель>`;
3. **не** починає роботу наступної фази.

Модель, що приймає роботу, спершу читає `HANDOFF.md` і документи своєї фази —
контекст чату не потрібен.

## Фази

| # | Модель | Робота | Критерій завершення |
|---|--------|--------|---------------------|
| 1 | Opus 5 | Спека + архітектура + інтерфейс клієнта | Кожен Move-entry/view має рішення: порт, off-chain або drop |
| 2 | Terra | Anchor-програма + тести + devnet | Тести зелені, devnet живий, IDL згенеровано |
| 3 | Opus 5 | Security- і parity-рев'ю програми | Виправлені знахідки, golden-тести проти TS |
| 4 | Terra | `chainClient.ts`, гаманці, переписані сторінки й API | Повний user-flow на devnet у браузері |
| 5 | Composer | Прибирання Movement-коду, i18n, лінт | Немає мертвих імпортів, лінт і build чисті |
| 6 | Opus 5 | Pre-mainnet рев'ю, runbook, authority, sunset | Runbook + чеклист деплою готові |

### Фаза 1 — Opus 5 (спека й архітектура)

Вихідні документи:

- `01-onchain-spec.md` — інвентар усього, що є в `fantasy_epl.move`
- `02-solana-program-design.md` — дизайн Anchor-програми
- `03-chain-client-interface.md` — TS-інтерфейс на заміну `src/lib/movement.ts`
- `04-open-decisions.md` — рішення, які має ухвалити власник продукту

### Фаза 2 — Terra (реалізація програми)

- Anchor-воркспейс у `solana/movematch/`
- Інструкції за `02-solana-program-design.md`
- SPL USDC для entry fee й виплат
- Тести на localnet: happy path, ties, подвійний claim, чужий signer, переповнення
- Деплой на devnet, збережений program id та IDL

Не чіпати фронтенд у цій фазі.

### Фаза 3 — Opus 5 (рев'ю)

- Констрейнти акаунтів: owner, signer, PDA seeds, bump, `has_one`
- Арифметика призів і залишок при поділі між рівними
- Ідемпотентність claim, неможливість повторної виплати після реопену
- Межа довіри до oracle: що він може підробити, як це обмежено
- Golden-тести: результати програми vs `scoring.ts` і `prize-distribution.ts`

### Фаза 4 — Terra (інтеграція)

- `src/lib/chainClient.ts` за інтерфейсом з фази 1
- Wallet: Phantom/Solflare через Solana Wallet Adapter замість Aptos-адаптера
- Переписати місця з транзакціями: `src/app/gameweek/page.tsx`,
  `src/app/leaderboard/page.tsx`, `src/app/titles/page.tsx`,
  `src/app/world-cup/squad|leaderboard|bracket/page.tsx`, `src/app/admin/page.tsx`
- API-роути, що читають ланцюг: `api/registrations`, `api/quest`,
  `api/tour-claim-history`, `api/season-points/*`
- Депозити: замість Stableyard → Movement обрати шлях поповнення USDC на Solana

### Фаза 5 — Composer (рутина)

Передумова: виконаний чеклист із `05-movement-archive.md`. Прибирання йде **одним
комітом**, щоб `git revert` повертав інтеграцію цілком. Каталог `move/` не
видаляється.

- Видалити `src/lib/movement.ts`, `walletNightly.ts`, `usdcxBalance.ts`,
  `stableyard*.ts` і Move-скрипти, якщо вони більше не потрібні
- Оновити тексти, i18n, назви мережі й активу
- Лінт, типи, build

### Фаза 6 — Opus 5 (перед mainnet)

- Фінальне рев'ю дифу
- Runbook: деплой, upgrade authority, oracle-ключ, ротація
- Multisig (Squads) на upgrade authority і treasury
- Snapshot лояльної бази з Movement, політика рефералів і season points
- Sunset Movement: read-only архів, повідомлення гравцям
