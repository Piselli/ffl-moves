# 02 — Дизайн Anchor-програми

Ціль: тонкий on-chain шар — гроші, склад, стан туру, результати, виплати.
Скоринг лишається в TypeScript.

Стек: Anchor (Rust), SPL Token (класичний USDC, не Token-2022).
Mint mainnet: `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v`,
devnet: `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`.

Розташування: `solana/movematch/` (Anchor workspace), program name `movematch`.

## 1. Акаунти й PDA

| Акаунт | Seeds | Розмір | Хто платить ренту |
|--------|-------|--------|-------------------|
| `Config` | `["config"]` | ~200 B | деплоєр |
| `Treasury` (authority) | `["treasury"]` | 0 (лише PDA-підпис) | — |
| Treasury USDC ATA | ATA(`treasury`, USDC mint) | стандарт | деплоєр |
| `House` USDC ATA | ATA(house wallet) | стандарт | оператор |
| `Gameweek` | `["gw", gw_id: u32 LE]` | ~80 B | адмін |
| `Entry` | `["entry", gw_id: u32 LE, owner: Pubkey]` | ~176 B | гравець |
| `ClaimReceipt` | `["claim", gw_id: u32 LE, owner: Pubkey]` | ~64 B | гравець |
| `StatsCommit` | `["stats", gw_id: u32 LE]` | ~120 B | oracle |
| `BracketState` | `["bracket"]` | ~40 B | адмін |
| `BracketEntry` | `["bpred", owner: Pubkey]` | ~152 B | гравець |

Свідомо прибрано з on-chain стану:

- `Gameweek.teams: vector<address>` — необмежений вектор. Список учасників
  збирається з подій `TeamRegistered` або `getProgramAccounts` по префіксу
  `["entry", gw_id]`.
- `SimpleMap` результатів на весь тур — замінюється Merkle-коренем (див. §3).

### Структури

```rust
#[account]
pub struct Config {
    pub admins: [Pubkey; 5],       // нульові = порожні слоти
    pub admin_count: u8,
    pub oracle: Pubkey,
    pub usdc_mint: Pubkey,
    pub house_wallet: Pubkey,
    pub entry_fee: u64,            // 6 знаків
    pub prize_pool_bps: u16,       // 8000 = 80%
    pub current_gameweek: u32,
    pub paused: bool,
    pub version: u16,              // заміна hasXOnChain() feature-detection
    pub treasury_bump: u8,
    pub bump: u8,
}

#[account]
pub struct Gameweek {
    pub id: u32,
    pub status: u8,                // 0 OPEN, 1 CLOSED, 2 SETTLING, 3 RESOLVED
    pub prize_pool: u64,           // накопичена prize-нога + спонсорські
    pub total_entries: u32,
    pub results_root: [u8; 32],    // Merkle root, нулі до сеттлу
    pub prize_allocated: u64,      // сума призів за коренем
    pub prize_claimed: u64,
    pub bump: u8,
}

#[account]
pub struct Entry {
    pub owner: Pubkey,
    pub gameweek_id: u32,
    pub player_ids: [u32; 14],     // перші 11 — старт, останні 3 — лава
    pub positions: [u8; 14],
    pub clubs: [u16; 14],
    pub fee_paid: u64,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
pub struct ClaimReceipt {
    pub owner: Pubkey,
    pub gameweek_id: u32,
    pub rank: u32,
    pub amount: u64,
    pub claimed_at: i64,
    pub bump: u8,
}
```

`u32` для `player_ids` покриває WC-діапазон (id ≥ 900000). `u16` для клубів.
Фіксовані масиви замість `Vec` роблять розмір `Entry` детермінованим.

## 2. Життєвий цикл туру

```
OPEN ──close──► CLOSED ──publish_results──► SETTLING/RESOLVED ──claims──►
  ▲                                                │
  └──────────────── reopen ────────────────────────┘
```

`reopen` дозволений лише якщо `prize_claimed == 0`. Це прибирає найгіршу
дірку поточної схеми, де реопен після виплат розсинхронізовував стан.

## 3. Результати: Merkle-корінь (рекомендований варіант)

Оракул рахує все off-chain (як зараз у v3), будує лист на кожного учасника:

```
leaf = keccak256(owner_pubkey || gw_id_le || rank_le || final_points_le || prize_amount_le)
```

Одна інструкція `publish_results(gw_id, root, total_entries, prize_allocated)`:

- перевіряє `oracle`, статус `CLOSED`, `prize_allocated <= gw.prize_pool`;
- записує `results_root`, ставить `RESOLVED`, емітить `ResultsPublished`.

`claim_prize(gw_id, rank, final_points, amount, proof: Vec<[u8;32]>)`:

- перераховує лист із **підписанта** (owner не передається аргументом);
- перевіряє proof проти `results_root`;
- створює `ClaimReceipt` (init — тому подвійний claim неможливий фізично);
- `gw.prize_claimed += amount`, перевірка `<= prize_allocated`;
- переказ USDC з treasury ATA підписом PDA.

Переваги: сеттл у одну транзакцію незалежно від кількості учасників, немає ренти
за програшні акаунти, claim платить сам гравець.

