import type { SiteLocale } from "./types";
import type { PagesMessages } from "./pages";
import { pagesUk, pagesEn } from "./pages";

export type SiteMessages = {
  nav: {
    squad: string;
    leaderboard: string;
    seasonPoints: string;
    fixtures: string;
    faq: string;
    worldCup: string;
    talents: string;
    soon: string;
    loading: string;
    menuOpen: string;
    menuClose: string;
    changeNickname: string;
    setNickname: string;
    disconnect: string;
    disconnectShort: string;
    walletShort: string;
    connectWallet: string;
    chooseWallet: string;
    compatibleChain: string;
    installed: string;
    openInSolflare: string;
    openInPhantom: string;
    noWalletsFound: string;
    noWalletsHint: string;
    connectHintNotInstalled: string;
    connectHintFailed: string;
    openingSolflare: string;
    openingPhantom: string;
    installSolflareExtension: string;
    installPhantomExtension: string;
    walletPhantomInstallSub: string;
    walletSolflareInstallSub: string;
    walletBeginnerEyebrow: string;
    walletBeginnerTitle: string;
    desktopExtensionHint: string;
    desktopExtensionRefresh: string;
    scanningSolflare: string;
    scanningWallets: string;
    connectHintInstalled: string;
    safariExtensionHint: string;
    solflareInstalledTips: string;
    socialXAria: string;
    installJupiterExtension: string;
    walletJupiterInstallSub: string;
    continueWithEmail: string;
    continueWithEmailSub: string;
    orUseWallet: string;
    emailLoginNeedsAppId: string;
    emailLoginNeedsAppIdLocal: string;
    loginTitle: string;
    loginWelcome: string;
    loginOr: string;
    loginTerms: string;
    loginPrivacy: string;
    loginSkinLabel: string;
    loginSkinCurrent: string;
    loginSkinIpad: string;
    loginSkinLocker: string;
    continueWithGoogle: string;
    googleLoginNotEnabled: string;
    emailPlaceholder: string;
    emailPlaceholderLong: string;
    emailContinue: string;
    emailInvalid: string;
    emailBack: string;
    enterCode: string;
    codeSentTo: (email: string) => string;
  };
  deposit: {
    title: string;
    open: string;
    close: string;
    balanceLabel: string;
    tabCash: string;
    tabCrypto: string;
    cashHint: string;
    cryptoHint: string;
    buyGuideCta: (wallet: string) => string;
    copyAddress: string;
    copied: string;
    copyFailed: string;
    needWallet: string;
    cashSoon: string;
    solanaAddress: string;
  };
  footer: {
    socialHint: string;
    socialHintShort: string;
    socialAria: string;
  };
  communityStrip: {
    label: string;
    badge: string;
    aria: string;
  };
  devBanner: {
    envHint: string;
  };
  home: {
    heroAlt: string;
    heroLine1: string;
    heroLine2: string;
    heroLine3: string;
    heroSub1: string;
    heroSub2: string;
    heroSub3: (symbol: string) => string;
    statPrizePool: string;
    statParticipants: string;
    statRegistered: string;
    ctaStart: string;
    wcPromoBadge: string;
    wcPromoTitleMain: string;
    wcPromoTitleYear: string;
    wcHeroEyebrow: string;
    wcHeroTitle: string;
    wcHeroLiveStatus: string;
    wcHeroTitleLine1: string;
    wcHeroTitleLine2: string;
    wcHeroLede: (symbol: string) => string;
    wcHeroHostsLabel: string;
    wcPromoDesc: (symbol: string) => string;
    wcPromoCta: string;
    wcPromoHosts: string;
    wcPromoStagePath: string;
    wcPromoFootnote: (rounds: number) => string;
    wcHeroTagline: string;
    wcScaleNations: string;
    wcScaleCities: string;
    wcScaleCountries: string;
    wcScaleMatches: string;
    wcScaleTrophy: string;
    wcHeroKicker: string;
    wcKickoffLabel: string;
    wcKickoffMeta: string;
    wcKickoffUnitD: string;
    wcKickoffUnitH: string;
    wcKickoffUnitM: string;
    wcKickoffUnitS: string;
    wcFeaturedLabel: string;
    statPrizePoolWc: string;
    statRegisteredWc: string;
    ctaStartWc: string;
    eplPausedNote: string;
    prizeTickerWc: (roundName: string) => string;
    howItWorks: string;
    step1Sub: string;
    step1Title: string;
    step1Desc: string;
    step2Badge: string;
    step2Title1: string;
    step2Title2: string;
    step2Desc: string;
    scoringBadge: string;
    scoringTitle: string;
    scoringSubtitle: string;
    positionScores: string;
    maxPerGw: string;
    pointsWord: string;
    penaltiesTitle: string;
    penaltiesSubtitle: string;
    bonusesTitle: string;
    bonusesSubtitle: string;
    talentsBadge: string;
    talentsTitle: string;
    talentsBodyStart: string;
    talentsBodyEnd: string;
    talentsHighlight: string;
    rarityCommon: string;
    rarityRare: string;
    rarityEpic: string;
    untilDeadline: string;
    deadlinePassed: string;
    daySuffix: string;
    hourSuffix: string;
    minSuffix: string;
    secSuffix: string;
    matchday: string;
    heroCarouselWcTab: string;
    heroCarouselAplTab: string;
    heroCarouselAria: string;
    heroCarouselPrev: string;
    heroCarouselNext: string;
    carouselMarqueePts: string;
    /** Interpolate `{n}` with GK_SAVE_BATCH */
    scoringSavesEvery: string;
    /** Interpolate `{n}` with GOALS_CONCEDED_DIVISOR */
    scoringConcededGoal: string;
  };
  scoringGains: Record<
    | "goal"
    | "penSave"
    | "cleanSheet"
    | "assist"
    | "savesBatch"
    | "concededGoal"
    | "rating90"
    | "rating80"
    | "rating75"
    | "lowRating"
    | "hattrick"
    | "minutes60"
    | "minutesPartial"
    | "redCard"
    | "ownGoal"
    | "penMiss"
    | "yellowCard"
    | "fplBonus",
    string
  >;
  pointsBreakdown: {
    total: string;
    noStats: string;
  };
  carousel: {
    slides: Array<{
      statusText: string;
      halfText: string;
      events: Array<{ action: string }>;
    }>;
  };
  marquee: Array<{
    stats: Array<{ text: string }>;
    pts: string;
  }>;
  rewards: {
    stepBadge: string;
    titleLine1: string;
    titleLine2: string;
    subtitle: (symbol: string) => string;
    colPosition: string;
    colShare: string;
  };
  recap: {
    /** Top badge — `{gw}` interpolated with the gameweek number */
    badge: string;
    title1: string;
    title2: string;
    desc: string;
    optimalLabel: string;
    winnerLabel: string;
    optimalSubtext: string;
    pointsBase: string;
    benchAbbrev: string;
    /** Tooltip shown on the green dot for players present in BOTH squads */
    sharedPlayer: string;
  };
  positionAbbrev: {
    GK: string;
    DEF: string;
    MID: string;
    FWD: string;
  };
  pages: PagesMessages;
};

