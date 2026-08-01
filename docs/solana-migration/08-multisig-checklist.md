# 08 — Multisig checklist (перед mainnet)

Операційний чеклист для власника. Код уже описує ролі в `06-runbook.md` §2–3;
тут — конкретні кроки, коли дійде черга до mainnet-деплою.

## 1. Squads multisig

1. Створити Squads v4 multisig на Solana mainnet (рекомендовано 2-of-3 або 3-of-5).
2. Записати адресу multisig — вона стане **upgrade authority** програми після деплою.
3. Додати 1–2 гарячі операційні ключі як co-signers для рутинних адмін-дій.

## 2. Розвести ролі (не один ключ на все)

| Роль | Гаманець |
|------|----------|
| Upgrade authority | Squads multisig |
| `admins[]` у Config | Squads + операційний ключ |
| `oracle` | Операційний ключ (або окремий oracle-only) |
| `house_wallet` | **Окремий гарячий ключ** (не multisig — кожен рефанд інакше стає proposal) |
| `INITIALIZER` у бінарнику | Адреса, що підпише `initialize` (може = deployer до першого init) |

## 3. Змінити `INITIALIZER` і перезібрати

```rust
// solana/movematch/programs/movematch/src/lib.rs
const INITIALIZER: Pubkey = pubkey!("<MAINNET_INITIALIZER_PUBKEY>");
```

Після зміни:

```bash
# збірка (див. 06-runbook.md §4)
cargo-build-sbf --manifest-path programs/movematch/Cargo.toml

# mainnet deploy — лише після review
solana program deploy --url mainnet-beta \
  --keypair solana/movematch/.keys/deployer.json \
  --program-id solana/movematch/target/deploy/movematch-keypair.json \
  solana/movematch/target/deploy/movematch.so
```

## 4. Transfer upgrade authority → multisig

```bash
solana program set-upgrade-authority <PROGRAM_ID> \
  --url mainnet-beta \
  --new-upgrade-authority <SQUADS_MULTISIG> \
  --keypair solana/movematch/.keys/deployer.json
```

Перевірка:

```bash
solana program show <PROGRAM_ID> --url mainnet-beta
npm run preflight:solana -- --mainnet
```

## 5. `initialize` — без повторів

- `house_wallet` задається **назавжди** в `initialize`.
- `admins[]`, `oracle`, `entry_fee`, `prize_pool_bps` — теж з першого виклику.
- Dry-run на devnet: `migrations/initialize-devnet.mjs` (не mainnet keys).

## 6. Bracket 10999

On-chain bracket не деплоїмо. Виплати — off-chain за
`public/data/wc-bracket-leaderboard.json` (генерується
`npm run wc:bracket:leaderboard`).
