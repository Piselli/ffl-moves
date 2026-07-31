# Журнал передач

Формат запису: дата, модель, фаза, що зроблено, що відкрито, кому передано.

---

## 2026-07-31 — Opus 5 — фаза 1 завершена

**Зроблено**

- `01-onchain-spec.md`: повний інвентар `fantasy_epl.move` — 30 entry-функцій,
  26 view, 12 подій, усі resources і константи. Кожен елемент має рішення:
  port / off-chain / drop / decision.
- `02-solana-program-design.md`: дизайн Anchor-програми — PDA й розміри акаунтів,
  життєвий цикл туру зі станом SETTLING, Merkle-схема результатів і claim,
  список інструкцій, валідації, бюджет CU, модель ключів, мапа Move → Solana.
- `03-chain-client-interface.md`: інтерфейс `src/lib/chainClient.ts` на заміну
  `movement.ts`, список 20 файлів-імпортерів, env-матриця.
- `04-open-decisions.md`: п'ять рішень із дефолтами (D1 Merkle, D2 hash-commit,
  D3 drop titles, D4 bracket за прапорцем, D5 зовнішні гаманці).

**Ключові архітектурні відступи від Movement-версії**

1. Результати туру — Merkle-корінь замість мапи на весь тур. Сеттл в одну
   транзакцію, рента лише за тих, хто забирає приз.
2. Статистика гравців — хеш опублікованого JSON замість 20 паралельних векторів
   у ланцюгу. Бойовий шлях і так рахує очки off-chain.
3. `Gameweek.teams` прибрано зі стану — учасники з подій або `getProgramAccounts`.
4. `reopen_gameweek` заборонений після першого claim.
5. Один актив (SPL USDC), без другої ноги на нативний токен.

**Відкрито**

- D1–D5 у `04-open-decisions.md`. Без відповіді — дефолти.
- Політика snapshot лояльної бази з Movement (це фаза 6).

**Далі**

Фаза 2 — Terra. Реалізувати Anchor-програму в `solana/movematch/` за
`02-solana-program-design.md`, тести на localnet, деплой на devnet.
Фронтенд не чіпати.

STOP — перемикай на Terra.

---

## 2026-07-31 — Opus 5 — доповнення до фази 1: архів Movement

**Зроблено**

- `05-movement-archive.md`: інвентар усього Movement-специфічного (контракт,
  бібліотеки, компоненти, 14 операційних скриптів, адреси, RPC), три рівні
  архіву й чеклист перед прибиранням.
- `04-open-decisions.md`: додано D6 — чи лишати обидва ланцюги живими.
- `PLAN.md`: фаза 5 тепер вимагає виконаного чеклиста архіву; прибирання одним
  комітом, каталог `move/` лишається.

- Мітка `movement-final` створена й запушена на origin (коміт `399fc8de`).
- `scripts/archive-movement-chain.mjs` написано й **виконано**:
  `archive/movement-snapshot/2026-07-31` — 14 турів, 264 гаманці, 62 файли, 1.2 МБ.

**Що знімок виявив (для фази 6)**

1. 11 невитребуваних призів у 6 турах — потрібна політика виплати або дедлайн.
2. Bracket закритий і не резолвлений: 18 прогнозів у ланцюгу, 0 результатів.
3. Історичний актив туру (MOVE vs USDCx) з ланцюга не відновлюється — зафіксувати
   вручну, поки пам'ятається.

**Рішення D6 (обидва ланцюги)**

Дволанцюговість лишається можливою в коді через абстракцію `chainClient.ts`, але
експлуатувати рекомендовано один ланцюг: Movement переходить у claims-only, потім
read-only. Причина не технічна — розділений призовий пул псує продукт на обох
мережах.

---

## 2026-07-31 — Terra — фаза 2: програма зібрана й протестована

**Тулчейн**

Стек 0.30.1 / Solana 1.18.26 виявився непридатним: його platform-tools несуть
Cargo 1.75, який не читає манифести Edition 2024 із сучасних транзитивних
крейтів. Замість підбору версій піднято актуальний стек.

| Компонент | Версія |
| --- | --- |
| Anchor CLI, `anchor-lang`, `anchor-spl` | 1.1.2 |
| Solana CLI (Agave) | 3.1.10 |
| Platform tools / SBF Rust | v1.52 / 1.89.0 |
| TypeScript-клієнт | `@anchor-lang/core` 1.1.2 |

