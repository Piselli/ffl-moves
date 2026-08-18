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

---

## 2026-08-01 — Opus 5 — фаза 4 закрита: повний тур на devnet пройдено

Тур **900** створений і покинутий (порожній, лишився відкритим), тур **901**
пройдений повністю: три склади → закриття → коміт статистики → публікація
результатів → три claim → звільнення нерозподіленого залишку.

### Як ганяти

`scripts/e2e-devnet.mts` — увесь флоу через **справжні** модулі:
інструкції з `chainClient`, виплати з `prize-distribution`, дерево з
`resultsTree`. Це не паралельна копія логіки, тому зелений прогін означає, що
працює саме браузерний шлях.

```
npm run dev                        # роздає файли оракула з public/data
npx tsx scripts/e2e-devnet.mts
```

Дві пастки середовища, не коду. `tsx` піднімає unix-сокет, тож у пісочниці не
стартує. І дві копії `next dev` на одному репозиторії трощать спільний `.next`:
перша починає віддавати 404 на власні чанки, сторінка лишається на «Loading
data…». Лікується `rm -rf .next` і одним сервером.

### Результат прогону (тур 901)

| Що | Значення |
| --- | --- |
| Учасників | 3, внесок 5 USDC |
| Пул | 12 USDC (80% від внесків) |
| Розподілено | 7.8 USDC: 3.6 / 2.4 / 1.8 при 74 / 67 / 61 очках |
| Залишок | 4.2 USDC звільнено через `release_unallocated` |
| Корінь | `c7e3fd8e…28666c51`, `prizeClaimed == prizeAllocated` |

Перевірено по дорозі: внесок списується рівно один раз, пул дорівнює
prize-нозі всіх внесків, `getProgramAccounts` знаходить усіх учасників,
опублікована статистика проходить keccak-звірку з `StatsCommit`, сума дерева
дорівнює заявленій алокації, суми на гаманцях збігаються з `allocatePrizes`,
повторний claim відкидається, зобовʼязання падає рівно на нерозподілену частку.

### Знайдено й виправлено

**1. Перша реєстрація на свіжому деплої була неможлива.** `register_team`
вимагає ATA house-гаманця, але його ніхто не створює: `initialize` робить лише
treasury ATA. Будь-який новий деплой дає незрозумілий `AccountNotInitialized`
на `house_ata` — і саме на першому платному кроці продукту. Програму не чіпав:
`buildRegisterTeam` тепер створює цей ATA ідемпотентно, а
`initialize-devnet.mjs` створює його одразу (і доробляє на вже
проініціалізованому деплої). Перед mainnet варто перенести це в `initialize`,
щоб рента за акаунт house не падала на першого гравця.

**2. `/api/tour-claim-history` був повністю Movement-ний.** Він сканував
Aptos-транзакції гаманця в пошуках виклику `claim_prize` — на Solana це не має
сенсу, роут віддавав 500. Переписаний на `ClaimReceipt`: PDA створюється самою
виплатою, а reopen після claim заборонений, тож це джерело істини, яке не
може застаріти. Читання батчами по 100 через `getMultipleAccountsInfo`.
Роут фігурував у списку фази 4 в `PLAN.md`, але в таблиці консюмерів його не
було — тобто його просто пропустили.

**3. Solana-адреси проганялися через нормалізатор Move-адрес.** У лідерборді
гаманці показувалися як `0xbjcb...9eya`: `normalizeMoveAccountAddress` зводить
рядок у нижній регістр і додає `0x`. Base58 регістрозалежний, тож це не лише
косметика — дві різні адреси можуть злитися в один ключ. Виправлено в
`tourClaimHistory` і `useNickname`; `moveAddress.ts` більше не використовується
жодним Solana-шляхом і має піти у фазі 5.

**4. `DevChainBanner` показував Movement RPC і Move-модуль**, тобто робив
протилежне задуму — маскував реальну мережу. Тепер показує кластер, RPC і
program id, і попереджає про розбіжність кластера з хостом RPC.

