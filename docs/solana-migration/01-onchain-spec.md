# 01 — Інвентар поточного on-chain шару

Джерело: `move/fantasy-epl-contract/sources/fantasy_epl.move` (3230 рядків),
модуль `fantasy_epl_addr::fantasy_epl`. Клієнт: `src/lib/movement.ts` (660 рядків).

Це фактичний зріз того, що працює на Movement сьогодні. Колонка «Solana»
показує рішення фази 1: `port` — переносимо, `off-chain` — виносимо з ланцюга,
`drop` — не переносимо, `decision` — рішення за власником (див. `04-open-decisions.md`).

## 1. Стан (resources)

| Resource | Поля | Solana |
|----------|------|--------|
| `Config` | `admins: vector<address>`, `oracle`, `entry_fee`, `title_fee`, `guild_fee`, `prize_pool_percent`, `current_gameweek` | port (PDA `config`) |
| `EntryFeeAssetConfig` | `asset: u8` (MOVE=0 / USDCX=1), `usdc_metadata_addr` | спрощується: лише SPL USDC mint у `Config` |
| `GameweekRegistry` | `Table<u64, Gameweek>` | port як окремі PDA на кожен gameweek |
| `Gameweek` | `id`, `status`, `prize_pool`, `total_entries`, `teams: vector<address>` | port, але **без** `teams` (необмежений вектор) |
| `Team` | `owner`, `gameweek_id`, `player_ids: vector<u64>` (14), `player_positions: vector<u8>`, `player_clubs: vector<u64>`, `created_at` | port у PDA `entry` з фіксованими масивами |
| `UserTeams` | `Table<u64, Team>` під адресою користувача | замінюється на PDA per (gw, owner) |
| `UserTitle` | `title_type`, `multiplier` (bps), `season` | decision |
| `UserGuild` | `multiplier`, `season` | decision |
| `PlayerStatsRegistry` / `PlayerStats` | 20 полів на гравця, `Table<gw, SimpleMap<player_id, PlayerStats>>` | decision (повний порт дорогий — див. §5) |
| `TeamResult` | `owner`, `base_points`, `rating_bonus`, `rating_bonus_negative`, `title_triggered`, `title_multiplier`, `guild_triggered`, `guild_multiplier`, `final_points`, `rank`, `prize_amount`, `claimed` | port у скороченому вигляді (поля title/guild у v3 не заповнюються) |
| `ResultsRegistry` | `Table<gw, SimpleMap<address, TeamResult>>` | decision: Merkle-root або PDA на переможця |
| `BracketChallengeState` | `status`, `total_entries` | port (за окремим прапорцем події) |
| `BracketPredictionData` | `group_ranks` 48B, `third_place_order` 12B, `knockout_winners` 32B, `submitted_at` | port (92 байти — вміщується легко) |
| `BracketChallengeResult` | `score`, `rank` (1–5), `prize_amount`, `claimed` | port |
| `TreasuryAuth` | `SignerCapability` resource account | замінюється PDA-authority + ATA |

Константи, які треба зберегти 1:1:

- Склад: `TOTAL_SQUAD_SIZE = 14`, `STARTING_XI_SIZE = 11`, `BENCH_SIZE = 3`, `MAX_PER_CLUB = 3`
- Формація стартових: `1 GK / 4 DEF / 3 MID / 3 FWD`
- Позиції: `GK=0, DEF=1, MID=2, FWD=3`
- Статуси: `OPEN=0, CLOSED=1, RESOLVED=2`
- WC: `WC_BRACKET_MD1_TOUR = 10001`, `WC_BRACKET_PRIZE_GW = 10999`, байти 48/12/32
- Entry fee за замовчуванням: `5_000_000` (5 USDC, 6 знаків)
- Множники title/guild у bps: `500 / 1000 / 1500`

## 2. Entry-функції (30) і їх доля

### Адмін / конфіг

| Move | Solana | Нотатки |
|------|--------|---------|
| `register_treasury_for_claims` | port → `init_treasury` | PDA-authority + USDC ATA замість resource account |
| `create_gameweek(id)` | port | створює PDA gameweek, статус OPEN |
| `close_gameweek(id)` | port | OPEN → CLOSED |
| `reopen_gameweek(id)` | port | CLOSED/RESOLVED → OPEN, чистить результати; потребує явної політики щодо вже виплачених призів |
| `admin_reset_gameweek_registrations(id)` | decision | рятувальна операція після поганого вікна оплат; на Solana означає закриття всіх entry-PDA й повернення коштів |
| `set_oracle` | port | |
| `set_fees(entry, title, guild)` | port (частково) | title/guild — лише якщо лишаємо titles |
| `set_entry_fee_asset` | drop | на Solana одразу SPL USDC, без другого активу |
| `set_prize_pool_percent(0–100)` | port | краще у bps |
| `add_admin` / `remove_admin` | port | або замінити на Squads multisig як єдиного адміна |
| `admin_withdraw_prize_vault(recipient, amount)` | port | лишається небезпечною операцією без перевірки зобов'язань — у фазі 3 додати перевірку нерозподілених призів |
| `admin_withdraw_legacy_move_from_vault` | drop | специфіка MOVE |
| `admin_sponsor_prize_pool(gw, amount)` | port | поповнення пулу до RESOLVED |
| `admin_mark_prize_claimed(gw, owner)` | port | позначити виплату без переказу |