Встановлення:

```
sh -c "$(curl -sSfL https://release.anza.xyz/v3.1.10/install)"
cargo install --git https://github.com/solana-foundation/anchor --tag v1.1.2 anchor-cli --locked
```

На macOS з Homebrew `rust` перехоплює `cargo` і ламає `cargo +toolchain`, який
викликає `cargo-build-sbf`. Перед збіркою в PATH має йти шим rustup:

```
export PATH="/opt/homebrew/opt/rustup/bin:$HOME/.local/share/solana/install/active_release/bin:$PATH"
```

**Міграція коду під Anchor 1.x**

- `CpiContext::new` більше не приймає `AccountInfo` програми — передаємо
  `token_program.key()`.
- `keccak` вилучено з фасаду `solana_program`; додано крейт
  `solana-keccak-hasher = "3"`.
- Секцію `[registry]` в `Anchor.toml` прибрано, вона більше не розпізнається.
- Усі токен-акаунти в `#[derive(Accounts)]` загорнуто в `Box`: без цього
  `RegisterTeam::try_accounts` давав фрейм 5248 байт проти ліміту 4096.
- Додано feature `idl-build`, без якої IDL не генерується.

**Зроблено**

- `anchor build` зелений, без ворнінгів. `movematch.so` — 440 992 байти.
- IDL і типи згенеровано: `solana/movematch/target/idl/movematch.json`,
  `solana/movematch/target/types/movematch.ts` — 18 інструкцій, 5 акаунтів,
  32 коди помилок.
- Bracket-модуль реально за `feature = "bracket"`: у дефолтній збірці його немає
  ні в IDL, ні в бінарі. Збірка `anchor build -- --features bracket` теж зелена.
- `anchor test --validator legacy` — 12 тестів проходять (~41 с). Покрито:
  розщеплення fee, форма складу / ліміт клубу / дублікати / повторна реєстрація,
  пауза, ties із перевіркою сум проти логіки `prize-distribution.ts`, підроблена
  сума в leaf, подвійний claim, claim чужим signer, oracle-авторизація,
  publish до закриття туру, allocation більший за пул, розбіжність entry count,
  заборона reopen після claim, захист unpaid obligations при withdraw,
  незмінність stats commit, refund через `close_entry`.
- Тести використовують surfpool-незалежний шлях; surfpool (дефолт `anchor test`
  у 1.x) не встановлений, тому потрібен прапорець `--validator legacy`.

**Деплой на devnet — виконано**

| Що | Значення |
| --- | --- |
| Program id | `A8UiSCd5yzhpZZwmop6k5upLVxUhDZq3x9pq7SfwoKN5` |
| ProgramData | `45b2UJAoa8QMTJLTw4qPhvr8KyqteU6iLMUSsZfxSD3v` |
| Upgrade authority / deployer | `Be2H3uNWxZRCXAoAw31nkgo7S1W5GprmS3a9QT8ZcxHh` |
| IDL metadata account | `3ryGY85h3Z1uDhjM2ytEJykwpa6t8CZYdMS8yBgH1MK8` |
| Data length | 440 992 байти, рента 3.0705 SOL |

Deployer keypair: `solana/movematch/.keys/deployer.json`, каталог у `.gitignore`.
`anchor idl fetch` з devnet повертає 18 інструкцій і 5 акаунтів, bracket
відсутній — збігається з локальним артефактом.

Пастка, на яку варто зважати при повторенні: `anchor build` генерує program
keypair у `target/deploy/`, тож зміна `CARGO_TARGET_DIR` дає новий keypair і
розсинхрон із `declare_id!`. Anchor 1.x попереджає про це рядком
`Program ID mismatch detected`, який легко втратити при грепанні виводу. Перший
деплой пішов на адресу, що не збігалась із `declare_id!`; виправлено через
`anchor keys sync` + rebuild + повторний `anchor deploy` (апгрейд на місці,
0.0023 SOL, рента не переплачується).

Деплой пройшов із точним розміром буфера, не подвоєним. Апгрейд має вкластися
в 440 992 байти, інакше спершу `solana program extend`.

**Відкрито**

- devnet USDC mint для `initialize` не зафіксовано; `initialize` на devnet ще не
  викликано, Config PDA не існує. У тестах створюється локальний mint на
  6 decimals.
