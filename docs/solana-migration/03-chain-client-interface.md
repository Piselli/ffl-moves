# 03 — Інтерфейс `src/lib/chainClient.ts`

Замінює `src/lib/movement.ts`. Мета: жодна сторінка й жоден API-роут не імпортує
Solana SDK напряму — усе через цей модуль. Тоді фаза 4 зводиться до заміни
імпортів, а не до переписування логіки сторінок.

Імпортери, які треба перевести (20 файлів): `src/app/gameweek/page.tsx`,
`leaderboard/page.tsx`, `titles/page.tsx`, `classic/page.tsx`, `fixtures/page.tsx`,
`my-result/page.tsx`, `admin/page.tsx`, `world-cup/squad|leaderboard|bracket|my-result/page.tsx`,
`api/tour-claim-history/route.ts`, `src/lib/seasonPoints.ts`,
`components/PrizeAssetProvider.tsx`, `PrizeTicker.tsx`, `PrizeTickerInline.tsx`,
`LeaderboardTable.tsx`, `WorldCupEventHub.tsx`,
`components/design-lab/locker-leaderboard/useResultsRoomData.ts`,
`components/design-lab/locker-hero/useLockerHeroData.ts`.

## Принципи

- Читання повертають ті самі форми даних, що й зараз, щоб UI не переписувався.
- Записи повертають **незібрані інструкції** (`TransactionInstruction[]`),
  підпис і відправку робить hook гаманця. Це прибирає SDK з рівня сторінок.
- Адреси — рядки base58 назовні, `PublicKey` всередині модуля.
- Суми — `bigint` у мінімальних одиницях USDC (6 знаків).

## Читання

```ts
export type ChainConfig = {
  admins: string[];
  oracle: string;
  usdcMint: string;
  entryFee: bigint;
  prizePoolBps: number;
  currentGameweek: number;
  paused: boolean;
  version: number;
};

export type GameweekSummary = {
  id: number;
  status: "open" | "closed" | "resolved";
  prizePool: bigint;
  totalEntries: number;
  resultsRoot: string | null;
  prizeAllocated: bigint;
  prizeClaimed: bigint;
};

export type UserTeam = { playerIds: number[]; positions: number[]; clubs: number[] };

export type TeamResult = {
  owner: string;
  rank: number;
  finalPoints: number;
  basePoints: number;
  prizeAmount: bigint;
  claimed: boolean;
};

getConfig(): Promise<ChainConfig | null>;
isAdmin(address: string): Promise<boolean>;

getGameweek(id: number): Promise<GameweekSummary | null>;
findOpenGameweek(): Promise<GameweekSummary | null>;
findActiveGameweek(): Promise<GameweekSummary | null>;
findHighestGameweekId(): Promise<number>;
findLatestResolvedGameweekId(highestId: number): Promise<number>;
findLatestUserRegisteredGameweek(owner: string): Promise<number | null>;

getUserTeam(owner: string, gameweekId: number): Promise<UserTeam | null>;
hasRegisteredTeam(owner: string, gameweekId: number): Promise<boolean>;
getGameweekEntrants(gameweekId: number): Promise<string[]>;

getTeamResult(owner: string, gameweekId: number): Promise<TeamResult | null>;
getGameweekResults(gameweekId: number): Promise<TeamResult[]>;
isPrizeClaimed(owner: string, gameweekId: number): Promise<boolean>;

getStatsCommit(gameweekId: number): Promise<{ hash: string; uri: string } | null>;

getBracketStatus(): Promise<number | null>;
getBracketEntries(): Promise<number | null>;
hasBracketPrediction(owner: string): Promise<boolean>;
getBracketPrediction(owner: string): Promise<BracketPrediction | null>;
getBracketResult(owner: string): Promise<BracketResult | null>;
```

Зауваження щодо зміни семантики:

- `getGameweekResults` при Merkle-варіанті читає опублікований JSON з бекенду й
  **перевіряє його хеш проти `resultsRoot`**. Це має бути в одному місці, щоб UI
  ніколи не показував неперевірені результати.
- `getGameweekEntrants` — через `getProgramAccounts` з `memcmp` по seeds або через
  індексер подій; для великих турів кешувати.
- `getPlayerStats` / `getGameweekStats` більше не з ланцюга — з того ж
  оракульного JSON. Зберегти сигнатури, змінити джерело.
- Функції `hasAdmin*OnChain()` (feature-detection через REST ABI) не потрібні:
  замість них `config.version`.

## Записи

```ts
type Ixs = Promise<TransactionInstruction[]>;

buildRegisterTeam(owner: string, gameweekId: number, squad: UserTeam): Ixs;
buildClaimPrize(owner: string, gameweekId: number): Ixs;   // proof тягне всередині
buildRegisterBracketPrediction(owner: string, prediction: BracketPrediction): Ixs;
buildClaimBracketPrize(owner: string): Ixs;

// адмін / oracle
buildCreateGameweek(admin: string, gameweekId: number): Ixs;
buildCloseGameweek(admin: string, gameweekId: number): Ixs;
buildReopenGameweek(admin: string, gameweekId: number): Ixs;
buildSetFees(admin: string, entryFee: bigint): Ixs;
buildSetPrizePoolBps(admin: string, bps: number): Ixs;
buildSponsorPrizePool(admin: string, gameweekId: number, amount: bigint): Ixs;
buildWithdrawTreasury(admin: string, recipient: string, amount: bigint): Ixs;
buildMarkClaimed(admin: string, gameweekId: number, owner: string): Ixs;
buildCommitStats(oracle: string, gameweekId: number, hash: string, uri: string): Ixs;
buildPublishResults(oracle: string, gameweekId: number, root: string, totalEntries: number, prizeAllocated: bigint): Ixs;
buildInitBracket(admin: string): Ixs;
buildCloseBracket(admin: string): Ixs;
buildResolveBracket(admin: string, rows: BracketWinnerRow[]): Ixs;
```

`buildRegisterTeam` має додавати створення ATA гравця, якщо його немає, і
`ComputeBudgetProgram.setComputeUnitPrice` для priority fee.

## Гаманець

`src/components/WalletProvider.tsx` і `src/hooks/useWalletConnect.ts` переходять
на `@solana/wallet-adapter-react` з Phantom і Solflare (плюс Wallet Standard, щоб
підхоплювались інші). Публічний API хука зберегти той самий (`address`,
`connected`, `connect`, `disconnect`, `signAndSubmit`), щоб сторінки не змінювались
у частині гаманця.

## Env

```
NEXT_PUBLIC_SOLANA_CLUSTER=devnet|mainnet-beta
NEXT_PUBLIC_SOLANA_RPC_URL=
NEXT_PUBLIC_MOVEMATCH_PROGRAM_ID=
NEXT_PUBLIC_USDC_MINT=
ORACLE_KEYPAIR=            (серверний, ніколи не в NEXT_PUBLIC_)
RESULTS_PUBLISH_BUCKET=    (де лежить JSON результатів під Merkle-корінь)
```