const uk: SiteMessages = {
  nav: {
    squad: "Склад",
    leaderboard: "Лідерборд",
    seasonPoints: "Сезон",
    fixtures: "Матчі",
    faq: "FAQ",
    worldCup: "Чемпіонат світу",
    talents: "Таланти",
    soon: "soon",
    loading: "Завантаження…",
    menuOpen: "Відкрити меню",
    menuClose: "Закрити меню",
    changeNickname: "Змінити нік",
    setNickname: "Вказати нік",
    disconnect: "Вийти",
    disconnectShort: "Вийти",
    walletShort: "Вхід",
    connectWallet: "Увійти",
    chooseWallet: "Обери гаманець",
    compatibleChain: "Сумісний з Solana",
    installed: "Встановлено",
    openInSolflare: "Відкрити в Solflare",
    openInPhantom: "Відкрити в Phantom",
    noWalletsFound: "Гаманців не знайдено",
    noWalletsHint:
      "Потрібен Phantom, Solflare або Jupiter. Рекомендуємо Phantom. Після встановлення натисни «Увійти» знову.",
    connectHintNotInstalled:
      "Схоже, гаманець не відкрився або не встановлено. Завантаж Phantom, Solflare або Jupiter за посиланням нижче й спробуй знову.",
    connectHintFailed:
      "Не вдалося підключити гаманець. Перевір, чи встановлено Phantom, Solflare або Jupiter, або скористайся посиланнями нижче.",
    openingSolflare: "Відкриваємо Solflare… Підтверди підключення у вікні розширення.",
    openingPhantom: "Відкриваємо Phantom… Підтверди підключення у вікні розширення.",
    installSolflareExtension: "Встановити Solflare",
    installPhantomExtension: "Встановити Phantom",
    walletPhantomInstallSub: "Рекомендований Solana-гаманець",
    walletSolflareInstallSub: "Альтернативний Solana-гаманець",
    walletBeginnerEyebrow: "Вперше тут?",
    walletBeginnerTitle: "Що таке гаманець",
    desktopExtensionHint:
      "На Mac у браузері потрібне розширення Phantom, Solflare або Jupiter (Chrome, Brave або Edge).",
    desktopExtensionRefresh:
      "Після встановлення онови сторінку (Cmd+Shift+R) і обери гаманець. Дозволь розширенню доступ до localhost.",
    scanningSolflare: "Шукаємо розширення Solflare у браузері…",
    scanningWallets: "Шукаємо розширення гаманців у браузері…",
    connectHintInstalled:
      "Гаманець знайдено, але підключення не завершилось. Натисни іконку розширення → підключи сайт → обери Solana → спробуй знову. Дозволь popup для localhost.",
    safariExtensionHint:
      "У Safari потрібне окреме розширення Phantom (phantom.com/download).",
    solflareInstalledTips:
      "1) Іконка гаманця у панелі браузера → підключи цей сайт. 2) Обери Solana. 3) Дозволь popup. 4) Онови сторінку Cmd+Shift+R.",
    socialXAria: "FORM8 на X (Twitter) — новини та підтримка",
    installJupiterExtension: "Встановити Jupiter",
    walletJupiterInstallSub: "Гаманець Jupiter для Solana",
    continueWithEmail: "Продовжити з email",
    continueWithEmailSub: "Google або пошта — без розширення",
    orUseWallet: "або гаманець",
    emailLoginNeedsAppId:
      "Вхід через Google і email зараз недоступний. Увійди гаманцем нижче.",
    emailLoginNeedsAppIdLocal:
      "Privy ще не в білді. Локально: NEXT_PUBLIC_PRIVY_APP_ID у .env.local. На проді: та сама змінна в Vercel Production + Redeploy.",
    loginTitle: "Увійти або зареєструватись",
    loginWelcome: "Вітаємо у Form8",
    loginOr: "АБО",
    loginTerms: "Умови",
    loginPrivacy: "Приватність",
    loginSkinLabel: "Варіант плашки",
    loginSkinCurrent: "Зараз",
    loginSkinIpad: "iPad",
    loginSkinLocker: "Плашка",
    continueWithGoogle: "Продовжити з Google",
    googleLoginNotEnabled:
      "Google ще не увімкнено в Privy. Dashboard → Login methods → Socials → Google. Allowed origins: localhost, https://www.movematch.xyz і https://movematch.xyz.",
    emailPlaceholder: "Email",
    emailPlaceholderLong: "Email адреса",
    emailContinue: "Далі",
    emailInvalid: "Введи коректний email.",
    emailBack: "Інший email",
    enterCode: "Код з листа",
    codeSentTo: (email) => `Код надіслано на ${email}`,
  },
  deposit: {
    title: "Поповнити",
    open: "Поповнити",
    close: "Закрити",
    balanceLabel: "Баланс",
    tabCash: "Картка",
    tabCrypto: "Крипта",
    cashHint: "Купи USDC карткою або Apple Pay.",
    cryptoHint: "Надішли USDC у Solana.",
    buyGuideCta: (wallet) => `Купити в ${wallet}`,
    copyAddress: "Копіювати",
    copied: "Скопійовано",
    copyFailed: "Не вдалося скопіювати.",
    needWallet: "Підключи гаманець.",
    cashSoon: "Картка ще підключається — незабаром.",
    solanaAddress: "Адреса",
  },
  footer: {
    socialHint: "Питання й баги — у Telegram @movematch. Новини туру та оновлення — у X.",
    socialHintShort: "Питання в Telegram · новини в X",
    socialAria: "FORM8 на X (Twitter)",
  },
  communityStrip: {
    label: "Новини та підтримка на",
    badge: "Спільнота",
    aria: "FORM8 на X (Twitter) — новини та підтримка",
  },
  devBanner: {
    envHint:
      "Перевір .env.local: на mainnet не має бути devnet RPC або дефолтного program ID.",
  },
  home: {
    heroAlt: "Тактична дошка FORM8",
    heroLine1: "Розбираєшся в АПЛ",
    heroLine2: "краще за інших?",
    heroLine3: "Час на цьому заробити",
    heroSub1: "Аналізуй форму гравців і розклад туру.",
    heroSub2: "Збери 11 стартовиків і 3 запасних.",
    heroSub3: (symbol) => `Чим точніший твій вибір, тим більше ${symbol} на гаманець.`,
    statPrizePool: "Призовий фонд цього туру",
    statParticipants: "Учасників у цьому турі",
    statRegistered: "зареєстрованих складів",
    ctaStart: "Почати змагатись",
    wcPromoBadge: "Архів івенту",
    wcPromoTitleMain: "Чемпіонат світу",
    wcPromoTitleYear: "2026",
    wcHeroEyebrow: "WORLD CUP · 2026",
    wcHeroTitle: "Фентезі",
    wcHeroLiveStatus: "Фентезі-сезон відкрито",
    wcHeroTitleLine1: "Чемпіонат",
    wcHeroTitleLine2: "Світу",
    wcHeroLede:
      (symbol) => `48 націй, 16 міст, один трофей. Збирай склад і вигравай ${symbol}.`,
    wcHeroHostsLabel: "Господарі",
    wcPromoDesc: () =>
      "Турнір завершено. Дивись лідерборд турів і свій скор у bracket challenge — призи claim пізніше.",
    wcPromoCta: "Результати ЧС",
    wcPromoHosts: "США · Мексика · Канада",
    wcPromoStagePath: "Група → Фінал",
    wcPromoFootnote: () => "Лідерборд · прогноз турніру · архіви складів",
    wcHeroTagline: "Збери команду, яка досягне результату",
    wcScaleNations: "збірних",
    wcScaleCities: "міст-господарів",
    wcScaleCountries: "країни",
    wcScaleMatches: "матчів",
    wcScaleTrophy: "трофей",
    wcHeroKicker: "Головна подія сезону",
    wcKickoffLabel: "Старт ЧС",
    wcKickoffMeta: "11 черв 2026 · Мехіко",
    wcKickoffUnitD: "днів",
    wcKickoffUnitH: "год",
    wcKickoffUnitM: "хв",
    wcKickoffUnitS: "сек",
    wcFeaturedLabel: "На турнірі",
    statPrizePoolWc: "Призовий фонд раунду",
    statRegisteredWc: "Гравці в раунді",
    ctaStartWc: "Зібрати склад ЧС",
    eplPausedNote: "АПЛ повернеться після завершення Чемпіонату світу",
    prizeTickerWc: (roundName) => `ЧС · ${roundName} · призи`,
    howItWorks: "Як це працює",
    step1Sub: "01 — Твій склад, твоя тактика",
    step1Title: "Весь склад АПЛ — твій вибір",
    step1Desc:
      "Аналізуй форму, дивись розклад і збирай склад з будь-яких гравців Англійської Прем'єр-ліги. 11 стартовиків і 3 запасних — твоє тактичне рішення на тур.",
    step2Badge: "02 — Очки в реальному часі",
    step2Title1: "Твої гравці.",
    step2Title2: "Реальні матчі.",
    step2Desc:
      "Статистика надходить з офіційних джерел АПЛ. Кожна дія твоїх гравців на полі — твої очки.",
    scoringBadge: "Правила нарахування",
    scoringTitle: "Чим більше дій — тим більше очок",
    scoringSubtitle:
      "Голи, асисти, сейви, суха пара, вихід на поле — все враховується. Кожна позиція має свою вагу.",
    positionScores: "Бали за позицією",
    maxPerGw: "Макс. за тур",
    pointsWord: "балів",
    penaltiesTitle: "Штрафи",
    penaltiesSubtitle: "Для всіх позицій",
    bonusesTitle: "Загальні бонуси",
    bonusesSubtitle: "Для всіх позицій",
    talentsBadge: "Незабаром",
    talentsTitle: "Таланти",
    talentsBodyStart: "Розблокуй унікальні ",
    talentsBodyEnd:
      ", які множать фінальні очки гравця на +5%, +10% або +15%. Один правильний вибір може перекинути весь лідерборд.",
    talentsHighlight: "Таланти",
    rarityCommon: "Звичайний",
    rarityRare: "Рідкісний",
    rarityEpic: "Епічний",
    untilDeadline: "До дедлайну",
    deadlinePassed: "Дедлайн пройшов",
    daySuffix: "д",
    hourSuffix: "г",
    minSuffix: "хв",
    secSuffix: "с",
    matchday: "Тур",
    heroCarouselWcTab: "ЧС 2026",
    heroCarouselAplTab: "АПЛ",
    heroCarouselAria: "Головний слайдер",
    heroCarouselPrev: "Попередній слайд",
    heroCarouselNext: "Наступний слайд",
    carouselMarqueePts: "ОЧК",
    scoringSavesEvery: "Кожні {n} сейви",
    scoringConcededGoal: "Пропущений гол (×{n})",
  },
  scoringGains: {
    goal: "Гол",
    penSave: "Відбитий пенальті",
    cleanSheet: "Суха пара",
    assist: "Асист",
    savesBatch: "сейви",
    concededGoal: "Пропущений гол",
    rating90: "Рейтинг матчу ≥9.0",
    rating80: "Рейтинг матчу ≥8.0",
    rating75: "Рейтинг матчу ≥7.5",
    lowRating: "Рейтинг матчу <6.0",
    hattrick: "Хет-трик",
    minutes60: "Вихід 60+ хв",
    minutesPartial: "Вихід 1–59 хв",
    redCard: "Червона картка",
    ownGoal: "Автогол",
    penMiss: "Незабитий пенальті",
    yellowCard: "Жовта картка",
    fplBonus: "FPL бонус",
  },
  pointsBreakdown: {
    total: "Разом",
    noStats: "Немає статистики за тур",
  },
  carousel: {
    slides: [
      {
        statusText: "LIVE",
        halfText: "2-й тайм",
        events: [{ action: "Гол!" }, { action: "Асист" }, { action: "Жовта картка" }],
      },
      {
        statusText: "ЗАВЕРШЕНО",
        halfText: "",
        events: [{ action: "2 Голи" }, { action: "Асист" }, { action: "Гол!" }],
      },
      {
        statusText: "LIVE",
        halfText: "1-й тайм",
        events: [{ action: "3 Сейви" }, { action: "Ключ. пас" }, { action: "Суха пара" }],
      },
    ],
  },
  marquee: [
    { stats: [{ text: "3 Сейви" }, { text: "Суха пара" }], pts: "+7 ОЧК" },
    { stats: [{ text: "Відбір" }, { text: "90+ хв" }], pts: "+6 ОЧК" },
    { stats: [{ text: "Суха пара" }, { text: "90+ хв" }], pts: "+8 ОЧК" },
    { stats: [{ text: "Суха пара" }, { text: "Жовта картка" }], pts: "+6 ОЧК" },
    { stats: [{ text: "Асист" }, { text: "Відбір" }], pts: "+9 ОЧК" },
    { stats: [{ text: "Гол" }, { text: "90+ хв" }], pts: "+11 ОЧК" },
    { stats: [{ text: "2 Голи" }, { text: "ГМ" }], pts: "+12 ОЧК" },
    { stats: [{ text: "Асист" }, { text: "Ключ. пас" }], pts: "+8 ОЧК" },
    { stats: [{ text: "Гол" }, { text: "Асист" }], pts: "+15 ОЧК" },
    { stats: [{ text: "2 Голи" }, { text: "90+ хв" }], pts: "+18 ОЧК" },
    { stats: [{ text: "Гол" }, { text: "Ключ. пас" }], pts: "+14 ОЧК" },
  ],
  rewards: {
    stepBadge: "03 — ПЕРЕМАГАЙ",
    titleLine1: "РОЗДІЛИ",
    titleLine2: "ПРИЗОВИЙ ПУЛ",
    subtitle:
      (symbol) => `Топ-10 менеджерів туру ділять призовий пул. Закінчився тур — ${symbol} надходять на гаманець після клейму на лідерборді.`,
    colPosition: "Позиція",
    colShare: "Розподіл",
  },
  recap: {
    badge: "Реальний приклад · Тур {gw}",
    title1: "Так виглядав найкращий склад",
    title2: "минулого туру",
    desc: "Зліва — найоптимальніший вибір з усіх гравців АПЛ. Справа — реальний переможець туру.",
    optimalLabel: "Найоптимальніший склад",
    winnerLabel: "Переможець туру",
    optimalSubtext: "З усіх гравців АПЛ",
    pointsBase: "очок",
    benchAbbrev: "ЛАВ",
    sharedPlayer: "Є і в переможця",
  },
  positionAbbrev: { GK: "ВР", DEF: "ЗАХ", MID: "ПЗ", FWD: "НАП" },
  pages: pagesUk,
};