- surfpool не встановлено, тому `anchor test` вимагає `--validator legacy`.

**Далі**

Фаза 3 — Opus 5, security- і parity-рев'ю програми за `PLAN.md`: констрейнти
акаунтів, арифметика призів і залишок при поділі між рівними, ідемпотентність
claim, межа довіри до oracle, golden-тести проти `scoring.ts` і
`prize-distribution.ts`. `chainClient.ts` — це фаза 4, не раніше.

Точки, на які рев'ю варто спрямувати першими, бо вони писалися під тиском
тулчейну і найменше відлежались:

1. `verify_proof` використовує сортовані пари без префікса домену — перевірити
   на second-preimage між leaf і internal node.
2. `publish_results` довіряє оракулу суму `prize_allocated`; програма звіряє її
   лише з розміром пулу, не з деревом. Оцінити, чи це прийнятна межа довіри.
3. Тестова функція `allocatePrizes` у `tests/movematch.ts` — це переписана від
   руки копія логіки тірів, а не імпорт із `src/lib/prize-distribution.ts`.
   Golden-тести мають ходити в справжній модуль, інакше звірка нічого не доводить.
4. `close_entry` повертає внесок цілком, але fee вже розщеплено: prize-нога йде
   з treasury, house-нога — з house ATA за підписом house_wallet. Перевірити
   поведінку, коли house ATA порожній.

