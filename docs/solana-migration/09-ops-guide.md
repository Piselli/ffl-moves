# 09 — Операційний гайд (mainnet)

Інструкція для власника після деплою MoveMatch на Solana mainnet
(2026-09-24). Технічний runbook: [06-runbook.md](06-runbook.md).

## Статус готовності

| Готово | Відкладено / обмеження |
|--------|-------------------------|
| Програма `A8UiSCd5yzhpZZwmop6k5upLVxUhDZq3x9pq7SfwoKN5` | Squads на upgrade authority (нагадати пізніше) |
| Config + treasury ATA + house ATA | Повний тур на mainnet ще не проганяли end-to-end |
| Helius RPC на Vercel Production | — |
| Сайт: `form8.football` / `movematch.xyz` | — |

**Можна відкривати реєстрацію** після: імпорту admin/oracle ключів + (бажано)
одного тестового туру на собі.

Поточні on-chain параметри (initialize):

| Параметр | Значення |
|----------|----------|
| `entry_fee` | **0.1 USDC** (пілот; для ~$1 комісії постав **5 USDC**) |
| `prize_pool_bps` | **8000** → 80% у пул, **20%** house |
| Admin | `CJKNFKKfvvYotke7EjYbKNAP1YWy8f4DBcxRFna1no57` |
| Oracle | `6vvo1tFS6Syq9mxg2qADJ3JXCGb99VC5Axpb6zZzonYS` |
| House | `4vDibv147NHUyCNvuv5gBEtQPV2Y38kPPFhR9gbJJsbe` |
| Treasury ATA | `CAjvP9Akiywv1Xtsi85JizUMd1NMojg4zmsQ3qT5JvAH` |
| House ATA | `4mYYHkrVF7ShQ7XRLoeYwHvFWjmyWXHoMbZe6qXJJA4n` |
| USDC mint | `EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v` |

---

## 1. Ключі й ролі

Файли в `solana/movematch/.keys/` (gitignore, бекап офлайн):

| Роль | Файл | Pubkey | Що робить |
|------|------|--------|-----------|
| Admin | `initializer.json` | `CJKNFK…no57` | `/admin`: create/close/reopen, fees, withdraw treasury, sponsor |
| Oracle | `oracle.json` | `6vvo1t…onYS` | commit_stats, publish_results |
| House | `house.json` | `4vDibv…Jsbe` | отримує 20% комісії; звідси виводиш «зароблене» |
| Deployer | `deployer.json` | `Be2H3u…cxHh` | лише upgrade authority програми |

### Імпорт у Phantom / Solflare

1. З секрету Solana keypair JSON (масив 64 байти) зроби base58 private key:

```bash
# з кореня репо, Solana CLI в PATH
solana-keygen pubkey solana/movematch/.keys/initializer.json   # перевірка адреси
python3 - <<'PY'
import json, hashlib
from pathlib import Path
# pip install base58  OR use solders if available
try:
    import base58
except ImportError:
    raise SystemExit("pip install base58")
raw = bytes(json.loads(Path("solana/movematch/.keys/initializer.json").read_text()))
print(base58.b58encode(raw).decode())  # вставити в Phantom → Import private key
PY
```

2. Phantom → Add / Connect wallet → Import private key → вставити рядок.
3. Повтори для `oracle.json` і (окремий профіль) `house.json`.
4. На сайті Connect цим гаманцем → `/admin`.

Адмінка показує кнопки лише якщо підключена адреса є в `config.admins` або
дорівнює `config.oracle`.

---

## 2. Куди йдуть гроші

```
Гравець платить entry_fee (USDC, Solana)
 ├─ prize_pool_bps/10000  → Treasury ATA   (призовий пул)
 └─ решта                 → House ATA      (комісія платформи)
```

Зараз 8000 bps → **80% / 20%**.

Приклади:

| Entry | У пул (80%) | House / ти (20%) |
|-------|-------------|------------------|
| 0.1 USDC (пілот) | 0.08 | 0.02 |
| **5 USDC (прод)** | 4.00 | **1.00** |

Після `publish_results` переможці забирають приз з Treasury через `claim_prize`
на **свій** Solana-гаманець (Helius embedded або Phantom).

---

