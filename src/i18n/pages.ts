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
    fplStripTitle: string;
    fplStripSeeAll: string;
    fplStripLoadError: string;
    fplStripMatchCount: (n: number) => string;
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
    sponsorSectionTitle: string;
    sponsorSectionHint: string;
    sponsorGwLabel: string;
    sponsorAmountLabel: string;
    sponsorSubmit: string;
    sponsorSuccess: (gw: number, amountMove: string) => string;
    sponsorInvalidGw: string;
    sponsorInvalidAmount: string;
    sponsorAmountTooSmall: string;
    sponsorAlertResolved: string;
    sponsorGwNotFound: (id: number) => string;
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
    fplStripTitle: "This round · FPL",
    fplStripSeeAll: "Full schedule →",
    fplStripLoadError: "Could not load the FPL fixture list.",
    fplStripMatchCount: (n) => `${n} matches`,
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
    sponsorSectionTitle: "Add to prize pool (sponsor)",
    sponsorSectionHint:
      "Send MOVE from your admin wallet to the prize vault and increase this gameweek’s on-chain prize pool by the same amount. Prize shares after «Calculate results» are computed from that pool, so do this before resolving the gameweek. Claims pay from the vault — as long as you add funds here, claim will not run out.",
    sponsorGwLabel: "Gameweek ID",
    sponsorAmountLabel: "Amount (MOVE)",
    sponsorSubmit: "Add to prize pool",
    sponsorSuccess: (gw, amountMove) =>
      `Added ${amountMove} MOVE to GW ${gw} prize pool on-chain. If results are not calculated yet, the extra amount will be included in payouts.`,
    sponsorInvalidGw: "Enter a valid gameweek number (integer ≥ 1).",
    sponsorInvalidAmount: "Enter a positive MOVE amount.",
    sponsorAmountTooSmall: "Amount rounds to zero in octas — enter a larger value.",
    sponsorAlertResolved:
      "This gameweek is already RESOLVED — individual prize amounts are fixed on-chain. Sponsor only works before «Calculate results».",
    sponsorGwNotFound: (id) => `GW ${id} not found in the contract.`,
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
      "If something is unclear or you found a bug — drop us a DM on X (Twitter). We answer fast and prefer real conversations to ticket queues.",
    contactCta: "Message us on",
    contactHref: "https://x.com/MoveMatchxyz",
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
                  "The top 10 managers of the gameweek share a prize pool, paid in MOVE crypto.",
                ],
              },
              { type: "p", text: "No betting on match outcomes — it is a skill contest about reading football, not a lottery." },
            ],
          },
          {
            id: "is-it-free",
            q: "Is it free to play?",
            a: [
              { type: "p", text: "No. Registering a squad costs a small entry fee in MOVE (the exact amount is shown on the Squad page)." },
              { type: "p", text: "All entry fees from all players go into that gameweek’s prize pool, and winners are paid from it." },
              { type: "p", text: "A small technical share is withheld to support and keep the project running." },
            ],
          },
          {
            id: "can-i-actually-win",
            q: "Can I really win something?",
            a: [
              { type: "p", text: "Yes. If your squad finishes in the top 10 by points, you automatically receive a share of the prize pool in MOVE on your wallet." },
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
            q: "What is a clean sheet, an assist, a hat-trick, BPS?",
            a: [
              {
                type: "ul",
                items: [
                  "Clean sheet — the team didn’t concede a goal during the match. Bonus for goalkeepers and defenders.",
                  "Assist — the pass that leads directly to a goal. Valuable for forwards and midfielders.",
                  "Hat-trick — three goals scored by the same player in one match. Rare, so it gets its own bonus.",
                  "BPS (Bonus Points System) — the official EPL scoring of useful match actions (tackles, passes, shots on target). Top performers get an extra bonus.",
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
              { type: "p", text: "MOVEMATCH works with the Nightly wallet. Get it from the official site nightly.app — there is a Chrome extension and a phone app (iOS / Android)." },
              {
                type: "ul",
                items: [
                  "Create a new wallet inside the app.",
                  "Write down the seed phrase (12–24 words) on paper and store it somewhere safe.",
                  "Never share your seed phrase with anyone — it is full access to your wallet.",
                  "Lose the seed and tell no one — wallet is gone forever. Write it and share it — funds will be stolen.",
                ],
              },
            ],
          },
          {
            id: "what-is-movement",
            q: "What is Movement and what is MOVE?",
            a: [
              { type: "p", text: "Movement is a blockchain network (think of it like the internet, but for crypto)." },
              { type: "p", text: "MOVE is its native coin, like the dollar in the US. On MOVEMATCH you pay entry fees and receive prizes in MOVE." },
            ],
          },
          {
            id: "how-to-get-move",
            q: "How do I get MOVE to start playing?",
            a: [
              {
                type: "ul",
                items: [
                  "Sign up at a crypto exchange (e.g. MEXC, Gate.io, KuCoin).",
                  "Top up your account with a card or with other crypto.",
                  "Buy MOVE.",
                  "Withdraw MOVE to your Nightly wallet address — make sure you pick the Movement network!",
                  "Once MOVE arrives in your wallet (a few minutes), open MOVEMATCH and register your squad.",
                ],
              },
            ],
          },
          {
            id: "is-connecting-safe",
            q: "Is it safe to connect my wallet to the site?",
            a: [
              { type: "p", text: "Yes. “Connect wallet” is not “hand over the keys.” The site only sees your public address and asks for your signature on each specific action (register a squad, claim a prize)." },
              { type: "p", text: "You always sign inside the Nightly window. The site never sees your seed phrase or private key, and cannot move a single MOVE without your explicit signature." },
              { type: "p", text: "Simple rule of thumb: always check the URL — only use the official MOVEMATCH address." },
            ],
          },
          {
            id: "what-is-smart-contract",
            q: "What is a smart contract and why does it matter?",
            a: [
              { type: "p", text: "A smart contract is a program that runs automatically on a blockchain with no middlemen. Its code is open and cannot be silently changed." },
              { type: "p", text: "On MOVEMATCH the contract handles taking your entry fee into the pool, locking your squad so even the developers cannot tamper with it, and paying out the top 10." },
              { type: "p", text: "Everything is auditable — you can verify in a public block explorer exactly what happened to your MOVE." },
            ],
          },
          {
            id: "why-claim",
            q: "Why do I need to press “Claim” to receive a prize?",
            a: [
              { type: "p", text: "It is how blockchains work — the prize doesn’t arrive automatically. Your wallet must sign a separate transaction that moves MOVE from the contract to your address." },
              { type: "p", text: "On the Leaderboard a Claim button appears next to your result. Press it → sign in Nightly → MOVE lands on your wallet. You can do this whenever you want." },
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
                  "1. Install Nightly from nightly.app.",
                  "2. Create a wallet and back up the seed phrase on paper.",
                  "3. Buy a small amount of MOVE on an exchange (e.g. MEXC) and withdraw it to your Movement address.",
                  "4. On MOVEMATCH press “Connect wallet” and pick Nightly.",
                  "5. Open the Squad page and pick 11 starters + 3 bench players.",
                  "6. Press “Confirm squad” and sign the transaction in Nightly.",
                  "7. Wait for kickoff — points are tallied automatically from there.",
                ],
              },
            ],
          },
          {
            id: "entry-cost",
            q: "How much does one gameweek entry cost?",
            a: [
              { type: "p", text: "The exact entry fee is shown on the Squad page (line “Registration fee”). It is a small MOVE amount — usually a few dollars worth is enough to try the game." },
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
              { type: "p", text: "Once the round is published as Resolved (usually within a day), a Claim button appears next to your result on the Leaderboard. Press it — and MOVE lands on your wallet." },
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
                  "High match rating — bonus",
                  "BPS (player of the match) — separate bonus",
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
            q: "How do I cash out MOVE back to normal money?",
            a: [
              { type: "p", text: "Through the same exchange you used to buy. Send MOVE from your wallet to your exchange account, sell for USDT/USDC or fiat, and withdraw to your bank card." },
              { type: "p", text: "Technically 2–3 transactions. The whole loop usually takes 15–30 minutes." },
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
              { type: "p", text: "If a bug in our logic is confirmed — we refund. Bug reports and questions: write to us via the social links." },
            ],
          },
          {
            id: "lost-seed",
            q: "What if I lose my Nightly seed phrase?",
            a: [
              { type: "p", text: "MOVEMATCH cannot help here. Your wallet is yours, and the seed phrase is the only way to recover it. Neither Nightly nor MOVEMATCH have access to it." },
              { type: "p", text: "If the seed is lost, the wallet (and any MOVE in it) is lost forever. Always store the seed offline, on paper, somewhere safe." },
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
    fplStripTitle: "Поточний тур · FPL",
    fplStripSeeAll: "Усі матчі →",
    fplStripLoadError: "Не вдалося завантажити розклад FPL.",
    fplStripMatchCount: (n) => `${n} матчів`,
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
    sponsorSectionTitle: "Додати в призовий пул (спонсор)",
    sponsorSectionHint:
      "Перерахуй MOVE з гаманця адміна в prize vault — on-chain поле призового фонду цього туру збільшиться на ту саму суму. Частки призів після «Calculate results» рахуються з цього фонду, тож роби це до резолву туру. Клейм платить з vault — якщо сума тут узгоджена з пулом, при клеймі не «не вистачить» коштів.",
    sponsorGwLabel: "Номер туру (GW)",
    sponsorAmountLabel: "Сума (MOVE)",
    sponsorSubmit: "Додати в пул",
    sponsorSuccess: (gw, amountMove) =>
      `On-chain додано ${amountMove} MOVE до призового пулу GW ${gw}. Якщо результати ще не пораховані — ця сума піде в виплати.`,
    sponsorInvalidGw: "Введи коректний номер туру (ціле число ≥ 1).",
    sponsorInvalidAmount: "Введи додатну суму в MOVE.",
    sponsorAmountTooSmall: "Сума в найменших одиницях дає нуль — збільш значення.",
    sponsorAlertResolved:
      "Цей тур уже RESOLVED — індивідуальні призи зафіксовані в контракті. Спонсор лише до кроку «Calculate results».",
    sponsorGwNotFound: (id) => `Тур ${id} не знайдено в контракті.`,
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
      "Якщо щось незрозуміло або знайшов баг — пиши нам у DM на X (Twitter). Відповідаємо швидко й любимо живі розмови, а не тікети.",
    contactCta: "Написати нам в",
    contactHref: "https://x.com/MoveMatchxyz",
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
                  "Топ-10 менеджерів за очками ділять призовий фонд у криптовалюті MOVE.",
                ],
              },
              { type: "p", text: "Жодних ставок на матчі — це змагання за вміння аналізувати футбол, а не лотерея." },
            ],
          },
          {
            id: "is-it-free",
            q: "Це безкоштовно?",
            a: [
              { type: "p", text: "Ні. Щоб зареєструвати склад, треба сплатити невеликий внесок у MOVE (точна сума завжди видно на сторінці «Склад»)." },
              { type: "p", text: "Усі внески всіх учасників складаються в призовий фонд цього туру — виплати переможцям виходять із нього." },
              { type: "p", text: "З фонду утримується невелика технічна частка на підтримку й існування проєкту." },
            ],
          },
          {
            id: "can-i-actually-win",
            q: "Чи я справді можу щось виграти?",
            a: [
              { type: "p", text: "Так. Якщо твій склад потрапляє в топ-10 за очками, тобі автоматично нараховується частка призового фонду в токенах MOVE — їх потім можна забрати на свій гаманець." },
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
            q: "Що таке «суха пара», «асист», «хет-трик», «BPS»?",
            a: [
              {
                type: "ul",
                items: [
                  "Суха пара (clean sheet) — команда не пропустила жодного гола за матч. Бонус для воротарів і захисників.",
                  "Асист — пас, після якого партнер забив. Цінна дія для нападників і півзахисників.",
                  "Хет-трик — три голи в одному матчі від одного гравця. Рідкість, тому окремий бонус.",
                  "BPS (Bonus Points System) — офіційний рейтинг АПЛ за корисні дії в матчі. Найкращим гравцям дається додатковий бонус.",
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
              { type: "p", text: "MOVEMATCH працює з гаманцем Nightly. Скачай його з офіційного сайту nightly.app — є розширення для Chrome і застосунок для телефону (iOS / Android)." },
              {
                type: "ul",
                items: [
                  "Створи новий гаманець у застосунку.",
                  "Обов'язково запиши seed-фразу (12-24 слова) на папері й сховай у безпечному місці.",
                  "Ніколи нікому не давай seed-фразу — це повний доступ до твого гаманця.",
                  "Втратиш seed і нікому не дав — гаманець відновити неможливо. Запишеш і поділишся з кимось — гроші вкрадуть.",
                ],
              },
            ],
          },
          {
            id: "what-is-movement",
            q: "Що таке Movement і MOVE?",
            a: [
              { type: "p", text: "Movement — це блокчейн-мережа (як інтернет, тільки для криптовалют)." },
              { type: "p", text: "MOVE — основна «монета» цієї мережі, як гривня в Україні чи долар у США. На MOVEMATCH ти платиш внески і отримуєш виграш у MOVE." },
            ],
          },
          {
            id: "how-to-get-move",
            q: "Як отримати MOVE, щоб зіграти?",
            a: [
              {
                type: "ul",
                items: [
                  "Зареєструйся на криптобіржі (наприклад MEXC, Gate.io, KuCoin).",
                  "Поповни рахунок з банківської карти або криптою.",
                  "Купи MOVE.",
                  "Виведи MOVE на адресу свого Nightly-гаманця — ВАЖЛИВО обрати мережу Movement.",
                  "Коли MOVE дійшли в гаманець (зазвичай кілька хвилин) — заходь на MOVEMATCH і реєструй склад.",
                ],
              },
            ],
          },
          {
            id: "is-connecting-safe",
            q: "Чи безпечно підключати гаманець до сайту?",
            a: [
              { type: "p", text: "Так. «Підключити гаманець» — це не «віддати ключі». Сайт лише бачить твою публічну адресу і кожного разу окремо просить твого підпису на конкретну дію (зареєструвати склад, забрати приз)." },
              { type: "p", text: "Підпис ти даєш сам у вікні Nightly. Сайт ніколи не отримує seed-фразу або приватний ключ і без твого явного підпису не може витратити жодного MOVE." },
              { type: "p", text: "Просте правило: перевіряй URL — заходь лише на офіційну адресу MOVEMATCH." },
            ],
          },
          {
            id: "what-is-smart-contract",
            q: "Що таке смарт-контракт і чому це важливо?",
            a: [
              { type: "p", text: "Смарт-контракт — це програма, яка автоматично виконується в блокчейні без посередників. Її код відкритий і його не можна непомітно змінити." },
              { type: "p", text: "У MOVEMATCH контракт відповідає за: прийом твого внеску у фонд, фіксацію складу так, що ніхто (навіть розробники) не зможе його підмінити, і виплату призів топ-10." },
              { type: "p", text: "Тому все відкрито — ти можеш сам перевірити в блокчейн-експлорері, що саме сталося з твоїми MOVE." },
            ],
          },
          {
            id: "why-claim",
            q: "Чому я маю натискати «Claim», щоб забрати виграш?",
            a: [
              { type: "p", text: "Це особливість блокчейна — приз не приходить автоматично. Гаманець мусить підписати окрему транзакцію на перерахунок MOVE з контракту на твою адресу." },
              { type: "p", text: "На сторінці «Лідерборд» поряд з твоїм результатом з'явиться кнопка «Claim». Натискаєш → підписуєш у Nightly → MOVE падає на гаманець. Зробити це можна в будь-який зручний момент." },
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
                  "1. Встанови гаманець Nightly з nightly.app.",
                  "2. Створи акаунт у Nightly і збережи seed-фразу на папері.",
                  "3. Купи трохи MOVE на біржі (наприклад MEXC) і виведи на свою Movement-адресу.",
                  "4. На MOVEMATCH натисни «Підключити гаманець», обери Nightly.",
                  "5. Зайди на сторінку «Склад», вибери 11 основних + 3 запасних.",
                  "6. Натисни «Підтвердити склад» і підпиши транзакцію в Nightly.",
                  "7. Чекай початку туру — далі все рахується автоматично.",
                ],
              },
            ],
          },
          {
            id: "entry-cost",
            q: "Скільки коштує вхід в один тур?",
            a: [
              { type: "p", text: "Конкретний внесок видно на сторінці «Склад» (рядок «Вартість реєстрації»). Це невелика сума в MOVE — для пробного входу зазвичай досить кількох доларів еквіваленту." },
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
              { type: "p", text: "Як тільки тур опубліковано як Resolved (зазвичай протягом доби), на сторінці «Лідерборд» поряд з твоїм результатом з'являється кнопка «Claim». Натискаєш — і MOVE приходить на гаманець." },
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
                  "Високий рейтинг матчу — бонус",
                  "BPS (player of the match) — окремий бонус",
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
            q: "Як вивести MOVE назад у звичайні гроші?",
            a: [
              { type: "p", text: "Через ту ж біржу, що ти використовував для покупки. Переказуєш MOVE з гаманця на свій акаунт біржі, продаєш за USDT/USDC або за фіат, і виводиш на банківську карту." },
              { type: "p", text: "Технічно це 2-3 транзакції. На все треба ~15-30 хвилин." },
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
              { type: "p", text: "У разі підтвердженого бага в нашій логіці контракту — повертаємо. Скарги і питання — пиши через посилання у соцмережі." },
            ],
          },
          {
            id: "lost-seed",
            q: "А якщо я втратив seed-фразу від Nightly?",
            a: [
              { type: "p", text: "MOVEMATCH тут нічим не допоможе. Гаманець належить тобі, і твоя seed-фраза — єдиний спосіб його відновити. Ні Nightly, ні MOVEMATCH не мають доступу до неї." },
              { type: "p", text: "Якщо seed утрачено — гаманець (і MOVE на ньому) втрачено назавжди. Тому seed зберігай оффлайн на папері в безпечному місці." },
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