STOP — перемикай на Opus 5 (фаза 3, рев'ю).

---

## 2026-08-01 — Opus 5 — фаза 3: security- і parity-рев'ю

Обʼєкт рев'ю: `programs/movematch/src/lib.rs`, `tests/movematch.ts`. Еталон —
`src/lib/prize-distribution.ts`, `src/lib/chainAlignedScoring.ts`,
`move/fantasy-epl-contract/sources/fantasy_epl.move`.

### Знахідки

| # | Рівень | Що | Вердикт |
| --- | --- | --- | --- |
| 1 | Високий | `initialize` без обмеження підписанта: перший, хто викличе, стає адміном, оракулом і власником house | Виправлено |
| 2 | Високий | `close_entry` рахував prize-ногу з **поточного** `prize_pool_bps`, а не з того, за яким внесок був прийнятий | Виправлено |
| 3 | Середній | Дерево результатів не звʼязане з `prize_allocated` — оракул міг опублікувати корінь, що роздає більше | Виправлено |
| 4 | Середній | Позиції гравців у програмі 1..4, а в Move-контракті й усьому `src/lib` — 0..3 | Виправлено |
| 5 | Середній | Нерозподілена частка пулу залишалася заблокованою назавжди | Виправлено |
| 6 | Середній | `create_gameweek` вимагав зростання id, що робило неможливими паралельні тури WC (10001+) після EPL-турів | Виправлено |
| 7 | Середній | Подія `TeamRegistered` не емітилась, хоча дизайн будує список учасників саме з неї | Виправлено |
| 8 | Середній | Тестова `allocatePrizes` роздавала весь залишок першому, а `calculate_results_v3` — по одиниці найпершим | Виправлено |
| 9 | Низький | Позиції лави (слоти 12–14) не валідувались зовсім | Виправлено |
| 10 | Низький | `close_entry` падав із непрозорою SPL-помилкою при порожньому house ATA | Виправлено |
| 11 | Низький | `oracle` / `house_wallet` можна було виставити в нульовий ключ | Виправлено |
| 12 | — | `verify_proof` без доменного префікса: second-preimage між leaf і внутрішнім вузлом | Хибна тривога, все одно закрито |
| 13 | Низький | `publish_results` не звірений зі `StatsCommit` | Відкрито |
| 14 | Низький | `set_paused` заморожує і claim уже виграних призів | Відкрито, рішення власника |
| 15 | Низький | Невитребувані призи блокують treasury без строку давності | Відкрито, рішення власника |

**Про знахідку 12 (перша гіпотеза фази 2).** Атака в цій конкретній схемі
нереалізовна: прообраз leaf має фіксовані 52 байти
(`owner || gw || rank || points || amount`), прообраз внутрішнього вузла — 64.
Щоб видати вузол за leaf, треба знайти прообраз keccak-256 у жорсткій 52-байтній
структурі, де `owner` прибитий до підписанта, а `gw_id` — до seeds PDA. Це повний
preimage-attack, не second-preimage. Префікси домену (`0x00` / `0x01`) все одно
додані — вони безкоштовні й потрібні для sum-tree.

**Про знахідку 3 (друга гіпотеза фази 2).** Оцінка межі довіри: сама по собі
переалокація не давала оракулу нічого нового — він і так призначає ранги й суми
довільно, а сукупна виплата була обмежена `prize_claimed <= prize_allocated <=
prize_pool`. Реальна шкода була в іншому: корінь, що роздає більше заявленого,
перетворює claim на гонку, і частина законних переможців не забирає нічого.
Межу звужено: дерево стало **sum-tree**. Внутрішній вузол комітить обидва хеші
дітей **і обидві суми дітей**, тож один proof дозволяє програмі відновити суму
всього дерева й вимагати `tree_total == prize_allocated`. Разом із наявною
перевіркою `prize_allocated <= prize_pool` це означає: опублікований корінь не
може роздати більше, ніж у пулі, і взагалі не сеттлиться, якщо не сходиться із
заявленою сумою. Занизити суму сусіда не вийде — вона в хеші батька.

Що оракул усе ще може: призначити довільні ранги й очки, віддати весь пул собі,
не опублікувати результати. Це навмисна межа за `02-solana-program-design.md` §7 —
доступу до treasury компрометація оракула не дає.

### Зміни в програмі

- `INITIALIZER` — константа з єдиним ключем, якому дозволено створити `Config`.
  **Перед mainnet-деплоєм замінити на операційний multisig і перезібрати.**
- `Entry.prize_contribution` — фактична prize-нога зберігається при реєстрації;
  `close_entry` повертає саме її. Розмір `Entry` 159 → 167 байт.
- Merkle: `result_leaf` з префіксом `0x00`; `ProofNode { hash, sum }`;
  `verify_proof` повертає суму дерева; `claim_prize` приймає
  `Vec<ProofNode>` і вимагає збігу з `prize_allocated`. Ліміт глибини 32.
- Позиції 0..3 (`POSITION_GK`…`POSITION_FWD`), валідуються всі 14 слотів.
- `release_unallocated(gw)` — адмінська інструкція, знімає з
  `total_prize_obligation` частку пулу, яку оракул не розподілив. Це не дрібниця:
  на турі з трьома учасниками дефолтна сітка призначає лише 65% пулу.
- `create_gameweek` більше не вимагає зростання id (повторне створення й так
  неможливе через `init`); `current_gameweek` тримає максимум.
- Події `TeamRegistered`, `EntryClosed`, `SurplusReleased`.
- `close_entry` перевіряє баланс house ATA і повертає `HouseBalanceInsufficient`.

Перевірені й визнані коректними: seeds і bump усіх PDA, `address`-констрейнти на
`usdc_mint` / `house_wallet` / `token_program`, ATA-констрейнти
`associated_token::authority`, ідемпотентність claim через `init` на
`ClaimReceipt`, заборона reopen після виплати, перевірка зобовʼязань у
`withdraw_treasury`, самореференційні seeds `[b"gw", gameweek.id]` (безпечні, бо
`id` пише лише програма).

### Зміни поза програмою

- `src/lib/prize-distribution.ts` — **додано** (нічого не переписано):
  `allocatePrizes()`, `sumPrizeAwards()`, типи `Standing` / `PrizeAward`. Це
  канонічне правило сеттлу, якого раніше не існувало в TS взагалі: воно жило
  тільки в `calculate_results_v3` і в рукописній копії всередині тестів.
  Правило залишку — як у Move: по одній одиниці найпершим у порядку сортування.
  Формулювання в `02-solana-program-design.md` §5 («залишок ... йде найпершим»)
  читалось як «увесь залишок першому» — саме так і зробив автор тестів фази 2.
  Розбіжність видно лише на групах від 3 рівних із залишком ≥ 2.
- `tests/resultsTree.ts` — будівник sum-tree. Фаза 4 має **перенести** його до
  `chainClient.ts`, а не копіювати.
- `tsconfig.json` + `Anchor.toml` — аліас `@/*` на `../../src/*` і прапорець
  `--paths` для `ts-mocha`, щоб тести ходили в справжні модулі.

### Тести

`anchor test --validator legacy` — **21 passing (~96 с)**. Було 12.
`anchor build` і `anchor build -- --features bracket` — чисті, без ворнінгів,
bracket у дефолтному IDL відсутній. `npx tsc --noEmit` у корені — чистий.

Нові golden-тести імпортують справжні `@/lib/prize-distribution` і
`@/lib/chainAlignedScoring`:

- виплата трьох рівних із залишком 2 — суми на гаманцях звіряються з модулем
  по одиниці (сценарій навмисно підібраний так, щоб старе правило залишку
  давало інший результат);
- параметрична звірка рангів і розкиду в межах групи на 6 формах × 4 пулах;
- WC-оверрайд сітки для турів 10001+;
- `previewTourPointsFromRegisteredTeam` рахує очки прямо з байтів `Entry`
  (без конвертації позицій — саме тому знахідка 4 виправлена в програмі),
  і leaf комітить ці очки: claim із `points + 1` відкидається;
- дерево, що роздає більше заявленого, не сеттлиться;
- proof із заниженими сумами сусідів ламає корінь;
- `close_entry` після зміни bps повертає початковий розподіл;
- `close_entry` з порожнім house ATA дає `HouseBalanceInsufficient`;
- `initialize` чужим ключем відкидається (перевірка виконується до створення
  `Config`, тому доводить саме констрейнт, а не «акаунт зайнято»).

### Devnet

Передеплой **не робив** — для перевірки він не потрібен, усе покрито localnet.
Але стан devnet треба знати:

- бінар виріс 440 992 → 454 472 байти, тож звичайний `anchor deploy` впаде:
  спершу `solana program extend A8UiSCd5yzhpZZwmop6k5upLVxUhDZq3x9pq7SfwoKN5 <delta>`;
- IDL на devnet застарів (18 інструкцій проти 19, старий формат proof);
- `Config` PDA на devnet досі не створений, а виправлення знахідки 1 живе в
  бінарі, якого там немає. До передеплою адресу `["config"]` теоретично може
  зайняти будь-хто, і апгрейд програми її не звільнить — PDA переживає upgrade.
  Для devnet це не критично (нових грошей там немає), але фаза 4 має починатися
  з передеплою, і лише потім із `initialize`.

### Відкрито

- **Рішення власника: правило залишку.** Прийнято Move-парність (по одиниці
  найпершим). Якщо канонічним вважається «весь залишок першому» — міняти треба
  `allocatePrizes` у `src/lib/prize-distribution.ts`, програма це не бачить.
- **Рішення власника: дедлайн claim.** Знімок Movement показав 11 невитребуваних
  призів у 6 турах. Зараз вони тримають treasury вічно. Потрібна політика:
  строк, після якого адмін може забрати, чи виплата вручну.
- **Рішення власника: `set_paused` морозить claim.** Технічно це навмисно, але
  означає, що адмін може безстроково затримати вже виграні гроші. Якщо це
  небажано — розділити паузу на register-паузу і claim-паузу.
- `INITIALIZER` вказує на devnet-деплоєр. Перед mainnet — замінити на multisig.
- `publish_results` не вимагає наявного `StatsCommit`. Звʼязати їх було б
  строгіше, але `commit_stats` — init-only, тож помилка оракула на етапі
  статистики заблокувала б сеттл туру. Лишив як є свідомо.
- devnet USDC mint для `initialize` досі не зафіксовано (тягнеться з фази 2).

STOP — перемикай на Terra (фаза 4)

---

## 2026-08-01 — Opus 5 — фаза 4: клієнт, гаманці й консюмери на Solana

Фаза 3 йшла паралельно; її ABI-зміни (sum-tree, позиції 0..3, `ProofNode`)
внесені в клієнт до фінальної перевірки, а не після.

### Передеплой devnet — виконано

`solana program extend` на дельту + `anchor deploy`. На ланцюгу тепер бінар із
усіма виправленнями фази 3, IDL — 19 інструкцій.

`Config` PDA `yuFG4rMsHP7zZyjv4k4JcE1rWyjBSvRg6NEsems5adX` створений
(`migrations/initialize-devnet.mjs`) і читається клієнтським декодером
байт-у-байт після апгрейду:

| Поле | Значення |
| --- | --- |
| admin / oracle / house | `Be2H3uNWxZRCXAoAw31nkgo7S1W5GprmS3a9QT8ZcxHh` |
| USDC mint | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Circle devnet) |
| entry fee | 5 000 000 (5 USDC) |
| prize pool | 8000 bps |

