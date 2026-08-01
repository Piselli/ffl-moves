# 06 — Runbook Solana

Операційний документ: деплой, ініціалізація, цикл оракула, ротація ключів,
аварійні процедури. Усі факти звірені з
`solana/movematch/programs/movematch/src/lib.rs` станом на 2026-08-01.

Читати **до** першого mainnet-деплою. Розділ 2 містить речі, які після
`initialize` вже не змінити.

## 1. Що зараз розгорнуто

| Що | Значення |
|----|----------|
| Program id (devnet) | `A8UiSCd5yzhpZZwmop6k5upLVxUhDZq3x9pq7SfwoKN5` |
| Upgrade authority (devnet) | `Be2H3uNWxZRCXAoAw31nkgo7S1W5GprmS3a9QT8ZcxHh` |
| Ключ деплоєра | `solana/movematch/.keys/deployer.json` (у `.gitignore`) |
| Anchor / Solana | `anchor 1.1.2`, `solana 3.1.10` (`Anchor.toml`) |
| USDC devnet | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` |
| USDC mainnet | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |
| Внесок | `5_000_000` (5 USDC), `prize_pool_bps = 8000` |

PDA-адреси (сіди без ідентифікатора кластера, тож на devnet і mainnet вони
збігаються — розрізняє лише кластер):

| Акаунт | Сіди |
|--------|------|
| `Config` | `["config"]` |
| `Treasury` (лише підпис) | `["treasury"]` |
| `Gameweek` | `["gw", gameweek_id: u32 LE]` |
| `Entry` | `["entry", gameweek_id: u32 LE, owner]` |
| Treasury ATA | ATA(`usdc_mint`, `Treasury` PDA) |

## 2. Рішення, які не переграти після `initialize`

Це головна причина читати документ заздалегідь.

### 2.1 `INITIALIZER` вшитий у бінарник

```34:34:solana/movematch/programs/movematch/src/lib.rs
const INITIALIZER: Pubkey = pubkey!("Be2H3uNWxZRCXAoAw31nkgo7S1W5GprmS3a9QT8ZcxHh");
```

`initialize` приймає підпис **лише** від цього ключа
(`lib.rs:639`, `ErrorCode::UnauthorizedInitializer`). Зараз там devnet-деплоєр.
Без цієї константи PDA `Config` — вільна земля: хто перший викликав, той і
адмін, і оракул, і house.

Перед mainnet: підставити операційний ключ (або multisig), **перезібрати**
програму, і лише тоді деплоїти. Зміна константи після деплою вимагає ще одного
`anchor upgrade`.

### 2.2 `house_wallet` не змінюється

Інструкції `set_house_wallet` немає. `house_wallet` задається аргументом
`initialize` і живе в `Config` назавжди. Помилка тут лікується тільки міграцією
на новий `Config`, тобто новою програмою.

### 2.3 `house_wallet` мусить підписувати рефанди

`close_entry` вимагає **двох** підписів — адміна і house-гаманця:

```734:737:solana/movematch/programs/movematch/src/lib.rs
    #[account(address = config.house_wallet)]
    pub house_authority: Signer<'info>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = house_authority)]
    pub house_ata: Box<InterfaceAccount<'info, TokenAccount>>,