## 3. Гаманець комісії («мій $1»)

### Реальність

- `house_wallet` задається **лише** в `initialize`.
- Інструкції `set_house_wallet` **немає**.
- Зараз назавжди: `4vDibv147NHUyCNvuv5gBEtQPV2Y38kPPFhR9gbJJsbe` (`house.json`).
- «Поставити інший особистий гаманець» без нового деплою **неможливо**.
- Щоб комісія була ~$1: у `/admin` постав entry **5 USDC** (20% = $1).

### Як вивести комісію собі

1. Імпортуй `house.json` у Phantom.
2. Переконайся, що мережа Solana + токен USDC (mint вище).
3. Send → на свій особистий / біржовий Solana-гаманець.

Це звичайний SPL-переказ з house ATA. Окремої кнопки «Withdraw house» в
`/admin` немає (є лише withdraw з **treasury**).

---

## 4. Відкрити реєстрацію на тур

1. Підключи **admin** (`CJKNFK…`) на `https://form8.football/admin`
   (або `https://www.movematch.xyz/admin`).
2. (Опційно) секція fees → введи `5` → **Застосувати внесок у мережі**.
3. Секція **Create Gameweek** → ID (напр. номер FPL GW) → **Create**.
4. Статус туру = **OPEN** → гравці реєструють склади.

### Закрити набір

`/admin` → Close gameweek (на відкритому турі).

### Повний цикл (після матчів)

| # | Дія | Хто |
|---|-----|-----|
| 1 | Close gameweek | admin |
| 2 | Fetch Stats (FPL або API-Sports) | oracle |
| 3 | Commit stats — файл має бути на `NEXT_PUBLIC_STATS_BASE_URL/<id>.json` | oracle |
| 4 | Calculate / publish results JSON у `public/data/results/` або бакет | oracle |
| 5 | Publish results on-chain | oracle |
| 6 | Гравці Claim на leaderboard / my-result | гравець |
| 7 | За потреби release unallocated / withdraw treasury surplus | admin |

Stats base URL на проді: `https://form8.football/data/stats`.

---

## 5. Вивід з treasury (призовий vault)

`/admin` → Withdraw from vault (підпис **admin**):

- вкажи Solana-адресу отримувача + суму USDC;
- програма **не дасть** вивести нижче `total_prize_obligation`
  (заброньовані, ще незабрані призи).

Не плутай із house: treasury = чужі/призові гроші; house = твоя комісія.

---

## 6. Гравець через email (Helius embedded) або гаманець

**Email / passkey (Helius WaaS):**
1. Логін email (OTP) → Helius створює **embedded Solana wallet**.
2. Deposit: поповнити USDC (переказ на адресу з Deposit modal).
3. Зібрати XI → оплата `entry_fee` → реєстрація on-chain.
4. Після settle → **Claim** → USDC на той самий embedded-гаманець.
5. **Вивести** (USDC або SOL): адреса Phantom / біржі + сума.

Потрібно: Helius plan **Developer+** ($49), `HELIUS_API_KEY` у Vercel /
`.env.local`, route `/api/helius/[...path]`. У Helius Dashboard → WaaS →
Configuration увімкни **email** (± passkey); **external wallet** лишай
вимкненим — Phantom / Solflare / Jupiter йдуть через wallet-adapter напряму.

**Phantom / Solflare / Jupiter:** підключають свій гаманець, платять SOL fee
самі, USDC з їхнього балансу — без «внутрішнього» депозиту на сайт.

Основний шлях для email (0 SOL): **FORM8 fee sponsor**
(withdraw USDC/SOL, register, claim).

**Вивід USDC (критично для email):** гравець має USDC, але зазвичай
**0 SOL**. Без fee payer вивід падає з помилкою мережі.

Налаштування Form8 fee sponsor (рекомендовано):

1. Згенеруй / візьми гаманець лише під fees, поповни **~0.5–2 SOL** (mainnet).
2. У Vercel / `.env.local` додай секретний ключ (JSON-масив байтів):

```bash
# preferred
SOLANA_FEE_SPONSOR_KEYPAIR=[...]
# або тимчасово той самий, що ADMIN_KEYPAIR (має мати SOL)
```

