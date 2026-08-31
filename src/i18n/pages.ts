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
  | "how-to-play"
  | "scoring-and-rewards"
  | "web3-101"
  | "trust-and-safety";

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
    /** Post-tournament hub framing when WC is no longer the primary campaign. */
    badgeArchive: string;
    landingTitle: string;
    landingSubtitle: string;
    landingSubtitleArchive: string;
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
      /** Post-registration results (score vs official bracket; prizes not claimable yet). */
      resultsEyebrow: string;
      resultsTitle: string;
      resultsScoringLive: string;
      resultsScoringComplete: string;
      resultsPrizesPendingTitle: string;
      resultsPrizesPendingBody: string;
      resultsYourScore: string;
      resultsNoEntry: string;
      resultsConnectHint: string;
      resultsWaitingOfficial: string;
      resultsLoading: string;
      resultsGroups: string;
      resultsThirds: string;
      resultsKnockout: string;
      resultsOfMax: (score: number, max: number) => string;
      resultsDecided: (decided: number, max: number) => string;
      resultsPerfectHit: string;
      resultsViewPrediction: string;
      submittedHintClosed: string;
      prizePayoutsPendingNote: string;
      leaderboard: {
        eyebrow: string;
        title: string;
        subtitle: string;
        backToBracket: string;
        entriesChip: (n: number) => string;
        payoutNoteTitle: string;
        payoutNoteBody: (topFivePool: string) => string;
        partialOfficial: (decided: number, max: number) => string;
        loadError: string;
        empty: string;
        colRank: string;
        colWallet: string;
        colScore: string;
        colPayout: string;
        generatedAt: (when: string) => string;
      };
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
    submitRegister: string;
    submitConfirm: (feeMove: string) => string;
    submitNeedPlayers: (picked: number, max: number) => string;
    submitNeedCaptain: string;
    submitNeedProgress: (picked: number, max: number) => string;
    submitRegistered: string;
    headerTitle: (gw: number) => string;
    pickPlayersHint: string;
    randomSquadBtn: string;
    randomSquadFailed: string;
    maxThreeHint: string;
    entryFeeLabel: string;
    insufficientFundsTitle: string;
    insufficientFundsBody: (entryFeeLabel: string) => string;
    insufficientFundsCancel: string;
    insufficientFundsTopUp: string;
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
    statusLive: string;
    liveMatches: (count: number) => string;
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
    seasonDisplayLabel: string;
    seasonLeague: string;
    pageTitle: string;
    subtitleLead: string;
    subtitleBenefits: string;
    faqInlineLink: string;
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
    ruleStreakHeaderEpl: string;
    ruleStreak: (n: number) => string;
    ruleClaim: string;
    rulesFootnote: string;
    rulesFootnoteEpl: string;
    campaignEarnHint: string;
    expandRules: string;
    collapseRules: string;
    faqLink: string;
    colRank: string;
    colPlayer: string;
    colPoints: string;
    colDelta: string;
    colRegistrations: string;
    colTop10: string;
    colBestRank: string;
    youBadge: string;
    findMe: string;
    connectHint: string;
    heroTotalSp: string;
    xpUnit: string;
    heroRank: string;
    leaguePodium: string;
    leagueEarn: string;
    leagueChase: string;
    leagueField: string;
    chipRegistration: string;
    chipFirstReg: string;
    chipTop10: string;
    chipClaim: string;
    gapToRankAbove: (sp: number) => string;
    variantPickerLabel: string;
    variantStack: string;
    variantRail: string;
    variantStackHook: string;
    variantRailHook: string;
    spZoneLabel: string;
    spZoneBelow: string;
    spToTop10Hint: (sp: number) => string;
    gapToLeader: (sp: number) => string;
    segmentLeader: string;
    awardsTab: string;
    standingsTab: string;
    allStandings: string;
    neighborhoodView: string;
    campaignTag: string;
    milestonesEarned: (earned: number, total: number) => string;
    milestoneFirstReg: string;
    milestoneStreak4: string;
    milestoneTop10: string;
    milestoneGw10: string;
    milestonePodium: string;
    demoBanner: string;
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
    seasonEndedHint: string;
    actionThisGw: (gw: number) => string;
    actionRegisterHook: string;
    actionConnectHook: string;
    actionUpsideRange: (min: number, max: number) => string;
    actionRegisterCta: string;
    actionUpsideReg: string;
    actionUpsideStreak: (n: number) => string;
    actionUpsideStreakOff: string;
    actionUpsideTop10: string;
    actionUpsideClaim: string;
    actionChaseEarnZone: (sp: number) => string;
    actionChaseRankAbove: (sp: number, rank: number) => string;
    actionChaseStreakAlive: (streak: number, bonus: number) => string;
    actionChaseStreakStart: string;
    actionChaseSection: string;
    actionUpsideSection: string;
    chaseToTop10: string;
    chaseToPass: (rank: number) => string;
    chaseStreakBonus: (streak: number) => string;
    railChaseHeader: string;
    railChaseTop10: string;
    railChasePass: (rank: number) => string;
    railChaseStreak: (streak: number) => string;
    railInEarnZone: string;
    railGwUpside: (min: number, max: number) => string;
    railAroundYou: string;
    railSpAhead: (sp: number) => string;
    railSpBehind: (sp: number) => string;
    railParticipation: (played: number, total: number) => string;
    railBestFinish: (rank: number) => string;
    railLastGw: (label: string) => string;
    railLastGwLine: (sp: number, rank: number) => string;
    railNotOnBoard: string;
    railTop10Finishes: (n: number) => string;
    railEarnTitle: string;
    railStreakTitle: string;
    railStreakOneGw: string;
    railStreakNone: string;
    railStreakPerGw: string;
    actionRulesToggle: string;
    pagePrev: string;
    pageNext: string;
    pageOf: (page: number, total: number) => string;
    pageRange: (from: number, to: number, total: number) => string;
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
    modalEyebrow: string;
    modalTitle: string;
    modalDesc: string;
    closeAria: string;
    copyButton: string;
    copyButtonCopied: string;
    copyButtonBusy: string;
    downloadButton: string;
    downloadButtonDone: string;
    downloadButtonBusy: string;
    laterButton: string;
    generating: string;
    desktopHint: string;
    clipboardHint: string;
    registeredShareButton: string;
    registeredShareSubline: string;
    posterCta: string;
    cardHeadline: string;
    cardLocked: string;
    /** v13 classic left rail — under manager nickname */
    cardFantasyLineup: string;
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
  /** Homepage locker tablet — pick list + in-flow rules. */
  lockerPick: {
    playersTitle: string;
    playersSubtitle: string;
    playersFound: (n: number) => string;
    clubLimitBadge: string;
    clubLimitTip: string;
    scoringBtn: string;
    /** Pitch ticker — last finished FPL GW under our scoring rules. */
    lastGwTooltip: string;
    lastGwLabel: (n: number) => string;
    lastGwSampleLabel: string;
    lastGwPartial: (picked: number) => string;
    lastGwPickCaptain: string;
    howToPlayBtn: string;
    scoringTitle: string;
    scoringSubtitle: string;
    goalsByPos: string;
    prizeSplitTitle: string;
    prizeSplitHint: string;
    scoringFaqLink: string;
    howToPlayTitle: string;
    howToPlaySubtitle: string;
    howToPlaySteps: string[];
    chooseCaptainHint: string;
    chooseCaptainBanner: string;
    setCaptainLabel: string;
    removePlayerLabel: string;
    close: string;
    managersLockedIn: (n: number) => string;
    /** Short mobile subtitle under the managers count. */
    managersInHint: string;
    managersLabel: string;
    deadlineLabel: string;
    untilLock: string;
    closingSoon: string;
    registrationClosed: string;
    /** Always-on header job line (desktop). */
    headerJob: string;
    /** Empty pitch only — gone after the first pick. */
    emptyPitchHint: string;
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
    badgeArchive: "Tournament results",
    landingTitle: "Fantasy World Cup",
    landingSubtitle:
      "Build a squad of national-team stars, score from real World Cup matches, and share the on-chain prize pool — round after round, from the group stage to the final.",
    landingSubtitleArchive:
      "The World Cup event is over. Browse round leaderboards, locked squads, and your bracket prediction score. Prize claim opens once the pool is funded.",
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
        `${bonusUsd} USDC if you nail all ${maxScore} places — every group rank, third-place order, and knockout winner. Nobody’s done it yet. Bonus stacks on top of your top-5 prize.`,
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
      submittedHintClosed:
        "No edits. Your score updates against the official bracket — prize claim opens once the pool is funded.",
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
      hubCta: "Bracket results",
      hubTeaser: "See your score vs the official bracket — $500 USDC prizes claim later when funded",
      resultsEyebrow: "Your result",
      resultsTitle: "Bracket score",
      resultsScoringLive: "Scoring against published official results. Remaining knockout ties still update your total.",
      resultsScoringComplete: "Final score against the completed official bracket.",
      resultsPrizesPendingTitle: "Prizes pending",
      resultsPrizesPendingBody:
        "Top-5 and perfect-bracket payouts are not open yet. Claim will unlock when the USDC pool is funded — no action needed for now.",
      resultsYourScore: "Your points",
      resultsNoEntry:
        "No locked prediction on this wallet. Connect the wallet you used before kickoff, or you did not enter.",
      resultsConnectHint: "Connect the wallet you used to lock your prediction to see your score.",
      resultsWaitingOfficial: "Official bracket results are still being published. Check back soon.",
      resultsLoading: "Loading official results…",
      resultsGroups: "Groups",
      resultsThirds: "Best 3rds",
      resultsKnockout: "Knockout",
      resultsOfMax: (score, max) => `${score} of ${max} possible points`,
      resultsDecided: (decided, max) => `${decided}/${max} official places scored so far`,
      resultsPerfectHit: "Perfect bracket",
      resultsViewPrediction: "View your locked picks ↓",
      prizePayoutsPendingNote:
        "Advertised pool stays the same — payouts and claim open after the prize pool is funded.",
      leaderboard: {
        eyebrow: "Bracket Challenge · Tour 10999",
        title: "Official leaderboard",
        subtitle:
          "Movement mainnet entries scored against the published official bracket. Prizes are paid manually to the Movement wallet shown — there is no on-chain claim for this challenge.",
        backToBracket: "← Bracket hub",
        entriesChip: (n) => `${n} locked predictions`,
        payoutNoteTitle: "Off-chain payouts",
        payoutNoteBody: (topFivePool) =>
          `Suggested USDC amounts for manual transfer: top-5 pool ${topFivePool} plus the $300 perfect-bracket bonus if anyone hits all 92 places.`,
        partialOfficial: (decided, max) =>
          `Official bracket is partial (${decided}/${max} places) — scores will shift as more results publish.`,
        loadError: "Could not load the leaderboard file. Run npm run wc:bracket:leaderboard.",
        empty: "No entries in the archive snapshot.",
        colRank: "Rank",
        colWallet: "Movement wallet",
        colScore: "Points",
        colPayout: "Suggested payout",
        generatedAt: (when) => `Generated ${when}`,
      },
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
    submitRegister: "Register",
    submitConfirm: (feeLabel) => `Confirm squad · ${feeLabel}`,
    submitNeedPlayers: (_picked: number, max: number) => `Pick ${max} players`,
    submitNeedCaptain: "Pick your captain",
    submitNeedProgress: (picked: number, max: number) => `${picked}/${max}`,
    submitRegistered: "Registered",
    headerTitle: (gw) => `GW ${gw} · Squad selection`,
    pickPlayersHint: "Pick 11 players. Max 3 from the same club.",
    randomSquadBtn: "Random squad",
    randomSquadFailed: "Could not build a valid squad — try again.",
    maxThreeHint: "Max 3 from the same club",
    entryFeeLabel: "Registration fee",
    insufficientFundsTitle: "Insufficient balance",
    insufficientFundsBody: (entryFeeLabel) => `Need ${entryFeeLabel} to register.`,
    insufficientFundsCancel: "Cancel",
    insufficientFundsTopUp: "Top up",
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
    statusLive: "Live",
    liveMatches: (n) => (n === 1 ? "1 match live" : `${n} matches live`),
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
    footerLine: (gw) => `Real on-chain results · GW ${gw} · Solana`,
  },
  seasonLeaderboard: {
    loading: "Loading season standings…",
    seasonTag: (label) => `Season ${label}`,
    seasonDisplayLabel: "2026/27",
    seasonLeague: "EPL",
    pageTitle: "Season XP",
    subtitleLead:
      "Season Points (SP) are our way of measuring your contribution throughout the season. They reflect your activity, participation, and consistency across FORM8.",
    subtitleBenefits:
      "While SP don't provide any direct benefits today, they'll help us identify and reward the community's most dedicated members whenever new opportunities become available. Read more in the ",
    faqInlineLink: "FAQ",
    resolvedThrough: (from, through) => `Counting resolved gameweeks GW ${from}–${through}`,
    myScore: "Your season score",
    streakLabel: "Best streak",
    rulesTitle: "How SP is earned",
    ruleRegistration: "Squad registered (per GW)",
    ruleFirstReg: "First registration (once)",
    ruleTop10Header: "Top 10 only",
    ruleRank: (n) => `${n}${n === 1 ? "st" : n === 2 ? "nd" : n === 3 ? "rd" : "th"} place`,
    ruleRank4to10: "4th–10th: 100 down to 25",
    ruleStreakHeader: "Registration streak (WC + EPL, per event)",
    ruleStreakHeaderEpl: "Registration streak (per GW)",
    ruleStreak: (n) => `${n}+ GWs in a row`,
    ruleClaim: "Prize claimed",
    rulesFootnote:
      "One season: WC tours then EPL gameweeks. Streak continues across the handoff. Only resolved events count. Ranks 11+ earn no SP.",
    rulesFootnoteEpl:
      "Only resolved EPL gameweeks count. Ranks 11+ earn no placement SP.",
    campaignEarnHint:
      "Earn SP by registering each GW, finishing top 10, keeping a streak, and claiming prizes.",
    expandRules: "Show rules",
    collapseRules: "Hide rules",
    faqLink: "Full rules in FAQ",
    colRank: "Rank",
    colPlayer: "Player",
    colPoints: "XP",
    colDelta: "Gap",
    colRegistrations: "GWs",
    colTop10: "Top",
    colBestRank: "Best",
    youBadge: "you",
    findMe: "Find me",
    connectHint: "Connect wallet to see your season rank and SP.",
    heroTotalSp: "Total XP",
    xpUnit: "XP",
    heroRank: "Rank",
    leaguePodium: "Podium",
    leagueEarn: "Earn zone",
    leagueChase: "Chase pack",
    leagueField: "Field",
    chipRegistration: "Per GW reg",
    chipFirstReg: "First reg",
    chipTop10: "Top 10 finish",
    chipClaim: "Prize claim",
    gapToRankAbove: (sp) => `${sp} SP to rank above`,
    variantPickerLabel: "Season UI · 2 layouts",
    variantStack: "Stack",
    variantRail: "Rail",
    variantStackHook: "Glass table · earn below",
    variantRailHook: "One screen · paged table",
    spZoneLabel: "SP earning zone · top 10",
    spZoneBelow: "Below top 10 — no placement SP",
    spToTop10Hint: (sp) => `${sp} SP to reach the earning zone (top 10)`,
    gapToLeader: (sp) => `${sp} SP behind #1`,
    segmentLeader: "Season leader",
    awardsTab: "Awards",
    standingsTab: "Standings",
    allStandings: "All standings",
    neighborhoodView: "Around you",
    campaignTag: "Season campaign",
    milestonesEarned: (earned, total) => `${earned} of ${total} milestones`,
    milestoneFirstReg: "First reg",
    milestoneStreak4: "4+ streak",
    milestoneTop10: "Top 10",
    milestoneGw10: "10+ GWs",
    milestonePodium: "1st place",
    demoBanner: "Preview — sample season data for layout review",
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
    awaitingFirstEvent: "Season is live — points appear after the first EPL gameweek resolves on-chain.",
    awaitingEpl: (startGw) =>
      `WC phase complete in SP terms — EPL continues the same season from GW ${startGw}.`,
    seasonEndedHint: "This season window is closed. Final standings below.",
    actionThisGw: (gw) => `Next · GW ${gw}`,
    actionRegisterHook: "Register to earn SP this gameweek",
    actionConnectHook: "Connect wallet & register to start earning SP",
    actionUpsideRange: (min, max) => `+${min} SP minimum · up to +${max} SP if you win the GW`,
    actionRegisterCta: "Register squad",
    actionUpsideReg: "Register",
    actionUpsideStreak: (n) => `${n}-GW streak`,
    actionUpsideStreakOff: "Streak bonus",
    actionUpsideTop10: "1st place",
    actionUpsideClaim: "Claim prize",
    actionChaseEarnZone: (sp) => `${sp} SP to enter the top-10 earn zone`,
    actionChaseRankAbove: (sp, rank) => `${sp} SP to pass #${rank}`,
    actionChaseStreakAlive: (streak, bonus) =>
      `${streak}-GW streak active — +${bonus} SP if you register next GW`,
    actionChaseStreakStart: "Register again to start a streak bonus",
    actionChaseSection: "Next targets",
    actionUpsideSection: "If you register",
    chaseToTop10: "to enter the top-10 earn zone",
    chaseToPass: (rank) => `to pass #${rank}`,
    chaseStreakBonus: (streak) => `${streak}-GW streak · register next GW`,
    railChaseHeader: "Chasing",
    railChaseTop10: "Top-10 earn zone",
    railChasePass: (rank) => `Pass #${rank}`,
    railChaseStreak: (streak) => `${streak}-GW streak bonus`,
    railInEarnZone: "In top-10 earn zone",
    railGwUpside: (min, max) => `+${min}–${max} SP this GW`,
    railAroundYou: "Around you",
    railSpAhead: (sp) => `${sp} SP ahead of you`,
    railSpBehind: (sp) => `${sp} SP behind you`,
    railParticipation: (played, total) => `${played} of ${total} GWs played`,
    railBestFinish: (rank) => `best finish #${rank}`,
    railLastGw: (label) => `Last · ${label}`,
    railLastGwLine: (sp, rank) => `+${sp} SP · finished #${rank}`,
    railNotOnBoard: "Register to appear on the season board",
    railTop10Finishes: (n) => (n === 1 ? "1 top-10 finish" : `${n} top-10 finishes`),
    railEarnTitle: "How XP is earned",
    railStreakTitle: "Your streak",
    railStreakOneGw: "Register next GW",
    railStreakNone: "No streak",
    railStreakPerGw: "/ GW",
    actionRulesToggle: "Full XP rules",
    pagePrev: "Prev",
    pageNext: "Next",
    pageOf: (page, total) => `${page} / ${total}`,
    pageRange: (from, to, total) => `${from}–${to} of ${total}`,
  },
  myResult: {
    errConfig: "Could not load config",
    errResultNotFound: "Result not found — the gameweek is not finished yet or you did not register a squad",
    errSquadNotFound: "Squad not found",
    errPlayersLoad: "Could not load players",
    errGeneric: "Something went wrong",
    connectTitle: "Log in",
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
    descWelcome: "Shown instead of your address.",
    fieldLabel: "Nickname",
    placeholder: "Enter nickname",
    later: "Later",
    save: "Save",
  },
  squadShare: {
    modalEyebrow: "Squad locked",
    modalTitle: "Copy squad poster",
    modalDesc: "",
    closeAria: "Close",
    copyButton: "Copy image",
    copyButtonCopied: "Copied",
    copyButtonBusy: "Copying…",
    downloadButton: "Download",
    downloadButtonDone: "Saved",
    downloadButtonBusy: "Saving…",
    laterButton: "Maybe later",
    generating: "Preparing…",
    desktopHint: "Poster saved — attach it to your post.",
    clipboardHint: "Copied — paste into your post (⌘V or Ctrl+V).",
    registeredShareButton: "Share squad",
    registeredShareSubline: "Squad locked",
    posterCta: "Build your squad on FORM8",
    cardHeadline: "Squad Locked",
    cardLocked: "Locked",
    cardFantasyLineup: "my fantasy lineup",
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
      "The Config account could not be read from Solana (network, RPC, or program unavailable). Without this data the admin panel cannot verify access.",
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
    feesSectionTitle: "Squad entry fee (USDC)",
    feesSectionHint:
      "Updates entry_fee on the Config account (USDC micro-units, 6 decimals). The squad page reads this from the same account — redeploying the program alone does not change a live value.",
    feesEntryLabel: (symbol) => `Squad registration (${symbol})`,
    feesSubmit: "Apply fee on-chain",
    feesUpdated: "Entry fee updated on-chain. Refresh the squad page.",
    feesInvalid: "Enter a valid non-negative USDC amount.",
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
    sponsorAmountTooSmall: "Amount rounds to zero in USDC micro-units — enter a larger value.",
    sponsorAlertResolved:
      "This gameweek is already RESOLVED — individual prize amounts are fixed on-chain. Sponsor only works before «Calculate results».",
    sponsorGwNotFound: (id) => `GW ${id} not found on-chain.`,
    sponsorNotOnChain:
      "The deployed program does not expose sponsor_prize_pool. Deploy the current program from this repo to the same program ID. Until then the prize pool only grows from entry fees at the configured %.",
    withdrawSectionTitle: "Withdraw from prize vault",
    withdrawSectionHint: (symbol) =>
      `Moves ${symbol} from the shared prize vault to any address (admin only). Does not change on-chain prize_pool fields or claim flags — leave enough balance for pending claim_prize calls or winners’ claims will fail.`,
    withdrawRecipientLabel: "Recipient address (base58)",
    withdrawAmountLabel: (symbol) => `Amount (${symbol})`,
    withdrawSubmit: "Withdraw from vault",
    withdrawSuccess: (recipient, amountLabel) =>
      `Sent ${amountLabel} from prize vault → ${recipient.slice(0, 6)}…${recipient.slice(-6)}`,
    withdrawInvalidRecipient: "Enter a valid Solana address (base58 pubkey).",
    withdrawInvalidAmount: (symbol) => `Enter a positive ${symbol} amount.`,
    withdrawAmountTooSmall: "Amount rounds to zero in USDC micro-units — enter a larger value.",
    withdrawNotOnChain:
      "The deployed program does not expose withdraw_treasury. Deploy the current program from this repo first.",
    bracketSectionTitle: "World Cup · Bracket Challenge go-live",
    bracketSectionHint:
      "The bracket challenge was never ported from Movement — these steps stay disabled until the instructions ship in the Solana program.",
    bracketAbiLive: "Bracket instructions detected on-chain",
    bracketAbiMissing: "Bracket instructions are not part of the Solana program",
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
    bracketStepPublish: "1. Ship bracket instructions in the Solana program",
    bracketStepCreateGw: "2. Create prize gameweek",
    bracketStepSponsor: "3. Sponsor USDC pool ($500)",
    bracketStepInit: "4. Open bracket challenge",
    bracketCreateGwButton: (gw) => `Create GW ${gw}`,
    bracketSponsorButton: (amountLabel) => `Sponsor ${amountLabel}`,
    bracketInitButton: "Open bracket challenge",
    bracketCloseButton: "Close bracket registration",
    bracketInitSuccess: "Bracket challenge is OPEN. Users can submit at /world-cup/bracket.",
    bracketCloseSuccess: "Bracket registration closed.",
    bracketInitModuleWalletHint:
      "First init must be signed with the program upgrade authority. Connect that wallet in the browser, or use the CLI.",
    bracketNotOnChain:
      "The Solana program has no bracket instructions — the World Cup bracket challenge stays read-only.",
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
    contactBody: "Support on Telegram @movematch · updates on X.",
    contactCta: "Message us on",
    contactHref: "https://t.me/movematch",
    categories: [
      {
        id: "how-to-play",
        title: "How to play",
        blurb: "Squad, fee, deadline — the essentials.",
        items: [
          {
            id: "what-is-movematch",
            q: "What is FORM8 in plain English?",
            a: [
              { type: "p", text: "FORM8 is fantasy football on the English Premier League. Before each gameweek you pick a squad of real EPL players; their real match actions earn you points; the top managers share a USDC prize pool." },
              { type: "p", text: "No betting on match outcomes — it is a skill contest about reading football." },
            ],
          },
          {
            id: "first-steps",
            q: "Where do I start?",
            a: [
              {
                type: "ul",
                items: [
                  "Log in with Google, email, or a Solana wallet (Phantom / Solflare / Jupiter).",
                  "Get USDC for the entry fee (shown on the home screen) plus a little SOL for fees.",
                  "On the home screen pick 11 starters + 3 bench. Max 3 players from the same club.",
                  "Confirm squad and sign. After the deadline your squad is locked.",
                ],
              },
            ],
          },
          {
            id: "entry-cost",
            q: "How much does one gameweek entry cost?",
            a: [
              { type: "p", text: "The exact fee is shown when you register — currently 5 USDC per gameweek. Entry fees fund that round’s prize pool (minus a small technical share)." },
            ],
          },
          {
            id: "max-three-per-club",
            q: "Why a maximum of 3 players from one club?",
            a: [
              { type: "p", text: "To stop everyone stacking one strong side. When you already have 3 from a club, the rest of that club darkens with a LIMIT mark in the player list." },
            ],
          },
          {
            id: "starters-vs-bench",
            q: "What is the difference between starters and bench?",
            a: [
              { type: "p", text: "The 11 starters score immediately. The 3 bench players are auto-subs if a starter does not play in the real match — so their points can replace a zero." },
            ],
          },
          {
            id: "change-squad",
            q: "Can I change my squad after registering?",
            a: [
              { type: "p", text: "Before the deadline — yes (each change is a new transaction). After the deadline the squad is locked on-chain." },
            ],
          },
          {
            id: "when-payout",
            q: "When and how do I get my prize?",
            a: [
              { type: "p", text: "After the round is resolved, a Claim button appears next to your result on the Leaderboard. Sign — USDC lands in your wallet." },
            ],
          },
        ],
      },
      {
        id: "scoring-and-rewards",
        title: "Scoring & prizes",
        blurb: "Points, prize split, Season Points.",
        items: [
          {
            id: "how-scoring-works",
            q: "How are points calculated?",
            a: [
              { type: "p", text: "Useful actions on the pitch become points. Highlights:" },
              {
                type: "ul",
                items: [
                  "Goal — GK +10, DEF +6, MID/FWD +5",
                  "Assist — +3",
                  "Clean sheet (60+ min) — GK/DEF +4, MID +1",
                  "GK saves — +1 per 3 saves; penalty save +5",
                  "Minutes — +1 (1–59) or +2 (60+)",
                  "Match rating bonuses — +1 / +2 / +3 at ≥7.5 / ≥8.0 / ≥9.0; very low rating can cost −1",
                  "Cards, own goal, missed penalty — negative points",
                ],
              },
              { type: "p", text: "Open Scoring on the home pick screen for the full compact table." },
            ],
          },
          {
            id: "how-much-can-i-win",
            q: "How is the prize pool split?",
            a: [
              { type: "p", text: "Prize pool = entry fees for the round (minus a small technical share). Top 10 split it: 1st 30%, 2nd 20%, 3rd 15%, then 8% → 2% down to 10th." },
              { type: "p", text: "Live pool size is on the home pick screen; claim is on the Leaderboard after resolve." },
            ],
          },
          {
            id: "11th-no-prize",
            q: "What if I finish outside the prizes?",
            a: [
              { type: "p", text: "No payout that round — the entry fee stays in the pool winners already split. Next gameweek is a fresh squad and a fresh chance." },
            ],
          },
          {
            id: "season-points",
            q: "What are Season Points (SP)?",
            a: [
              { type: "p", text: "SP is a season-long loyalty score (registrations, top-10 finishes, streaks, claims). It does not change match scoring." },
              { type: "p", text: "Check your SP and ranking on the Season page." },
            ],
          },
        ],
      },
      {
        id: "web3-101",
        title: "Wallet & USDC",
        blurb: "Login, fees, and claiming — without the jargon.",
        items: [
          {
            id: "what-is-wallet",
            q: "What is a crypto wallet and why do I need one?",
            a: [
              { type: "p", text: "A wallet holds your crypto and signs actions on-chain. On FORM8 it is your account: login, entry fee, and prize claim." },
              { type: "p", text: "You can also enter with Google or email — a wallet is still used under the hood for payments." },
            ],
          },
          {
            id: "which-wallet",
            q: "Which wallet do I need?",
            a: [
              { type: "p", text: "Phantom, Solflare, or Jupiter — pick any after Log in. Phantom is the most common: phantom.com (extension or iOS/Android)." },
              { type: "p", text: "Back up your seed phrase offline. Never share it. Lose it and the wallet is gone forever." },
            ],
          },
          {
            id: "what-is-movement",
            q: "What is Solana and what is USDC?",
            a: [
              { type: "p", text: "Solana is the network FORM8 runs on — fast, with tiny fees. USDC is a dollar stablecoin (~$1). Entry fees and prizes are in USDC." },
            ],
          },
          {
            id: "why-claim",
            q: "Why do I need to press “Claim” to receive a prize?",
            a: [
              { type: "p", text: "On-chain payouts need your wallet signature to move USDC. Claim on the Leaderboard when the round is resolved." },
            ],
          },
        ],
      },
      {
        id: "trust-and-safety",
        title: "Trust & safety",
        blurb: "Fair play and what we can (and cannot) do.",
        items: [
          {
            id: "is-it-scam",
            q: "How do I know this is not a scam?",
            a: [
              { type: "p", text: "Squads, pool, points, and payouts are recorded on Solana and verifiable in a public explorer. The admin cannot rewrite your locked squad or silently drain the prize pool." },
            ],
          },
          {
            id: "is-this-gambling",
            q: "Is this gambling?",
            a: [
              { type: "p", text: "It is fantasy sports — a skill contest. Check your local rules to be safe." },
            ],
          },
          {
            id: "what-if-bug",
            q: "What if there is a bug and I lose my entry fee?",
            a: [
              { type: "p", text: "Only play with amounts you are willing to risk. Confirmed bugs in our logic — we refund. Contact: Telegram @movematch." },
            ],
          },
          {
            id: "lost-seed",
            q: "What if I lose my wallet seed phrase?",
            a: [
              { type: "p", text: "FORM8 cannot recover it. Store the seed offline. If it is lost, the wallet and funds are gone." },
            ],
          },
        ],
      },
    ],
  },
  lockerPick: {
    playersTitle: "Players",
    playersSubtitle: "Choose for active position",
    playersFound: (n) => `${n} found`,
    clubLimitBadge: "LIMIT",
    clubLimitTip: "Max 3 per club",
    scoringBtn: "Scoring",
    lastGwTooltip: "What this squad scored last GW.",
    lastGwLabel: (n) => `Last GW ${n}`,
    lastGwSampleLabel: "Sample score",
    lastGwPartial: (picked) => `${picked}/11`,
    lastGwPickCaptain: "Pick C to double",
    howToPlayBtn: "How to play",
    scoringTitle: "Scoring",
    scoringSubtitle: "",
    goalsByPos: "Goals",
    prizeSplitTitle: "Prize split",
    prizeSplitHint: "",
    scoringFaqLink: "FAQ",
    howToPlayTitle: "How to play",
    howToPlaySubtitle: "A squad for this Premier League weekend. Points from real matches.",
    howToPlaySteps: [
      "Pick 11 starters and 3 on the bench",
      "Tap C on a starter — captain scores double",
      "Max 3 players from one club",
      "After the matches, the top 10 split the prize pool",
    ],
    chooseCaptainHint: "Hover a starter · tap C for captain",
    chooseCaptainBanner: "Squad complete — pick your captain for double points",
    setCaptainLabel: "Set as captain",
    removePlayerLabel: "Remove player",
    close: "Close",
    managersLockedIn: (n) => `${n} already locked in`,
    managersInHint: "locked in",
    managersLabel: "Managers",
    deadlineLabel: "Deadline",
    untilLock: "until lock",
    closingSoon: "closing soon",
    registrationClosed: "registration closed",
    headerJob: "11 + 3 bench. Points from this week’s matches.",
    emptyPitchHint: "Tap a + on the pitch, then a player in the list.",
  },
};