```

Причина: внесок розщеплюється між treasury (призова частина) і house (комісія),
і рефанд повертає обидві ноги. Призову тягне PDA, комісію — сам house.

**Наслідок для multisig:** якщо зробити `house_wallet` гаманцем Squads, кожен
рефанд стає пропозицією в multisig із кворумом. Для рутинної операції це дорого.
Рекомендація — розвести ролі:

| Роль | Кому |
|------|------|
| Upgrade authority | Squads multisig |
| `admins[]` | Squads + 1–2 гарячі операційні ключі |
| `house_wallet` | окремий гарячий ключ, що тримає лише комісію |
| Виведення накопиченої комісії | `withdraw_house` на адресу multisig |

Тобто multisig охороняє код і накопичені гроші, а не кожен рефанд. Ризик
гарячого house-ключа обмежений залишком комісії між виведеннями.

## 3. Ролі й що чим змінюється

| Роль | Де живе | Як змінити | Обмеження |
|------|---------|-----------|-----------|
| Upgrade authority | BPF loader | `solana program set-upgrade-authority` | одноразово незворотна, якщо віддати `--final` |
| `INITIALIZER` | константа в коді | перезбірка + `anchor upgrade` | діє лише на `initialize` |
| Адміни | `config.admins[5]` | `add_admin` / `remove_admin` | максимум 5; останнього не зняти (`CannotRemoveLastAdmin`) |
| Оракул | `config.oracle` | `set_oracle` | не може бути `Pubkey::default()` |
| House wallet | `config.house_wallet` | **ніяк** | див. 2.2 |
| Внесок | `config.entry_fee` | `set_fees` | діє на нові реєстрації |
| Частка призового | `config.prize_pool_bps` | `set_prize_pool_bps` | ≤ 10000; рефанд рахується за збереженою в `Entry` часткою, не за поточною |
| Пауза | `config.paused` | `set_paused` | блокує і claim-и теж — свідомо прийнято |

## 4. Деплой на mainnet

Передумови: розділ 2 закритий, Squads створений, адреси зафіксовані.

```bash
# 0. Прапорці кластера
solana config set --url mainnet-beta

# 1. Підставити операційний INITIALIZER у lib.rs, потім
cd solana/movematch
anchor build

# 2. Program id нової збірки
solana address -k target/deploy/movematch-keypair.json
```

Новий program id треба записати у трьох місцях, інакше клієнт піде не туди:

- `declare_id!` у `programs/movematch/src/lib.rs`
- `[programs.mainnet]` в `Anchor.toml` (секції зараз **немає**, додати)
- `NEXT_PUBLIC_MOVEMATCH_PROGRAM_ID` у продакшн-оточенні

Після правки `declare_id!` — `anchor build` ще раз, бо id зашитий у бінарник.

```bash
# 3. Деплой
anchor deploy --provider.cluster mainnet

# 4. Запас місця під майбутні апгрейди (бінарник росте)
solana program extend <PROGRAM_ID> 20000

# 5. Передати upgrade authority multisig-у
solana program set-upgrade-authority <PROGRAM_ID> \
  --new-upgrade-authority <SQUADS_VAULT>