### Стан devnet після прогону

| Гаманець | USDC |
| --- | --- |
| `BjCBtn…9eya` | 8.6 |
| `C8itoX…tQUz` | 2.4 |
| `SYJWA2…VSei` | 1.8 |

Разом 12.8 — вистачає ще на два внески, не на три. Ключі гравців B і C:
`solana/movematch/.keys/e2e-player-{b,c}.json` (каталог ігнорується git).
Опубліковані файли туру 901 лежать у `public/data/{stats,results}/901.json` і
закомічені: без них тур не читається, а `stats_uri` в ланцюзі незмінний.

**Увага до `stats_uri`:** для туру 901 у ланцюг записано
`http://localhost:3000/data/stats/901.json`. На devnet це нормально, але
показує, чому на mainnet виведення URI з origin заборонене.

### Лишається на фазу 5 (Composer)

Косметика, яку видно на кожній сторінці: заголовок «fantasy on Movement»,
підпис «Real on-chain results · GW 901 · Movement», актив підписаний як
`USDCx` замість USDC, невикористаний ключ i18n `devBanner.envHint`, мертвий
`moveAddress.ts`. Плюс сам `movement.ts`-фасад і 20 його імпортерів.

### Відкрито

- Прибирання Movement (фаза 5) — Composer, чеклист у `05-movement-archive.md`
  тримають операційні рішення, не код.
- Дизайнерська робота досі не в git, зокрема нова головна (`page.tsx` →
  `LockerHero`); у git головна лишається старою Aptos-версією.

STOP — фаза 4 закрита. Далі фаза 5 (Composer) або фаза 6 (Opus 5).

---

## 2026-08-01 — Opus 5 — фаза 5 завершена (прибирання Movement)

**Операційні рішення, які тримали чеклист**

- Невитребувані призи (11 шт., усі USDCx-ери): дедлайну немає, лишаються
  claimable на Movement безстроково.
- Bracket-челендж (тур 10999, 18 прогнозів, CLOSED, без результатів) — перенесено
  у фазу 6, до оголошення sunset.
- Повідомлення гравцям — фаза 6, перед mainnet або на старті claims-only вікна.
- Мапа «тур → актив» зафіксована в `archive/movement-snapshot/2026-07-31/TOUR-ASSETS.md`.

**Видалено**

- Файли: `movement.ts`-фасад, `walletNightly.ts`, `moveAddress.ts`,
  `usdcxBalance.ts`, `stableyard.ts` / `stableyardClient.ts`,
  `useStableyardDeposit.ts`, `MovementWalletRows.tsx`, `RegistrationCostPanel.tsx`.
- Дві admin-секції, недоступні на Solana назавжди: вивід legacy MOVE із vault і
  `admin_mark_prize_claimed` (обидві `has*OnChain` поверталися `false` безумовно).
  Разом із ними — стан, хендлери й ~25 i18n-ключів.
- Поля титулів і гільдій із форми внесків: `set_fees` на Solana приймає лише
  `entry_fee`, решта полів була декоративною.
- Мертві i18n-ключі: `stableyard*` (14), `entryFeeLegacyBanner`,
  `registrationTopUp*`, `entryFeeUsdcxHint`, `insufficientFundsTopUp`.

**Спрощено**

- `entryFee.ts` — прибрано дуальність MOVE/USDCx. `getConfig()` на Solana завжди
  повертав `entryFeeAsset: 1`, тож MOVE-гілка була недосяжна. Тепер один актив,
  6 знаків, без параметра `asset` у форматерах.
- `PrizeAssetProvider` більше не робить RPC-запит заради константи;
  `ChainConfig` втратив `titleFee`, `guildFee`, `entryFeeAsset`, `usdcxEntryLive`.
- `adaptFaqCopy` — regex-адаптер, що на льоту переписував MOVE → USDCx у FAQ
  (30 правил на дві мови). Копірайт тепер написаний прямо в USDC.