### Клієнт

- `src/lib/chainClient.ts` — єдиний вхід у ланцюг. PDA, декодери
  `Config` / `Gameweek` / `Entry` / `StatsCommit` / `ClaimReceipt`, білдери
  інструкцій, перевірка off-chain даних оракула.
- `src/lib/resultsTree.ts` — sum-tree **перенесено** з `tests/resultsTree.ts`
  (як вимагала фаза 3, не копією). Тепер і публікація результатів в адмінці, і
  перевірка proof у клієнті, і тести Anchor ходять в один модуль. Дубль у
  `tests/` видалено, тест імпортує `@/lib/resultsTree`.
- Результати не показуються, поки proof не відновлює корінь з ланцюга **і**
  сума дерева не дорівнює `prize_allocated` — та сама умова, що в програмі.
- `src/lib/movement.ts` перетворений на фасад: читання проксіює в `chainClient`
  з конверсією `bigint` → `number`, записи кидають помилку. Це дозволило не
  чіпати 20 файлів-імпортерів одночасно.

### Гаманці

Aptos-стек замінено на Solana Wallet Adapter (Phantom, Solflare).
`useSolanaWallet` дає сторінкам `address` / `connected` / `signAndSubmit`,
`WalletSessionRestore` став no-op — відновлення сесії робить `autoConnect`.