export const pagesUk: PagesMessages = {
  languageSwitcherAria: "Мова сайту",
  worldCup: {
    badge: "Чемпіонат світу 2026",
    badgeArchive: "Результати турніру",
    landingTitle: "Фентезі Чемпіонат світу",
    landingSubtitle:
      "Збери склад із зірок збірних, набирай очки з реальних матчів ЧС і ділíть on-chain призовий фонд — раунд за раундом, від групового етапу до фіналу.",
    landingSubtitleArchive:
      "Івент ЧС завершено. Дивись лідерборди турів, зафіксовані склади та скор bracket challenge. Claim призів відкриється після фінансування пулу.",
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
        `+${bonusUsd} USDC, якщо вгадаєш усі ${maxScore} місця — кожну позицію в групах, порядок третіх і переможців плей-оф. Ніхто ще не робив. Бонус додається до призу топ-5.`,
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
      submittedHintClosed:
        "Редагування неможливе. Скор оновлюється за офіційною сіткою — claim призів відкриється, коли буде профінансовано пул.",
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
      hubCta: "Результати прогнозу",
      hubTeaser: "Подивись свій скор проти офіційної сітки — $500 USDC claim пізніше, коли буде пул",
      resultsEyebrow: "Твій результат",
      resultsTitle: "Скор прогнозу",
      resultsScoringLive:
        "Рахуємо за опублікованими офіційними результатами. Решта матчів плей-оф ще оновить твій тотал.",
      resultsScoringComplete: "Фінальний скор проти завершеної офіційної сітки.",
      resultsPrizesPendingTitle: "Призи поки на паузі",
      resultsPrizesPendingBody:
        "Виплати топ-5 і бонусу за ідеальний прогноз ще не відкриті. Claim з’явиться, коли пул USDC буде профінансовано — зараз нічого робити не треба.",
      resultsYourScore: "Твої очки",
      resultsNoEntry:
        "На цьому гаманці немає зафіксованого прогнозу. Підключи той, з якого подавав до старту, або ти не брав участі.",
      resultsConnectHint: "Підключи гаманець, з якого фіксував прогноз, щоб побачити свій скор.",
      resultsWaitingOfficial: "Офіційні результати сітки ще публікуються. Заглянь трохи згодом.",
      resultsLoading: "Завантажуємо офіційні результати…",
      resultsGroups: "Групи",
      resultsThirds: "Кращі 3-ті",
      resultsKnockout: "Плей-оф",
      resultsOfMax: (score, max) => `${score} з ${max} можливих очок`,
      resultsDecided: (decided, max) => `${decided}/${max} офіційних місць уже пораховано`,
      resultsPerfectHit: "Ідеальний прогноз",
      resultsViewPrediction: "Дивитись свій прогноз ↓",
      prizePayoutsPendingNote:
        "Заявлений фонд той самий — виплати й claim відкриються після фінансування пулу.",
      leaderboard: {
        eyebrow: "Прогноз турніру · Тур 10999",
        title: "Офіційний рейтинг",
        subtitle:
          "Заявки з Movement mainnet, оцінені за опублікованою офіційною сіткою. Призи виплачуються вручну на вказаний Movement-гаманець — on-chain claim для цього челенджу немає.",
        backToBracket: "← До прогнозу",
        entriesChip: (n) => `${n} зафіксованих прогнозів`,
        payoutNoteTitle: "Off-chain виплати",
        payoutNoteBody: (topFivePool) =>
          `Рекомендовані суми USDC для ручного переказу: топ-5 ${topFivePool} плюс бонус $300 за ідеальний прогноз, якщо хтось набере усі 92 очки.`,
        partialOfficial: (decided, max) =>
          `Офіційна сітка ще неповна (${decided}/${max} місць) — скор зміниться після нових результатів.`,
        loadError: "Не вдалося завантажити рейтинг. Запусти npm run wc:bracket:leaderboard.",
        empty: "У архівному знімку немає заявок.",
        colRank: "Місце",
        colWallet: "Movement-гаманець",
        colScore: "Очки",
        colPayout: "Реком. виплата",
        generatedAt: (when) => `Згенеровано ${when}`,
      },
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
    submitRegister: "Зареєструвати",
    submitConfirm: (feeLabel) => `Підтвердити склад · ${feeLabel}`,
    submitNeedPlayers: (_picked: number, max: number) => `Обери ${max} гравців`,
    submitNeedCaptain: "Обери капітана",
    submitNeedProgress: (picked: number, max: number) => `${picked}/${max}`,
    submitRegistered: "Зареєстровано",
    headerTitle: (gw) => `Тур ${gw} · Вибір складу`,
    pickPlayersHint: "Обери 11 гравців. Максимум 3 з однієї команди.",
    randomSquadBtn: "Випадковий склад",
    randomSquadFailed: "Не вдалося зібрати склад — спробуй ще раз.",
    maxThreeHint: "Максимум 3 з однієї команди",
    entryFeeLabel: "Вартість реєстрації",
    insufficientFundsTitle: "Недостатньо коштів",
    insufficientFundsBody: (entryFeeLabel) =>
      `Потрібно ${entryFeeLabel} для реєстрації.`,
    insufficientFundsCancel: "Скасувати",
    insufficientFundsTopUp: "Поповнити",
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
    statusLive: "Наживо",
    liveMatches: (n) => {
      const mod10 = n % 10;
      const mod100 = n % 100;
      const word =
        mod10 === 1 && mod100 !== 11
          ? "матч"
          : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)
            ? "матчі"
            : "матчів";
      return `${n} ${word} наживо`;
    },
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
    footerLine: (gw) => `Реальні on-chain результати · Тур ${gw} · Solana`,
  },
  seasonLeaderboard: {
    loading: "Завантаження сезонного рейтингу…",
    seasonTag: (label) => `Сезон ${label}`,
    seasonDisplayLabel: "2026/27",
    seasonLeague: "EPL",
    pageTitle: "Season XP",
    subtitleLead:
      "Season Points (SP) — це наш спосіб виміряти твій внесок протягом сезону. Вони відображають активність, участь і стабільність у FORM8.",
    subtitleBenefits:
      "Сьогодні SP не дають прямих бонусів, але допоможуть нам знаходити й винагороджувати найактивніших учасників, коли з’являться нові можливості. Детальніше в ",
    faqInlineLink: "FAQ",
    resolvedThrough: (from, through) => `Враховано завершені тури GW ${from}–${through}`,
    myScore: "Твій сезонний рахунок",
    streakLabel: "Найкращий стрік",
    rulesTitle: "Як нараховуються SP",
    ruleRegistration: "Реєстрація складу (за тур)",
    ruleFirstReg: "Перша реєстрація (одноразово)",
    ruleTop10Header: "Лише топ-10",
    ruleRank: (n) => `${n}-е місце`,
    ruleRank4to10: "4–10 місце: від 100 до 25",
    ruleStreakHeader: "Стрік реєстрацій (ЧС + EPL, за подію)",
    ruleStreakHeaderEpl: "Стрік реєстрацій (за тур)",
    ruleStreak: (n) => `${n}+ тури поспіль`,
    ruleClaim: "Клейм призу",
    rulesFootnote:
      "Один сезон: тури ЧС, потім EPL. Стрік триває через перехід. Рахуються лише завершені події. 11-е місце і нижче — 0 SP.",
    rulesFootnoteEpl:
      "Рахуються лише завершені тури EPL. З 11-го місця — 0 SP за позицію.",
    campaignEarnHint:
      "SP за реєстрацію кожного туру, топ-10, стрік і клейм призів.",
    expandRules: "Показати правила",
    collapseRules: "Сховати правила",
    faqLink: "Повні правила в FAQ",
    colRank: "Місце",
    colPlayer: "Гравець",
    colPoints: "XP",
    colDelta: "Відстав.",
    colRegistrations: "Тури",
    colTop10: "Топ",
    colBestRank: "Кращ.",
    youBadge: "ти",
    findMe: "Знайти мене",
    connectHint: "Підключи гаманець, щоб бачити свій rank і SP.",
    heroTotalSp: "Усього XP",
    xpUnit: "XP",
    heroRank: "Місце",
    leaguePodium: "Podium",
    leagueEarn: "Earn zone",
    leagueChase: "Chase pack",
    leagueField: "Field",
    chipRegistration: "Реєстр. / тур",
    chipFirstReg: "Перша реєстр.",
    chipTop10: "Топ-10",
    chipClaim: "Клейм",
    gapToRankAbove: (sp) => `${sp} SP до місця вище`,
    variantPickerLabel: "Season UI · 2 layouts",
    variantStack: "Stack",
    variantRail: "Rail",
    variantStackHook: "Glass table · earn below",
    variantRailHook: "Один екран · сторінки",
    spZoneLabel: "Зона SP · топ-10",
    spZoneBelow: "Нижче топ-10 — без SP за місце",
    spToTop10Hint: (sp) => `${sp} SP до зони нарахування (топ-10)`,
    gapToLeader: (sp) => `${sp} SP до #1`,
    segmentLeader: "Лідер сезону",
    awardsTab: "Нагороди",
    standingsTab: "Рейтинг",
    allStandings: "Весь рейтинг",
    neighborhoodView: "Поруч із тобою",
    campaignTag: "Сезонна кампанія",
    milestonesEarned: (earned, total) => `${earned} з ${total} milestone`,
    milestoneFirstReg: "Перша реєстр.",
    milestoneStreak4: "Стрік 4+",
    milestoneTop10: "Топ-10",
    milestoneGw10: "10+ турів",
    milestonePodium: "1-е місце",
    demoBanner: "Прев’ю — умовні дані сезону для макету",
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
    awaitingFirstEvent: "Сезон увімкнено — очки з’являться після першого завершеного туру EPL on-chain.",
    awaitingEpl: (startGw) =>
      `Фаза ЧС у SP завершена — той самий сезон продовжується з EPL, GW ${startGw}.`,
    seasonEndedHint: "Сезонне вікно закрито. Фінальний рейтинг нижче.",
    actionThisGw: (gw) => `Наступний · GW ${gw}`,
    actionRegisterHook: "Зареєструй склад — зароби SP цього туру",
    actionConnectHook: "Підключи гаманець і зареєструй склад",
    actionUpsideRange: (min, max) => `мін. +${min} SP · до +${max} SP якщо виграєш тур`,
    actionRegisterCta: "Зареєструвати склад",
    actionUpsideReg: "Реєстрація",
    actionUpsideStreak: (n) => `Стрік ${n} турів`,
    actionUpsideStreakOff: "Бонус стріку",
    actionUpsideTop10: "1-е місце",
    actionUpsideClaim: "Клейм призу",
    actionChaseEarnZone: (sp) => `${sp} SP до зони нарахування (топ-10)`,
    actionChaseRankAbove: (sp, rank) => `${sp} SP щоб обійти #${rank}`,
    actionChaseStreakAlive: (streak, bonus) =>
      `Стрік ${streak} турів — +${bonus} SP якщо зареєструєшся наступного туру`,
    actionChaseStreakStart: "Зареєструйся знову, щоб запустити бонус стріку",
    actionChaseSection: "Наступні цілі",
    actionUpsideSection: "Якщо зареєструєшся",
    chaseToTop10: "до зони нарахування (топ-10)",
    chaseToPass: (rank) => `щоб обійти #${rank}`,
    chaseStreakBonus: (streak) => `стрік ${streak} турів · зареєструйся наступного туру`,
    railChaseHeader: "Переслідую",
    railChaseTop10: "Зона топ-10",
    railChasePass: (rank) => `Обійти #${rank}`,
    railChaseStreak: (streak) => `Бонус стріку ${streak} турів`,
    railInEarnZone: "У зоні нарахування (топ-10)",
    railGwUpside: (min, max) => `+${min}–${max} SP цього туру`,
    railAroundYou: "Поруч із тобою",
    railSpAhead: (sp) => `${sp} SP попереду`,
    railSpBehind: (sp) => `${sp} SP позаду`,
    railParticipation: (played, total) => `${played} з ${total} турів зіграно`,
    railBestFinish: (rank) => `найкраще #${rank}`,
    railLastGw: (label) => `Останній · ${label}`,
    railLastGwLine: (sp, rank) => `+${sp} SP · фініш #${rank}`,
    railNotOnBoard: "Зареєструй склад, щоб з’явитись у таблиці",
    railTop10Finishes: (n) => (n === 1 ? "1 фініш у топ-10" : `${n} фінішів у топ-10`),
    railEarnTitle: "Як заробити XP",
    railStreakTitle: "Твій стрік",
    railStreakOneGw: "Зареєструй наступний тур",
    railStreakNone: "Без стріку",
    railStreakPerGw: "/ тур",
    actionRulesToggle: "Повні правила XP",
    pagePrev: "Назад",
    pageNext: "Далі",
    pageOf: (page, total) => `${page} / ${total}`,
    pageRange: (from, to, total) => `${from}–${to} з ${total}`,
  },
  myResult: {
    errConfig: "Не вдалось завантажити конфіг",
    errResultNotFound: "Результат не знайдено — тур ще не закритий або ти не реєстрував склад",
    errSquadNotFound: "Склад не знайдено",
    errPlayersLoad: "Не вдалось завантажити гравців",
    errGeneric: "Щось пішло не так",
    connectTitle: "Увійди",
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
    descWelcome: "Замість адреси в таблицях і шапці.",
    fieldLabel: "Нікнейм",
    placeholder: "Введи нікнейм",
    later: "Пізніше",
    save: "Зберегти",
  },
  squadShare: {
    modalEyebrow: "Склад зареєстровано",
    modalTitle: "Копіювати постер",
    modalDesc: "",
    closeAria: "Закрити",
    copyButton: "Копіювати зображення",
    copyButtonCopied: "Скопійовано",
    copyButtonBusy: "Копіюємо…",
    downloadButton: "Завантажити",
    downloadButtonDone: "Збережено",
    downloadButtonBusy: "Зберігаємо…",
    laterButton: "Можливо пізніше",
    generating: "Готуємо…",
    desktopHint: "Постер збережено — прикріпи до поста.",
    clipboardHint: "Скопійовано — встав у пост (⌘V або Ctrl+V).",
    registeredShareButton: "Поділитися",
    registeredShareSubline: "Склад зареєстровано",
    posterCta: "Збери свій склад на FORM8",
    cardHeadline: "Склад зареєстровано",
    cardLocked: "Зареєстровано",
    cardFantasyLineup: "мій фентезі склад",
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
      "Не вдалося прочитати акаунт Config із Solana (мережа, RPC або програма недоступні). Без цих даних адмінка не може перевірити права доступу.",
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
    feesSectionTitle: "Внесок за склад (USDC)",
    feesSectionHint:
      "Оновлює entry_fee в акаунті Config (мікро-одиниці USDC, 6 знаків). Сторінка вибору складу читає це значення з того самого акаунта — сам по собі редеплой програми його не змінює.",
    feesEntryLabel: (symbol) => `Реєстрація складу (${symbol})`,
    feesSubmit: "Застосувати внесок у мережі",
    feesUpdated: "Внесок оновлено on-chain. Онови сторінку вибору складу.",
    feesInvalid: "Введи коректну невід’ємну суму в USDC.",
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
    sponsorGwNotFound: (id) => `Тур ${id} не знайдено on-chain.`,
    sponsorNotOnChain:
      "У задеплоєній програмі немає інструкції sponsor_prize_pool. Задеплой поточну програму з цього репозиторію на той самий program ID. Доки цього немає, призовий пул росте лише з внесків гравців за налаштованим відсотком.",
    withdrawSectionTitle: "Вивести з призового vault",
    withdrawSectionHint: (symbol) =>
      `Переказує ${symbol} зі спільного prize vault на будь-яку адресу (лише адмін). Не змінює on-chain поля prize_pool і не знімає незаклеймлені призи в обліку — лишай у vault достатньо ліквідності під очікувані claim_prize, інакше клейми впадуть через нестачу балансу.`,
    withdrawRecipientLabel: "Адреса отримувача (base58)",
    withdrawAmountLabel: (symbol) => `Сума (${symbol})`,
    withdrawSubmit: "Вивести з vault",
    withdrawSuccess: (recipient, amountLabel) =>
      `З vault відправлено ${amountLabel} → ${recipient.slice(0, 6)}…${recipient.slice(-6)}`,
    withdrawInvalidRecipient: "Введи коректну адресу Solana (base58 pubkey).",
    withdrawInvalidAmount: (symbol) => `Введи додатну суму в ${symbol}.`,
    withdrawAmountTooSmall: "Сума в мікро-одиницях USDC дає нуль — збільш значення.",
    withdrawNotOnChain:
      "У задеплоєній програмі немає інструкції withdraw_treasury. Спочатку задеплой поточну програму з цього репозиторію.",
    bracketSectionTitle: "ЧС · Запуск Bracket Challenge",
    bracketSectionHint:
      "Bracket challenge не переносили з Movement — кроки лишаються вимкненими, доки інструкції не зʼявляться в Solana-програмі.",
    bracketAbiLive: "Bracket-інструкції є on-chain",
    bracketAbiMissing: "Bracket-інструкцій немає в Solana-програмі",
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
    bracketStepPublish: "1. Додати bracket-інструкції у Solana-програму",
    bracketStepCreateGw: "2. Створити prize gameweek",
    bracketStepSponsor: "3. Завести $500 USDC у пул",
    bracketStepInit: "4. Відкрити bracket challenge",
    bracketCreateGwButton: (gw) => `Створити GW ${gw}`,
    bracketSponsorButton: (amountLabel) => `Завести ${amountLabel}`,
    bracketInitButton: "Відкрити bracket challenge",
    bracketCloseButton: "Закрити реєстрацію bracket",
    bracketInitSuccess: "Bracket challenge ВІДКРИТО. Користувачі можуть подавати на /world-cup/bracket.",
    bracketCloseSuccess: "Реєстрацію bracket закрито.",
    bracketInitModuleWalletHint:
      "Перший init має підписати upgrade authority програми. Підключи цей гаманець у браузері або використай CLI.",
    bracketNotOnChain:
      "У Solana-програмі немає bracket-інструкцій — сітка ЧС лишається лише для перегляду.",
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
    searchPlaceholder: "Знайти питання...",
    searchAriaLabel: "Пошук по FAQ",
    expandAll: "Розгорнути все",
    collapseAll: "Згорнути все",
    foundCount: (n) => `${n} ${n === 1 ? "питання" : n < 5 ? "питання" : "питань"}`,
    noResultsTitle: "Нічого не знайдено",
    noResultsHint: "Спробуй інше слово або очисти пошук, щоб переглянути всі категорії.",
    clearSearch: "Очистити пошук",
    backToTop: "Нагору",
    contactTitle: "Залишилось питання?",
    contactBody: "Підтримка в Telegram @movematch · новини в X.",
    contactCta: "Написати в",
    contactHref: "https://t.me/movematch",
    categories: [
      {
        id: "how-to-play",
        title: "Як грати",
        blurb: "Склад, внесок, дедлайн — головне.",
        items: [
          {
            id: "what-is-movematch",
            q: "Що таке FORM8 простими словами?",
            a: [
              { type: "p", text: "FORM8 — фентезі-футбол по Англійській Прем’єр-лізі. Перед туром збираєш склад із реальних гравців АПЛ; їхні дії в матчах дають очки; топ менеджерів ділить призовий фонд у USDC." },
              { type: "p", text: "Це не ставки на результат матчу — це навичка читати футбол." },
            ],
          },
          {
            id: "first-steps",
            q: "З чого почати?",
            a: [
              {
                type: "ul",
                items: [
                  "Увійди через Google, email або Solana-гаманець (Phantom / Solflare / Jupiter).",
                  "Підготуй USDC на внесок (сума на головному екрані) і трохи SOL на комісії.",
                  "На головному екрані обери 11 в основі + 3 запасних. Максимум 3 з однієї команди.",
                  "Підтверди склад і підпиши. Після дедлайну склад заблоковано.",
                ],
              },
            ],
          },
          {
            id: "entry-cost",
            q: "Скільки коштує участь у турі?",
            a: [
              { type: "p", text: "Точна сума видно при реєстрації — зараз 5 USDC за тур. Внески формують призовий фонд туру (мінус невелика технічна частка)." },
            ],
          },
          {
            id: "max-three-per-club",
            q: "Чому максимум 3 гравці з однієї команди?",
            a: [
              { type: "p", text: "Щоб ніхто не зібрав усю сильну сторону. Коли вже є 3 з клубу, інші з нього темніють і мають позначку LIMIT у списку." },
            ],
          },
          {
            id: "starters-vs-bench",
            q: "Чим основа відрізняється від лавки?",
            a: [
              { type: "p", text: "11 стартовиків рахуються одразу. 3 запасних — автозаміна, якщо стартовик не вийшов у реальному матчі." },
            ],
          },
          {
            id: "change-squad",
            q: "Чи можна змінити склад після реєстрації?",
            a: [
              { type: "p", text: "До дедлайну — так (кожна зміна = нова транзакція). Після дедлайну склад заблоковано ончейн." },
            ],
          },
          {
            id: "when-payout",
            q: "Коли і як отримати приз?",
            a: [
              { type: "p", text: "Після резолву туру на Лідерборді з’являється Claim біля твого результату. Підпиши — USDC прийде на гаманець." },
            ],
          },
        ],
      },
      {
        id: "scoring-and-rewards",
        title: "Очки і призи",
        blurb: "Нарахування, розподіл фонду, Season Points.",
        items: [
          {
            id: "how-scoring-works",
            q: "Як нараховуються очки?",
            a: [
              { type: "p", text: "Корисні дії на полі стають очками. Головне:" },
              {
                type: "ul",
                items: [
                  "Гол — ВР +10, ЗАХ +6, ПЗ/НАП +5",
                  "Асист — +3",
                  "Суха пара (60+ хв) — ВР/ЗАХ +4, ПЗ +1",
                  "Сейви ВР — +1 за кожні 3; відбитий пенальті +5",
                  "Хвилини — +1 (1–59) або +2 (60+)",
                  "Рейтинг матчу — +1 / +2 / +3 при ≥7.5 / ≥8.0 / ≥9.0; дуже низький може дати −1",
                  "Картки, автогол, незабитий пенальті — мінус",
                ],
              },
              { type: "p", text: "Повну компактну таблицю відкрий через Scoring на екрані піку." },
            ],
          },
          {
            id: "how-much-can-i-win",
            q: "Як ділиться призовий фонд?",
            a: [
              { type: "p", text: "Фонд = внески туру (мінус невелика технічна частка). Топ-10 ділять: 1 місце 30%, 2 — 20%, 3 — 15%, далі 8% → 2% до 10-го." },
              { type: "p", text: "Живий розмір фонду — на екрані піку; клейм — на Лідерборді після резолву." },
            ],
          },
          {
            id: "11th-no-prize",
            q: "Що якщо я поза призами?",
            a: [
              { type: "p", text: "Виплати немає — внесок лишається в фонді, який уже ділять переможці. Наступний тур — новий склад і новий шанс." },
            ],
          },
          {
            id: "season-points",
            q: "Що таке Season Points (SP)?",
            a: [
              { type: "p", text: "SP — сезонний рахунок активності (реєстрації, топ-10, стріки, клейми). На очки матчу не впливає." },
              { type: "p", text: "Свій SP і місце дивись на сторінці Season." },
            ],
          },
        ],
      },
      {
        id: "web3-101",
        title: "Гаманець і USDC",
        blurb: "Вхід, внесок і клейм — без зайвого жаргону.",
        items: [
          {
            id: "what-is-wallet",
            q: "Що таке криптогаманець і навіщо він?",
            a: [
              { type: "p", text: "Гаманець тримає крипту і підписує дії в мережі. У FORM8 це твій акаунт: логін, внесок і отримання призу." },
              { type: "p", text: "Можна увійти через Google або email — для платежів гаманець усе одно використовується." },
            ],
          },
          {
            id: "which-wallet",
            q: "Який гаманець потрібен?",
            a: [
              { type: "p", text: "Phantom, Solflare або Jupiter — будь-який після Log in. Найпоширеніший — Phantom: phantom.com (розширення або iOS/Android)." },
              { type: "p", text: "Збережи seed-фразу офлайн. Нікому не показуй. Втратив — гаманець зник назавжди." },
            ],
          },
          {
            id: "what-is-movement",
            q: "Що таке Solana і USDC?",
            a: [
              { type: "p", text: "Solana — мережа, на якій працює FORM8: швидко й з мізерними комісіями. USDC — стейблкоїн ≈ $1. Внески й призи — в USDC." },
            ],
          },
          {
            id: "why-claim",
            q: "Чому треба натискати «Claim», щоб отримати приз?",
            a: [
              { type: "p", text: "Ончейн-виплата потребує підпису гаманця, щоб переказати USDC. Claim — на Лідерборді, коли тур резолвлено." },
            ],
          },
        ],
      },
      {
        id: "trust-and-safety",
        title: "Безпека і чесність",
        blurb: "Чесна гра і що ми можемо (і не можемо) зробити.",
        items: [
          {
            id: "is-it-scam",
            q: "Як зрозуміти, що це не шахрайство?",
            a: [
              { type: "p", text: "Склади, фонд, очки й виплати фіксуються в Solana і перевіряються в публічному експлорері. Адмін не може переписати заблокований склад чи тихо забрати фонд." },
            ],
          },
          {
            id: "is-this-gambling",
            q: "Це азартна гра?",
            a: [
              { type: "p", text: "Це фентезі-спорт — гра на навичку. Перевір локальні правила, щоб бути спокійним." },
            ],
          },
          {
            id: "what-if-bug",
            q: "Що якщо баг і я втрачу внесок?",
            a: [
              { type: "p", text: "Грай на суми, які готовий ризикнути. Підтверджений баг у нашій логіці — повертаємо. Контакт: Telegram @movematch." },
            ],
          },
          {
            id: "lost-seed",
            q: "Що якщо втратив seed-фразу?",
            a: [
              { type: "p", text: "FORM8 не відновить її. Зберігай офлайн. Втратив — гаманець і кошти зникли." },
            ],
          },
        ],
      },
    ],
  },
  lockerPick: {
    playersTitle: "Гравці",
    playersSubtitle: "Обери для активної позиції",
    playersFound: (n) => `${n} знайдено`,
    clubLimitBadge: "ЛІМІТ",
    clubLimitTip: "Макс. 3 з клубу",
    scoringBtn: "Очки",
    lastGwTooltip: "Стільки б набрав цей склад минулого GW.",
    lastGwLabel: (n) => `Минулий тур ${n}`,
    lastGwSampleLabel: "Приклад рахунку",
    lastGwPartial: (picked) => `${picked}/11`,
    lastGwPickCaptain: "Обери C — подвоєння",
    howToPlayBtn: "Як грати",
    scoringTitle: "Очки",
    scoringSubtitle: "",
    goalsByPos: "Голи",
    prizeSplitTitle: "Призовий фонд",
    prizeSplitHint: "",
    scoringFaqLink: "FAQ",
    howToPlayTitle: "Як грати",
    howToPlaySubtitle: "Склад на вікенд АПЛ. Очки — з реальних матчів.",
    howToPlaySteps: [
      "Обери 11 в основі і 3 запасних",
      "Натисни C на гравці в основі — капітан дає подвійні очки",
      "Не більше 3 з одного клубу",
      "Після матчів топ-10 ділять призовий фонд",
    ],
    chooseCaptainHint: "Наведи на гравця в основі · C — капітан",
    chooseCaptainBanner: "Склад готовий — обери капітана (подвійні очки)",
    setCaptainLabel: "Зробити капітаном",
    removePlayerLabel: "Прибрати гравця",
    close: "Закрити",
    managersLockedIn: (n) => `${n} уже в грі`,
    managersInHint: "уже в грі",
    managersLabel: "Менеджери",
    deadlineLabel: "Дедлайн",
    untilLock: "до блокування",
    closingSoon: "скоро закриється",
    registrationClosed: "реєстрація закрита",
    headerJob: "11 + 3 у запасі. Очки з матчів цього тура.",
    emptyPitchHint: "Натисни + на полі, потім гравця зі списку.",
  },
};
