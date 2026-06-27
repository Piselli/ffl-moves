/** A single block inside an FAQ answer — paragraph or bullet list. */
export type FaqAnswerBlock =
  | { type: "p"; text: string }
  | { type: "ul"; items: string[] };

export type FaqItem = {
  /** Stable id used for deep-link anchors (e.g. `?q=what-is-movematch`). */
  id: string;
  q: string;
  a: FaqAnswerBlock[];
};

export type FaqCategoryId =
  | "what-is-this"
  | "football-101"
  | "web3-101"
  | "how-to-play"
  | "scoring-and-rewards"
  | "trust-and-safety"
  | "whats-next";

export type FaqCategory = {
  id: FaqCategoryId;
  title: string;
  /** Short tagline displayed under the category title. */
  blurb: string;
  items: FaqItem[];
};

/** All non-home strings: gameweek, fixtures, leaderboard, my-result, modals, tables, admin alerts, faq. */
export type PagesMessages = {
  languageSwitcherAria: string;
  worldCup: {
    badge: string;
    landingTitle: string;
    landingSubtitle: string;
    playCta: string;
    heroRegistrationLabel: string;
    heroRegistrationClosedHint: string;
    leaderboardCta: string;
    navSquad: string;
    navLeaderboard: string;
    stageGroup: string;
    stageKnockout: string;
    /** Human label for a tour by its round key (md1, r32, …). */
    roundName: (key: string) => string;
    roundsTitle: string;
    roundsSubtitle: string;
    statusUpcoming: string;
    statusOpen: string;
    statusClosed: string;
    statusResolved: string;
    squadTitle: string;
    pickHint: string;
    maxThreeNation: string;
    nationFilterAll: string;
    catalogEmptyTitle: string;
    catalogEmptyHint: string;
    noActiveTourTitle: string;
    noActiveTourHint: string;
    leaderboardTitle: string;
    leaderboardEmptyTitle: string;
    leaderboardEmptyHint: string;
    /** Closed round — squads locked, oracle stats not submitted yet. */
    leaderboardClosedAwaitingHint: (roundLabel: string) => string;
    /** Squads can still be viewed while points are pending. */
    leaderboardSquadsViewable: string;
    mySquadsCta: string;
    myResultPageTitle: string;
    myResultTourPicker: string;
    myResultNoSquads: string;
    myResultBackLeaderboard: string;
    myResultOpenRegistrationCta: string;
    backToHub: string;
    howItWorksTitle: string;
    howStep1: string;
    howStep2: string;
    howStep3: (symbol: string) => string;
    howDemoPoolTitle: string;
    howDemoPoolMore: string;
    hubLiveBadge: string;
    hubSubNavOverview: string;
    hubPrizePoolLabel: string;
    hubEntriesLabel: string;
    hubUntilDeadline: string;
    hubPrizeTeaserTitle: string;
    hubPrizeTeaserDesc: (symbol: string) => string;
    hubStagePath: string;
    hubHostsLabel: string;
    prizeBadge: string;
    prizeTitle: string;
    prizeTitleForN: (n: number) => string;
    prizeDesc: (symbol: string) => string;
    prizeDescForN: (n: number, symbol: string) => string;
    prizePoolNowLabel: string;
    prizeShareSuffix: string;
    prizeClaimNote: string;
    prizeEmptyHint: string;
    prizeRankLabel: (rank: number) => string;
    /** Heading above the payout distribution chart. */
    prizeDistribution: string;
    /** Fixtures / results board. */
    fx: {
      title: string;
      subtitle: string;
      loading: string;
      deadlineLabel: string;
      emptyTitle: string;
      emptyHint: string;
      groupLabel: (letter: string) => string;
      statusUpcoming: string;
      statusLive: string;
      statusFinished: string;
      tbd: string;
      timeTbc: string;
      seeAll: string;
      teaserTitle: string;
    };
    /** Bracket prediction challenge (full tournament). */
    bracket: {
      badge: string;
      title: string;
      subtitle: string;
      rulesLine: string;
      deadlineNote: string;
      statusOpen: string;
      statusClosed: string;
      statusResolved: string;
      statusUpcoming: string;
      entriesLabel: (n: number) => string;
      prizeRank: (n: number) => string;
      prizePoolLabel: string;
      prizeTopFiveLabel: string;
      prizePerfectBonusTitle: string;
      prizePerfectBonusDesc: (maxScore: number, bonusUsd: string) => string;
      notEligibleTitle: string;
      notEligibleHint: string;
      registrationClosedTitle: string;
      registrationClosedBanner: string;
      registrationClosedConnectHint: string;
      registrationClosedMissedHint: string;
      registrationClosedNotEligibleHint: string;
      submittedTitle: string;
      submittedHint: string;
      contractPending: string;
      submitCta: string;
      submitting: string;
      gasNote: string;
      submitPickRemaining: (n: number) => string;
      submitPickFinals: string;
      submitDeadlinePassed: string;
      submitStatusNotOpen: string;
      confirmGroups: string;
      confirmThirds: string;
      koFinal: string;
      koThirdPlace: string;
      koTapHint: string;
      hubCta: string;
      hubTeaser: string;
      predictor: {
        stepGroups: string;
        stepThirds: string;
        stepKnockout: string;
        thirdsTitle: string;
        thirdsHint: string;
        thirdsAdvance: string;
        koTitle: string;
        koPickWinner: string;
        progress: (done: number, total: number) => string;
      };
    };
  };
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
    randomSquadBtn: string;
    randomSquadFailed: string;
    maxThreeHint: string;
    entryFeeLabel: string;
    entryFeeUsdcxHint: string;
    entryFeeLegacyBanner: (chargedLabel: string) => string;
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
    fplStripTitle: string;
    fplStripSeeAll: string;
    fplStripLoadError: string;
    fplStripMatchCount: (n: number) => string;
    /** Registered squad sidebar — scores list heading */
    registeredScoresTitle: string;
    /** Column heading above player names in the scores list */
    registeredPlayerCol: string;
    /** Label above starting XI total points */
    registeredXiTotalLabel: string;
    /** Shown when chain publishes official tour points (resolved GW) */
    registeredOfficialTotalHint: string;
    /** Sidebar footer — titles/guild multiplier applied after base + rating */
    registeredMultiplierFooter: (factorLabel: string) => string;
    /** Registered starter row — stats counted from auto-sub */
    registeredViaSub: (name: string, subPts?: number) => string;
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
    dateTbc: string;
    timeTbc: string;
    emptyScheduleHint: string;
  };
  leaderboard: {
    claimSuccess: (symbol: string) => string;
    claimFail: (msg: string) => string;
    claimAlreadyPaid: string;
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
    topNPrizeReceive: (n: number) => string;
    noDataForGw: (gw: number) => string;
    myResultTitle: (gw: number) => string;
    inPrizes: string;
    detailsLink: string;
    colRank: string;
    colPoints: string;
    colPrize: (symbol: string) => string;
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
  seasonLeaderboard: {
    loading: string;
    seasonTag: (label: string) => string;
    pageTitle: string;
    subtitle: string;
    resolvedThrough: (from: number, through: number) => string;
    myScore: string;
    streakLabel: string;
    rulesTitle: string;
    ruleRegistration: string;
    ruleFirstReg: string;
    ruleTop10Header: string;
    ruleRank: (n: number) => string;
    ruleRank4to10: string;
    ruleStreakHeader: string;
    ruleStreak: (n: number) => string;
    ruleClaim: string;
    rulesFootnote: string;
    faqLink: string;
    colRank: string;
    colPlayer: string;
    colPoints: string;
    colRegistrations: string;
    colTop10: string;
    colBestRank: string;
    youBadge: string;
    emptyTitle: string;
    emptyHint: string;
    breakdownGw: (gw: number) => string;
    breakdownRegistration: string;
    breakdownRank: string;
    breakdownStreak: string;
    breakdownClaim: string;
    breakdownFirst: string;
    breakdownSkipped: string;
    loadError: (msg: string) => string;
    footerNote: string;
    inactiveTitle: string;
    inactiveHint: string;
    endedBadge: string;
    awaitingGw: (startGw: number) => string;
    ruleStreakCap: string;
    seasonWindowOpen: (startGw: number) => string;
    seasonWindowClosed: (startGw: number, endGw: number) => string;
    progressWc: (resolved: number, total: number) => string;
    progressEpl: (from: number, through: number) => string;
    awaitingFirstEvent: string;
    awaitingEpl: (startGw: number) => string;
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
    colStatus: string;
    fundSplit: string;
    you: string;
    claimed: string;
    notClaimed: string;
    colSquad: string;
    viewSquad: string;
    hideSquad: string;
    viewSquadHint: string;
    squadLoading: string;
    squadLoadError: string;
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
  squadShare: {
    modalTitle: string;
    modalDesc: string;
    closeAria: string;
    xHandleLabel: string;
    xHandlePlaceholder: string;
    xHandleHint: string;
    shareButton: string;
    laterButton: string;
    generating: string;
    desktopHint: string;
    clipboardHint: string;
    registeredShareButton: string;
    posterCta: string;
    tweetXiLabel: string;
    tweetBenchLabel: string;
    tweetHeaderGw: (gwLabel: string) => string;
    tweetHeaderWc: (roundLabel: string) => string;
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
    feesEntryLabel: (symbol: string) => string;
    feesTitleLabel: string;
    feesGuildLabel: string;
    feesSubmit: string;
    feesUpdated: string;
    feesInvalid: string;
    sponsorSectionTitle: string;
    sponsorSectionHint: (symbol: string) => string;
    sponsorGwLabel: string;
    sponsorAmountLabel: (symbol: string) => string;
    sponsorSubmit: string;
    sponsorSuccess: (gw: number, amountLabel: string) => string;
    sponsorInvalidGw: string;
    sponsorInvalidAmount: (symbol: string) => string;
    sponsorAmountTooSmall: string;
    sponsorAlertResolved: string;
    sponsorGwNotFound: (id: number) => string;
    sponsorNotOnChain: string;
    withdrawSectionTitle: string;
    withdrawSectionHint: (symbol: string) => string;
    withdrawRecipientLabel: string;
    withdrawAmountLabel: (symbol: string) => string;
    withdrawSubmit: string;
    withdrawSuccess: (recipient: string, amountLabel: string) => string;
    withdrawInvalidRecipient: string;
    withdrawInvalidAmount: (symbol: string) => string;
    withdrawAmountTooSmall: string;
    withdrawNotOnChain: string;
    bracketSectionTitle: string;
    bracketSectionHint: string;
    bracketAbiLive: string;
    bracketAbiMissing: string;
    bracketStatusLabel: (status: number) => string;
    bracketEntriesLabel: (n: number) => string;
    bracketGwPoolLabel: (gw: number, poolLabel: string) => string;
    bracketStepPublish: string;
    bracketStepCreateGw: string;
    bracketStepSponsor: string;
    bracketStepInit: string;
    bracketCreateGwButton: (gw: number) => string;
    bracketSponsorButton: (amountLabel: string) => string;
    bracketInitButton: string;
    bracketCloseButton: string;
    bracketInitSuccess: string;
    bracketCloseSuccess: string;
    bracketInitModuleWalletHint: string;
    bracketNotOnChain: string;
    markClaimedSectionTitle: string;
    markClaimedSectionHint: string;
    markClaimedGwLabel: string;
    markClaimedOwnerLabel: string;
    markClaimedSubmit: string;
    markClaimedSuccess: string;
    markClaimedInvalidGw: string;
    markClaimedInvalidOwner: string;
    markClaimedNotOnChain: string;
    heroStateTitle: string;
    heroStateHint: string;
    heroStateAutoSyncOn: string;
    heroStateAutoSyncOff: string;
    heroStateOverrideTitle: string;
    heroStateOverrideHint: string;
    heroStateAdminKeyLabel: string;
    heroStateAdminKeyPlaceholder: string;
    heroStateRefreshButton: string;
    heroStateSaveButton: string;
    heroStateSaving: string;
    heroStateLastUpdated: (iso: string, source: string) => string;
    heroStateSaveSuccess: string;
    heroStateSaveError: string;
    heroStateKeyRequired: string;
  };
  faq: {
    pageTitle: string;
    eyebrow: string;
    title: string;
    subtitle: string;
    searchPlaceholder: string;
    searchAriaLabel: string;
    expandAll: string;
    collapseAll: string;
    foundCount: (n: number) => string;
    noResultsTitle: string;
    noResultsHint: string;
    clearSearch: string;
    backToTop: string;
    contactTitle: string;
    contactBody: string;
    contactCta: string;
    contactHref: string;
    categories: FaqCategory[];
  };
};

const WC_ROUND_NAMES_EN: Record<string, string> = {
  md1: "Group Stage · Matchday 1",
  md2: "Group Stage · Matchday 2",
  md3: "Group Stage · Matchday 3",
  r32: "Round of 32",
  r16: "Round of 16",
  qf: "Quarter-finals",
  sf: "Semi-finals",
  final: "Final",
};

const WC_ROUND_NAMES_UK: Record<string, string> = {
  md1: "Груповий етап · Тур 1",
  md2: "Груповий етап · Тур 2",
  md3: "Груповий етап · Тур 3",
  r32: "1/16 фіналу",
  r16: "1/8 фіналу",
  qf: "1/4 фіналу",
  sf: "Півфінали",
  final: "Фінал",
};

export const pagesEn: PagesMessages = {
  languageSwitcherAria: "Site language",
  worldCup: {
    badge: "World Cup 2026",
    landingTitle: "Fantasy World Cup",
    landingSubtitle:
      "Build a squad of national-team stars, score from real World Cup matches, and share the on-chain prize pool — round after round, from the group stage to the final.",
    playCta: "Build your squad",
    heroRegistrationLabel: "Registration",
    heroRegistrationClosedHint:
      "Squad registration for this round is closed. The next matchday opens when the schedule is live on-chain.",
    leaderboardCta: "Leaderboard",
    navSquad: "Squad",
    navLeaderboard: "Leaderboard",
    stageGroup: "Group stage",
    stageKnockout: "Knockout",
    roundName: (key) => WC_ROUND_NAMES_EN[key] ?? key,
    roundsTitle: "Tournament rounds",
    roundsSubtitle: "Each round is its own contest: pick a squad, matches play, top managers split the pool.",
    statusUpcoming: "Soon",
    statusOpen: "Open",
    statusClosed: "Closed",
    statusResolved: "Finished",
    squadTitle: "World Cup · Squad selection",
    pickHint: "Pick 11 starters + 3 bench. Max 3 players from one nation.",
    maxThreeNation: "Max 3 from one nation",
    nationFilterAll: "All nations",
    catalogEmptyTitle: "Squads not published yet",
    catalogEmptyHint:
      "National-team rosters are still being finalized. The player list opens here as soon as squads are confirmed.",
    noActiveTourTitle: "No open round right now",
    noActiveTourHint: "Registration for the next World Cup round will open before kickoff. Check back soon.",
    leaderboardTitle: "World Cup · Leaderboard",
    leaderboardEmptyTitle: "No results yet",
    leaderboardEmptyHint: "Results appear after a round is played and published on-chain.",
    leaderboardClosedAwaitingHint: (roundLabel) =>
      `${roundLabel} is closed on-chain: squads are locked. Points appear after matches are played and stats are published.`,
    leaderboardSquadsViewable: "Squads viewable · points pending",
    mySquadsCta: "My squad →",
    myResultPageTitle: "My World Cup squads",
    myResultTourPicker: "Round",
    myResultNoSquads: "You have not registered a squad for any World Cup round yet.",
    myResultBackLeaderboard: "Leaderboard",
    myResultOpenRegistrationCta: "Register for the open round →",
    backToHub: "← World Cup",
    howItWorksTitle: "How it works",
    howStep1: "Pick 11 + 3 from real World Cup squads before the round deadline.",
    howStep2: "Earn points from real match actions — goals, assists, clean sheets, ratings.",
    howStep3: (symbol) => `Top 10 of each round split the ${symbol} prize pool. Claim on the leaderboard.`,
    howDemoPoolTitle: "Player pool",
    howDemoPoolMore: "+ hundreds more from every squad",
    hubLiveBadge: "Live on-chain",
    hubSubNavOverview: "Overview",
    hubPrizePoolLabel: "Round prize pool",
    hubEntriesLabel: "Squads registered",
    hubUntilDeadline: "Until round deadline",
    hubPrizeTeaserTitle: "Top 10 split the pool",
    hubPrizeTeaserDesc:
      (symbol) => `Every World Cup round is its own contest. When matches finish, the top 10 managers claim ${symbol} straight from the leaderboard.`,
    hubStagePath: "Group → Final",
    hubHostsLabel: "USA · México · Canada",
    prizeBadge: "Prize pool",
    prizeTitle: "Top 10 split the pool",
    prizeTitleForN: (n) => `Top ${n} split the pool`,
    prizeDesc:
      (symbol) => `Every entry fee flows into the round's on-chain pool. When the matches are settled, the ten best managers take their cut — paid out in ${symbol}, claimable straight from the leaderboard.`,
    prizeDescForN: (n, symbol) =>
      `Every entry fee flows into the round's on-chain pool. When the matches are settled, the top ${n} managers take their cut — paid out in ${symbol}, claimable straight from the leaderboard.`,
    prizePoolNowLabel: "Current round pool",
    prizeShareSuffix: "of pool",
    prizeClaimNote: "Payouts are on-chain — winners claim on the leaderboard",
    prizeEmptyHint: "The pool grows with every squad registered. Splits below update live as entries come in.",
    prizeRankLabel: (rank) => `#${rank}`,
    prizeDistribution: "Prize split",
    fx: {
      title: "Match schedule",
      subtitle: "Every World Cup fixture — kickoff times, live scores and results, round by round.",
      loading: "Loading fixtures…",
      deadlineLabel: "Round deadline (1st kickoff)",
      emptyTitle: "Fixtures not available yet",
      emptyHint: "The schedule for this round will appear here once it is published.",
      groupLabel: (letter) => `Group ${letter}`,
      statusUpcoming: "Upcoming",
      statusLive: "Live",
      statusFinished: "FT",
      tbd: "TBD",
      timeTbc: "TBC",
      seeAll: "All matches",
      teaserTitle: "Match schedule",
    },
    bracket: {
      badge: "Bracket Challenge",
      title: "Predict the full World Cup",
      subtitle:
        "Rank every group, pick the eight best third-placed sides, then call every knockout tie through the final and third-place play-off. One submission — locked on-chain.",
      rulesLine: "Scoring: 1 point per exact place — group positions (48), third-place ranking among the dozen (12), and each knockout winner (32). Max 92 pts.",
      deadlineNote: "Registration closes at the first match kickoff (same deadline as md1 squad registration). Free entry — gas only.",
      statusOpen: "Open",
      statusClosed: "Closed",
      statusResolved: "Resolved",
      statusUpcoming: "Soon",
      entriesLabel: (n) => `${n.toLocaleString()} predictions`,
      prizeRank: (n) => `#${n}`,
      prizePoolLabel: "Total prize pool",
      prizeTopFiveLabel: "Top 5",
      prizePerfectBonusTitle: "Perfect bracket bonus",
      prizePerfectBonusDesc: (maxScore, bonusUsd) =>
        `${bonusUsd} USDCx if you nail all ${maxScore} places — every group rank, third-place order, and knockout winner. Nobody’s done it yet. Bonus stacks on top of your top-5 prize.`,
      notEligibleTitle: "Squad required",
      notEligibleHint: "Register a squad for World Cup matchday 1 first — then come back to submit your bracket.",
      registrationClosedTitle: "Registration closed",
      registrationClosedBanner: "New entries are no longer accepted.",
      registrationClosedConnectHint:
        "Connect your wallet to view your locked prediction if you submitted before the deadline.",
      registrationClosedMissedHint:
        "You had an md1 squad but did not lock a bracket prediction before kickoff. The entry window has passed.",
      registrationClosedNotEligibleHint:
        "Bracket entry required an md1 squad before the first match kickoff. That registration window has also closed.",
      submittedTitle: "Prediction locked on-chain",
      submittedHint: "No edits after submission. Results and prizes after the tournament.",
      contractPending: "On-chain registration opens after the next contract upgrade is live on mainnet.",
      submitCta: "Lock prediction on-chain",
      submitting: "Submitting…",
      gasNote: "Free entry · you only pay network gas",
      submitPickRemaining: (n) =>
        n === 1 ? "Pick 1 more knockout tie to continue." : `Pick ${n} more knockout ties to continue.`,
      submitPickFinals:
        "Almost there — pick the Final and 3rd-place play-off in the centre of the bracket (M103 & M104).",
      submitDeadlinePassed: "Registration closed at the first match kickoff.",
      submitStatusNotOpen: "Bracket challenge is not open for entries yet.",
      confirmGroups: "Confirm groups →",
      confirmThirds: "Confirm best 3rds →",
      koFinal: "Final",
      koThirdPlace: "3rd place",
      koTapHint: "Tap a nation to pick the winner of each tie. Pairs in the Round of 32 come from your group and third-place picks.",
      hubCta: "Bracket challenge",
      hubTeaser: "Predict the full tournament — $500 USDCx prize pool (+$300 perfect bracket bonus)",
      predictor: {
        stepGroups: "Groups",
        stepThirds: "Best 3rds",
        stepKnockout: "Knockout",
        thirdsTitle: "Eight best third-placed teams",
        thirdsHint:
          "Rank all twelve third-placed sides from strongest to weakest. The top eight advance — same FIFA rule as the real draw.",
        thirdsAdvance: "Advances",
        koTitle: "Knockout bracket",
        koPickWinner: "Pick winner…",
        progress: (done, total) => `${done}/${total} ties`,
      },
    },
  },
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
    submitConfirm: (feeLabel) => `Confirm squad · ${feeLabel}`,
    submitNeedPlayers: (picked: number, max: number) => `Pick ${max} players (${picked}/${max})`,
    headerTitle: (gw) => `GW ${gw} · Squad selection`,
    pickPlayersHint: "Pick 11 players. Max 3 from the same club.",
    randomSquadBtn: "Random squad",
    randomSquadFailed: "Could not build a valid squad — try again.",
    maxThreeHint: "Max 3 from the same club",
    entryFeeLabel: "Registration fee",
    entryFeeUsdcxHint: "Need USDCx? Swap in Motion, Nightly, or Yuzu →",
    entryFeeLegacyBanner: (chargedLabel) =>
      `On-chain entry is still ${chargedLabel} (MOVE) — USDCx activates after a contract upgrade. The wallet will charge MOVE, not USDCx.`,
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
    fplStripTitle: "This round · FPL",
    fplStripSeeAll: "Full schedule →",
    fplStripLoadError: "Could not load the FPL fixture list.",
    fplStripMatchCount: (n) => `${n} matches`,
    registeredScoresTitle: "Gameweek scores",
    registeredPlayerCol: "Player",
    registeredXiTotalLabel: "Starting XI total",
    registeredOfficialTotalHint: "Published tour total",
    registeredMultiplierFooter: (factorLabel) => `Titles / guild ${factorLabel}`,
    registeredViaSub: (name, subPts) =>
      subPts != null && subPts > 0 ? `→ ${name} (+${subPts})` : `→ ${name}`,
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
    dateTbc: "Date TBC",
    timeTbc: "TBC",
    emptyScheduleHint:
      "Live match list from FPL did not load from this server — only the deadline from cache is shown. Refresh or try again shortly.",
  },
  leaderboard: {
    claimSuccess: (symbol) => `Claim complete: ${symbol} was sent to your wallet (check balance in wallet / explorer).`,
    claimFail: (msg) => `Could not claim: ${msg}`,
    claimAlreadyPaid:
      "You already claimed this tour’s prize (including before results were recalculated). A second payout is not allowed.",
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
    topNPrizeReceive: (n) => `Top ${n} receive`,
    noDataForGw: (gw) => `No data for GW ${gw}`,
    myResultTitle: (gw) => `My result · GW ${gw}`,
    inPrizes: "In the prizes 🎉",
    detailsLink: "Details →",
    colRank: "Rank",
    colPoints: "Points",
    colPrize: (symbol) => `Prize (${symbol})`,
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
  seasonLeaderboard: {
    loading: "Loading season standings…",
    seasonTag: (label) => `Season ${label}`,
    pageTitle: "Season Points",
    subtitle:
      "Season Points (SP) reward participation and top finishes across one season — World Cup tours first, then EPL. Streaks carry from WC into EPL. Separate from fantasy tour points.",
    resolvedThrough: (from, through) => `Counting resolved gameweeks GW ${from}–${through}`,
    myScore: "Your season score",
    streakLabel: "Best streak",
    rulesTitle: "How SP is earned",
    ruleRegistration: "Squad registered (per GW)",
    ruleFirstReg: "First registration (once)",
    ruleTop10Header: "Top 10 only",
    ruleRank: (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"} place`,
    ruleRank4to10: "4th–10th: 100 → 25 SP (see FAQ)",
    ruleStreakHeader: "Registration streak (WC + EPL, per event)",
    ruleStreak: (n) => `${n}+ GWs in a row`,
    ruleClaim: "Prize claimed",
    rulesFootnote:
      "One season: WC tours then EPL gameweeks. Streak continues across the handoff. Only resolved events count. Ranks 11+ earn no SP.",
    faqLink: "Full rules in FAQ",
    colRank: "Rank",
    colPlayer: "Player",
    colPoints: "SP",
    colRegistrations: "GWs",
    colTop10: "Top 10",
    colBestRank: "Best",
    youBadge: "you",
    emptyTitle: "No season data yet",
    emptyHint: "Season Points appear after the first gameweek in the season window is resolved on-chain.",
    breakdownGw: (gw) => `GW ${gw}`,
    breakdownRegistration: "reg",
    breakdownRank: "rank",
    breakdownStreak: "streak",
    breakdownClaim: "claim",
    breakdownFirst: "first",
    breakdownSkipped: "not registered",
    loadError: (msg) => `Could not load season standings: ${msg}`,
    footerNote: "SP is computed from on-chain registration and results · cached ~2 min",
    inactiveTitle: "Season not started yet",
    inactiveHint:
      "Season Points are configured but not live. The counter starts on the first resolved gameweek after launch — we’ll announce when SP go live.",
    endedBadge: "Season ended",
    awaitingGw: (startGw) =>
      `Season is live from GW ${startGw}. Points appear after that gameweek is resolved on-chain.`,
    ruleStreakCap: "5th GW and beyond — same +20 (no higher tier)",
    seasonWindowOpen: (startGw) => `Open season · from GW ${startGw}`,
    seasonWindowClosed: (startGw, endGw) => `GW ${startGw}–${endGw}`,
    progressWc: (resolved, total) => `WC phase · ${resolved}/${total} tours resolved`,
    progressEpl: (from, through) => `EPL · GW ${from}–${through}`,
    awaitingFirstEvent: "Season is live — points appear after the first WC or EPL event resolves on-chain.",
    awaitingEpl: (startGw) =>
      `WC phase complete in SP terms — EPL continues the same season from GW ${startGw}.`,
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
    colStatus: "Status",
    fundSplit: "Pool split",
    you: "You",
    claimed: "Claimed",
    notClaimed: "Not claimed",
    colSquad: "Squad",
    viewSquad: "View",
    hideSquad: "Hide",
    viewSquadHint: "Tap to view squad",
    squadLoading: "Loading squad…",
    squadLoadError: "Could not load squad.",
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
  squadShare: {
    modalTitle: "Share your squad on X",
    modalDesc: "Your full squad goes in the post text. Attach the PNG in X manually — browsers can't upload images for you.",
    closeAria: "Close",
    xHandleLabel: "Your X handle (optional)",
    xHandlePlaceholder: "username",
    xHandleHint: "Saved locally — we add it to your post so friends can find you.",
    shareButton: "Share on X",
    laterButton: "Maybe later",
    generating: "Preparing…",
    desktopHint:
      "X opened in a new tab. The squad PNG was downloaded — drag it into the compose box or click the image icon to attach.",
    clipboardHint:
      "X opened in a new tab. The squad image is in your clipboard — paste it into the compose box (⌘V).",
    registeredShareButton: "Share on X",
    posterCta: "Build your squad on MoveMatch",
    tweetXiLabel: "XI",
    tweetBenchLabel: "Bench",
    tweetHeaderGw: (gw) => `My ${gw} squad on @MoveMatchxyz ⚽`,
    tweetHeaderWc: (round) => `My WC ${round} squad on @MoveMatchxyz ⚽`,
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
    feesSectionTitle: "Fees: squad (USDCx) & titles (MOVE)",
    feesSectionHint:
      "Updates on-chain entry_fee (USDCx micro-units), title_fee, and guild_fee (MOVE octas). Squad page reads these values from get_config — republishing the package alone does not change an existing deployment.",
    feesEntryLabel: (symbol) => `Squad registration (${symbol})`,
    feesTitleLabel: "Title purchase",
    feesGuildLabel: "Guild",
    feesSubmit: "Apply fees on-chain",
    feesUpdated: "Fees updated on-chain. Refresh the squad page.",
    feesInvalid: "Enter valid non-negative numbers for all three fees (entry in USDCx, title/guild in MOVE).",
    sponsorSectionTitle: "Add to prize pool (sponsor)",
    sponsorSectionHint: (symbol) =>
      `Send ${symbol} from your admin wallet to the prize vault and increase this gameweek’s on-chain prize pool by the same amount. Prize shares after «Calculate results» are computed from that pool, so do this before resolving the gameweek. Claims pay from the vault — as long as you add funds here, claim will not run out.`,
    sponsorGwLabel: "Gameweek ID",
    sponsorAmountLabel: (symbol) => `Amount (${symbol})`,
    sponsorSubmit: "Add to prize pool",
    sponsorSuccess: (gw, amountLabel) =>
      `Added ${amountLabel} to GW ${gw} prize pool on-chain. If results are not calculated yet, the extra amount will be included in payouts.`,
    sponsorInvalidGw: "Enter a valid gameweek number (integer ≥ 1).",
    sponsorInvalidAmount: (symbol) => `Enter a positive ${symbol} amount.`,
    sponsorAmountTooSmall: "Amount rounds to zero in octas — enter a larger value.",
    sponsorAlertResolved:
      "This gameweek is already RESOLVED — individual prize amounts are fixed on-chain. Sponsor only works before «Calculate results».",
    sponsorGwNotFound: (id) => `GW ${id} not found in the contract.`,
    sponsorNotOnChain:
      "This deployment’s on-chain module does not include the entry function admin_sponsor_prize_pool (the wallet cannot load its ABI). The source in this repo has it — you need to publish a Movement package upgrade to the same account so that function exists on-chain. Until then the prize pool only grows from entry fees at the configured %.",
    withdrawSectionTitle: "Withdraw from prize vault",
    withdrawSectionHint: (symbol) =>
      `Moves ${symbol} from the shared prize vault to any address (admin only). Does not change on-chain prize_pool fields or claim flags — leave enough balance for pending claim_prize calls or winners’ claims will fail.`,
    withdrawRecipientLabel: "Recipient address (0x…)",
    withdrawAmountLabel: (symbol) => `Amount (${symbol})`,
    withdrawSubmit: "Withdraw from vault",
    withdrawSuccess: (recipient, amountLabel) =>
      `Sent ${amountLabel} from prize vault → ${recipient.slice(0, 10)}…${recipient.slice(-8)}`,
    withdrawInvalidRecipient: "Enter a valid Movement address (0x + hex).",
    withdrawInvalidAmount: (symbol) => `Enter a positive ${symbol} amount.`,
    withdrawAmountTooSmall: "Amount rounds to zero in octas — enter a larger value.",
    withdrawNotOnChain:
      "This deployment’s module has no admin_withdraw_prize_vault entry on-chain. Upgrade the published package from this repo so the function appears in the ABI.",
    bracketSectionTitle: "World Cup · Bracket Challenge go-live",
    bracketSectionHint:
      "After publishing the package upgrade (register_bracket_prediction on-chain), run these steps in order. First admin_init_bracket_challenge must be signed by the module publisher wallet (0xf598…).",
    bracketAbiLive: "Bracket entrypoints detected on-chain",
    bracketAbiMissing: "Bracket entrypoints missing — publish package upgrade first (npm run wc:bracket:deploy)",
    bracketStatusLabel: (status) =>
      status === 255
        ? "Not initialized"
        : status === 0
          ? "OPEN — accepting predictions"
          : status === 1
            ? "CLOSED"
            : status === 2
              ? "RESOLVED"
              : `Status ${status}`,
    bracketEntriesLabel: (n) => `${n.toLocaleString()} bracket predictions`,
    bracketGwPoolLabel: (gw, poolLabel) => `GW ${gw} prize pool: ${poolLabel}`,
    bracketStepPublish: "1. Publish upgrade (CLI — requires module key)",
    bracketStepCreateGw: "2. Create prize gameweek",
    bracketStepSponsor: "3. Sponsor USDCx pool ($500)",
    bracketStepInit: "4. Open bracket challenge",
    bracketCreateGwButton: (gw) => `Create GW ${gw}`,
    bracketSponsorButton: (amountLabel) => `Sponsor ${amountLabel}`,
    bracketInitButton: "Open bracket challenge",
    bracketCloseButton: "Close bracket registration",
    bracketInitSuccess: "Bracket challenge is OPEN. Users can submit at /world-cup/bracket.",
    bracketCloseSuccess: "Bracket registration closed.",
    bracketInitModuleWalletHint:
      "First init must be signed with the module publisher wallet (same address as MODULE_ADDRESS). Connect that wallet in the browser, or use the CLI.",
    bracketNotOnChain:
      "register_bracket_prediction is not in the on-chain ABI yet. Run: npm run wc:bracket:deploy",
    markClaimedSectionTitle: "Mark prize already claimed",
    markClaimedSectionHint:
      "After recalc, set claimed=true for wallets that already received a payout (no second transfer). Use for MD1 reopen workflow before winners try to claim again.",
    markClaimedGwLabel: "Tour / gameweek ID",
    markClaimedOwnerLabel: "Wallet address (0x…)",
    markClaimedSubmit: "Mark claimed",
    markClaimedSuccess: "Prize marked as claimed on-chain.",
    markClaimedInvalidGw: "Enter a valid tour / gameweek ID.",
    markClaimedInvalidOwner: "Enter a valid Movement wallet address (0x + 64 hex).",
    markClaimedNotOnChain:
      "admin_mark_prize_claimed is not on mainnet yet. From repo root run: npm run md1:deploy-mark-claimed (Movement CLI + module publisher wallet). Then mark the 3 MD1 wallets or run npm run md1:mark-prior-claims.",
    heroStateTitle: "Homepage hero · Official bracket",
    heroStateHint:
      "Results sync automatically from football-data.org (FOOTBALL_DATA_TOKEN). The homepage hero refreshes every ~30s — no manual publish needed. Use manual override only if the API is wrong.",
    heroStateAutoSyncOn: "Auto-sync · live",
    heroStateAutoSyncOff: "Auto-sync off · set FOOTBALL_DATA_TOKEN",
    heroStateOverrideTitle: "Manual override",
    heroStateOverrideHint:
      "Overrides are merged on top of live API data. Save only when you need to fix a wrong result.",
    heroStateAdminKeyLabel: "Admin key",
    heroStateAdminKeyPlaceholder: "WC_BRACKET_STATE_ADMIN_KEY",
    heroStateRefreshButton: "Refresh preview",
    heroStateSaveButton: "Save override",
    heroStateSaving: "Saving…",
    heroStateLastUpdated: (iso, source) => `Last sync: ${new Date(iso).toLocaleString()} · ${source}`,
    heroStateSaveSuccess: "Override saved — live API will fill gaps around it.",
    heroStateSaveError: "Failed to save override.",
    heroStateKeyRequired: "Enter WC_BRACKET_STATE_ADMIN_KEY to save an override.",
  },
  faq: {
    pageTitle: "FAQ",
    eyebrow: "Help center",
    title: "Frequently asked questions",
    subtitle:
      "New to fantasy football, or to crypto, or to both? You are in the right place. Start from the top — answers go from “what is this site even?” all the way down to scoring details.",
    searchPlaceholder: "Search a question…",
    searchAriaLabel: "Search FAQ",
    expandAll: "Expand all",
    collapseAll: "Collapse all",
    foundCount: (n) => `${n} ${n === 1 ? "question" : "questions"} match`,
    noResultsTitle: "Nothing matches your search",
    noResultsHint: "Try a different keyword or clear the search to browse all categories.",
    clearSearch: "Clear search",
    backToTop: "Back to top",
    contactTitle: "Still have a question?",
    contactBody:
      "If something is unclear or you found a bug — message us on Telegram @movematch. We answer fast. Announcements and news — on X too.",
    contactCta: "Message us on",
    contactHref: "https://t.me/movematch",
    categories: [
      {
        id: "what-is-this",
        title: "What is this site?",
        blurb: "First contact — read this if you just landed here.",
        items: [
          {
            id: "what-is-movematch",
            q: "What is MOVEMATCH in plain English?",
            a: [
              { type: "p", text: "MOVEMATCH is fantasy football on the English Premier League (EPL). The loop is simple:" },
              {
                type: "ul",
                items: [
                  "Before each gameweek you build a squad from real EPL players.",
                  "Those players play real Premier League matches.",
                  "Their on-pitch actions (goals, assists, saves, etc.) earn you points.",
                  "The top 10 managers of the gameweek share a prize pool, paid in USDCx.",
                ],
              },
              { type: "p", text: "No betting on match outcomes — it is a skill contest about reading football, not a lottery." },
            ],
          },
          {
            id: "is-it-free",
            q: "Is it free to play?",
            a: [
              { type: "p", text: "No. Registering a squad costs a small entry fee in USDCx (the exact amount is shown on the Squad page)." },
              { type: "p", text: "All entry fees from all players go into that gameweek’s prize pool, and winners are paid from it." },
              { type: "p", text: "A small technical share is withheld to support and keep the project running." },
            ],
          },
          {
            id: "can-i-actually-win",
            q: "Can I really win something?",
            a: [
              { type: "p", text: "Yes. If your squad finishes in the top 10 by points, you automatically receive a share of the prize pool in USDCx on your wallet." },
              { type: "p", text: "How much depends on your final rank and how many people entered the round." },
            ],
          },
          {
            id: "is-this-gambling",
            q: "Is this gambling?",
            a: [
              { type: "p", text: "Not in the casino sense. It is fantasy sports — a skill game, like chess with a prize pool. The winner is the one who reads form and fixtures best, not the one who got lucky on a spin." },
              { type: "p", text: "In most jurisdictions fantasy sports are not classified as gambling, but check your local rules to be safe." },
            ],
          },
        ],
      },
      {
        id: "football-101",
        title: "Football 101",
        blurb: "Don’t know what a clean sheet is? Start here.",
        items: [
          {
            id: "what-is-epl",
            q: "What is the English Premier League (EPL)?",
            a: [
              { type: "p", text: "The most popular football championship in the world. Twenty English clubs (Manchester City, Liverpool, Arsenal, etc.) play each other from August to May." },
              { type: "p", text: "MOVEMATCH uses real match stats from the EPL — your “virtual” players are real footballers playing real matches." },
            ],
          },
          {
            id: "what-is-gameweek",
            q: "What is a “gameweek”?",
            a: [
              { type: "p", text: "One round of fixtures. Usually 10 matches across 2–3 days (Friday to Sunday, sometimes Monday)." },
              { type: "p", text: "Each gameweek on MOVEMATCH is a self-contained contest: pick a squad → matches play → points are tallied → prizes are paid. Then the next round opens." },
            ],
          },
          {
            id: "what-is-deadline",
            q: "What does “deadline” mean?",
            a: [
              { type: "p", text: "The cut-off time to register your squad. It is the kickoff whistle of the first match of the gameweek." },
              { type: "p", text: "After the deadline your squad is locked. Otherwise people could “tune” their picks once they already saw matches play out." },
            ],
          },
          {
            id: "positions",
            q: "What do GK, DEF, MID and FWD mean?",
            a: [
              { type: "p", text: "The four positions on the pitch:" },
              {
                type: "ul",
                items: [
                  "GK (goalkeeper) — stands in goal and stops shots.",
                  "DEF (defender) — guards their half, blocks attackers.",
                  "MID (midfielder) — plays in the middle, creates plays, sometimes scores.",
                  "FWD (forward / striker) — main job is to score goals.",
                ],
              },
              { type: "p", text: "On MOVEMATCH you pick 11 players in a standard fantasy formation (1 GK + 3–5 DEF + 3–5 MID + 1–3 FWD)." },
            ],
          },
          {
            id: "football-terms",
            q: "What is a clean sheet, an assist, a hat-trick, match rating?",
            a: [
              {
                type: "ul",
                items: [
                  "Clean sheet — the team didn’t concede a goal during the match. Bonus for goalkeepers and defenders.",
                  "Assist — the pass that leads directly to a goal. Valuable for forwards and midfielders.",
                  "Hat-trick — three goals scored by the same player in one match. Rare, so it gets its own bonus.",
                  "Match rating — a performance score for each player per game (e.g. 7.5, 8.2). High ratings earn bonus points; a very low rating can cost −1.",
                ],
              },
            ],
          },
          {
            id: "max-three-per-club",
            q: "Why a maximum of 3 players from one club?",
            a: [
              { type: "p", text: "To prevent “stacking” a single team. If, say, Sunderland plays Manchester City, it would be unfair if everyone simply picked 11 City players." },
              { type: "p", text: "The “max 3 per club” rule forces you to diversify and actually decide which players will have the best round." },
            ],
          },
          {
            id: "what-is-form",
            q: "What does a player’s “form” mean?",
            a: [
              { type: "p", text: "The average number of points a player has scored per match in our system over recent rounds. A player “in form” usually keeps scoring or assisting; one out of form usually doesn’t." },
              { type: "p", text: "It is a hint, not a guarantee. Tactics, injuries and the opponent all matter." },
            ],
          },
          {
            id: "starters-vs-bench",
            q: "What is the difference between starters and bench?",
            a: [
              { type: "p", text: "The 11 starters are your main lineup — their points count immediately." },
              { type: "p", text: "The 3 bench players are your safety net. If a starter doesn’t play in the real match (injury, manager left them out, etc.), the system automatically substitutes one of your bench players in and counts their points instead of zero." },
            ],
          },
        ],
      },
      {
        id: "web3-101",
        title: "Web3 101",
        blurb: "Wallets, tokens, blockchain — without the jargon.",
        items: [
          {
            id: "what-is-wallet",
            q: "What is a crypto wallet and why do I need one?",
            a: [
              { type: "p", text: "A wallet is a small app (browser extension or phone app) that holds your crypto and signs your actions on a blockchain." },
              { type: "p", text: "On MOVEMATCH the wallet is your account — your login, your bank, and your way to confirm “yes, I want to register this squad”." },
            ],
          },
          {
            id: "which-wallet",
            q: "Which wallet do I need? Where do I get it?",
            a: [
              { type: "p", text: "MOVEMATCH supports Motion and Nightly — pick either when you press “Connect wallet”." },
              { type: "p", text: "Motion (recommended) is the official Movement-native Chrome extension: motion.movementnetwork.xyz. Self-custodial, built for Movement — send, swap, connect to dApps. Install from the Chrome Web Store. Full FAQ: movementnetwork.xyz/faqs/motion-wallet." },
              { type: "p", text: "Nightly (alternative) also works on Movement — Chrome extension plus a phone app (iOS / Android) from nightly.app. Handy if you already use Nightly on mobile." },
              {
                type: "ul",
                items: [
                  "Create a new wallet inside the extension or app.",
                  "Write down the seed phrase (12–24 words) on paper and store it somewhere safe.",
                  "Never share your seed phrase with anyone — it is full access to your wallet.",
                  "Lose the seed and tell no one — wallet is gone forever. Write it and share it — funds will be stolen.",
                ],
              },
            ],
          },
          {
            id: "what-is-movement",
            q: "What is Movement and what is USDCx?",
            a: [
              { type: "p", text: "Movement is a blockchain network (think of it like the internet, but for crypto)." },
              { type: "p", text: "USDCx is the dollar stablecoin on Movement, backed 1:1 by USDC from Circle. On MOVEMATCH you pay squad entry fees and receive prizes in USDCx. Get it via swap in Motion or Nightly, or on Yuzu (app.yuzu.finance)." },
            ],
          },
          {
            id: "how-to-get-move",
            q: "How do I get USDCx to start playing?",
            a: [
              {
                type: "ul",
                items: [
                  "Install Motion from motion.movementnetwork.xyz (or Nightly from nightly.app) and create a wallet on Movement.",
                  "In Motion or Nightly, open Swap and exchange MOVE (or another token you already hold) for USDCx — takes a few taps.",
                  "Or use Yuzu, Movement’s official DEX: app.yuzu.finance — connect your wallet, pick USDCx, swap, and sign.",
                  "You need at least 5 USDCx to register one squad. Keep a little MOVE on the wallet for network fees.",
                  "Open MOVEMATCH → Connect wallet → pick Motion or Nightly → Squad page → Confirm squad and sign.",
                ],
              },
              {
                type: "p",
                text: "Shortcut: the «Swap on Yuzu → USDCx» button in the wallet menu on this site opens the pair ready to go.",
              },
            ],
          },
          {
            id: "is-connecting-safe",
            q: "Is it safe to connect my wallet to the site?",
            a: [
              { type: "p", text: "Yes. “Connect wallet” is not “hand over the keys.” The site only sees your public address and asks for your signature on each specific action (register a squad, claim a prize)." },
              { type: "p", text: "You always sign inside your wallet window (Motion or Nightly). The site never sees your seed phrase or private key, and cannot move a single token without your explicit signature." },
              { type: "p", text: "Simple rule of thumb: always check the URL — only use the official MOVEMATCH address." },
            ],
          },
          {
            id: "what-is-smart-contract",
            q: "What is a smart contract and why does it matter?",
            a: [
              { type: "p", text: "A smart contract is a program that runs automatically on a blockchain with no middlemen. Its code is open and cannot be silently changed." },
              { type: "p", text: "On MOVEMATCH the contract handles taking your entry fee into the pool, locking your squad so even the developers cannot tamper with it, and paying out the top 10." },
              { type: "p", text: "Everything is auditable — you can verify in a public block explorer exactly what happened to your USDCx." },
            ],
          },
          {
            id: "why-claim",
            q: "Why do I need to press “Claim” to receive a prize?",
            a: [
              { type: "p", text: "It is how blockchains work — the prize doesn’t arrive automatically. Your wallet must sign a separate transaction that moves USDCx from the contract to your address." },
              { type: "p", text: "On the Leaderboard a Claim button appears next to your result. Press it → sign in your wallet → USDCx lands on your wallet. You can do this whenever you want." },
            ],
          },
        ],
      },
      {
        id: "how-to-play",
        title: "How to play",
        blurb: "Step by step — from zero to your first squad.",
        items: [
          {
            id: "first-steps",
            q: "Where do I start? Step-by-step.",
            a: [
              {
                type: "ul",
                items: [
                  "1. Install Motion from motion.movementnetwork.xyz (recommended) or Nightly from nightly.app.",
                  "2. Create a wallet and back up the seed phrase on paper.",
                  "3. Get USDCx — swap in Motion, Nightly, or on Yuzu (app.yuzu.finance). You need ~5 USDCx + a bit of MOVE for fees.",
                  "4. On MOVEMATCH press “Connect wallet” and pick Motion or Nightly.",
                  "5. Open the Squad page and pick 11 starters + 3 bench players.",
                  "6. Press “Confirm squad” and sign the transaction in your wallet.",
                  "7. Wait for kickoff — points are tallied automatically from there.",
                ],
              },
            ],
          },
          {
            id: "entry-cost",
            q: "How much does one gameweek entry cost?",
            a: [
              { type: "p", text: "The exact entry fee is shown on the Squad page (line “Registration fee”). It is 5 USDCx per gameweek — a small stablecoin amount to try the game." },
            ],
          },
          {
            id: "change-squad",
            q: "Can I change my squad after registering?",
            a: [
              { type: "p", text: "While the round has not started yet (i.e. before the deadline) — yes, but every change is a new transaction with a small network fee." },
              { type: "p", text: "After the deadline the squad is locked on-chain. That is not our policy — it is how blockchains work: once written, it cannot be rewritten." },
            ],
          },
          {
            id: "missed-deadline",
            q: "What if I miss the deadline?",
            a: [
              { type: "p", text: "Just wait for the next round. A new gameweek with a new squad opens every week, and there is no penalty for skipping." },
            ],
          },
          {
            id: "multiple-squads",
            q: "How many squads can I register per gameweek?",
            a: [
              { type: "p", text: "One squad per wallet per gameweek. If you want several entries, you need additional wallets (additional addresses) — each pays its own entry fee." },
            ],
          },
          {
            id: "injured-player",
            q: "What if my player gets injured or doesn’t play?",
            a: [
              { type: "p", text: "He scores 0 in that match. BUT if you have 3 bench players, the system automatically subs one of them in and counts their points instead." },
              { type: "p", text: "This is why your bench should usually contain players who are likely to actually start somewhere in the gameweek." },
            ],
          },
          {
            id: "when-points",
            q: "When will I see my points?",
            a: [
              { type: "p", text: "Points update in near real time during gameweek matches (with a small delay — stats come from official EPL sources)." },
              { type: "p", text: "Final points are fixed once the last match of the round is played and the admin submits the stats to the smart contract." },
            ],
          },
          {
            id: "when-payout",
            q: "When and how do I get my prize?",
            a: [
              { type: "p", text: "After the last match of the round the admin closes the gameweek, stats go to the contract, and final ranks and prizes are computed." },
              { type: "p", text: "Once the round is published as Resolved (usually within a day), a Claim button appears next to your result on the Leaderboard. Press it — and USDCx lands on your wallet." },
            ],
          },
        ],
      },
      {
        id: "scoring-and-rewards",
        title: "Scoring & rewards",
        blurb: "How points are calculated and how prizes are split.",
        items: [
          {
            id: "how-scoring-works",
            q: "How exactly are points calculated?",
            a: [
              { type: "p", text: "Every useful action by your player on the pitch turns into points. Standard rewards:" },
              {
                type: "ul",
                items: [
                  "Goal — from +4 to +6 points (depending on position)",
                  "Assist — a few points",
                  "Clean sheet — for goalkeepers and defenders",
                  "Saves — for goalkeepers",
                  "60+ minutes played — extra points",
                  "High match rating — +1 to +3 (≥7.5 / ≥8.0 / ≥9.0)",
                  "Hat-trick — separate big bonus",
                ],
              },
              { type: "p", text: "Penalties: red/yellow card, own goal, missed penalty, very low rating — negative points. Full table is on the homepage in the “More actions, more points” section." },
            ],
          },
          {
            id: "defender-vs-forward-goal",
            q: "Why is a defender’s goal worth more than a forward’s?",
            a: [
              { type: "p", text: "Because for a forward a goal is the routine — that is literally his job. For a defender it is a rare event that is hard to predict and that significantly changes the match." },
              { type: "p", text: "Fantasy systems reward picking the “riskier” options instead of just stacking obvious goalscorers." },
            ],
          },
          {
            id: "how-much-can-i-win",
            q: "How much can I win?",
            a: [
              { type: "p", text: "It depends on the prize pool of the round and your final rank. Prize pool = sum of all entry fees of the round (minus a small technical share)." },
              { type: "p", text: "More entries → bigger pool. The top 10 split it on a fixed grid: 1st gets the largest share, 10th the smallest. The split is shown on the homepage in the “Split the prize pool” section." },
            ],
          },
          {
            id: "11th-no-prize",
            q: "What if I finish 11th — no prize at all?",
            a: [
              { type: "p", text: "Then you get nothing this round. The entry fee does not return — it stays in the pool the winners already split." },
              { type: "p", text: "Try the next gameweek: new squad, new chances." },
            ],
          },
          {
            id: "convert-to-fiat",
            q: "How do I cash out USDCx back to normal money?",
            a: [
              { type: "p", text: "USDCx is already pegged to the dollar. Swap it back to MOVE or another token on Yuzu, in Motion, or in Nightly, then cash out via your usual exchange — same as any crypto." },
              { type: "p", text: "Technically 2–3 transactions. The whole loop usually takes 15–30 minutes." },
            ],
          },
          {
            id: "season-points",
            q: "What are Season Points (SP)?",
            a: [
              { type: "p", text: "Season Points are one loyalty season: World Cup tours first, then EPL gameweeks. The same streak counter runs across both — playing every WC round and continuing into EPL keeps your streak." },
              { type: "p", text: "You earn SP from: registering (+25), first registration (+50 once), top-10 finishes (1st = 200 down to 10th = 25), streaks (+10 / +15 / +20 from 4+), and claiming (+10). The season starts when we enable it (from zero). WC ending does not end the SP season — EPL continues it." },
              { type: "p", text: "Set `enabled: true` in config when launching. Optionally set `eplStartGw` before or when EPL joins. Live table: Season SP in the menu." },
            ],
          },
        ],
      },
      {
        id: "trust-and-safety",
        title: "Trust & safety",
        blurb: "How can I be sure this is fair and not a scam?",
        items: [
          {
            id: "is-it-scam",
            q: "How do I know this is not a scam?",
            a: [
              { type: "p", text: "Every key action — your squad, the prize pool, the points, the payouts — is recorded on the Movement blockchain and can be verified in a public explorer. No one, not even the MOVEMATCH developers, can silently change anything." },
              { type: "p", text: "The admin cannot: replace your squad after the deadline, take from the prize pool, or rewrite points. The smart contract simply does not allow it." },
            ],
          },
          {
            id: "what-if-bug",
            q: "What if there is a bug and I lose my entry fee?",
            a: [
              { type: "p", text: "The contract is tested, but there is always some risk. For now, only play with amounts you are willing to risk." },
              { type: "p", text: "If a bug in our logic is confirmed — we refund. Bug reports and questions: Telegram @movematch." },
            ],
          },
          {
            id: "lost-seed",
            q: "What if I lose my wallet seed phrase?",
            a: [
              { type: "p", text: "MOVEMATCH cannot help here. Your wallet is yours, and the seed phrase is the only way to recover it. Neither Motion, Nightly, nor MOVEMATCH have access to it." },
              { type: "p", text: "If the seed is lost, the wallet (and any funds in it) is lost forever. Always store the seed offline, on paper, somewhere safe." },
            ],
          },
        ],
      },
      {
        id: "whats-next",
        title: "What’s next",
        blurb: "Roadmap features you may have spotted in the menu.",
        items: [
          {
            id: "what-are-talents",
            q: "What are the “Talents” I see in the menu (marked “soon”)?",
            a: [
              { type: "p", text: "An upcoming feature, in development. Talents are bonus multipliers (+5%, +10% or +15%) that boost a player’s final score in your squad." },
              { type: "p", text: "They will unlock through a separate game mechanic. Once they’re live, we will announce it." },
            ],
          },
          {
            id: "guilds-and-titles",
            q: "What about guilds and titles?",
            a: [
              { type: "p", text: "Guilds (team play) and titles (achievements) are also on the roadmap. Both are still in development — follow the announcements for updates." },
            ],
          },
        ],
      },
    ],
  },
};

export const pagesUk: PagesMessages = {
  languageSwitcherAria: "Мова сайту",
  worldCup: {
    badge: "Чемпіонат світу 2026",
    landingTitle: "Фентезі Чемпіонат світу",
    landingSubtitle:
      "Збери склад із зірок збірних, набирай очки з реальних матчів ЧС і ділíть on-chain призовий фонд — раунд за раундом, від групового етапу до фіналу.",
    playCta: "Зібрати склад",
    heroRegistrationLabel: "Реєстрація",
    heroRegistrationClosedHint:
      "Реєстрацію складів на цей тур закрито. Наступний тур відкриється, коли з’явиться в розкладі on-chain.",
    leaderboardCta: "Лідерборд",
    navSquad: "Склад",
    navLeaderboard: "Лідерборд",
    stageGroup: "Груповий етап",
    stageKnockout: "Плей-оф",
    roundName: (key) => WC_ROUND_NAMES_UK[key] ?? key,
    roundsTitle: "Раунди турніру",
    roundsSubtitle: "Кожен раунд — окремий конкурс: збираєш склад, грають матчі, топ-менеджери ділять фонд.",
    statusUpcoming: "Скоро",
    statusOpen: "Відкрито",
    statusClosed: "Закрито",
    statusResolved: "Завершено",
    squadTitle: "Чемпіонат світу · Вибір складу",
    pickHint: "Обери 11 в основі + 3 запасних. Максимум 3 гравці з однієї збірної.",
    maxThreeNation: "Максимум 3 з однієї збірної",
    nationFilterAll: "Усі збірні",
    catalogEmptyTitle: "Склади ще не опубліковані",
    catalogEmptyHint:
      "Заявки збірних ще фіналізуються. Список гравців з’явиться тут одразу після підтвердження складів.",
    noActiveTourTitle: "Зараз немає відкритого раунду",
    noActiveTourHint: "Реєстрація на наступний раунд ЧС відкриється перед стартом матчів. Зазирни трохи згодом.",
    leaderboardTitle: "Чемпіонат світу · Лідерборд",
    leaderboardEmptyTitle: "Результатів поки немає",
    leaderboardEmptyHint: "Результати з’являються після того, як раунд зіграно й опубліковано on-chain.",
    leaderboardClosedAwaitingHint: (roundLabel) =>
      `${roundLabel} закрито on-chain: склади зафіксовані. Очки з’являться після матчів і публікації статистики.`,
    leaderboardSquadsViewable: "Склади доступні · очки очікуються",
    mySquadsCta: "Мій склад →",
    myResultPageTitle: "Мої склади ЧС",
    myResultTourPicker: "Раунд",
    myResultNoSquads: "Ти ще не зареєстрував склад жодного раунду Чемпіонату світу.",
    myResultBackLeaderboard: "Лідерборд",
    myResultOpenRegistrationCta: "Зареєструватись на відкритий раунд →",
    backToHub: "← Чемпіонат світу",
    howItWorksTitle: "Як це працює",
    howStep1: "Обери 11 + 3 з реальних складів збірних до дедлайну раунду.",
    howStep2: "Набирай очки за реальні дії в матчах — голи, асисти, сухі пари, рейтинги.",
    howStep3: (symbol) => `Топ-10 кожного раунду ділять призовий фонд ${symbol}. Забирай на лідерборді.`,
    howDemoPoolTitle: "Пул гравців",
    howDemoPoolMore: "+ сотні інших з усіх збірних",
    hubLiveBadge: "Live on-chain",
    hubSubNavOverview: "Огляд",
    hubPrizePoolLabel: "Призовий фонд раунду",
    hubEntriesLabel: "Зареєстровано складів",
    hubUntilDeadline: "До дедлайну раунду",
    hubPrizeTeaserTitle: "Топ-10 ділять фонд",
    hubPrizeTeaserDesc:
      (symbol) => `Кожен раунд ЧС — окремий конкурс. Після матчів топ-10 менеджерів забирають ${symbol} прямо з лідерборду.`,
    hubStagePath: "Група → Фінал",
    hubHostsLabel: "США · Мексика · Канада",
    prizeBadge: "Призовий фонд",
    prizeTitle: "Топ-10 ділять фонд",
    prizeTitleForN: (n) => `Топ-${n} ділять фонд`,
    prizeDesc:
      (symbol) => `Кожен внесок за участь іде в on-chain фонд раунду. Після завершення матчів десять найкращих менеджерів забирають свою частку — у ${symbol}, прямо з лідерборду.`,
    prizeDescForN: (n, symbol) =>
      `Кожен внесок за участь іде в on-chain фонд раунду. Після завершення матчів топ-${n} менеджерів забирають свою частку — у ${symbol}, прямо з лідерборду.`,
    prizePoolNowLabel: "Поточний фонд раунду",
    prizeShareSuffix: "від фонду",
    prizeClaimNote: "Виплати on-chain — переможці забирають на лідерборді",
    prizeEmptyHint: "Фонд росте з кожним зареєстрованим складом. Розподіл нижче оновлюється наживо.",
    prizeRankLabel: (rank) => `#${rank}`,
    prizeDistribution: "Розподіл призів",
    fx: {
      title: "Розклад матчів",
      subtitle: "Усі матчі Чемпіонату світу — час початку, живі рахунки та результати, тур за туром.",
      loading: "Завантаження матчів…",
      deadlineLabel: "Дедлайн раунду (1-й матч)",
      emptyTitle: "Матчі поки недоступні",
      emptyHint: "Розклад цього раунду з’явиться тут після публікації.",
      groupLabel: (letter) => `Група ${letter}`,
      statusUpcoming: "Скоро",
      statusLive: "Live",
      statusFinished: "FT",
      tbd: "TBD",
      timeTbc: "TBC",
      seeAll: "Усі матчі",
      teaserTitle: "Розклад матчів",
    },
    bracket: {
      badge: "Прогноз турніру",
      title: "Прогнозуй весь Чемпіонат світу",
      subtitle:
        "Розстав місця в усіх групах, визнач вісім найкращих третіх і пройди всю сітку до фіналу та матчу за 3-тє місце. Одна заявка — фіксується on-chain.",
      rulesLine:
        "Очки: 1 за кожне точне місце — позиції в групах (48), рейтинг третіх серед дванадцяти (12) і переможець кожного матчу плей-оф (32). Макс. 92 очки.",
      deadlineNote:
        "Реєстрація закривається на старті першого матчу (разом із дедлайном складу md1). Безкоштовно — лише газ.",
      statusOpen: "Відкрито",
      statusClosed: "Закрито",
      statusResolved: "Завершено",
      statusUpcoming: "Скоро",
      entriesLabel: (n) => `${n.toLocaleString()} прогнозів`,
      prizeRank: (n) => `#${n}`,
      prizePoolLabel: "Загальний призовий фонд",
      prizeTopFiveLabel: "Топ-5",
      prizePerfectBonusTitle: "Бонус за ідеальний прогноз",
      prizePerfectBonusDesc: (maxScore, bonusUsd) =>
        `+${bonusUsd} USDCx, якщо вгадаєш усі ${maxScore} місця — кожну позицію в групах, порядок третіх і переможців плей-оф. Ніхто ще не робив. Бонус додається до призу топ-5.`,
      notEligibleTitle: "Потрібен склад md1",
      notEligibleHint: "Спочатку зареєструй склад на перший тур ЧС — тоді зможеш подати прогноз.",
      registrationClosedTitle: "Реєстрацію закрито",
      registrationClosedBanner: "Нові заявки більше не приймаються.",
      registrationClosedConnectHint:
        "Підключи гаманець, щоб переглянути свій зафіксований прогноз, якщо встиг подати до дедлайну.",
      registrationClosedMissedHint:
        "У тебе був склад md1, але прогноз не зафіксовано on-chain до старту. Вікно подачі вже минуло.",
      registrationClosedNotEligibleHint:
        "Для участі потрібен був склад md1 до старту першого матчу. Реєстрація складів теж уже закрита.",
      submittedTitle: "Прогноз зафіксовано on-chain",
      submittedHint: "Редагування неможливе. Результати й призи — після турніру.",
      contractPending: "On-chain реєстрація відкриється після оновлення контракту на mainnet.",
      submitCta: "Зафіксувати прогноз on-chain",
      submitting: "Надсилання…",
      gasNote: "Безкоштовно · платиш лише газ за транзакцію",
      submitPickRemaining: (n) => {
        if (n === 1) return "Обери ще 1 матч плей-оф, щоб продовжити.";
        const mod10 = n % 10;
        const mod100 = n % 100;
        if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) {
          return `Обери ще ${n} матчі плей-оф, щоб продовжити.`;
        }
        return `Обери ще ${n} матчів плей-оф, щоб продовжити.`;
      },
      submitPickFinals:
        "Майже готово — обери переможців фіналу та матчу за 3-тє місце в центрі сітки (M103 і M104).",
      submitDeadlinePassed: "Реєстрація закрита на старті першого матчу.",
      submitStatusNotOpen: "Прийом прогнозів ще не відкрито.",
      confirmGroups: "Підтвердити групи →",
      confirmThirds: "Підтвердити кращі 3-ті →",
      koFinal: "Фінал",
      koThirdPlace: "3-тє місце",
      koTapHint: "Натисни на збірну, щоб обрати переможця матчу. Пари 1/16 будуються з твоїх групових прогнозів і рейтингу третіх місць.",
      hubCta: "Прогноз турніру",
      hubTeaser: "Прогнозуй весь турнір — $500 USDCx фонд (+$300 бонус за ідеальний прогноз)",
      predictor: {
        stepGroups: "Групи",
        stepThirds: "Кращі 3-ті",
        stepKnockout: "Плей-оф",
        thirdsTitle: "Вісім найкращих третіх місць",
        thirdsHint:
          "Розстав усі дванадцять третіх місць від найсильнішого до найслабшого. Вісім перших проходять — за регламентом FIFA.",
        thirdsAdvance: "Проходить",
        koTitle: "Сітка плей-оф",
        koPickWinner: "Обери переможця…",
        progress: (done, total) => `${done}/${total} матчів`,
      },
    },
  },
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
    submitConfirm: (feeLabel) => `Підтвердити склад · ${feeLabel}`,
    submitNeedPlayers: (picked: number, max: number) => `Обери ${max} гравців (${picked}/${max})`,
    headerTitle: (gw) => `Тур ${gw} · Вибір складу`,
    pickPlayersHint: "Обери 11 гравців. Максимум 3 з однієї команди.",
    randomSquadBtn: "Випадковий склад",
    randomSquadFailed: "Не вдалося зібрати склад — спробуй ще раз.",
    maxThreeHint: "Максимум 3 з однієї команди",
    entryFeeLabel: "Вартість реєстрації",
    entryFeeUsdcxHint: "Потрібен USDCx? Motion, Nightly Swap або Yuzu →",
    entryFeeLegacyBanner: (chargedLabel) =>
      `On-chain внесок досі ${chargedLabel} (MOVE) — USDCx увімкнеться після оновлення контракту. З гаманця зніметься MOVE, не USDCx.`,
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
    fplStripTitle: "Поточний тур · FPL",
    fplStripSeeAll: "Усі матчі →",
    fplStripLoadError: "Не вдалося завантажити розклад FPL.",
    fplStripMatchCount: (n) => `${n} матчів`,
    registeredScoresTitle: "Результати туру",
    registeredPlayerCol: "Гравець",
    registeredXiTotalLabel: "Разом (основа)",
    registeredOfficialTotalHint: "Офіційний підсумок туру",
    registeredMultiplierFooter: (factorLabel) => `Титули / гільдії ${factorLabel}`,
    registeredViaSub: (name, subPts) =>
      subPts != null && subPts > 0 ? `→ ${name} (+${subPts})` : `→ ${name}`,
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
    dateTbc: "Дата уточнюється",
    timeTbc: "TBC",
    emptyScheduleHint:
      "Живий список матчів з FPL із цього сервера не підвантажився — показано лише дедлайн із кешу. Онови сторінку або спробуй за хвилину.",
  },
  leaderboard: {
    claimSuccess: (symbol) => `Клейм виконано: ${symbol} надіслано на твій гаманець (перевір баланс у гаманці / в експлорері).`,
    claimFail: (msg) => `Не вдалося заклеймити: ${msg}`,
    claimAlreadyPaid:
      "Ти вже забирав приз за цей тур (у т.ч. до recalc). Повторна виплата недоступна.",
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
    topNPrizeReceive: (n) => `Топ-${n} отримують`,
    noDataForGw: (gw) => `Немає даних для GW ${gw}`,
    myResultTitle: (gw) => `Мій результат · Тур ${gw}`,
    inPrizes: "У призах 🎉",
    detailsLink: "Детальніше →",
    colRank: "Місце",
    colPoints: "Очки",
    colPrize: (symbol) => `Приз (${symbol})`,
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
  seasonLeaderboard: {
    loading: "Завантаження сезонного рейтингу…",
    seasonTag: (label) => `Сезон ${label}`,
    pageTitle: "Season Points",
    subtitle:
      "Season Points (SP) — один сезон: спочатку тури ЧС, потім EPL. Стрік переноситься з ЧС на EPL. Це не фентезі-очки туру.",
    resolvedThrough: (from, through) => `Враховано завершені тури GW ${from}–${through}`,
    myScore: "Твій сезонний рахунок",
    streakLabel: "Найкращий стрік",
    rulesTitle: "Як нараховуються SP",
    ruleRegistration: "Реєстрація складу (за тур)",
    ruleFirstReg: "Перша реєстрація (одноразово)",
    ruleTop10Header: "Лише топ-10",
    ruleRank: (n) => `${n}-е місце`,
    ruleRank4to10: "4–10 місце: від 100 до 25 SP (деталі в FAQ)",
    ruleStreakHeader: "Стрік реєстрацій (ЧС + EPL, за подію)",
    ruleStreak: (n) => `${n}+ тури поспіль`,
    ruleClaim: "Клейм призу",
    rulesFootnote:
      "Один сезон: тури ЧС, потім EPL. Стрік триває через перехід. Рахуються лише завершені події. 11-е місце і нижче — 0 SP.",
    faqLink: "Повні правила в FAQ",
    colRank: "Місце",
    colPlayer: "Гравець",
    colPoints: "SP",
    colRegistrations: "Тури",
    colTop10: "Топ-10",
    colBestRank: "Кращ.",
    youBadge: "ти",
    emptyTitle: "Сезонних даних поки немає",
    emptyHint: "Season Points з’являться після першого завершеного туру в межах сезону on-chain.",
    breakdownGw: (gw) => `Тур ${gw}`,
    breakdownRegistration: "реєстр.",
    breakdownRank: "місце",
    breakdownStreak: "стрік",
    breakdownClaim: "клейм",
    breakdownFirst: "перша",
    breakdownSkipped: "без участі",
    loadError: (msg) => `Не вдалось завантажити сезонний рейтинг: ${msg}`,
    footerNote: "SP рахуються з on-chain реєстрацій і результатів · кеш ~2 хв",
    inactiveTitle: "Сезон ще не стартував",
    inactiveHint:
      "Season Points налаштовано, але ще не ввімкнено. Відлік піде з першого завершеного туру після запуску — анонсуємо, коли SP стануть активними.",
    endedBadge: "Сезон завершено",
    awaitingGw: (startGw) =>
      `Сезон активний з GW ${startGw}. Очки з’являться після on-chain завершення цього туру.`,
    ruleStreakCap: "5-й тур і далі — ті самі +20 (вищого рівня немає)",
    seasonWindowOpen: (startGw) => `Відкритий сезон · з GW ${startGw}`,
    seasonWindowClosed: (startGw, endGw) => `GW ${startGw}–${endGw}`,
    progressWc: (resolved, total) => `Фаза ЧС · ${resolved}/${total} турів завершено`,
    progressEpl: (from, through) => `EPL · GW ${from}–${through}`,
    awaitingFirstEvent: "Сезон увімкнено — очки з’являться після першої завершеної події ЧС або EPL on-chain.",
    awaitingEpl: (startGw) =>
      `Фаза ЧС у SP завершена — той самий сезон продовжується з EPL, GW ${startGw}.`,
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
    colStatus: "Статус",
    fundSplit: "Розподіл фонду",
    you: "Ви",
    claimed: "Отримано",
    notClaimed: "Не отримано",
    colSquad: "Склад",
    viewSquad: "Переглянути",
    hideSquad: "Згорнути",
    viewSquadHint: "Натисни — побачиш склад",
    squadLoading: "Завантажуємо склад…",
    squadLoadError: "Не вдалось завантажити склад.",
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
  squadShare: {
    modalTitle: "Поділись складом у X",
    modalDesc: "Увесь склад буде в тексті поста. PNG прикріпи в X вручну — браузер не може завантажити фото замість тебе.",
    closeAria: "Закрити",
    xHandleLabel: "Твій X (необовʼязково)",
    xHandlePlaceholder: "username",
    xHandleHint: "Зберігається локально — додамо в пост, щоб друзі могли знайти тебе.",
    shareButton: "Поділитись у X",
    laterButton: "Можливо пізніше",
    generating: "Готуємо…",
    desktopHint:
      "X відкрився в новій вкладці. PNG складу завантажено — перетягни у вікно поста або натисни іконку зображення.",
    clipboardHint:
      "X відкрився в новій вкладці. Зображення в буфері — встав у вікно поста (⌘V).",
    registeredShareButton: "Поділитись у X",
    posterCta: "Збери свій склад на MoveMatch",
    tweetXiLabel: "Основа",
    tweetBenchLabel: "Запас",
    tweetHeaderGw: (gw) => `Мій склад ${gw} на @MoveMatchxyz ⚽`,
    tweetHeaderWc: (round) => `Мій склад ЧС · ${round} на @MoveMatchxyz ⚽`,
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
    feesSectionTitle: "Внески: склад (USDCx) та титули (MOVE)",
    feesSectionHint:
      "Оновлює on-chain entry_fee (мікро-одиниці USDCx), title_fee та guild_fee (октаси MOVE). Сторінка вибору складу бере суми з get_config — лише зміна коду пакета не змінює вже задеплоєний контракт.",
    feesEntryLabel: (symbol) => `Реєстрація складу (${symbol})`,
    feesTitleLabel: "Купівля титулу",
    feesGuildLabel: "Гільдія",
    feesSubmit: "Застосувати внески в мережі",
    feesUpdated: "Внески оновлено on-chain. Онови сторінку вибору складу.",
    feesInvalid: "Введи коректні невід’ємні числа для всіх трьох полів (внесок у USDCx, титули/гільдія в MOVE).",
    sponsorSectionTitle: "Додати в призовий пул (спонсор)",
    sponsorSectionHint: (symbol) =>
      `Перерахуй ${symbol} з гаманця адміна в prize vault — on-chain поле призового фонду цього туру збільшиться на ту саму суму. Частки призів після «Calculate results» рахуються з цього фонду, тож роби це до резолву туру. Клейм платить з vault — якщо сума тут узгоджена з пулом, при клеймі не «не вистачить» коштів.`,
    sponsorGwLabel: "Номер туру (GW)",
    sponsorAmountLabel: (symbol) => `Сума (${symbol})`,
    sponsorSubmit: "Додати в пул",
    sponsorSuccess: (gw, amountLabel) =>
      `On-chain додано ${amountLabel} до призового пулу GW ${gw}. Якщо результати ще не пораховані — ця сума піде в виплати.`,
    sponsorInvalidGw: "Введи коректний номер туру (ціле число ≥ 1).",
    sponsorInvalidAmount: (symbol) => `Введи додатну суму в ${symbol}.`,
    sponsorAmountTooSmall: "Сума в найменших одиницях дає нуль — збільш значення.",
    sponsorAlertResolved:
      "Цей тур уже RESOLVED — індивідуальні призи зафіксовані в контракті. Спонсор лише до кроку «Calculate results».",
    sponsorGwNotFound: (id) => `Тур ${id} не знайдено в контракті.`,
    sponsorNotOnChain:
      "У задеплоєному on-chain модулі немає entry-функції admin_sponsor_prize_pool (гаманець не бачить ABI). У коді репозиторію вона вже є — потрібно зробити оновлення пакета Movement на той самий акаунт, щоб функція з’явилася в мережі. Доки цього немає, призовий пул росте лише з внесків гравців за налаштованим відсотком.",
    withdrawSectionTitle: "Вивести з призового vault",
    withdrawSectionHint: (symbol) =>
      `Переказує ${symbol} зі спільного prize vault на будь-яку адресу (лише адмін). Не змінює on-chain поля prize_pool і не знімає незаклеймлені призи в обліку — лишай у vault достатньо ліквідності під очікувані claim_prize, інакше клейми впадуть через нестачу балансу.`,
    withdrawRecipientLabel: "Адреса отримувача (0x…)",
    withdrawAmountLabel: (symbol) => `Сума (${symbol})`,
    withdrawSubmit: "Вивести з vault",
    withdrawSuccess: (recipient, amountLabel) =>
      `З vault відправлено ${amountLabel} → ${recipient.slice(0, 10)}…${recipient.slice(-8)}`,
    withdrawInvalidRecipient: "Введи коректну адресу Movement (0x + hex).",
    withdrawInvalidAmount: (symbol) => `Введи додатну суму в ${symbol}.`,
    withdrawAmountTooSmall: "Сума в найменших одиницях дає нуль — збільш значення.",
    withdrawNotOnChain:
      "У задеплоєному модулі on-chain немає entry admin_withdraw_prize_vault. Онови пакет із цього репозиторію, щоб функція з’явилася в ABI.",
    bracketSectionTitle: "ЧС · Запуск Bracket Challenge",
    bracketSectionHint:
      "Після publish оновлення пакета (register_bracket_prediction on-chain) виконай кроки по порядку. Перший admin_init_bracket_challenge має підписати гаманець модуля (0xf598…).",
    bracketAbiLive: "Bracket entrypoints є on-chain",
    bracketAbiMissing: "Bracket entrypoints відсутні — спочатку publish (npm run wc:bracket:deploy)",
    bracketStatusLabel: (status) =>
      status === 255
        ? "Не ініціалізовано"
        : status === 0
          ? "ВІДКРИТО — приймаємо прогнози"
          : status === 1
            ? "ЗАКРИТО"
            : status === 2
              ? "ЗАВЕРШЕНО"
              : `Статус ${status}`,
    bracketEntriesLabel: (n) => `${n.toLocaleString()} прогнозів`,
    bracketGwPoolLabel: (gw, poolLabel) => `GW ${gw} призовий фонд: ${poolLabel}`,
    bracketStepPublish: "1. Publish upgrade (CLI — потрібен ключ модуля)",
    bracketStepCreateGw: "2. Створити prize gameweek",
    bracketStepSponsor: "3. Завести $500 USDCx у пул",
    bracketStepInit: "4. Відкрити bracket challenge",
    bracketCreateGwButton: (gw) => `Створити GW ${gw}`,
    bracketSponsorButton: (amountLabel) => `Завести ${amountLabel}`,
    bracketInitButton: "Відкрити bracket challenge",
    bracketCloseButton: "Закрити реєстрацію bracket",
    bracketInitSuccess: "Bracket challenge ВІДКРИТО. Користувачі можуть подавати на /world-cup/bracket.",
    bracketCloseSuccess: "Реєстрацію bracket закрито.",
    bracketInitModuleWalletHint:
      "Перший init має підписати гаманець publisher модуля (MODULE_ADDRESS). Підключи його в браузері або використай CLI.",
    bracketNotOnChain:
      "register_bracket_prediction ще немає в on-chain ABI. Запусти: npm run wc:bracket:deploy",
    markClaimedSectionTitle: "Позначити приз як уже отриманий",
    markClaimedSectionHint:
      "Після recalc: claimed=true для гаманців, які вже забрали виплату (без другого transfer). Для MD1 — одразу після calculate, щоб не було повторного claim.",
    markClaimedGwLabel: "ID туру / gameweek",
    markClaimedOwnerLabel: "Адреса гаманця (0x…)",
    markClaimedSubmit: "Позначити claimed",
    markClaimedSuccess: "На chain позначено claimed=true.",
    markClaimedInvalidGw: "Введи коректний ID туру / gameweek.",
    markClaimedInvalidOwner: "Введи коректну адресу Movement (0x + 64 hex).",
    markClaimedNotOnChain:
      "admin_mark_prize_claimed ще немає on-chain. У корені репо: npm run md1:deploy-mark-claimed (Movement CLI + гаманець publisher модуля). Потім познач 3 гаманці MD1 або npm run md1:mark-prior-claims.",
    heroStateTitle: "Hero на головній · Офіційна сітка",
    heroStateHint:
      "Результати підтягуються автоматично з football-data.org (FOOTBALL_DATA_TOKEN). Hero на головній оновлюється кожні ~30 с — публікувати вручну не потрібно. Ручне редагування — лише якщо API помиляється.",
    heroStateAutoSyncOn: "Авто-синк · live",
    heroStateAutoSyncOff: "Авто-синк вимкнено · задай FOOTBALL_DATA_TOKEN",
    heroStateOverrideTitle: "Ручне виправлення",
    heroStateOverrideHint:
      "Виправлення зберігаються поверх live API. Зберігай лише коли треба підправити помилковий результат.",
    heroStateAdminKeyLabel: "Admin key",
    heroStateAdminKeyPlaceholder: "WC_BRACKET_STATE_ADMIN_KEY",
    heroStateRefreshButton: "Оновити превʼю",
    heroStateSaveButton: "Зберегти виправлення",
    heroStateSaving: "Збереження…",
    heroStateLastUpdated: (iso, source) => `Останній синк: ${new Date(iso).toLocaleString()} · ${source}`,
    heroStateSaveSuccess: "Виправлення збережено — live API заповнить решту.",
    heroStateSaveError: "Не вдалося зберегти виправлення.",
    heroStateKeyRequired: "Введи WC_BRACKET_STATE_ADMIN_KEY для збереження.",
  },
  faq: {
    pageTitle: "Часті питання",
    eyebrow: "Довідка",
    title: "Часті питання",
    subtitle:
      "Не знаєш ні фентезі-футболу, ні крипти, ні того й того? Тоді ти за адресою. Читай зверху вниз — відповіді йдуть від «що це за сайт взагалі?» до деталей нарахування очок.",
    searchPlaceholder: "Знайти питання...",
    searchAriaLabel: "Пошук по FAQ",
    expandAll: "Розгорнути все",
    collapseAll: "Згорнути все",
    foundCount: (n) => {
      const mod10 = n % 10;
      const mod100 = n % 100;
      let word = "питань";
      if (mod10 === 1 && mod100 !== 11) word = "питання";
      else if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) word = "питання";
      return `Знайдено ${n} ${word}`;
    },
    noResultsTitle: "Нічого не знайдено",
    noResultsHint: "Спробуй інше слово або очисти пошук, щоб переглянути всі категорії.",
    clearSearch: "Очистити пошук",
    backToTop: "Нагору",
    contactTitle: "Не знайшов відповіді?",
    contactBody:
      "Якщо щось незрозуміло або знайшов баг — напиши в Telegram @movematch. Відповідаємо швидко. Оголошення й новини — також у X.",
    contactCta: "Написати в",
    contactHref: "https://t.me/movematch",
    categories: [
      {
        id: "what-is-this",
        title: "Що це за сайт?",
        blurb: "Перший контакт — почни з цього розділу, якщо щойно сюди потрапив.",
        items: [
          {
            id: "what-is-movematch",
            q: "Що таке MOVEMATCH простими словами?",
            a: [
              { type: "p", text: "MOVEMATCH — це фентезі-футбол на Англійську Прем'єр-лігу (АПЛ). Алгоритм простий:" },
              {
                type: "ul",
                items: [
                  "Перед кожним туром ти збираєш свій склад із реальних футболістів АПЛ.",
                  "Ці футболісти грають у реальних матчах туру.",
                  "За їхні дії на полі (голи, асисти, сейви тощо) тобі нараховуються очки.",
                  "Топ-10 менеджерів за очками ділять призовий фонд у USDCx.",
                ],
              },
              { type: "p", text: "Жодних ставок на матчі — це змагання за вміння аналізувати футбол, а не лотерея." },
            ],
          },
          {
            id: "is-it-free",
            q: "Це безкоштовно?",
            a: [
              { type: "p", text: "Ні. Щоб зареєструвати склад, треба сплатити невеликий внесок у USDCx (точна сума завжди видно на сторінці «Склад»)." },
              { type: "p", text: "Усі внески всіх учасників складаються в призовий фонд цього туру — виплати переможцям виходять із нього." },
              { type: "p", text: "З фонду утримується невелика технічна частка на підтримку й існування проєкту." },
            ],
          },
          {
            id: "can-i-actually-win",
            q: "Чи я справді можу щось виграти?",
            a: [
              { type: "p", text: "Так. Якщо твій склад потрапляє в топ-10 за очками, тобі автоматично нараховується частка призового фонду в USDCx — їх потім можна забрати на свій гаманець." },
              { type: "p", text: "Розмір виграшу залежить від місця і від кількості учасників туру." },
            ],
          },
          {
            id: "is-this-gambling",
            q: "Це азартна гра?",
            a: [
              { type: "p", text: "Не в розумінні «казино». Це фентезі-спорт, скіл-гра — як шахи з призовим фондом. Виграє той, хто краще аналізує форму гравців і розклад туру, а не той, кому пощастило зі спіном рулетки." },
              { type: "p", text: "У більшості юрисдикцій фентезі-спорт не вважається азартними іграми, але остаточно перевір власне законодавство." },
            ],
          },
        ],
      },
      {
        id: "football-101",
        title: "Футбол з нуля",
        blurb: "Не знаєш, що таке «суха пара»? Починай звідси.",
        items: [
          {
            id: "what-is-epl",
            q: "Що таке Англійська Прем'єр-ліга (АПЛ)?",
            a: [
              { type: "p", text: "Найпопулярніший футбольний чемпіонат у світі. 20 англійських клубів (Манчестер Сіті, Ліверпуль, Арсенал та інші) грають один з одним з серпня по травень." },
              { type: "p", text: "У MOVEMATCH ми використовуємо реальну статистику з матчів АПЛ — тому твої «віртуальні» гравці насправді справжні футболісти, які виходять на поле." },
            ],
          },
          {
            id: "what-is-gameweek",
            q: "Що таке тур (gameweek)?",
            a: [
              { type: "p", text: "Один раунд матчів. Зазвичай це 10 матчів за 2-3 дні (десь з п'ятниці по неділю, інколи понеділок)." },
              { type: "p", text: "Кожен тур у MOVEMATCH — окремий конкурс: збираєш склад → грає тур → нараховуються очки → виплачуються призи. Потім — наступний тур." },
            ],
          },
          {
            id: "what-is-deadline",
            q: "Що таке дедлайн?",
            a: [
              { type: "p", text: "Час, до якого треба встигнути зареєструвати склад. Це момент свистка першого матчу туру." },
              { type: "p", text: "Після дедлайну склад зафіксовано і змінити його не можна — інакше можна було б «підлаштовувати» вибір під вже зіграні матчі." },
            ],
          },
          {
            id: "positions",
            q: "Що означає GK, DEF, MID, FWD?",
            a: [
              { type: "p", text: "Це чотири позиції на полі:" },
              {
                type: "ul",
                items: [
                  "GK (воротар) — стоїть у воротах, не дає забити.",
                  "DEF (захисник) — оберігає свою половину поля, не пускає чужих у штрафний.",
                  "MID (півзахисник) — грає в центрі, віддає паси, інколи забиває.",
                  "FWD (нападник) — головна задача — забивати голи.",
                ],
              },
              { type: "p", text: "У MOVEMATCH потрібно вибрати 11 гравців у стандартній фентезі-формації (1 воротар + 3-5 захисників + 3-5 півзахисників + 1-3 нападники)." },
            ],
          },
          {
            id: "football-terms",
            q: "Що таке «суха пара», «асист», «хет-трик», рейтинг матчу?",
            a: [
              {
                type: "ul",
                items: [
                  "Суха пара (clean sheet) — команда не пропустила жодного гола за матч. Бонус для воротарів і захисників.",
                  "Асист — пас, після якого партнер забив. Цінна дія для нападників і півзахисників.",
                  "Хет-трик — три голи в одному матчі від одного гравця. Рідкість, тому окремий бонус.",
                  "Рейтинг матчу — оцінка гри кожного гравця за матч (наприклад, 7.5, 8.2). Високий рейтинг дає бонусні очки; дуже низький — штраф −1.",
                ],
              },
            ],
          },
          {
            id: "max-three-per-club",
            q: "Чому максимум 3 гравці з однієї команди?",
            a: [
              { type: "p", text: "Щоб не можна було «забити склад одним клубом». Якщо проти умовного «Сандерленда» грає Манчестер Сіті, було б нечесно якби всі взяли 11 гравців Сіті." },
              { type: "p", text: "Обмеження «макс 3 з клубу» змушує тебе диверсифікувати склад і реально вибирати, хто з кого матиме найкращу гру в цьому турі." },
            ],
          },
          {
            id: "what-is-form",
            q: "Що означає «форма» гравця?",
            a: [
              { type: "p", text: "Середня кількість очок, які гравець набирає за матч у нашій системі за останні тури. Гравець «у формі» зазвичай продовжує забивати або асистувати, гравець «не в формі» — навпаки." },
              { type: "p", text: "Це підказка кого вибирати, але не гарантія. Тренери, травми, суперник — все має значення." },
            ],
          },
          {
            id: "starters-vs-bench",
            q: "Чим основа відрізняється від запасних?",
            a: [
              { type: "p", text: "11 гравців основи — твій стартовий склад. Їхні очки рахуються одразу." },
              { type: "p", text: "3 запасних — резерв. Якщо хтось з основи не вийшов на поле в реальному матчі (травма, тренер його не випустив), система автоматично «замінить» його одним із запасних і зарахує саме його очки замість нуля." },
            ],
          },
        ],
      },
      {
        id: "web3-101",
        title: "Веб-3 з нуля",
        blurb: "Гаманці, токени, blockchain — без жаргону.",
        items: [
          {
            id: "what-is-wallet",
            q: "Що таке крипто-гаманець і навіщо він мені?",
            a: [
              { type: "p", text: "Гаманець — це програма (розширення для браузера або застосунок на телефоні), яка зберігає твою криптовалюту і «підписує» твої дії в блокчейні." },
              { type: "p", text: "На MOVEMATCH гаманець — твій акаунт: і логін, і банк, і спосіб підтвердити «так, я хочу зареєструвати цей склад на цей тур»." },
            ],
          },
          {
            id: "which-wallet",
            q: "Який гаманець потрібен? Де його взяти?",
            a: [
              { type: "p", text: "MOVEMATCH підтримує Motion і Nightly — обери будь-який, коли натискаєш «Підключити гаманець»." },
              { type: "p", text: "Motion (рекомендуємо) — офіційне розширення Chrome для Movement: motion.movementnetwork.xyz. Self-custodial, зроблений під Movement: відправка, своп, підключення до dApps. Встанови з Chrome Web Store. Повний FAQ: movementnetwork.xyz/faqs/motion-wallet." },
              { type: "p", text: "Nightly (альтернатива) теж працює з Movement — розширення для Chrome і застосунок для телефону (iOS / Android) з nightly.app. Зручно, якщо вже користуєшся Nightly на мобільному." },
              {
                type: "ul",
                items: [
                  "Створи новий гаманець у розширенні або застосунку.",
                  "Обов'язково запиши seed-фразу (12-24 слова) на папері й сховай у безпечному місці.",
                  "Ніколи нікому не давай seed-фразу — це повний доступ до твого гаманця.",
                  "Втратиш seed і нікому не дав — гаманець відновити неможливо. Запишеш і поділишся з кимось — гроші вкрадуть.",
                ],
              },
            ],
          },
          {
            id: "what-is-movement",
            q: "Що таке Movement і USDCx?",
            a: [
              { type: "p", text: "Movement — це блокчейн-мережа (як інтернет, тільки для криптовалют)." },
              { type: "p", text: "USDCx — доларовий стейблкоїн на мережі Movement, забезпечений USDC від Circle. На MOVEMATCH ти платиш внески за склад і отримуєш призи в USDCx. Отримати можна через своп у Motion або Nightly, або на Yuzu (app.yuzu.finance)." },
            ],
          },
          {
            id: "how-to-get-move",
            q: "Як отримати USDCx, щоб зіграти?",
            a: [
              {
                type: "ul",
                items: [
                  "Встанови Motion з motion.movementnetwork.xyz (або Nightly з nightly.app) і створи гаманець у Movement.",
                  "У Motion або Nightly відкрий Swap і обміняй MOVE (або інший токен на балансі) на USDCx — кілька тапів.",
                  "Або Yuzu — офіційний DEX Movement: app.yuzu.finance — підключи гаманець, обери USDCx, свопни і підпиши.",
                  "Потрібно щонайменше 5 USDCx на один склад. Залиш трохи MOVE на комісії мережі.",
                  "Заходь на MOVEMATCH → Підключи гаманець → обери Motion або Nightly → Склад → Підтверди і підпиши.",
                ],
              },
              {
                type: "p",
                text: "Швидкий шлях: кнопка «Своп на Yuzu → USDCx» у меню гаманця на сайті відкриває пару вже налаштованою.",
              },
            ],
          },
          {
            id: "is-connecting-safe",
            q: "Чи безпечно підключати гаманець до сайту?",
            a: [
              { type: "p", text: "Так. «Підключити гаманець» — це не «віддати ключі». Сайт лише бачить твою публічну адресу і кожного разу окремо просить твого підпису на конкретну дію (зареєструвати склад, забрати приз)." },
              { type: "p", text: "Підпис ти даєш сам у вікні гаманця (Motion або Nightly). Сайт ніколи не отримує seed-фразу або приватний ключ і без твого явного підпису не може витратити жодного токена." },
              { type: "p", text: "Просте правило: перевіряй URL — заходь лише на офіційну адресу MOVEMATCH." },
            ],
          },
          {
            id: "what-is-smart-contract",
            q: "Що таке смарт-контракт і чому це важливо?",
            a: [
              { type: "p", text: "Смарт-контракт — це програма, яка автоматично виконується в блокчейні без посередників. Її код відкритий і його не можна непомітно змінити." },
              { type: "p", text: "У MOVEMATCH контракт відповідає за: прийом твого внеску у фонд, фіксацію складу так, що ніхто (навіть розробники) не зможе його підмінити, і виплату призів топ-10." },
              { type: "p", text: "Тому все відкрито — ти можеш сам перевірити в блокчейн-експлорері, що саме сталося з твоїм USDCx." },
            ],
          },
          {
            id: "why-claim",
            q: "Чому я маю натискати «Claim», щоб забрати виграш?",
            a: [
              { type: "p", text: "Це особливість блокчейна — приз не приходить автоматично. Гаманець мусить підписати окрему транзакцію на перерахунок USDCx з контракту на твою адресу." },
              { type: "p", text: "На сторінці «Лідерборд» поряд з твоїм результатом з'явиться кнопка «Claim». Натискаєш → підписуєш у гаманці → USDCx падає на гаманець. Зробити це можна в будь-який зручний момент." },
            ],
          },
        ],
      },
      {
        id: "how-to-play",
        title: "Як грати",
        blurb: "Покрокова механіка — від нуля до першого складу.",
        items: [
          {
            id: "first-steps",
            q: "З чого почати? Покрокова інструкція.",
            a: [
              {
                type: "ul",
                items: [
                  "1. Встанови Motion з motion.movementnetwork.xyz (рекомендуємо) або Nightly з nightly.app.",
                  "2. Створи акаунт і збережи seed-фразу на папері.",
                  "3. Отримай USDCx — своп у Motion, Nightly або на Yuzu (app.yuzu.finance). Потрібно ~5 USDCx + трохи MOVE на комісії.",
                  "4. На MOVEMATCH натисни «Підключити гаманець», обери Motion або Nightly.",
                  "5. Зайди на сторінку «Склад», вибери 11 основних + 3 запасних.",
                  "6. Натисни «Підтвердити склад» і підпиши транзакцію в гаманці.",
                  "7. Чекай початку туру — далі все рахується автоматично.",
                ],
              },
            ],
          },
          {
            id: "entry-cost",
            q: "Скільки коштує вхід в один тур?",
            a: [
              { type: "p", text: "Конкретний внесок видно на сторінці «Склад» (рядок «Вартість реєстрації»). Це 5 USDCx за тур — невелика стабільна сума для пробного входу." },
            ],
          },
          {
            id: "change-squad",
            q: "Чи можна змінити склад після реєстрації?",
            a: [
              { type: "p", text: "Поки тур ще не почався (до дедлайну) — так, але кожна зміна — нова транзакція з невеликою комісією мережі." },
              { type: "p", text: "Після дедлайну склад зафіксовано в блокчейні. Це не наша примха — це властивість блокчейна: те, що записано, переписати не можна." },
            ],
          },
          {
            id: "missed-deadline",
            q: "Що якщо я пропустив дедлайн?",
            a: [
              { type: "p", text: "Просто чекаєш наступного туру. Кожен тиждень — новий тур з новим складом, жодних штрафів за пропуск." },
            ],
          },
          {
            id: "multiple-squads",
            q: "Скільки складів можна зареєструвати на один тур?",
            a: [
              { type: "p", text: "Один склад на один гаманець на тур. Якщо хочеш кілька — потрібен інший гаманець (інша адреса), і кожен з них окремо платить внесок." },
            ],
          },
          {
            id: "injured-player",
            q: "Що якщо мій гравець травмувався і не вийшов?",
            a: [
              { type: "p", text: "У такому матчі він набирає 0 очок. АЛЕ якщо у тебе є 3 запасних, система автоматично «впустить на поле» одного з них замість того, хто не зіграв, і зарахує саме його очки." },
              { type: "p", text: "Тому має сенс серед запасних брати тих, хто з найбільшою ймовірністю зіграє в цьому турі." },
            ],
          },
          {
            id: "when-points",
            q: "Коли я побачу свої очки?",
            a: [
              { type: "p", text: "Очки оновлюються в реальному часі під час матчів туру (з невеликою затримкою — статистика збирається з офіційних джерел АПЛ)." },
              { type: "p", text: "Остаточний результат фіксується після завершення останнього матчу туру і подачі статистики в смарт-контракт адміністрацією." },
            ],
          },
          {
            id: "when-payout",
            q: "Коли і як я отримую виграш?",
            a: [
              { type: "p", text: "Після останнього матчу туру адміністрація закриває тур, статистика подається в смарт-контракт, обчислюються остаточні місця і призи." },
              { type: "p", text: "Як тільки тур опубліковано як Resolved (зазвичай протягом доби), на сторінці «Лідерборд» поряд з твоїм результатом з'являється кнопка «Claim». Натискаєш — і USDCx приходить на гаманець." },
            ],
          },
        ],
      },
      {
        id: "scoring-and-rewards",
        title: "Очки і виграш",
        blurb: "Як рахуються очки і як ділиться призовий фонд.",
        items: [
          {
            id: "how-scoring-works",
            q: "Як саме рахуються очки?",
            a: [
              { type: "p", text: "Кожна корисна дія гравця на полі = очки тобі. Стандартні нарахування:" },
              {
                type: "ul",
                items: [
                  "Гол — від +4 до +6 очок (залежно від позиції)",
                  "Асист — кілька очок",
                  "Суха пара — для воротарів і захисників",
                  "Сейви — для воротарів",
                  "Гра 60+ хвилин — додаткові очки",
                  "Високий рейтинг матчу — +1 до +3 (≥7.5 / ≥8.0 / ≥9.0)",
                  "Хет-трик — окремий великий бонус",
                ],
              },
              { type: "p", text: "Штрафи: червона/жовта картка, автогол, незабитий пенальті, низький рейтинг — мінусові очки. Повна таблиця нарахувань — на головній у розділі «Чим більше дій — тим більше очок»." },
            ],
          },
          {
            id: "defender-vs-forward-goal",
            q: "Чому за гол захисника дають більше ніж за гол нападника?",
            a: [
              { type: "p", text: "Бо для нападника гол — рутина, його основна задача. А для захисника — рідкісна подія, яку складно передбачити, і яка значно змінює матч." },
              { type: "p", text: "Так фентезі-системи стимулюють вибирати «ризикові» варіанти, а не лише забивних форвардів." },
            ],
          },
          {
            id: "how-much-can-i-win",
            q: "Скільки можна виграти?",
            a: [
              { type: "p", text: "Залежить від призового фонду туру і твого місця. Призовий фонд = сума внесків усіх учасників туру (мінус мала технічна частка)." },
              { type: "p", text: "Чим більше учасників, тим більший фонд. Топ-10 ділять його за фіксованою сіткою: 1-ше місце — найбільша частка, 10-те — найменша. Розподіл видно на головній у розділі «Розділи призовий пул»." },
            ],
          },
          {
            id: "11th-no-prize",
            q: "Що якщо я 11-й, без призу?",
            a: [
              { type: "p", text: "Цього туру нічого не отримуєш. Внесок не повертається — він залишається в призовому фонді, який вже й розділили переможці." },
              { type: "p", text: "Спробуй наступний тур: новий склад, нові шанси." },
            ],
          },
          {
            id: "convert-to-fiat",
            q: "Як вивести USDCx у звичайні гроші?",
            a: [
              { type: "p", text: "USDCx уже прив’язаний до долара. Обміняй назад на MOVE або інший токен на Yuzu, у Motion або в Nightly, потім виведи через звичну біржу — як із будь-якою криптою." },
              { type: "p", text: "Технічно це 2-3 транзакції. На все треба ~15-30 хвилин." },
            ],
          },
          {
            id: "season-points",
            q: "Що таке Season Points (SP)?",
            a: [
              { type: "p", text: "Season Points — один сезон лояльності: спочатку тури ЧС, потім EPL. Один лічильник стріку на обидві фази." },
              { type: "p", text: "SP за реєстрацію (+25), першу реєстрацію (+50), топ-10 (1-ше = 200 … 10-те = 25), стріки (+10 / +15 / +20 з 4-го), клейм (+10). Сезон стартує з нуля, коли ми його ввімкнемо. Кінець ЧС не завершує SP-сезон — далі йде EPL." },
              { type: "p", text: "У конфігу `enabled: true` при запуску. `eplStartGw` — коли EPL входить у той самий сезон. Таблиця — Season SP у меню." },
            ],
          },
        ],
      },
      {
        id: "trust-and-safety",
        title: "Безпека і чесність",
        blurb: "Як упевнитись, що це не шахрайство.",
        items: [
          {
            id: "is-it-scam",
            q: "Як я знаю, що це не шахрайство?",
            a: [
              { type: "p", text: "Усі ключові дії (твій склад, призовий фонд, очки, виплати) фіксуються в блокчейні Movement, і їх можна перевірити в публічному експлорері — ніхто, навіть розробники MOVEMATCH, не може непомітно нічого змінити." },
              { type: "p", text: "Адміністрація НЕ може: підмінити чужий склад після дедлайну, забрати щось з призового фонду, переписати очки. Смарт-контракт цього просто не дозволяє." },
            ],
          },
          {
            id: "what-if-bug",
            q: "Що якщо у вас баг і я втрачу внесок?",
            a: [
              { type: "p", text: "Контракт тестується, але ризик завжди є. Поки що грай на суми, які ти готовий ризикнути." },
              { type: "p", text: "У разі підтвердженого бага в нашій логіці контракту — повертаємо. Скарги й питання — пиши в Telegram @movematch." },
            ],
          },
          {
            id: "lost-seed",
            q: "А якщо я втратив seed-фразу від гаманця?",
            a: [
              { type: "p", text: "MOVEMATCH тут нічим не допоможе. Гаманець належить тобі, і твоя seed-фраза — єдиний спосіб його відновити. Ні Motion, ні Nightly, ні MOVEMATCH не мають доступу до неї." },
              { type: "p", text: "Якщо seed утрачено — гаманець (і кошти на ньому) втрачено назавжди. Тому seed зберігай оффлайн на папері в безпечному місці." },
            ],
          },
        ],
      },
      {
        id: "whats-next",
        title: "Що буде далі",
        blurb: "Майбутні фічі, які ти міг побачити в меню.",
        items: [
          {
            id: "what-are-talents",
            q: "Що таке «Таланти», які я бачу в меню (з позначкою soon)?",
            a: [
              { type: "p", text: "Майбутня фіча, поки що в розробці. «Таланти» — це бонусні множники (+5%, +10% або +15%) на фінальний рахунок гравця у твоєму складі." },
              { type: "p", text: "Розблоковуватимуться окремою механікою. Як тільки запустимо — буде анонс." },
            ],
          },
          {
            id: "guilds-and-titles",
            q: "А «Гільдії» / «Титули»?",
            a: [
              { type: "p", text: "Це теж заплановані механіки для команд (гільдії) і досягнень (титули). Поки що в розробці. Слідкуй за оновленнями." },
            ],
          },
        ],
      },
    ],
  },
};
