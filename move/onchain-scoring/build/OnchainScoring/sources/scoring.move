/// Pure scoring logic — must stay in sync with `src/lib/scoring.ts` (`calculateFantasyPoints`).
/// Integrate into your `fantasy_epl` module: call `player_gameweek_points` from `calculate_results`
/// after loading each starter’s stats. Extend `submit_player_stats` / stored `PlayerStats` with
/// `fpl_bonus: u8` and `goals_conceded: u64` (and persist `fpl_clean_sheet: bool` for MID +1 CS).
module onchain_scoring::scoring {
    /// position: 0 GK, 1 DEF, 2 MID, 3 FWD
    public fun player_gameweek_points(
        position: u8,
        minutes_played: u64,
        goals: u64,
        assists: u64,
        clean_sheet: bool,
        saves: u64,
        penalties_saved: u64,
        penalties_missed: u64,
        own_goals: u64,
        yellow_cards: u64,
        red_cards: u64,
        fpl_bonus: u8,
        goals_conceded: u64,
        fpl_clean_sheet: bool,
    ): u64 {
        let pts = minute_points(minutes_played);
        let pts = pts + goal_points(position, goals);
        let pts = if (goals >= 3) {
            pts + 3
        } else {
            pts
        };
        let pts = pts + assists * 3;
        let has_cs = clean_sheet || fpl_clean_sheet;
        let pts = if (minutes_played >= 60 && has_cs) {
            if (position <= 1) {
                pts + 4
            } else if (position == 2) {
                pts + 1
            } else {
                pts
            }
        } else {
            pts
        };
        let pts = if (position == 0) {
            pts + saves / 3
        } else {
            pts
        };
        let pts = pts + penalties_saved * 5;
        let pts = if (position <= 1 && goals_conceded > 0) {
            pts - goals_conceded / 2
        } else {
            pts
        };
        let bonus_u64 = (fpl_bonus as u64);
        let capped = if (bonus_u64 > 3) {
            3
        } else {
            bonus_u64
        };
        let pts = pts + capped;
        let deductions =
            penalties_missed * 2 + own_goals * 2 + yellow_cards + red_cards * 3;
        if (pts >= deductions) {
            pts - deductions
        } else {
            0
        }
    }

    fun minute_points(minutes_played: u64): u64 {
        if (minutes_played >= 60) {
            2
        } else if (minutes_played >= 1) {
            1
        } else {
            0
        }
    }

    fun goal_points(position: u8, goals: u64): u64 {
        if (goals == 0) {
            return 0
        };
        let per = if (position == 0) {
            10
        } else if (position == 1) {
            6
        } else {
            5
        };
        goals * per
    }

    #[test]
    fun test_gibbs_white_hat_trick() {
        // MID, 88 min, 3 goals, bonus 3, no CS flag for MID from chain, no fpl cs
        let p = player_gameweek_points(
            2,
            88,
            3,
            0,
            false,
            0,
            0,
            0,
            0,
            0,
            0,
            3,
            1,
            false,
        );
        assert!(p == 23, 1);
    }

    #[test]
    fun test_darlow_gk() {
        // 180 min +2, CS +4, 6 saves +2, gc 2 -> -1  => 7
        let p = player_gameweek_points(
            0,
            180,
            0,
            0,
            true,
            6,
            0,
            0,
            0,
            0,
            0,
            0,
            2,
            true,
        );
        assert!(p == 7, 2);
    }
}
