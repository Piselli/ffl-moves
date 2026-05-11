import type { SiteLocale } from "./types";
import type { PagesMessages } from "./pages";
import { pagesUk, pagesEn } from "./pages";

export type SiteMessages = {
  nav: {
    squad: string;
    leaderboard: string;
    fixtures: string;
    faq: string;
    talents: string;
    soon: string;
    loading: string;
    menuOpen: string;
    menuClose: string;
    changeNickname: string;
    setNickname: string;
    disconnect: string;
    walletShort: string;
    connectWallet: string;
    chooseWallet: string;
    compatibleMovement: string;
    installed: string;
    openInNightly: string;
    noWalletsFound: string;
    noWalletsHint: string;
    connectHintNightly: string;
    connectHintFailed: string;
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
    heroSub3: string;
    statPrizePool: string;
    statParticipants: string;
    statRegistered: string;
    ctaStart: string;
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
    matchday: string;
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
    | "bps"
    | "hattrick"
    | "minutes60"
    | "minutesPartial"
    | "redCard"
    | "ownGoal"
    | "penMiss"
    | "yellowCard",
    string
  >;
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
    subtitle: string;
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
    fixtures: "Матчі",
    faq: "FAQ",
    talents: "Таланти",
    soon: "soon",
    loading: "Завантаження…",
    menuOpen: "Відкрити меню",
    menuClose: "Закрити меню",
    changeNickname: "Змінити нікнейм",
    setNickname: "Встановити нікнейм",
    disconnect: "Від'єднати",
    walletShort: "Гаманець",
    connectWallet: "Підключити гаманець",
    chooseWallet: "Обери гаманець",
    compatibleMovement: "Сумісний з Movement Network",
    installed: "Встановлено",
    openInNightly: "Відкрити в Nightly",
    noWalletsFound: "Гаманців не знайдено",
    noWalletsHint:
      "Потрібен гаманець Nightly. Після встановлення натисни «Підключити гаманець» знову.",
    connectHintNightly:
      "Схоже, Nightly не відкрився або не встановлено. Завантаж Nightly за посиланням нижче й спробуй підключити знову.",
    connectHintFailed:
      "Не вдалося підключити гаманець. Перевір, чи встановлено Nightly, або скористайся посиланнями нижче.",
  },
  devBanner: {
    envHint:
      "Перевір .env.local і Nightly: не nightly RPC і не дефолтна адреса testnet3 на mainnet.",
  },
  home: {
    heroAlt: "Тактична дошка MOVEMATCH",
    heroLine1: "Розбираєшся в АПЛ",
    heroLine2: "краще за інших?",
    heroLine3: "Час на цьому заробити",
    heroSub1: "Аналізуй форму гравців і розклад туру.",
    heroSub2: "Збери 11 стартовиків і 3 запасних.",
    heroSub3: "Чим точніший твій вибір, тим більше MOVE на гаманець.",
    statPrizePool: "Призовий фонд цього туру",
    statParticipants: "Учасників у цьому турі",
    statRegistered: "зареєстрованих складів",
    ctaStart: "Почати змагатись",
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
    matchday: "Тур",
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
    bps: "Гравець матчу (BPS)",
    hattrick: "Хет-трик",
    minutes60: "Вихід 60+ хв",
    minutesPartial: "Вихід 1–59 хв",
    redCard: "Червона картка",
    ownGoal: "Автогол",
    penMiss: "Незабитий пенальті",
    yellowCard: "Жовта картка",
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
      "Топ-10 менеджерів туру ділять призовий пул. Закінчився тур — MOVE токени надходять на гаманець автоматично.",
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
    fixtures: "Fixtures",
    faq: "FAQ",
    talents: "Talents",
    soon: "soon",
    loading: "Loading…",
    menuOpen: "Open menu",
    menuClose: "Close menu",
    changeNickname: "Change nickname",
    setNickname: "Set nickname",
    disconnect: "Disconnect",
    walletShort: "Wallet",
    connectWallet: "Connect wallet",
    chooseWallet: "Choose a wallet",
    compatibleMovement: "Compatible with Movement Network",
    installed: "Installed",
    openInNightly: "Open in Nightly",
    noWalletsFound: "No wallets found",
    noWalletsHint: "You need the Nightly wallet. After installing, tap “Connect wallet” again.",
    connectHintNightly:
      "Nightly may not have opened or isn’t installed. Download Nightly via the link below and try again.",
    connectHintFailed:
      "Could not connect the wallet. Check that Nightly is installed or use the links below.",
  },
  devBanner: {
    envHint:
      "Check .env.local and Nightly: avoid nightly RPC and the default testnet3 module address on mainnet.",
  },
  home: {
    heroAlt: "MOVEMATCH tactical board",
    heroLine1: "Know the EPL",
    heroLine2: "Better than everyone?",
    heroLine3: "Time to earn from it",
    heroSub1: "Study player form and the gameweek schedule.",
    heroSub2: "Pick 11 starters and 3 subs.",
    heroSub3: "The sharper your picks, the more MOVE lands in your wallet.",
    statPrizePool: "This gameweek’s prize pool",
    statParticipants: "Players this gameweek",
    statRegistered: "registered squads",
    ctaStart: "Start competing",
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
    matchday: "Matchday",
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
    bps: "Player of the match (BPS)",
    hattrick: "Hat-trick",
    minutes60: "Played 60+ mins",
    minutesPartial: "Played 1–59 mins",
    redCard: "Red card",
    ownGoal: "Own goal",
    penMiss: "Penalty miss",
    yellowCard: "Yellow card",
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
      "The top 10 managers of the gameweek share the pool. When the round ends, MOVE is sent to wallets automatically.",
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