Наслідок: повна таблиця результатів роздається з бекенду (той самий JSON, з якого
будувався корінь). Це вже фактичний стан справ — очки й так рахує оракул.

Альтернатива, якщо потрібна повна таблиця в ланцюгу: `Result` PDA на кожного
учасника, запис чанками по ~20 у транзакції. Дорожче рентою і транзакціями,
але leaderboard читається напряму з ланцюга. Рішення — в `04-open-decisions.md`.

## 4. Інструкції

### Адмін
- `initialize(entry_fee, prize_pool_bps, oracle, usdc_mint, house_wallet)`
- `set_oracle(new_oracle)`
- `set_fees(entry_fee)`
- `set_prize_pool_bps(bps)` — 0..=10000
- `add_admin(pubkey)` / `remove_admin(pubkey)` — не можна видалити останнього
- `set_paused(bool)` — глобальний стоп для register/claim
- `create_gameweek(gw_id)`
- `close_gameweek(gw_id)`
- `reopen_gameweek(gw_id)` — лише при `prize_claimed == 0`
- `sponsor_prize_pool(gw_id, amount)` — до `RESOLVED`
- `withdraw_house(amount, recipient)` — тільки house ATA
- `withdraw_treasury(amount, recipient)` — перевірка
  `treasury_balance - amount >= (prize_allocated - prize_claimed)` по відкритих турах

### Гравець
- `register_team(gw_id, player_ids[14], positions[14], clubs[14])`
- `claim_prize(gw_id, rank, final_points, amount, proof)`

### Oracle
- `commit_stats(gw_id, stats_hash, uri)` — хеш опублікованого JSON зі статистикою
- `publish_results(gw_id, root, total_entries, prize_allocated)`

### Bracket (за прапорцем події)
- `init_bracket()` / `close_bracket()`
- `register_bracket_prediction(group_ranks[48], third_order[12], ko_winners[32])`
- `resolve_bracket(winners[≤5], scores, ranks, prizes)`
- `claim_bracket_prize()`

## 5. Валідації, які треба перенести 1:1

`register_team`:

- `gw.status == OPEN` і `!config.paused`
- рівно 14 гравців; серед перших 11 — 1 GK, 4 DEF, 3 MID, 3 FWD
- ≤ 3 гравці з одного клубу серед усіх 14
- відсутність дублікатів `player_ids` (у Move явно не перевіряється — **додати**)
- `Entry` PDA з `init` → повторна реєстрація неможлива
- оплата: `prize_leg = fee * prize_pool_bps / 10000` у treasury ATA,
  `house_leg = fee - prize_leg` у house ATA, обидва через `transfer_checked`
- `gw.prize_pool += prize_leg`, `gw.total_entries += 1`

Розподіл призів (у оракула, перевіряється тестами проти
`src/lib/prize-distribution.ts`): competition rank `1,2,2,4,…`, група рівних ділить
суму відсотків своїх слотів, залишок від цілочисельного ділення йде найпершим
у порядку сортування.

## 6. Бюджет обчислень і транзакцій

| Операція | Оцінка CU | Ризик |
|----------|-----------|-------|
| `register_team` | ~30–40k | немає |
| `claim_prize` з proof на 512 учасників (9 рівнів) | ~25k | немає |
| `publish_results` | ~10k | немає |
| `commit_stats` | ~5k | немає |

Через Merkle-схему пропадає найважче місце Movement-версії — батчі статистики й
запис результатів на весь тур.

## 7. Ключі та authority

- **Upgrade authority**: Squads multisig, не одиночний ключ
- **Адміни**: 1 multisig + максимум 1 гарячий операційний ключ
- **Oracle**: окремий гарячий ключ, повноваження лише `commit_stats` і
  `publish_results`; компрометація дає підробку результатів, але не доступ до
  treasury — це навмисне розділення
- **Treasury**: PDA, приватного ключа не існує; вивід лише через `withdraw_treasury`
  з перевіркою невиплачених зобов'язань

## 8. Мапа Move → Solana

| Move | Solana |
|------|--------|
| `register_treasury_for_claims` | `initialize` (PDA + ATA одразу) |
| `create_gameweek` / `close_gameweek` / `reopen_gameweek` | однойменні |
| `set_oracle` / `set_fees` / `set_prize_pool_percent` | однойменні, bps замість % |
| `set_entry_fee_asset` | — (тільки USDC) |
| `add_admin` / `remove_admin` | однойменні |
| `admin_sponsor_prize_pool` | `sponsor_prize_pool` |
| `admin_withdraw_prize_vault` | `withdraw_treasury` + перевірка зобов'язань |
| `admin_withdraw_legacy_move_from_vault` | — |
| `admin_reset_gameweek_registrations` | `close_entry(gw, owner)` + повернення (decision) |
| `register_team` | `register_team` |
| `claim_prize` | `claim_prize` з Merkle-proof |
| `admin_mark_prize_claimed` | `mark_claimed(gw, owner)` — створює `ClaimReceipt` без переказу |
| `submit_player_stats` | `commit_stats` (hash + uri) |
| `calculate_results_v3` | `publish_results` |
| `calculate_results` / `_v2` | — |
| bracket-функції | однойменні |
| усі `#[view]` | читання акаунтів у `chainClient.ts` |