```

Крок 4 не пропускати: без запасу перший же апгрейд, що збільшив бінарник,
впреться в розмір акаунта.

## 5. Ініціалізація

`migrations/initialize-devnet.mjs` захардкодив devnet program id (рядок 20),
devnet USDC (рядок 21) і ставить оракула та house на деплоєра (рядки 61–62).
Для mainnet потрібна окрема копія з реальними адресами — **не** запускати
devnet-версію проти mainnet.

Скрипт робить дві речі:

1. `initialize` — створює `Config` і treasury ATA.
2. `ensureHouseAta` — створює ATA house-гаманця.

Другий крок обов'язковий: `register_team` переказує комісію на house ATA, але
програма його не створює. Без нього деплой виглядає живим, а перша ж реєстрація
падає.

Після ініціалізації звірити on-chain `Config` з наміром: `usdc_mint`, `oracle`,
`house_wallet`, `entry_fee`, `prize_pool_bps`, `admins[0]`.

## 6. Цикл туру

Оракул і адмін ходять через `/admin` підключеним гаманцем. Серверного підписанта
немає: `ORACLE_KEYPAIR` згадується в `.env.example`, але код його не читає.
Отже приватний ключ оракула живе в гаманці людини, яка сеттлить тур.

| Крок | Інструкція | Хто підписує |
|------|-----------|--------------|
| 1. Відкрити тур | `create_gameweek` | admin |
| 2. Реєстрації | `register_team` | гравець |
| 3. Дедлайн | `close_gameweek` | admin |
| 4. Зібрати статистику | `npm run fpl:gw -- <gw>` | — |
| 5. Опублікувати статистику | `commit_stats(hash, uri)` | oracle |
| 6. Опублікувати результати | `publish_results(root, entries, allocated)` | oracle |
| 7. Виплати | `claim_prize` | гравець |
| 8. Залишок пулу | `release_unallocated` | admin |

`commit_stats` зберігає **хеш** файлу статистики, тому файл має лежати за
публічним URL — інакше ніхто не перевірить сеттл. За це відповідає
`NEXT_PUBLIC_STATS_BASE_URL`; на mainnet він обов'язковий, `/admin` без нього
кидає помилку.

Знати про `publish_results`: він перевіряє підпис оракула, але **не** звіряється
з `StatsCommit` того ж туру (знахідка #13 з фази 3). Тобто оракул технічно може
опублікувати корінь, що не відповідає закомміченій статистиці. Захист поки
процедурний.

## 7. Ротація ключів

**Оракул.** `set_oracle(new)` будь-яким адміном. Робити між турами: якщо
поміняти після `commit_stats`, але до `publish_results`, старий commit лишиться,
а новий оракул допублікує результати — розрив у ланцюжку відповідальності.

**Адмін.** `add_admin(new)` → перевірити, що новий ключ працює →
`remove_admin(old)`. Саме в такому порядку: слотів п'ять, а останнього адміна
програма зняти не дасть.

**Upgrade authority.** `solana program set-upgrade-authority`. Поточний власник
підписує. Передача на `--final` робить програму незмінною назавжди — це не
ротація, це відмова від апгрейдів.

**House wallet.** Не ротується (2.2). Якщо ключ скомпрометований: `set_paused`,
вивести залишок `withdraw_house`, і далі — міграція на новий `Config`.

## 8. Аварійні процедури

**Пауза.** `set_paused(true)` зупиняє реєстрації, але блокує і `claim_prize`.
Тримати паузу довше за інцидент не варто — це заморозка чужих грошей.

**Рефанд одному гравцю.** `close_entry` підписують адмін і house (2.3). Працює
лише поки тур `OPEN` або `CLOSED`; після `RESOLVED` — ні.

**Вивід із treasury.** `withdraw_treasury` не дасть опустити баланс нижче
`config.total_prize_obligation`:

```504:507:solana/movematch/programs/movematch/src/lib.rs
        require!(
            after >= ctx.accounts.config.total_prize_obligation,
            ErrorCode::OutstandingPrizeObligations
        );
```

Тобто невитребувані призи структурно захищені від виведення. Зворотний бік:
призи, за якими ніхто не прийшов, тримають частину treasury нескінченно
(знахідка #15, прийнято свідомо).

## 9. Перевірка перед mainnet

`npm run preflight:mainnet` наразі перевіряє **Movement**, не Solana. До
переписування — звіряти вручну:

- [ ] `NEXT_PUBLIC_SOLANA_CLUSTER=mainnet-beta`
- [ ] `NEXT_PUBLIC_SOLANA_RPC_URL` — платний RPC, не публічний
- [ ] `NEXT_PUBLIC_MOVEMATCH_PROGRAM_ID` = mainnet program id
- [ ] `NEXT_PUBLIC_USDC_MINT` = `EPjFWdd5…Dt1v`
- [ ] `NEXT_PUBLIC_STATS_BASE_URL` заданий і віддає файли публічно
- [ ] `Config` on-chain збігається з наміром (розділ 5)
- [ ] House ATA існує
- [ ] Upgrade authority = multisig
- [ ] Повний тур пройдено: реєстрація → сеттл → claim

Останній пункт — умова з `05-movement-archive.md`: Movement не відключаємо, поки
Solana не відпрацювала повний тур на mainnet.
