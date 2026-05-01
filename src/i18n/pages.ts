/** All non-home strings: gameweek, fixtures, leaderboard, my-result, modals, tables, admin alerts. */
export type PagesMessages = {
  languageSwitcherAria: string;
  gameweek: {
    registerErrorPrefix: string;
    connectTitle: string;
    connectDesc: string;
    gwWord: string;
    registeredTitle: string;
    leaderboardLink: string;
    startersSection: string;
    benchSection: string;
    unavailableTitle: string;
    unavailableIntro: string;
    statusClosed: string;
    statusResolved: string;
    unavailableGwSuffix: (gw: number, statusLabel: string) => string;
    submitRegistering: string;
    submitConfirm: (feeMove: string) => string;
    submitNeedPlayers: (picked: number, max: number) => string;
    headerTitle: (gw: number) => string;
    pickPlayersHint: string;
    maxThreeHint: string;
    entryFeeLabel: string;
    entryShort: string;
    benchTitle: (n: number, max: number) => string;
    benchSlotEmpty: (idx: number) => string;
    playersProgress: (total: number, max: number, starters: number, bench: number) => string;
    playersProgressShort: (total: number, max: number) => string;
    searchPlaceholder: string;
    allTeams: string;
    playersFound: (n: number) => string;
    resetFilters: string;
    reset: string;
    noPlayersTitle: string;
    noPlayersHint: string;
    tabPitch: string;
    tabPlayers: string;
  };
  fixtures: {
    back: string;
    title: string;
    deadlineLabel: string;
    loading: string;
    errorTitle: string;
    errorHint: string;
    finished: string;
    progressDone: (finished: number, total: number) => string;
    buildSquad: string;
  };
  leaderboard: {
    claimSuccess: string;
    claimFail: (msg: string) => string;
    loading: string;
    seasonTag: string;
    pageTitle: string;
    gwLabel: string;
    statusOpen: string;
    statusClosed: string;
    statusResolved: string;
    poolLabel: string;
    entriesLabel: string;
    prizeDistribution: string;
    top10Receive: string;
    noDataForGw: (gw: number) => string;
    myResultTitle: (gw: number) => string;
    inPrizes: string;
    detailsLink: string;
    colRank: string;
    colPoints: string;
    colPrizeMove: string;
    claim: string;
    claiming: string;
    claimed: string;
    noPrize: string;
    emptyTitle: string;
    emptyClosedHint: (gw: number) => string;
    emptyNotPublished: (gw: number) => string;
    registerSquadCta: string;
    footerLine: (gw: number) => string;
  };
  myResult: {
    errConfig: string;
    errResultNotFound: string;
    errSquadNotFound: string;
    errPlayersLoad: string;
    errGeneric: string;
    connectTitle: string;
    connectHint: string;
    loading: string;
    unavailableTitle: string;
    viewLeaderboard: string;
    backLeaderboard: string;
    gwBadge: (gw: number) => string;
    pointsLabel: string;
    prizeLabel: string;
    participantsLabel: string;
    squadTitle: string;
    statsPending: string;
    catalogHint: string;
    startingXi: (n: number) => string;
    bench: (n: number) => string;
    pointsLegend: string;
    ctaNextGw: string;
  };
  playerCard: {
    injuryFallback: string;
    suspensionFallback: string;
    doubtfulWithPct: (pct: string) => string;
    doubtfulUnknown: string;
    statusLine: (status: string, pct: string | null) => string;
    formLabel: string;
    formTitle: string;
    formSubtitle: string;
    formTier1: string;
    formTier1Hint: string;
    formTier2: string;
    formTier2Hint: string;
    formTier3: string;
    formTier3Hint: string;
    formTier4: string;
    formTier4Hint: string;
  };
  leaderboardTable: {
    colRank: string;
    colManager: string;
    colPoints: string;
    colPrize: string;
    fundSplit: string;
    you: string;
    claimed: string;
  };
  nickname: {
    errEmpty: string;
    errMin: string;
    titleEdit: string;
    titleWelcome: string;
    descEdit: string;
    descWelcome: string;
    fieldLabel: string;
    placeholder: string;
    later: string;
    save: string;
  };
  admin: {
    alertInvalidGw: string;
    alertGwExists: (id: number, statusWord: string) => string;
    alertGwCreated: (id: number) => string;
    alertFailed: (msg: string) => string;
    alertNoOpenToClose: string;
    alertGwClosed: (id: number) => string;
    alertReopenInvalidGw: string;
    alertGwNotFound: (id: number) => string;
    alertGwAlreadyOpen: (id: number) => string;
    alertReopenConfirm: (id: number) => string;
    alertReopenDone: (id: number) => string;
    statusWordOpen: string;
    statusWordClosed: string;
    statusWordResolved: string;
    loadFailedTitle: string;
    loadFailedBody: string;
    retry: string;
    statConfigGw: string;
    statSameGwStatus: string;
    statOpenRegistration: string;
    noOpenGw: string;
    desyncTitle: string;
    desyncBody: (cfgGw: number, openGw: number) => string;
    manageResolvedTitle: string;
    manageResolvedBody: string;
    sectionCloseTitle: string;
    sectionCloseSubtitleOpen: (openGw: number) => string;
    sectionCloseSubtitleConfig: (cfgGw: string, st: string) => string;
    closeExplain: (gw: number) => string;
    whyNoCloseTitle: string;
    whyNoCloseBody: string;
    noOpenVisibleHint: string;
    reopenExplain: (cfgGw: string) => string;
    reopenGwLabel: string;
    alertPrizePoolUpdated: string;
    alertStatsSubmitted: string;
    alertResultsCalculated: (gwId: string) => string;
    sectionTitleWhenOpen: string;
    sectionTitleWhenClosed: string;
    closeGwButtonLabel: (gw: number) => string;
    feesSectionTitle: string;
    feesSectionHint: string;
    feesEntryLabel: string;
    feesTitleLabel: string;
    feesGuildLabel: string;
    feesSubmit: string;
    feesUpdated: string;
    feesInvalid: string;
  };
};

