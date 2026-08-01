# 08 — Multisig checklist (перед mainnet)

Операційний чеклист для власника. Код уже описує ролі в `06-runbook.md` §2–3;
тут — конкретні кроки, коли дійде черга до mainnet-деплою.

## 1. Squads multisig

1. Відкрити [squads.so](https://app.squads.so) → Create multisig (рекомендовано **2-of-3**).
2. Додати co-signers (твій основний гаманець + резервний).
3. Записати **multisig vault** — це адреса для `set-upgrade-authority`.
4. Після `initialize` додати vault як admin: `/admin` → Add admin, або `add_admin` з CLI.

Ключі згенеровані локально (`solana/movematch/.keys/`, gitignored):

```bash
node scripts/print-mainnet-key-manifest.mjs
```

| Роль | Файл | Pubkey (2026-08-01) |
|------|------|---------------------|
| INITIALIZER | `initializer.json` | `CJKNFKKfvvYotke7EjYbKNAP1YWy8f4DBcxRFna1no57` |
| house_wallet | `house.json` | `4vDibv147NHUyCNvuv5gBEtQPV2Y38kPPFhR9gbJJsbe` |
| oracle | `oracle.json` | `6vvo1tFS6Syq9mxg2qADJ3JXCGb99VC5Axpb6zZzonYS` |
| Upgrade authority | Squads vault | *(заповнити після створення)* |

**Бекап:** seed-фрази ключів зберегти офлайн. У git вони не потрапляють.

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
const INITIALIZER: Pubkey = pubkey!("CJKNFKKfvvYotke7EjYbKNAP1YWy8f4DBcxRFna1no57");
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
MOVEMATCH_PROGRAM_ID=<PROGRAM_ID> SQUADS_UPGRADE_AUTHORITY=<SQUADS_VAULT> \
  bash scripts/solana-transfer-upgrade-authority.sh
```

Або вручну:
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

- Скрипт: `node solana/movematch/migrations/initialize-mainnet.mjs`
- Підписує **initializer.json**; oracle і house — окремі ключі з `.keys/`.
- `house_wallet` задається **назавжди** в `initialize`.
- `admins[]`, `oracle`, `entry_fee`, `prize_pool_bps` — теж з першого виклику.
- Dry-run на devnet: `migrations/initialize-devnet.mjs` (не mainnet keys).

## 6. Bracket 10999

On-chain bracket не деплоїмо. Виплати — off-chain за
`public/data/wc-bracket-leaderboard.json` (генерується
`npm run wc:bracket:leaderboard`).