### Консюмери

| Шлях | Стан |
| --- | --- |
| `gameweek`, `world-cup/squad` | `buildRegisterTeam` |
| `leaderboard`, `world-cup/leaderboard`, results-room | `buildClaimPrize` |
| `admin` | create / close / reopen / set_fees / set_prize_pool_bps / sponsor / withdraw_treasury / commit_stats / publish_results |
| `/api/registrations`, `/api/quest` | читають через `chainClient` |
| `/api/results` | новий серверний проксі на `RESULTS_PUBLISH_BUCKET` |
| `titles`, `world-cup/bracket` | чесне «недоступно на Solana» замість викликів, яких немає в програмі |

Жоден клієнтський файл не імпортує Solana SDK напряму.

**Оракульський шлях в адмінці змінився за суттю.** Раніше статистика лилася в
ланцюг батчами по 100 гравців у 20 векторах. Тепер адмінка формує канонічний
JSON, віддає його файлом на завантаження й комітить у ланцюг лише keccak-хеш і
URI. Так само з результатами: `publish_results` шле корінь, а файл із proof-ами
качається локально. **Операційний наслідок: без завантаження цих двох файлів у
бакет тур не читається і призи не забираються.**

### Перевірки

- `anchor test --skip-local-validator` — **21 passing** уже проти спільного
  `src/lib/resultsTree.ts`. Тобто перенесення нічого не зламало.
- `npx tsc --noEmit` і `npm run build` — чисті; `next lint` без нових зауважень.
- surfpool у 1.x — дефолтний валідатор `anchor test`, він не встановлений.
  Робочий шлях: `solana-test-validator -r` фоном, airdrop на
  `.keys/deployer.json`, далі `anchor test --skip-local-validator`.

### Рішення власника (закриті 2026-08-01)

Три питання, що тягнулися з фази 3, закриті. Не піднімати їх заново:

| Питання | Рішення |
| --- | --- |
| Правило залишку при поділі між рівними | Лишається Move-парність — по одиниці найпершим у порядку сортування. `allocatePrizes` не чіпати. |
| Дедлайн claim для 11 невитребуваних призів Movement | Знято з розгляду, тема закрита. Ніякої політики строків не вводимо. |
| `set_paused` морозить claim | Лишається як є — це навмисний kill-switch, розділяти паузу не будемо. |

### Відкрито