- `formatTxError` парсив Move abort-коди: будь-яке число 1–200 у тексті помилки
  давало українську підказку про Move-контракт. Замінено на читання Anchor-логів.
- Перехідні аліаси `*FromChain` / `*OnChain` / `getGameweekTeams` розібрані по
  15 файлах — лишились справжні імена з `chainClient`.
- `constants.ts` — без Movement RPC, `MODULE_ADDRESS`, `MODULE_NAME`,
  `ENTRY_FEE_MOVE` і метаданих USDCx.
- `utils.ts` — без `formatMOVE` / `octasToMOVE` / `moveToOctas`.

**Копірайт**

- FAQ обома мовами: Motion/Nightly → Phantom/Solflare, Movement/USDCx → Solana/USDC,
  свопи на Yuzu → своп у гаманці або вивід із біржі в мережі Solana. Додано
  попередження про вибір мережі при виводі.
- Admin: `get_config` → акаунт Config, октаси → мікро-одиниці USDC,
  `0x…`-адреси → base58, ABI/publish пакета → інструкції та деплой програми.
- i18n-ключі гаманців перейменовані під фактичні значення
  (`openInNightly` → `openInSolflare` тощо).

**Свідомо лишено**

- Дві згадки Movement в admin-копірайті — історична довідка про те, що
  bracket-інструкції не переносили.
- `design-lab/` і `design-preview/` — внутрішні макети з написами
  «Movement Network» і `USDCx`; не продакшн-поверхні.
- Коментарі в `scoring.ts`, `scoring-rules.ts`, `chainAlignedScoring.ts`, що
  посилаються на `fantasy_epl.move` як джерело числової парності. Потребують
  перенацілювання на Solana-програму — окрема задача.

**Перевірено:** `tsc --noEmit` чисто, `next lint` без нових попереджень,
`npm run build` проходить.

### Відкрито

- Дизайнерська робота досі не в git, зокрема нова головна (`page.tsx` →
  `LockerHero`); у git головна лишається старою Aptos-версією.
- `.env.local` + `~/.movement/config.yaml` — бекап на власнику, перед фінальним
  відключенням Movement.

STOP — фаза 5 закрита. Далі фаза 6 (Opus 5).

## 2026-08-01 — Opus 5 — фаза 6 (частина, яку можна зробити без власника)

**Коміти.** Робота фази 5 лежала незакоміченою разом із дизайном. Розведено на
три коміти: дизайн і головна (`LockerHero`), фото-пайплайн FPL + каталог гравців
на сезон 2026/27, і власне прибирання Movement. `origin/main` досі на
`399fc8d` — усе після нього не запушено.

Дизайн-асети: на диску 538 МБ, у git пішло 86 МБ. Проміжні генерації
(`kit/filled-plates`, `kit/bay-refs`, `kit/_review`, `kit/bay*`) і 23 з 24
ітерацій плити — в `.gitignore`, лишились локально в дизайнера.

**Помилка фази 5, яку знайшов і виправив**

`TOUR-ASSETS.md` стверджував, що EPL-тури 35–38 йшли на USDCx із внеском
5 USDCx. Це неправда на чотири порядки. Пул ділений на учасників дає ~1e10 на
вхід — це 75–300 MOVE (8 знаків), а не 7 500–29 400 USDCx (6 знаків). Останнє
означало б $4 млн призових на 137 гравців. Звіряння з `ENTRY_FEE_MOVE = 300` на
тегу `movement-final` підтвердило: **усі EPL-тури були на MOVE, USDCx був лише
на ЧС-турах**. Іронія в тому, що вихідний `05-movement-archive.md` це писав
правильно — помилку вніс я, коли складав мапу.

Наслідок: невитребувані призи — не «11 дрібних USDCx», а **2 526.11 MOVE плюс
26.38 USDCx**. Дві третини суми в одного гравця, що зіграв один тур (GW36,
1 575.50 MOVE) і не повернувся. Це змінює зміст sunset-розсилки.

**Зроблено**