export const pagesEn: PagesMessages = {
  languageSwitcherAria: "Site language",
  gameweek: {
    registerErrorPrefix: "Registration error:",
    connectTitle: "Pick your squad",
    connectDesc: "Connect your wallet to select your squad for the current gameweek.",
    gwWord: "GW",
    registeredTitle: "Your registered squad",
    leaderboardLink: "Leaderboard →",
    startersSection: "Starters",
    benchSection: "Bench",
    unavailableTitle: "Gameweek unavailable",
    unavailableIntro: "There is no open gameweek right now.",
    statusClosed: "closed",
    statusResolved: "finished",
    unavailableGwSuffix: (gw, statusLabel) => ` GW ${gw} — ${statusLabel}.`,
    submitRegistering: "Registering…",
    submitConfirm: (fee) => `Confirm squad · ${fee} MOVE`,
    submitNeedPlayers: (picked: number, max: number) => `Pick ${max} players (${picked}/${max})`,
    headerTitle: (gw) => `GW ${gw} · Squad selection`,
    pickPlayersHint: "Pick 11 players. Max 3 from the same club.",
    maxThreeHint: "Max 3 from the same club",
    entryFeeLabel: "Registration fee",
    entryShort: "Entry",
    benchTitle: (n, max) => `Bench (${n}/${max})`,
    benchSlotEmpty: (idx) => `Sub ${idx + 1}`,
    playersProgress: (total, max, starters, bench) =>
      `${total}/${max} players (${starters} starters + ${bench} bench)`,
    playersProgressShort: (total, max) => `${total}/${max} players`,
    searchPlaceholder: "Search player…",
    allTeams: "All teams",
    playersFound: (n) => `${n} players`,
    resetFilters: "Reset filters",
    reset: "Reset",
    noPlayersTitle: "No players found",
    noPlayersHint: "Try different filters",
    tabPitch: "Pitch",
    tabPlayers: "Players",
  },
  fixtures: {
    back: "Back",
    title: "Gameweek fixtures",
    deadlineLabel: "Deadline (1st match)",
    loading: "Loading fixtures…",
    errorTitle: "Could not load fixtures",
    errorHint: "Try refreshing the page",
    finished: "FT",
    progressDone: (f, t) => `${f}/${t} finished`,
    buildSquad: "Build squad",
  },
  leaderboard: {
    claimSuccess: "Claim complete: MOVE was sent to your wallet (check balance in wallet / explorer).",
    claimFail: (msg) => `Could not claim: ${msg}`,
    loading: "Loading data…",
    seasonTag: "Season 2024/25",
    pageTitle: "Leaderboard",
    gwLabel: "GW",
    statusOpen: "Open",
    statusClosed: "Closed",
    statusResolved: "Finished",
    poolLabel: "Pool",
    entriesLabel: "Entries",
    prizeDistribution: "Prize split",
    top10Receive: "Top 10 receive",
    noDataForGw: (gw) => `No data for GW ${gw}`,
    myResultTitle: (gw) => `My result · GW ${gw}`,
    inPrizes: "In the prizes 🎉",
    detailsLink: "Details →",
    colRank: "Rank",
    colPoints: "Points",
    colPrizeMove: "Prize (MOVE)",
    claim: "Claim",
    claiming: "...",
    claimed: "✓ Claimed",
    noPrize: "No prize",
    emptyTitle: "No results yet",
    emptyClosedHint: (gw) =>
      `GW ${gw} is Closed on-chain: squads are locked and stats can be submitted. The leaderboard appears after the final admin step — Calculate & Publish (compute + publish tx). Until then the gameweek is not Resolved on-chain.`,
    emptyNotPublished: (gw) => `GW ${gw} results are not published yet.`,
    registerSquadCta: "Register your squad",
    footerLine: (gw) => `Real on-chain results · GW ${gw} · Movement`,
  },
  myResult: {
    errConfig: "Could not load config",
    errResultNotFound: "Result not found — the gameweek is not finished yet or you did not register a squad",
    errSquadNotFound: "Squad not found",
    errPlayersLoad: "Could not load players",
    errGeneric: "Something went wrong",
    connectTitle: "Connect wallet",
    connectHint: "To see your result",
    loading: "Loading result…",
    unavailableTitle: "Result unavailable",
    viewLeaderboard: "View leaderboard →",
    backLeaderboard: "Leaderboard",
    gwBadge: (gw) => `Gameweek ${gw}`,
    pointsLabel: "Points",
    prizeLabel: "Prize",
    participantsLabel: "Entries",
    squadTitle: "Gameweek squad",
    statsPending: "Stats not finalized yet",
    catalogHint:
      "Some IDs are missing from the short on-site catalog; names are filled from the full FPL list. If you still see “Player #id”, the player is missing from the FPL bootstrap (rare).",
    startingXi: (n) => `Starting XI · ${n}`,
    bench: (n) => `Bench · ${n}`,
    pointsLegend: "Points:",
    ctaNextGw: "Build squad for the next gameweek →",
  },
  playerCard: {
    injuryFallback: "Injury / missing the round",
    suspensionFallback: "Suspension (red card / missing matches)",
    doubtfulWithPct: (pct) => `Doubtful — chance to play: ${pct}`,
    doubtfulUnknown: "Doubtful (chance unknown)",
    statusLine: (status, pct) => `Status: ${status}${pct ? ` (${pct})` : ""}`,
    formLabel: "Form",
    formTitle: "Player form",
    formSubtitle: "Average points per match in our scoring system (2025/26 season)",
    formTier1: "≥ 7.0",
    formTier1Hint: "Top form",
    formTier2: "≥ 5.0",
    formTier2Hint: "Steady returns",
    formTier3: "≥ 3.0",
    formTier3Hint: "Inconsistent",
    formTier4: "< 3.0",
    formTier4Hint: "Poor form",
  },
  leaderboardTable: {
    colRank: "#",
    colManager: "Manager",
    colPoints: "Pts",
    colPrize: "Prize",
    fundSplit: "Pool split",
    you: "You",
    claimed: "Claimed ✓",
  },
  nickname: {
    errEmpty: "Enter a nickname",
    errMin: "At least 2 characters",
    titleEdit: "Change nickname",
    titleWelcome: "Welcome!",
    descEdit: "This name is shown on the leaderboard",
    descWelcome: "Pick a nickname — it replaces your wallet address",
    fieldLabel: "Nickname",
    placeholder: "Enter nickname",
    later: "Later",
    save: "Save",
  },
  admin: {
    alertInvalidGw: "Enter a valid gameweek number (integer ≥ 1).",
    alertGwExists: (id, statusWord) =>
      `GW ${id} already exists in the contract (currently — ${statusWord}).\n\n` +
      `You cannot create it again (smart-contract rule). To change the gameweek: use “Re-open gameweek” for that number, or create a NEW number that is not in the table yet (e.g. the next free after the latest).`,
    alertGwCreated: (id) => `GW ${id} created.`,
    alertFailed: (msg) => `Failed: ${msg}`,
    alertNoOpenToClose:
      "No OPEN gameweek on-chain — nothing to close. If wallet/site looks wrong, tap Refresh after the latest transaction.",
    alertGwClosed: (id) => `GW ${id} closed (registration stopped).`,
    alertReopenInvalidGw: "Enter a gameweek number for re-open (integer ≥ 1).",
    alertGwNotFound: (id) => `GW ${id} not found in the contract.`,
    alertGwAlreadyOpen: (id) => `GW ${id} is already open — re-open not needed.`,
    alertReopenConfirm: (id) =>
      `Re-open GW ${id}? This clears stored oracle stats and published results for that gameweek on-chain.`,
    alertReopenDone: (id) =>
      `GW ${id} is OPEN again. If config “current” shows another number, that can be normal — the pointer does not always move when reopening a different GW.`,
    statusWordOpen: "open",
    statusWordClosed: "closed",
    statusWordResolved: "finished",
    loadFailedTitle: "Could not load contract",
    loadFailedBody:
      "The get_config request to Movement did not respond (network, RPC, or contract unavailable). Without this data the admin panel cannot verify access.",
    retry: "Try again",
    statConfigGw: "In config (current_gameweek)",
    statSameGwStatus: "Status (same GW)",
    statOpenRegistration: "Open for registration (on-chain fact)",
    noOpenGw: "no OPEN",
    desyncTitle: "Out of sync:",
    desyncBody: (cfgGw, openGw) =>
      `Config shows GW ${cfgGw}, but registration is in GW ${openGw}. The Close button below closes GW ${openGw}.`,
    manageResolvedTitle: "Managing the gameweek:",
    manageResolvedBody:
      "Config pointer is RESOLVED. If there is no “Open for registration · OPEN” row above, there is nothing to close; you can Re-open or Create a new gameweek.",
    sectionCloseTitle: "Close registration / Re-open gameweek",
    sectionCloseSubtitleOpen: (openGw) => `Closing applies to GW ${openGw} (currently open on-chain).`,
    sectionCloseSubtitleConfig: (cfgGw, st) => `Config now GW ${cfgGw}, status ${st}.`,
    closeExplain: (gw) =>
      `Close GW ${gw} to stop new squad registrations and prepare oracle stats submission.`,
    whyNoCloseTitle: "Why there is no Close:",
    whyNoCloseBody:
      "No OPEN gameweek on-chain; config GW may be RESOLVED — registration was already closed. To accept squads again for the same number — Re-open. New gameweek — Create.",
    noOpenVisibleHint:
      "No open gameweek visible — if registration should still be open, check the “Open for registration” block above after refreshing.",
    reopenExplain: (cfgGw) =>
      `Bring the selected gameweek back to OPEN. By default the config GW (${cfgGw}) is prefilled — you can change to another existing GW. WARNING: results and oracle stats for that GW will be cleared.`,
    reopenGwLabel: "Gameweek number for re-open",
    alertPrizePoolUpdated: "Prize pool percentage updated.",
    alertStatsSubmitted: "Stats submitted successfully.",
    alertResultsCalculated: (gwId) => `Results calculated for GW ${gwId}.`,
    sectionTitleWhenOpen: "Close registration",
    sectionTitleWhenClosed: "Re-open gameweek",
    closeGwButtonLabel: (gw) => `Close GW ${gw}`,
    feesSectionTitle: "Registration & title fees (MOVE)",
    feesSectionHint:
      "Updates on-chain entry_fee, title_fee, and guild_fee (octas). Squad page reads these values from get_config — republishing the package alone does not change an existing deployment.",
    feesEntryLabel: "Squad registration",
    feesTitleLabel: "Title purchase",
    feesGuildLabel: "Guild",
    feesSubmit: "Apply fees on-chain",
    feesUpdated: "Fees updated on-chain. Refresh the squad page.",
    feesInvalid: "Enter valid non-negative numbers for all three fees (MOVE).",
  },
};