3. Redeploy. Перевірка: `GET /api/solana/fee-payer` → `{ "configured": true, "feePayer": "…" }`.

Хто що платить після цього:

| Дія | USDC | SOL (мережа) |
|-----|------|----------------|
| Withdraw / send USDC or SOL (Helius email) | гравець | **FORM8 fee sponsor** |
| Register / claim (Helius email) | гравець (entry) | **FORM8 fee sponsor** (мережа + ATA + rent top-up для Entry/Claim PDA) |
| Phantom / Solflare / Jupiter | гравець | гравець (у розширенні) |

Sponsor також може переказати гравцю до **0.01 SOL** на rent PDA (`init` у програмі
все ще списує rent з owner). Без `SOLANA_FEE_SPONSOR_KEYPAIR` на
гаманці email-гравця має бути трохи SOL (~0.01).

### Імпорт ops-ключів (admin / house / oracle)

Це **не чужі** гаманці — keypair-и згенеровані під цей проєкт і лежать у тебе:

`solana/movematch/.keys/*.json`

```bash
node scripts/print-phantom-import-keys.mjs
# відкрий solana/movematch/.keys/PHANTOM-IMPORT.txt
# Phantom → Import Private Key → вставити private_key_base58
```

- **ADMIN** (`initializer.json` / `CJKNFK…`) — `/admin`
- **HOUSE** (`house.json` / `4vDibv…`) — комісія платформи (змінити on-chain **не можна**)
- **ORACLE** (`oracle.json`) — settle туру

`house_wallet` після initialize незмінний. Щоб комісія падала на іншу
особисту адресу — імпортуй house і роби Send з нього, або пізніше міграція
програми.

---

## 7. Рекомендований чеклист перед публічним туром

1. [ ] Admin + oracle імпортовані в Phantom, `/admin` бачить секції.
2. [ ] Fees: пілот `0.1` або прод `5` USDC — свідомо вибрано.
3. [ ] Create тестовий GW → сам зареєструйся → Close → Commit → Publish → Claim.
4. [ ] House ATA отримала 20%; умієш Send з `house.json`.
5. [ ] Stats URL віддає `https://form8.football/data/stats/<id>.json`.
6. [ ] (Пізніше) Squads → `set-upgrade-authority`.

---

## 8. Авто-close реєстрації (cron)

Vercel Hobby **не вміє** cron частіше ніж 1×/день, тому тригер — **GitHub Actions**
кожні 5 хв → `GET /api/cron/close-gameweek` (workflow
`.github/workflows/auto-close-gameweek.yml`).

Логіка ендпоінту:
1. Знайти OPEN gameweek on-chain.
2. Дедлайн = **перший kickoff** FPL event (як на сайті); fallback — bootstrap `deadline_time`.
3. Якщо `now >= deadline` → `close_gameweek` підписом **ADMIN**.

Env на **Vercel Production**:

| Змінна | Значення |
|--------|----------|
| `CRON_SECRET` | random; також як GitHub secret `CRON_SECRET` |
| `ADMIN_KEYPAIR` | JSON з `initializer.json` |
| `AUTO_CLOSE_ENABLED` | `true` |
| `AUTO_CLOSE_LEAD_MS` | `0` = на kickoff |

GitHub: Settings → Secrets → `CRON_SECRET` (той самий рядок, що в
`solana/movematch/.keys/CRON_SECRET.txt`). Manual run: Actions → Auto-close gameweek → Run.

Admin потребує ~0.01+ SOL на fee (зараз ок, якщо не злито).

Dry-run:

```bash
curl -H "Authorization: Bearer $(cat solana/movematch/.keys/CRON_SECRET.txt)" \
  "https://www.movematch.xyz/api/cron/close-gameweek?dryRun=1"
```

---

## 9. Аварії (коротко)

| Ситуація | Дія |
|----------|-----|
| Стоп реєстрацій | admin `set_paused(true)` — **також блокує claims** |
| Рефанд одному гравцю | `close_entry`: підписи **admin + house**, лише до RESOLVED |
| Компрометація house | pause → вивести USDC з house → міграція на нову програму |
| Компрометація admin | `add_admin(новий)` → перевірити → `remove_admin(старий)` |

Деталі: [06-runbook.md](06-runbook.md) §7–8.