- `docs/solana-migration/06-runbook.md` — деплой, ініціалізація, цикл туру,
  ротація ключів, аварійні процедури.
- `npm run preflight:solana` (`--devnet`) — перевіряє оточення й одразу звіряє
  його з ланцюгом: upgrade authority, `Config`, treasury і house ATA, залишок
  проти `total_prize_obligation`. Стару Movement-перевірку перейменовано на
  `preflight:movement`.
- `npm run loyalty:snapshot` — зводить архів у `loyalty.json` / `loyalty.csv`.
  264 гаманці, 106 повернулись, 7 ядро, 18 bracket-прогнозів. Читає лише архів,
  тож переживе відключення RPC.
- `docs/solana-migration/07-sunset.md` — порядок оголошення, чернетки текстів
  двома мовами, адресна розсилка про невитребувані призи, варіанти щодо bracket.

**Знайдено в програмі (для рішення про multisig)**

- `INITIALIZER` (`lib.rs:34`) — компайл-тайм константа, зараз devnet-деплоєр.
  Без заміни й перезбірки mainnet-`Config` може перехопити будь-хто.
- `house_wallet` **не змінюється**: інструкції `set_house_wallet` немає.
- `close_entry` вимагає підпису `house_wallet` на кожен рефанд. Якщо зробити
  house-гаманцем Squads, кожен рефанд стає multisig-пропозицією. Рекомендація в
  runbook §2.3 — рознести ролі: multisig на upgrade authority і як отримувач
  `withdraw_house`, окремий гарячий ключ як `house_wallet`.

**Блокери, які не закриваються без власника**

- Multisig — відкладено до підготовки mainnet-деплою (власник не розбирається в
  деталях; runbook §2–3 описує що саме треба зробити, коли дійде черга).
- Повний тур на mainnet.
- Чи зараховувати Movement-історію в season points, і чи будувати flow
  «доведи контроль над старим гаманцем».

**Рішення власника 2026-08-01 (додатково)**

- Невитребувані призи (11 шт.) — ок: це тестери/підтримка, claim не очікується.
- Bracket 10999 — off-chain: сторінка результатів + прямий переказ переможцям.
- Головна: затемнення поки LockerHero не завантажить фон і планшет (`LockerHeroBoot`).

**2026-08-01 — security review finding #13 закрито**

`publish_results` тепер вимагає ініціалізований `StatsCommit` PDA для того ж
gameweek. Без попереднього `commit_stats` інструкція відхиляється (`StatsNotCommitted`).
`commit_stats` також відхиляє нульовий hash. Оновлено `chainClient`, admin UI,
тести, runbook §6. **Потрібен redeploy програми** (devnet і далі mainnet).

---

## 2026-08-15 — підготовка mainnet без SOL

Власник не має зараз SOL / платного RPC. Зроблено все, що не вимагає грошей.

**3-4-3 разом із 4-3-3**

- `validate_team` у програмі пускає обидві схеми; Anchor-тест реєструє 3-4-3.
- Клієнт відхиляє інші XI до відправки транзакції.
- Пітч (реєстрація, лідерборд, share-постер) читає layout з `PITCH_SLOT_LAYOUTS`.
- `MIN_PUBLIC_LEADERBOARD_GW` = 1 (новий сезон на Solana, не Movement 35+).

**Артефакти деплою**

- `[programs.mainnet]` у `Anchor.toml` — той самий program id, що на devnet.
- `.env.example` має закоментований блок Vercel Production.
- `npm run preflight:solana:offline` — ключі, INITIALIZER, USDC mint, house ATA
  у скрипті, обидві схеми. Без RPC.
- Runbook §9 розділяє безкоштовні галочки і те, що коштує SOL.

**Далі, коли зʼявляться гроші:** ~3–4 SOL на deployer, Helius/QuickNode,
`bash scripts/deploy-mainnet.sh`, `initialize-mainnet.mjs`, Vercel env,
`create_gameweek` на GW1 (FPL дедлайн 2026-08-21 17:30 UTC).