export const pagesUk: PagesMessages = {
  languageSwitcherAria: "Мова сайту",
  gameweek: {
    registerErrorPrefix: "Помилка реєстрації:",
    connectTitle: "Вибір складу",
    connectDesc: "Підключи гаманець щоб вибрати свій склад на поточний тур.",
    gwWord: "Тур",
    registeredTitle: "Твій зареєстрований склад",
    leaderboardLink: "Лідерборд →",
    startersSection: "Основа",
    benchSection: "Запасні",
    unavailableTitle: "Тур недоступний",
    unavailableIntro: "Зараз немає відкритого ігрового тижня.",
    statusClosed: "закрито",
    statusResolved: "завершено",
    unavailableGwSuffix: (gw, statusLabel) => ` Тур ${gw} — ${statusLabel}.`,
    submitRegistering: "Реєстрація...",
    submitConfirm: (fee) => `Підтвердити склад · ${fee} MOVE`,
    submitNeedPlayers: (picked: number, max: number) => `Обери ${max} гравців (${picked}/${max})`,
    headerTitle: (gw) => `Тур ${gw} · Вибір складу`,
    pickPlayersHint: "Обери 11 гравців. Максимум 3 з однієї команди.",
    maxThreeHint: "Максимум 3 з однієї команди",
    entryFeeLabel: "Вартість реєстрації",
    entryShort: "Внесок",
    benchTitle: (n, max) => `Запасні (${n}/${max})`,
    benchSlotEmpty: (idx) => `Запасний ${idx + 1}`,
    playersProgress: (total, max, starters, bench) =>
      `${total}/${max} гравців (${starters} основних + ${bench} запасних)`,
    playersProgressShort: (total, max) => `${total}/${max} гравців`,
    searchPlaceholder: "Пошук гравця...",
    allTeams: "Всі команди",
    playersFound: (n) => `${n} гравців`,
    resetFilters: "Скинути фільтри",
    reset: "Скинути",
    noPlayersTitle: "Гравців не знайдено",
    noPlayersHint: "Спробуй інші фільтри",
    tabPitch: "Поле",
    tabPlayers: "Гравці",
  },
  fixtures: {
    back: "Назад",
    title: "Матчі туру",
    deadlineLabel: "Дедлайн (1-й матч)",
    loading: "Завантажуємо матчі...",
    errorTitle: "Не вдалось завантажити матчі",
    errorHint: "Спробуй оновити сторінку",
    finished: "Завершено",
    progressDone: (f, t) => `${f}/${t} завершено`,
    buildSquad: "Зібрати склад",
  },
  leaderboard: {
    claimSuccess: "Клейм виконано: MOVE надіслано на твій гаманець (перевір баланс у гаманці / в експлорері).",
    claimFail: (msg) => `Не вдалося заклеймити: ${msg}`,
    loading: "Завантаження даних...",
    seasonTag: "Сезон 2024/25",
    pageTitle: "Лідерборд",
    gwLabel: "Тур",
    statusOpen: "Відкрито",
    statusClosed: "Закрито",
    statusResolved: "Завершено",
    poolLabel: "Фонд",
    entriesLabel: "Учасників",
    prizeDistribution: "Розподіл призів",
    top10Receive: "Топ-10 отримують",
    noDataForGw: (gw) => `Немає даних для GW ${gw}`,
    myResultTitle: (gw) => `Мій результат · Тур ${gw}`,
    inPrizes: "У призах 🎉",
    detailsLink: "Детальніше →",
    colRank: "Місце",
    colPoints: "Очки",
    colPrizeMove: "Приз (MOVE)",
    claim: "Отримати",
    claiming: "...",
    claimed: "✓ Отримано",
    noPrize: "Без призу",
    emptyTitle: "Результатів поки немає",
    emptyClosedHint: (gw) =>
      `Тур ${gw} на ланцюгу в статусі «Закрито»: склади зафіксовано, статистику можна вже відправити в контракт. Таблиця лідерборду з’явиться після останнього кроку в адмінці — кнопка Calculate & Publish (транзакція обчислення та публікації). До цього on-chain статус туру не «Завершено».`,
    emptyNotPublished: (gw) => `Результати Туру ${gw} ще не опубліковані.`,
    registerSquadCta: "Зареєструй свій склад",
    footerLine: (gw) => `Реальні on-chain результати · Тур ${gw} · Movement`,
  },
  myResult: {
    errConfig: "Не вдалось завантажити конфіг",
    errResultNotFound: "Результат не знайдено — тур ще не закритий або ти не реєстрував склад",
    errSquadNotFound: "Склад не знайдено",
    errPlayersLoad: "Не вдалось завантажити гравців",
    errGeneric: "Щось пішло не так",
    connectTitle: "Підключи гаманець",
    connectHint: "Щоб побачити свій результат",
    loading: "Завантаження результату…",
    unavailableTitle: "Результат недоступний",
    viewLeaderboard: "Переглянути лідерборд →",
    backLeaderboard: "Лідерборд",
    gwBadge: (gw) => `Тур ${gw}`,
    pointsLabel: "Очки",
    prizeLabel: "Приз",
    participantsLabel: "Учасників",
    squadTitle: "Склад туру",
    statsPending: "Статистику ще не підведено",
    catalogHint:
      "Деякі id не знайдені в короткому каталозі сайту; ім’я підтягується з повного списку FPL. Якщо все ще «Гравець #id» — гравця немає в bootstrap FPL (рідкісно).",
    startingXi: (n) => `Основний склад · ${n}`,
    bench: (n) => `Запасні · ${n}`,
    pointsLegend: "Очки:",
    ctaNextGw: "Зібрати склад на наступний тур →",
  },
  playerCard: {
    injuryFallback: "Травма / пропуск туру",
    suspensionFallback: "Дискваліфікація (червона картка / відбуття матчів)",
    doubtfulWithPct: (pct) => `Під питанням — шанс зіграти: ${pct}`,
    doubtfulUnknown: "Під питанням (ймовірність участі не відома)",
    statusLine: (status, pct) => `Статус: ${status}${pct ? ` (${pct})` : ""}`,
    formLabel: "форма",
    formTitle: "Форма гравця",
    formSubtitle: "Середнє очок за гру в нашій системі нарахування (сезон 2025/26)",
    formTier1: "≥ 7.0",
    formTier1Hint: "гравець у топ-формі",
    formTier2: "≥ 5.0",
    formTier2Hint: "стабільно набирає",
    formTier3: "≥ 3.0",
    formTier3Hint: "непостійний",
    formTier4: "< 3.0",
    formTier4Hint: "погана форма",
  },
  leaderboardTable: {
    colRank: "#",
    colManager: "Менеджер",
    colPoints: "Очки",
    colPrize: "Приз",
    fundSplit: "Розподіл фонду",
    you: "Ви",
    claimed: "Отримано ✓",
  },
  nickname: {
    errEmpty: "Введи нікнейм",
    errMin: "Мінімум 2 символи",
    titleEdit: "Змінити нікнейм",
    titleWelcome: "Вітаємо!",
    descEdit: "Це ім'я буде відображатись у лідерборді",
    descWelcome: "Обери нікнейм — він відображатиметься замість адреси гаманця",
    fieldLabel: "Нікнейм",
    placeholder: "Введи нікнейм",
    later: "Пізніше",
    save: "Зберегти",
  },
  admin: {
    alertInvalidGw: "Введи коректний номер туру (ціле число ≥ 1).",
    alertGwExists: (id, statusWord) =>
      `Тур ${id} уже є в контракті (зараз — ${statusWord}).\n\n` +
      `Створити його знову неможливо (обмеження смарт-контракту). Щоб змінити тур: використай «Повторно відкрити тур» для цього номера, або створи НОВИЙ номер, якого ще немає в таблиці (наприклад наступний вільний після останнього).`,
    alertGwCreated: (id) => `Тур ${id} створено.`,
    alertFailed: (msg) => `Не вдалося: ${msg}`,
    alertNoOpenToClose:
      "Немає відкритого туру на ланцюгу (статус OPEN) — закривати нічого. Якщо в гаманці/сайті здається інакше, натисни «Оновити» після останньої транзакції.",
    alertGwClosed: (id) => `Тур ${id} закрито (реєстрацію зупинено).`,
    alertReopenInvalidGw: "Введи номер туру для re-open (ціле число ≥ 1).",
    alertGwNotFound: (id) => `Тур ${id} не знайдено в контракті.`,
    alertGwAlreadyOpen: (id) => `Тур ${id} уже відкритий — re-open не потрібен.`,
    alertReopenConfirm: (id) =>
      `Повторно відкрити тур ${id}? Буде очищено збережену статистику оракула та опубліковані результати для цього туру on-chain.`,
    alertReopenDone: (id) =>
      `Тур ${id} знову OPEN. Якщо в конфігу «current» інший номер — це нормально, покажчик не завжди змінюється при reopen іншого туру.`,
    statusWordOpen: "відкритий",
    statusWordClosed: "закритий",
    statusWordResolved: "завершений",
    loadFailedTitle: "Не вдалося завантажити контракт",
    loadFailedBody:
      "Запит get_config до Movement не відповів (мережа, RPC або контракт недоступні). Без цих даних адмінка не може перевірити права доступу.",
    retry: "Спробувати знову",
    statConfigGw: "У конфігу (current_gameweek)",
    statSameGwStatus: "Статус (той самий тур)",
    statOpenRegistration: "Відкритий для реєстрації (факт на ланцюгу)",
    noOpenGw: "немає OPEN",
    desyncTitle: "Розсинхрон:",
    desyncBody: (cfgGw, openGw) =>
      `у конфігу зараз Тур ${cfgGw}, але реєстрація йде в Тур ${openGw}. Кнопка «Close» нижче закриє саме Тур ${openGw}.`,
    manageResolvedTitle: "Керування туром:",
    manageResolvedBody:
      "покажчик у конфігу — RESOLVED. Якщо немає рядка «Відкритий для реєстрації · OPEN» вище, закривати нічого; можна Re-open або Create новий тур.",
    sectionCloseTitle: "Закрити реєстрацію / Повторно відкрити тур",
    sectionCloseSubtitleOpen: (openGw) => `Закриття стосується GW ${openGw} (відкритий зараз на ланцюгу).`,
    sectionCloseSubtitleConfig: (cfgGw, st) => `У конфігу зараз GW ${cfgGw}, статус ${st}.`,
    closeExplain: (gw) =>
      `Закрий GW ${gw}, щоб зупинити нові реєстрації складів і підготувати подачу статистики оракулом.`,
    whyNoCloseTitle: "Чому немає «Close»:",
    whyNoCloseBody:
      "відкритого туру (OPEN) на ланцюгу не знайдено; тур у конфігу може бути RESOLVED — реєстрація вже закрита раніше. Щоб знову приймати склади для того ж номера — Re-open. Новий тур — Create.",
    noOpenVisibleHint:
      "Відкритого туру не видно — якщо реєстрація ще мала б бути відкрита, перевір блок «Відкритий для реєстрації» вище після оновлення сторінки.",
    reopenExplain: (cfgGw) =>
      `Поверни обраний тур у OPEN. За замовчуванням підставлено номер з конфігу (GW ${cfgGw}) — можна змінити на інший існуючий тур. УВАГА: очистяться результати й статистика оракула для цього туру.`,
    reopenGwLabel: "Номер туру для re-open",
    alertPrizePoolUpdated: "Відсоток призового фонду оновлено.",
    alertStatsSubmitted: "Статистику успішно відправлено.",
    alertResultsCalculated: (gwId) => `Результати для GW ${gwId} обчислено та опубліковано.`,
    sectionTitleWhenOpen: "Закрити реєстрацію",
    sectionTitleWhenClosed: "Повторно відкрити тур",
    closeGwButtonLabel: (gw) => `Закрити GW ${gw}`,
    feesSectionTitle: "Внески: реєстрація складу та титули (MOVE)",
    feesSectionHint:
      "Оновлює on-chain entry_fee, title_fee та guild_fee (у найменших одиницях). Сторінка вибору складу бере суми з get_config — лише зміна коду пакета не змінює вже задеплоєний контракт.",
    feesEntryLabel: "Реєстрація складу",
    feesTitleLabel: "Купівля титулу",
    feesGuildLabel: "Гільдія",
    feesSubmit: "Застосувати внески в мережі",
    feesUpdated: "Внески оновлено on-chain. Онови сторінку вибору складу.",
    feesInvalid: "Введи коректні невід’ємні числа для всіх трьох полів (MOVE).",
  },
};