const en: SiteMessages = {
  nav: {
    squad: "Squad",
    leaderboard: "Leaderboard",
    seasonPoints: "Season",
    fixtures: "Fixtures",
    faq: "FAQ",
    worldCup: "World Cup",
    talents: "Talents",
    soon: "soon",
    loading: "Loading…",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    changeNickname: "Change nickname",
    setNickname: "Set nickname",
    disconnect: "Log out",
    disconnectShort: "Log out",
    walletShort: "Log in",
    connectWallet: "Log in",
    chooseWallet: "Choose a wallet",
    compatibleChain: "Compatible with Solana",
    installed: "Installed",
    openInSolflare: "Open in Solflare",
    openInPhantom: "Open in Phantom",
    noWalletsFound: "No wallets found",
    noWalletsHint:
      "You need Phantom, Solflare, or Jupiter. We recommend Phantom. After installing, tap “Log in” again.",
    connectHintNotInstalled:
      "The wallet may not have opened or isn’t installed. Download Phantom, Solflare, or Jupiter via the links below and try again.",
    connectHintFailed:
      "Could not connect the wallet. Check that Phantom, Solflare, or Jupiter is installed or use the links below.",
    openingSolflare: "Opening Solflare… Approve the connection in the extension popup.",
    openingPhantom: "Opening Phantom… Approve the connection in the extension popup.",
    installSolflareExtension: "Install Solflare",
    installPhantomExtension: "Install Phantom",
    walletPhantomInstallSub: "Recommended Solana wallet",
    walletSolflareInstallSub: "Alternative Solana wallet",
    walletBeginnerEyebrow: "First time here?",
    walletBeginnerTitle: "What is a wallet",
    desktopExtensionHint:
      "On Mac, the browser needs the Phantom, Solflare, or Jupiter extension (Chrome, Brave, or Edge).",
    desktopExtensionRefresh:
      "After installing, refresh this page (Cmd+Shift+R) and choose a wallet. Allow the extension access to localhost.",
    scanningSolflare: "Looking for the Solflare extension in your browser…",
    scanningWallets: "Looking for wallet extensions in your browser…",
    connectHintInstalled:
      "Wallet found but the connection did not finish. Click the extension icon → connect this site → select Solana → try again. Allow popups for localhost.",
    safariExtensionHint:
      "Safari needs the separate Phantom Safari extension (phantom.com/download).",
    solflareInstalledTips:
      "1) Wallet toolbar icon → connect this site. 2) Select Solana. 3) Allow popups. 4) Refresh Cmd+Shift+R.",
    socialXAria: "FORM8 on X (Twitter) — news and support",
    installJupiterExtension: "Install Jupiter",
    walletJupiterInstallSub: "Jupiter wallet for Solana",
    continueWithEmail: "Continue with email",
    continueWithEmailSub: "Google or email — no extension",
    orUseWallet: "or a wallet",
    emailLoginNeedsAppId:
      "Google and email login is not available yet. Use a wallet below.",
    emailLoginNeedsAppIdLocal:
      "Privy is not in this build. Local: NEXT_PUBLIC_PRIVY_APP_ID in .env.local. Production: the same variable on Vercel Production, then Redeploy.",
    loginTitle: "Log in or sign up",
    loginWelcome: "Welcome to Form8",
    loginOr: "OR",
    loginTerms: "Terms",
    loginPrivacy: "Privacy",
    loginSkinLabel: "Plaque look",
    loginSkinCurrent: "Current",
    loginSkinIpad: "iPad",
    loginSkinLocker: "Plaque",
    continueWithGoogle: "Continue with Google",
    googleLoginNotEnabled:
      "Google login is off in Privy. Dashboard → Login methods → Socials → Google. Allowed origins: localhost, https://www.movematch.xyz, and https://movematch.xyz.",
    emailPlaceholder: "Email",
    emailPlaceholderLong: "Email address",
    emailContinue: "Continue",
    emailInvalid: "Enter a valid email.",
    emailBack: "Use a different email",
    enterCode: "Code from email",
    codeSentTo: (email) => `Code sent to ${email}`,
  },
  deposit: {
    title: "Deposit",
    open: "Deposit",
    close: "Close",
    balanceLabel: "Balance",
    tabCash: "Cash",
    tabCrypto: "Crypto",
    cashHint: "Buy USDC with a card or Apple Pay.",
    cryptoHint: "Send USDC on Solana.",
    buyGuideCta: (wallet) => `Buy in ${wallet}`,
    copyAddress: "Copy",
    copied: "Copied",
    copyFailed: "Could not copy.",
    needWallet: "Connect a wallet.",
    cashSoon: "Card is still being connected — coming soon.",
    solanaAddress: "Address",
  },
  footer: {
    socialHint: "Questions and bugs — Telegram @movematch. Gameweek news and updates — on X.",
    socialHintShort: "Questions on Telegram · news on X",
    socialAria: "FORM8 on X (Twitter)",
  },
  communityStrip: {
    label: "News & support on",
    badge: "Community",
    aria: "FORM8 on X (Twitter) — news and support",
  },
  devBanner: {
    envHint:
      "Check .env.local: avoid a devnet RPC or the default program ID on mainnet.",
  },
  home: {
    heroAlt: "FORM8 tactical board",
    heroLine1: "Know the EPL",
    heroLine2: "Better than everyone?",
    heroLine3: "Time to earn from it",
    heroSub1: "Study player form and the gameweek schedule.",
    heroSub2: "Pick 11 starters and 3 subs.",
    heroSub3: (symbol) => `The sharper your picks, the more ${symbol} lands in your wallet.`,
    statPrizePool: "This gameweek prize pool",
    statParticipants: "Players this gameweek",
    statRegistered: "registered squads",
    ctaStart: "Start competing",
    wcPromoBadge: "Event archive",
    wcPromoTitleMain: "World Cup",
    wcPromoTitleYear: "2026",
    wcHeroEyebrow: "WORLD CUP · 2026",
    wcHeroTitle: "Fantasy",
    wcHeroLiveStatus: "Fantasy season is live",
    wcHeroTitleLine1: "World Cup",
    wcHeroTitleLine2: "",
    wcHeroLede:
      (symbol) => `48 nations, 16 cities, one trophy. Draft your squad and win ${symbol}.`,
    wcHeroHostsLabel: "Hosts",
    wcPromoDesc: () =>
      "Tournament wrapped. Check round leaderboards and your bracket score — prize claim opens when funded.",
    wcPromoCta: "View WC results",
    wcPromoHosts: "USA · México · Canada",
    wcPromoStagePath: "Group → Final",
    wcPromoFootnote: () => "Leaderboards · bracket challenge · squad archives",
    wcHeroTagline: "Build a squad that delivers",
    wcScaleNations: "nations",
    wcScaleCities: "host cities",
    wcScaleCountries: "countries",
    wcScaleMatches: "matches",
    wcScaleTrophy: "trophy",
    wcHeroKicker: "The main event of the season",
    wcKickoffLabel: "Kickoff",
    wcKickoffMeta: "11 Jun 2026 · México City",
    wcKickoffUnitD: "Days",
    wcKickoffUnitH: "Hrs",
    wcKickoffUnitM: "Min",
    wcKickoffUnitS: "Sec",
    wcFeaturedLabel: "At the Cup",
    statPrizePoolWc: "Round prize pool",
    statRegisteredWc: "Players this round",
    ctaStartWc: "Build World Cup squad",
    eplPausedNote: "Premier League returns after the World Cup",
    prizeTickerWc: (roundName) => `WC · ${roundName} · prizes`,
    howItWorks: "How it works",
    step1Sub: "01 — Your squad, your tactics",
    step1Title: "The whole PL player pool — your call",
    step1Desc:
      "Read form, check fixtures, and build a squad from any Premier League players. 11 starters and 3 subs — your tactical call for the round.",
    step2Badge: "02 — Live points",
    step2Title1: "Your players.",
    step2Title2: "Real matches.",
    step2Desc:
      "Stats come from official Premier League sources. Every action on the pitch becomes your points.",
    scoringBadge: "Scoring rules",
    scoringTitle: "More actions — more points",
    scoringSubtitle:
      "Goals, assists, saves, clean sheets, minutes on the pitch — it all counts. Each position is weighted differently.",
    positionScores: "Points by position",
    maxPerGw: "Max per GW",
    pointsWord: "pts",
    penaltiesTitle: "Penalties",
    penaltiesSubtitle: "All positions",
    bonusesTitle: "Global bonuses",
    bonusesSubtitle: "All positions",
    talentsBadge: "Coming soon",
    talentsTitle: "Talents",
    talentsBodyStart: "Unlock unique ",
    talentsBodyEnd:
      " that multiply a player’s final score by +5%, +10%, or +15%. One right pick can flip the whole leaderboard.",
    talentsHighlight: "Talents",
    rarityCommon: "Common",
    rarityRare: "Rare",
    rarityEpic: "Epic",
    untilDeadline: "Until deadline",
    deadlinePassed: "Deadline end",
    daySuffix: "d",
    hourSuffix: "h",
    minSuffix: "m",
    secSuffix: "s",
    matchday: "Matchday",
    heroCarouselWcTab: "World Cup 2026",
    heroCarouselAplTab: "Premier League",
    heroCarouselAria: "Home hero carousel",
    heroCarouselPrev: "Previous slide",
    heroCarouselNext: "Next slide",
    carouselMarqueePts: "PTS",
    scoringSavesEvery: "Every {n} saves",
    scoringConcededGoal: "Goal conceded (×{n})",
  },
  scoringGains: {
    goal: "Goal",
    penSave: "Penalty save",
    cleanSheet: "Clean sheet",
    assist: "Assist",
    savesBatch: "saves",
    concededGoal: "Goal conceded",
    rating90: "Match rating ≥9.0",
    rating80: "Match rating ≥8.0",
    rating75: "Match rating ≥7.5",
    lowRating: "Match rating <6.0",
    hattrick: "Hat-trick",
    minutes60: "Played 60+ mins",
    minutesPartial: "Played 1–59 mins",
    redCard: "Red card",
    ownGoal: "Own goal",
    penMiss: "Penalty miss",
    yellowCard: "Yellow card",
    fplBonus: "FPL bonus",
  },
  pointsBreakdown: {
    total: "Total",
    noStats: "No stats for this round",
  },
  carousel: {
    slides: [
      {
        statusText: "LIVE",
        halfText: "2nd half",
        events: [{ action: "Goal!" }, { action: "Assist" }, { action: "Yellow card" }],
      },
      {
        statusText: "FT",
        halfText: "",
        events: [{ action: "2 Goals" }, { action: "Assist" }, { action: "Goal!" }],
      },
      {
        statusText: "LIVE",
        halfText: "1st half",
        events: [{ action: "3 Saves" }, { action: "Key pass" }, { action: "Clean sheet" }],
      },
    ],
  },
  marquee: [
    { stats: [{ text: "3 Saves" }, { text: "Clean sheet" }], pts: "+7 PTS" },
    { stats: [{ text: "Tackle" }, { text: "90+ mins" }], pts: "+6 PTS" },
    { stats: [{ text: "Clean sheet" }, { text: "90+ mins" }], pts: "+8 PTS" },
    { stats: [{ text: "Clean sheet" }, { text: "Yellow card" }], pts: "+6 PTS" },
    { stats: [{ text: "Assist" }, { text: "Tackle" }], pts: "+9 PTS" },
    { stats: [{ text: "Goal" }, { text: "90+ mins" }], pts: "+11 PTS" },
    { stats: [{ text: "2 Goals" }, { text: "MOTM" }], pts: "+12 PTS" },
    { stats: [{ text: "Assist" }, { text: "Key pass" }], pts: "+8 PTS" },
    { stats: [{ text: "Goal" }, { text: "Assist" }], pts: "+15 PTS" },
    { stats: [{ text: "2 Goals" }, { text: "90+ mins" }], pts: "+18 PTS" },
    { stats: [{ text: "Goal" }, { text: "Key pass" }], pts: "+14 PTS" },
  ],
  rewards: {
    stepBadge: "03 — WIN",
    titleLine1: "SPLIT THE",
    titleLine2: "PRIZE POOL",
    subtitle:
      (symbol) => `The top 10 managers of the gameweek share the pool. When the round ends, claim ${symbol} on the leaderboard.`,
    colPosition: "Rank",
    colShare: "Share",
  },
  recap: {
    badge: "Real example · GW {gw}",
    title1: "What the best lineup looked like",
    title2: "last gameweek",
    desc: "Left — the optimal pick from every PL player. Right — the actual gameweek winner.",
    optimalLabel: "Best possible lineup",
    winnerLabel: "Gameweek winner",
    optimalSubtext: "From every PL player",
    pointsBase: "pts",
    benchAbbrev: "BEN",
    sharedPlayer: "Also in the winner's squad",
  },
  positionAbbrev: { GK: "GK", DEF: "DEF", MID: "MID", FWD: "FWD" },
  pages: pagesEn,
};

export const messages: Record<SiteLocale, SiteMessages> = { uk, en };

/** Ukrainian ordinal place label (1-ше … n-те). */
export function formatRewardPlaceUk(rank: number): string {
  if (rank === 1) return "1-ше місце";
  if (rank === 2) return "2-ге місце";
  if (rank === 3) return "3-тє місце";
  return `${rank}-те місце`;
}

export function formatRewardPlaceEn(rank: number): string {
  const mod10 = rank % 10;
  const mod100 = rank % 100;
  let suf = "th";
  if (mod100 < 11 || mod100 > 13) {
    if (mod10 === 1) suf = "st";
    else if (mod10 === 2) suf = "nd";
    else if (mod10 === 3) suf = "rd";
  }
  return `${rank}${suf} place`;
}