- **Блокер повного e2e на devnet: у деплоєра 0 USDC.** Мінт Circle
  (`4zMMC9…ncDU`) чужий, самі не намінтимо. Власник бере USDC на
  [faucet.circle.com](https://faucet.circle.com) для devnet-гаманця. Без цього
  реєстрація й claim у браузері не проходяться. Все, що не потребує USDC,
  перевірено.
- `NEXT_PUBLIC_STATS_BASE_URL` і `RESULTS_PUBLISH_BUCKET` не налаштовані —
  без них `commit_stats` кидає помилку, а `/api/results` нічого не віддає.

STOP — чекаємо devnet USDC на e2e, далі фаза 5 (прибирання Movement) або
фаза 6 (міграція лояльної бази).

---

## 2026-08-01 — Opus 5 — фази 2–4 закомічені, роздача файлів оракула

Не нова фаза, а закриття боргу: до цього запису **весь код фаз 2–4 жив тільки в
робочому дереві**. `git ls-files solana` повертав нуль — Anchor-програми в
історії не існувало взагалі.

### Ключі

`solana/movematch/.keys/deployer.json` — upgrade authority задеплоєної програми,
під `.gitignore` і в одному екземплярі на диску. Копія покладена поза
репозиторієм: `~/Documents/movematch-devnet-keys/deployer.json`, права 600.
Pubkey звірено — `Be2H3uNWxZRCXAoAw31nkgo7S1W5GprmS3a9QT8ZcxHh`.

У `.gitignore` воркспейсу було `test-ledger`, а Anchor створює `.test-ledger` —
120+ файлів локального валідатора висіли як untracked. Виправлено.

### Роздача файлів оракула — вирішено без зовнішнього бакета

Обидва URL тепер мають дефолт «застосунок роздає сам із `public/data`»:

| Змінна | Без неї | З нею |
| --- | --- | --- |
| `NEXT_PUBLIC_STATS_BASE_URL` | `window.location.origin` + `/data/stats` | зовнішній бакет |
| `RESULTS_PUBLISH_BUCKET` | `request.nextUrl.origin` + `/data/results` | зовнішній бакет |

Операційний цикл: адмінка після коміту в ланцюг віддає файл на завантаження,
оператор кладе `stats-<gw>.json` у `public/data/stats/<gw>.json`, а
`results-<gw>.json` у `public/data/results/<gw>.json`, комітить і деплоїть.
Обидва alert-и в адмінці тепер називають точний шлях призначення.

Захист від незворотної помилки: `stats_uri` пишеться в `StatsCommit` назавжди
(`commit_stats` — init-only), тож на `mainnet-beta` виведення URI з origin
заборонене — без явного `NEXT_PUBLIC_STATS_BASE_URL` адмінка відмовляється
комітити статистику. На devnet origin підставляється мовчки, і це правильно:
локальний e2e читає з того самого localhost, на якому публікує.

### Що ввійшло в коміт

Anchor-воркспейс, `chainClient.ts`, `resultsTree.ts`, `useSolanaWallet.ts`,
Solana-провайдер гаманців, усі переписані сторінки й API, `/api/results`,
`public/data/*`, env-приклад, залежності.

**Що свідомо лишилось поза комітом.** У дереві паралельно живе велика
дизайнерська робота (`src/components/design-lab/**`, `src/app/design-lab/**`,
`public/design-lab` — **538 МБ** ассетів разом із чернетками й `_review`). Вона
не має стосунку до міграції й потребує окремого курування, бо в такому вигляді
в git їй не місце.

Зачіпка, про яку треба знати: `src/app/page.tsx` у робочому дереві вже рендерить
`LockerHero`, а мігрована головна переїхала в `src/app/classic/page.tsx`. У
коміт узято лише `classic/page.tsx`. Тому **в git головна тимчасово лишається
старою Aptos-версією** — вона компілюється, але в рантаймі впаде, бо
Aptos-провайдера більше немає. Хто робитиме коміт дизайну — має водночас
перевести `page.tsx` на нову головну.

### Гаманець для e2e

Створено окремий devnet-гаманець: `BjCBtn6kuiCEPT6cTbty75gJ8bdTxMqeHALbbMVi9eya`
(`solana/movematch/.keys/e2e-player.json`, каталог ігнорується git). Переказано
0.2 SOL з деплоєра на комісії — faucet Solana був зарейтлімлений. **Чекає USDC з
[faucet.circle.com](https://faucet.circle.com).**

Ключ лежить файлом, тож транзакційний e2e (реєстрація → коміт статистики →
публікація → claim) можна ганяти скриптом. Для підпису **в браузері** цей
гаманець доведеться імпортувати в Phantom за seed-фразою.

### Перевірки

`npx tsc --noEmit` і `npm run build` — чисті.

### Відкрито

- e2e на devnet: чекає USDC на `BjCBtn…9eya`.
- Дизайнерська робота не в git, зокрема нова головна. Ассети потребують
  курування (538 МБ, з них більшість — чернетки).