### Користувач

| Move | Solana | Нотатки |
|------|--------|---------|
| `register_team(gw, ids, positions, clubs)` | port | валідація формації + ≤3 з клубу + переказ USDC двома ногами (prize / house) |
| `claim_prize(gw)` | port | ідемпотентний, лише після RESOLVED |
| `buy_title` / `reroll_title` / `buy_guild` / `reroll_guild` | decision | on-chain рандом на Solana недоступний; у поточному v3-сеттлі title/guild і так не впливають на final points |

### Oracle

| Move | Solana | Нотатки |
|------|--------|---------|
| `submit_player_stats(...20 паралельних векторів)` | decision | див. §5 |
| `calculate_results` (v1) | drop | on-chain сортування, legacy |
| `calculate_results_v2` | drop | legacy |
| `calculate_results_v3(gw, sorted_owners, sorted_base, sorted_final, prize_ranks, prize_pct)` | port | основний бойовий шлях |

### WC bracket

| Move | Solana |
|------|--------|
| `admin_init_bracket_challenge` | port (за прапорцем події) |
| `admin_close_bracket_challenge` | port |
| `register_bracket_prediction(48B, 12B, 32B)` | port |
| `admin_resolve_bracket_challenge(winners, scores, ranks, prizes)` | port |
| `claim_bracket_prize` | port |

## 3. View-функції (26)

`get_config`, `get_entry_fee_asset`, `get_gameweek`, `get_user_team`,
`get_user_title`, `get_user_guild`, `get_team_result`, `has_title`, `has_guild`,
`has_registered_team`, `get_admins`, `is_admin_address`, `get_oracle`,
`gameweek_exists`, `get_gameweek_teams`, `get_player_stats`, `player_stats_exist`,
`get_entry_fee`, `get_title_fee`, `get_guild_fee`, `get_current_gameweek`,
`bracket_challenge_status`, `bracket_challenge_entries`, `has_bracket_prediction`,
`get_bracket_prediction`, `get_bracket_result`.

На Solana view-функцій немає. Заміна:

- поодинокі читання → `getAccountInfo` + Anchor-декодер;
- списки (`get_gameweek_teams`, всі результати туру) → `getProgramAccounts`
  з `memcmp`-фільтром по seeds або індексер подій;
- похідні читання (`findOpenGameweek`, `findLatestResolvedGameweekId`) →
  обчислюються в `chainClient.ts` над `Config.current_gameweek` і сканом PDA.

## 4. Гроші

Поточна логіка `register_team`:

```
fee          = config.entry_fee
prize_leg    = fee * prize_pool_percent / 100   → prize vault
house_leg    = fee - prize_leg                  → publisher
gameweek.prize_pool += prize_leg
```

Поточна логіка розподілу в `calculate_results_v3`: власники приходять уже
відсортованими за `final_points` (спадання). Для кожної групи з рівними очками:

```
comp_rank    = індекс першого в групі + 1        // 1,2,2,4,…
sum_pct      = сума відсотків за всі порядкові слоти групи
group_total  = prize_pool * sum_pct / 100
share_base   = group_total / tie_count
share_rem    = group_total % tie_count           // по 1 одиниці найпершим у сортуванні
```

Це має бути відтворено **побайтово однаково**, включно із залишком, інакше
розійдеться з `src/lib/prize-distribution.ts`.

Bracket: фіксовані призи топ-5, пул живе на gameweek `10999`, поповнюється через
`admin_sponsor_prize_pool`.

## 5. Статистика гравців — головне питання вартості

Зараз оракул пише всі 20 полів на кожного гравця в ланцюг батчами. На Solana це
найдорожчий елемент: ~600 гравців × ~40 байт ≈ 24 КБ на тур, з обмеженням
приросту акаунта 10 КБ за інструкцію.

При цьому в бойовому шляху (`calculate_results_v3`) очки **вже пораховані
off-chain** — контракт їх не перераховує. Тобто повна статистика в ланцюгу
сьогодні не використовується для розрахунку, лише для прозорості.

Варіанти в `04-open-decisions.md`, рекомендація — hash-commitment.

## 6. Події

`GameweekCreated`, `TeamRegistered`, `TitleAssigned`, `GuildAssigned`,
`GameweekClosed`, `GameweekReopened`, `GameweekRegistrationsReset`,
`ResultsPublished`, `PrizeClaimed`, `PrizeClaimMarked`, `PrizeVaultWithdrawn`,
`PrizePoolSponsored`.

На Solana — Anchor `emit!`. Ці ж події стають основою індексації для UI, бо
`getProgramAccounts` дорогий для великих вибірок.

## 7. Що НЕ живе в ланцюгу і не міняється

- Скоринг і auto-sub: `src/lib/scoring.ts`, `scoring-rules.ts`, `chainAlignedScoring.ts`
- Призова сітка: `src/lib/prize-distribution.ts`
- WC-логіка й bracket-скоринг: `src/lib/worldcup.ts`, `wcBracketPrediction.ts`
- Season Points: `src/lib/seasonPoints.ts`, `season-points-rules.ts` (агрегація над chain-читаннями)
- Реферали й чернетки bracket: Redis
- FPL/WC оракульні дані: `src/app/api/fpl-live`, `wc-live`, `scripts/fpl-oracle-gw.mjs`
