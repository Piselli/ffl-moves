use anchor_lang::prelude::*;
use anchor_spl::{
    associated_token::AssociatedToken,
    token_interface::{transfer_checked, Mint, TokenAccount, TokenInterface, TransferChecked},
};
use solana_keccak_hasher::hashv;

declare_id!("A8UiSCd5yzhpZZwmop6k5upLVxUhDZq3x9pq7SfwoKN5");

const MAX_ADMINS: usize = 5;
const TEAM_SIZE: usize = 14;
const STARTERS: usize = 11;
const MAX_URI_BYTES: usize = 200;
const OPEN: u8 = 0;
const CLOSED: u8 = 1;
const RESOLVED: u8 = 3;

/// Same encoding as `fantasy_epl.move` and `src/lib/fplSquadResolve.ts`, so stored
/// positions can be fed to the TypeScript scoring modules without translation.
const POSITION_GK: u8 = 0;
const POSITION_DEF: u8 = 1;
const POSITION_MID: u8 = 2;
const POSITION_FWD: u8 = 3;

/// Longest accepted Merkle path — 2^32 leaves, far beyond any realistic gameweek.
const MAX_PROOF_LEN: usize = 32;
/// Domain tags keep leaf pre-images and internal-node pre-images disjoint.
const LEAF_DOMAIN: u8 = 0x00;
const NODE_DOMAIN: u8 = 0x01;

/// The only key allowed to bootstrap `Config`. Without this the PDA is a land grab:
/// whoever calls `initialize` first becomes admin, oracle and house.
/// Set this to the operating multisig and rebuild before any mainnet deploy.
const INITIALIZER: Pubkey = pubkey!("CJKNFKKfvvYotke7EjYbKNAP1YWy8f4DBcxRFna1no57");

#[program]
pub mod movematch {
    use super::*;

    pub fn initialize(
        ctx: Context<Initialize>,
        entry_fee: u64,
        prize_pool_bps: u16,
        oracle: Pubkey,
        house_wallet: Pubkey,
    ) -> Result<()> {
        require!(prize_pool_bps <= 10_000, ErrorCode::InvalidBasisPoints);
        require!(oracle != Pubkey::default(), ErrorCode::InvalidOracle);
        require!(
            house_wallet != Pubkey::default(),
            ErrorCode::InvalidHouseWallet
        );
        let config = &mut ctx.accounts.config;
        config.admins = [Pubkey::default(); MAX_ADMINS];
        config.admins[0] = ctx.accounts.authority.key();
        config.admin_count = 1;
        config.oracle = oracle;
        config.usdc_mint = ctx.accounts.usdc_mint.key();
        config.house_wallet = house_wallet;
        config.entry_fee = entry_fee;
        config.prize_pool_bps = prize_pool_bps;
        config.current_gameweek = 0;
        config.paused = false;
        config.version = 1;
        config.total_prize_obligation = 0;
        config.treasury_bump = ctx.bumps.treasury;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    pub fn set_oracle(ctx: Context<Admin>, oracle: Pubkey) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        require!(oracle != Pubkey::default(), ErrorCode::InvalidOracle);
        ctx.accounts.config.oracle = oracle;
        Ok(())
    }

    pub fn set_fees(ctx: Context<Admin>, entry_fee: u64) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        ctx.accounts.config.entry_fee = entry_fee;
        Ok(())
    }

    pub fn set_prize_pool_bps(ctx: Context<Admin>, prize_pool_bps: u16) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        require!(prize_pool_bps <= 10_000, ErrorCode::InvalidBasisPoints);
        ctx.accounts.config.prize_pool_bps = prize_pool_bps;
        Ok(())
    }

    pub fn set_paused(ctx: Context<Admin>, paused: bool) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        ctx.accounts.config.paused = paused;
        Ok(())
    }

    pub fn add_admin(ctx: Context<Admin>, new_admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require_admin(config, &ctx.accounts.admin.key())?;
        require!(new_admin != Pubkey::default(), ErrorCode::InvalidAdmin);
        require!(!is_admin(config, &new_admin), ErrorCode::AdminAlreadyExists);
        let slot = config
            .admins
            .iter()
            .position(|key| *key == Pubkey::default())
            .ok_or(error!(ErrorCode::AdminCapacityReached))?;
        config.admins[slot] = new_admin;
        config.admin_count = config
            .admin_count
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn remove_admin(ctx: Context<Admin>, old_admin: Pubkey) -> Result<()> {
        let config = &mut ctx.accounts.config;
        require_admin(config, &ctx.accounts.admin.key())?;
        require!(config.admin_count > 1, ErrorCode::CannotRemoveLastAdmin);
        let slot = config
            .admins
            .iter()
            .position(|key| *key == old_admin)
            .ok_or(error!(ErrorCode::AdminNotFound))?;
        config.admins[slot] = Pubkey::default();
        config.admin_count = config
            .admin_count
            .checked_sub(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn create_gameweek(ctx: Context<CreateGameweek>, gameweek_id: u32) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        let config = &mut ctx.accounts.config;
        require!(gameweek_id != 0, ErrorCode::InvalidGameweekId);
        let gameweek = &mut ctx.accounts.gameweek;
        gameweek.id = gameweek_id;
        gameweek.status = OPEN;
        gameweek.prize_pool = 0;
        gameweek.total_entries = 0;
        gameweek.results_root = [0; 32];
        gameweek.prize_allocated = 0;
        gameweek.prize_claimed = 0;
        gameweek.bump = ctx.bumps.gameweek;
        // Ids are not sequential: World Cup tours live at 10001+ while EPL keeps 1..38.
        // Re-creation is already impossible because the PDA is `init`.
        if gameweek_id > config.current_gameweek {
            config.current_gameweek = gameweek_id;
        }
        Ok(())
    }

    pub fn close_gameweek(ctx: Context<ManageGameweek>) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        require!(
            ctx.accounts.gameweek.status == OPEN,
            ErrorCode::GameweekNotOpen
        );
        ctx.accounts.gameweek.status = CLOSED;
        Ok(())
    }

    pub fn reopen_gameweek(ctx: Context<ManageGameweek>) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        let gameweek = &mut ctx.accounts.gameweek;
        require!(
            gameweek.status == CLOSED || gameweek.status == RESOLVED,
            ErrorCode::InvalidGameweekStatus
        );
        require!(
            gameweek.prize_claimed == 0,
            ErrorCode::GameweekAlreadyClaimed
        );
        gameweek.status = OPEN;
        gameweek.results_root = [0; 32];
        gameweek.prize_allocated = 0;
        Ok(())
    }

    pub fn register_team(
        ctx: Context<RegisterTeam>,
        gameweek_id: u32,
        player_ids: [u32; TEAM_SIZE],
        positions: [u8; TEAM_SIZE],
        clubs: [u16; TEAM_SIZE],
        captain_index: u8,
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        let gameweek = &ctx.accounts.gameweek;
        require!(!config.paused, ErrorCode::ProgramPaused);
        require!(gameweek.status == OPEN, ErrorCode::GameweekNotOpen);
        validate_team(&player_ids, &positions, &clubs)?;
        require!(
            (captain_index as usize) < STARTERS,
            ErrorCode::InvalidCaptain
        );

        let prize_leg = config
            .entry_fee
            .checked_mul(config.prize_pool_bps as u64)
            .ok_or(ErrorCode::ArithmeticOverflow)?
            .checked_div(10_000)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        let house_leg = config
            .entry_fee
            .checked_sub(prize_leg)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        transfer_from_owner(
            &ctx.accounts.token_program,
            &ctx.accounts.owner_ata,
            &ctx.accounts.treasury_ata,
            &ctx.accounts.owner,
            &ctx.accounts.usdc_mint,
            prize_leg,
        )?;
        transfer_from_owner(
            &ctx.accounts.token_program,
            &ctx.accounts.owner_ata,
            &ctx.accounts.house_ata,
            &ctx.accounts.owner,
            &ctx.accounts.usdc_mint,
            house_leg,
        )?;

        let entry = &mut ctx.accounts.entry;
        entry.owner = ctx.accounts.owner.key();
        entry.gameweek_id = gameweek_id;
        entry.player_ids = player_ids;
        entry.positions = positions;
        entry.clubs = clubs;
        entry.captain_index = captain_index;
        entry.fee_paid = config.entry_fee;
        // Persisted because `set_prize_pool_bps` may move before this entry is refunded.
        entry.prize_contribution = prize_leg;
        entry.created_at = Clock::get()?.unix_timestamp;
        entry.bump = ctx.bumps.entry;

        let gameweek = &mut ctx.accounts.gameweek;
        gameweek.prize_pool = gameweek
            .prize_pool
            .checked_add(prize_leg)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        gameweek.total_entries = gameweek
            .total_entries
            .checked_add(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        let config = &mut ctx.accounts.config;
        config.total_prize_obligation = config
            .total_prize_obligation
            .checked_add(prize_leg)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        emit!(TeamRegistered {
            gameweek_id,
            owner: ctx.accounts.owner.key(),
            fee_paid: config.entry_fee,
            prize_contribution: prize_leg,
        });
        Ok(())
    }

    pub fn close_entry(ctx: Context<CloseEntry>, gameweek_id: u32) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        let gameweek = &ctx.accounts.gameweek;
        require!(
            gameweek.status == OPEN || gameweek.status == CLOSED,
            ErrorCode::EntryCannotBeClosed
        );
        let fee = ctx.accounts.entry.fee_paid;
        let config = &ctx.accounts.config;
        // Refund the split as it was actually booked, not as the current bps would compute it.
        let prize_leg = ctx.accounts.entry.prize_contribution;
        let house_leg = fee
            .checked_sub(prize_leg)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        require!(
            ctx.accounts.house_ata.amount >= house_leg,
            ErrorCode::HouseBalanceInsufficient
        );
        transfer_from_treasury(
            &ctx.accounts.token_program,
            &ctx.accounts.treasury_ata,
            &ctx.accounts.owner_ata,
            &ctx.accounts.treasury,
            &ctx.accounts.usdc_mint,
            config.treasury_bump,
            prize_leg,
        )?;
        transfer_from_owner(
            &ctx.accounts.token_program,
            &ctx.accounts.house_ata,
            &ctx.accounts.owner_ata,
            &ctx.accounts.house_authority,
            &ctx.accounts.usdc_mint,
            house_leg,
        )?;
        let gameweek = &mut ctx.accounts.gameweek;
        gameweek.prize_pool = gameweek
            .prize_pool
            .checked_sub(prize_leg)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        gameweek.total_entries = gameweek
            .total_entries
            .checked_sub(1)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        let config = &mut ctx.accounts.config;
        config.total_prize_obligation = config
            .total_prize_obligation
            .checked_sub(prize_leg)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        emit!(EntryClosed {
            gameweek_id,
            owner: ctx.accounts.owner.key(),
            refunded: fee,
        });
        Ok(())
    }

    /// Releases the part of a resolved pool the oracle never allocated — with three
    /// entrants the default tier table only assigns 65%, and without this the rest
    /// stays pinned behind `total_prize_obligation` forever.
    pub fn release_unallocated(ctx: Context<ManageGameweek>) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        let gameweek = &mut ctx.accounts.gameweek;
        require!(gameweek.status == RESOLVED, ErrorCode::GameweekNotResolved);
        let surplus = gameweek
            .prize_pool
            .checked_sub(gameweek.prize_allocated)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        require!(surplus > 0, ErrorCode::NoUnallocatedSurplus);
        gameweek.prize_pool = gameweek.prize_allocated;
        let config = &mut ctx.accounts.config;
        config.total_prize_obligation = config
            .total_prize_obligation
            .checked_sub(surplus)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        emit!(SurplusReleased {
            gameweek_id: gameweek.id,
            amount: surplus,
        });
        Ok(())
    }

    pub fn sponsor_prize_pool(ctx: Context<SponsorPrizePool>, amount: u64) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        require!(
            ctx.accounts.gameweek.status != RESOLVED,
            ErrorCode::InvalidGameweekStatus
        );
        transfer_from_owner(
            &ctx.accounts.token_program,
            &ctx.accounts.sponsor_ata,
            &ctx.accounts.treasury_ata,
            &ctx.accounts.sponsor,
            &ctx.accounts.usdc_mint,
            amount,
        )?;
        ctx.accounts.gameweek.prize_pool = ctx
            .accounts
            .gameweek
            .prize_pool
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        ctx.accounts.config.total_prize_obligation = ctx
            .accounts
            .config
            .total_prize_obligation
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        Ok(())
    }

    pub fn commit_stats(
        ctx: Context<CommitStats>,
        stats_hash: [u8; 32],
        uri: String,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.config.oracle,
            ctx.accounts.oracle.key(),
            ErrorCode::UnauthorizedOracle
        );
        require!(uri.as_bytes().len() <= MAX_URI_BYTES, ErrorCode::UriTooLong);
        require!(stats_hash != [0u8; 32], ErrorCode::InvalidStatsHash);
        let commit = &mut ctx.accounts.stats_commit;
        commit.gameweek_id = ctx.accounts.gameweek.id;
        commit.stats_hash = stats_hash;
        commit.uri = uri;
        commit.updated_at = Clock::get()?.unix_timestamp;
        commit.bump = ctx.bumps.stats_commit;
        Ok(())
    }

    pub fn publish_results(
        ctx: Context<PublishResults>,
        root: [u8; 32],
        total_entries: u32,
        prize_allocated: u64,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.config.oracle,
            ctx.accounts.oracle.key(),
            ErrorCode::UnauthorizedOracle
        );
        require!(
            ctx.accounts.stats_commit.gameweek_id == ctx.accounts.gameweek.id,
            ErrorCode::StatsNotCommitted
        );
        require!(
            ctx.accounts.stats_commit.stats_hash != [0u8; 32],
            ErrorCode::StatsNotCommitted
        );
        let gameweek = &mut ctx.accounts.gameweek;
        require!(gameweek.status == CLOSED, ErrorCode::GameweekNotClosed);
        require!(
            total_entries == gameweek.total_entries,
            ErrorCode::UnexpectedEntryCount
        );
        require!(
            prize_allocated <= gameweek.prize_pool,
            ErrorCode::PrizeAllocationTooLarge
        );
        gameweek.results_root = root;
        gameweek.prize_allocated = prize_allocated;
        gameweek.status = RESOLVED;
        emit!(ResultsPublished {
            gameweek_id: gameweek.id,
            root,
            total_entries,
            prize_allocated
        });
        Ok(())
    }

    pub fn claim_prize(
        ctx: Context<ClaimPrize>,
        gameweek_id: u32,
        rank: u32,
        final_points: u32,
        amount: u64,
        proof: Vec<ProofNode>,
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        require!(proof.len() <= MAX_PROOF_LEN, ErrorCode::ProofTooLong);
        let gameweek = &ctx.accounts.gameweek;
        require!(gameweek.status == RESOLVED, ErrorCode::GameweekNotResolved);
        let leaf = result_leaf(
            &ctx.accounts.owner.key(),
            gameweek_id,
            rank,
            final_points,
            amount,
        );
        let tree_total = verify_proof(leaf, amount, &proof, gameweek.results_root)?;
        // The published tree must pay exactly what the oracle declared, so a root that
        // hands out more than `prize_allocated` cannot be settled at all.
        require!(
            tree_total == gameweek.prize_allocated,
            ErrorCode::TreeTotalMismatch
        );
        let remaining = gameweek
            .prize_allocated
            .checked_sub(gameweek.prize_claimed)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        require!(amount <= remaining, ErrorCode::PrizeAllocationExceeded);
        transfer_from_treasury(
            &ctx.accounts.token_program,
            &ctx.accounts.treasury_ata,
            &ctx.accounts.owner_ata,
            &ctx.accounts.treasury,
            &ctx.accounts.usdc_mint,
            ctx.accounts.config.treasury_bump,
            amount,
        )?;
        let receipt = &mut ctx.accounts.claim_receipt;
        receipt.owner = ctx.accounts.owner.key();
        receipt.gameweek_id = gameweek_id;
        receipt.rank = rank;
        receipt.amount = amount;
        receipt.claimed_at = Clock::get()?.unix_timestamp;
        receipt.bump = ctx.bumps.claim_receipt;
        let gameweek = &mut ctx.accounts.gameweek;
        gameweek.prize_claimed = gameweek
            .prize_claimed
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        ctx.accounts.config.total_prize_obligation = ctx
            .accounts
            .config
            .total_prize_obligation
            .checked_sub(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        emit!(PrizeClaimed {
            gameweek_id,
            owner: ctx.accounts.owner.key(),
            rank,
            amount
        });
        Ok(())
    }

    pub fn withdraw_house(ctx: Context<WithdrawHouse>, amount: u64) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        transfer_from_owner(
            &ctx.accounts.token_program,
            &ctx.accounts.house_ata,
            &ctx.accounts.recipient_ata,
            &ctx.accounts.house_authority,
            &ctx.accounts.usdc_mint,
            amount,
        )
    }

    pub fn withdraw_treasury(ctx: Context<WithdrawTreasury>, amount: u64) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        let balance = ctx.accounts.treasury_ata.amount;
        let after = balance
            .checked_sub(amount)
            .ok_or(ErrorCode::InsufficientTreasuryBalance)?;
        require!(
            after >= ctx.accounts.config.total_prize_obligation,
            ErrorCode::OutstandingPrizeObligations
        );
        transfer_from_treasury(
            &ctx.accounts.token_program,
            &ctx.accounts.treasury_ata,
            &ctx.accounts.recipient_ata,
            &ctx.accounts.treasury,
            &ctx.accounts.usdc_mint,
            ctx.accounts.config.treasury_bump,
            amount,
        )
    }

    #[cfg(feature = "bracket")]
    pub fn init_bracket(ctx: Context<InitBracket>) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        let bracket = &mut ctx.accounts.bracket;
        bracket.status = OPEN;
        bracket.prize_allocated = 0;
        bracket.prize_claimed = 0;
        bracket.bump = ctx.bumps.bracket;
        Ok(())
    }

    #[cfg(feature = "bracket")]
    pub fn close_bracket(ctx: Context<ManageBracket>) -> Result<()> {
        require_admin(&ctx.accounts.config, &ctx.accounts.admin.key())?;
        require!(
            ctx.accounts.bracket.status == OPEN,
            ErrorCode::BracketNotOpen
        );
        ctx.accounts.bracket.status = CLOSED;
        Ok(())
    }

    #[cfg(feature = "bracket")]
    pub fn register_bracket_prediction(
        ctx: Context<RegisterBracketPrediction>,
        group_ranks: [u8; 48],
        third_order: [u8; 12],
        ko_winners: [u8; 32],
    ) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        require!(
            ctx.accounts.bracket.status == OPEN,
            ErrorCode::BracketNotOpen
        );
        let entry = &mut ctx.accounts.bracket_entry;
        entry.owner = ctx.accounts.owner.key();
        entry.group_ranks = group_ranks;
        entry.third_order = third_order;
        entry.ko_winners = ko_winners;
        entry.score = 0;
        entry.rank = 0;
        entry.prize = 0;
        entry.claimed = false;
        entry.bump = ctx.bumps.bracket_entry;
        Ok(())
    }

    /// Resolve one winner per invocation. The oracle selects the top entries off-chain.
    #[cfg(feature = "bracket")]
    pub fn resolve_bracket(
        ctx: Context<ResolveBracket>,
        score: u32,
        rank: u32,
        prize: u64,
    ) -> Result<()> {
        require_keys_eq!(
            ctx.accounts.config.oracle,
            ctx.accounts.oracle.key(),
            ErrorCode::UnauthorizedOracle
        );
        require!(
            ctx.accounts.bracket.status == CLOSED,
            ErrorCode::BracketNotClosed
        );
        let entry = &mut ctx.accounts.bracket_entry;
        require!(!entry.claimed, ErrorCode::BracketAlreadyClaimed);
        entry.score = score;
        entry.rank = rank;
        entry.prize = prize;
        ctx.accounts.bracket.prize_allocated = ctx
            .accounts
            .bracket
            .prize_allocated
            .checked_add(prize)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        ctx.accounts.config.total_prize_obligation = ctx
            .accounts
            .config
            .total_prize_obligation
            .checked_add(prize)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        Ok(())
    }

    #[cfg(feature = "bracket")]
    pub fn claim_bracket_prize(ctx: Context<ClaimBracketPrize>) -> Result<()> {
        require!(!ctx.accounts.config.paused, ErrorCode::ProgramPaused);
        let amount = ctx.accounts.bracket_entry.prize;
        require!(
            !ctx.accounts.bracket_entry.claimed,
            ErrorCode::BracketAlreadyClaimed
        );
        transfer_from_treasury(
            &ctx.accounts.token_program,
            &ctx.accounts.treasury_ata,
            &ctx.accounts.owner_ata,
            &ctx.accounts.treasury,
            &ctx.accounts.usdc_mint,
            ctx.accounts.config.treasury_bump,
            amount,
        )?;
        ctx.accounts.bracket_entry.claimed = true;
        ctx.accounts.bracket.prize_claimed = ctx
            .accounts
            .bracket
            .prize_claimed
            .checked_add(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        ctx.accounts.config.total_prize_obligation = ctx
            .accounts
            .config
            .total_prize_obligation
            .checked_sub(amount)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
        Ok(())
    }
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut, address = INITIALIZER @ ErrorCode::UnauthorizedInitializer)]
    pub authority: Signer<'info>,
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(init, payer = authority, space = Config::SPACE, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    /// CHECK: PDA signing authority only.
    #[account(seeds = [b"treasury"], bump)]
    pub treasury: UncheckedAccount<'info>,
    #[account(init, payer = authority, associated_token::mint = usdc_mint, associated_token::authority = treasury)]
    pub treasury_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Admin<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(gameweek_id: u32)]
pub struct CreateGameweek<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = Gameweek::SPACE, seeds = [b"gw".as_ref(), &gameweek_id.to_le_bytes()], bump)]
    pub gameweek: Account<'info, Gameweek>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ManageGameweek<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    #[account(mut, seeds = [b"gw".as_ref(), &gameweek.id.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
}

#[derive(Accounts)]
#[instruction(gameweek_id: u32)]
pub struct RegisterTeam<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"gw".as_ref(), &gameweek_id.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(init, payer = owner, space = Entry::SPACE, seeds = [b"entry".as_ref(), &gameweek_id.to_le_bytes(), owner.key().as_ref()], bump)]
    pub entry: Account<'info, Entry>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, token::mint = usdc_mint, token::authority = owner)]
    pub owner_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: checked against config treasury seed.
    #[account(seeds = [b"treasury"], bump = config.treasury_bump)]
    pub treasury: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = treasury)]
    pub treasury_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: checked against config house wallet.
    #[account(address = config.house_wallet)]
    pub house_wallet: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = house_wallet)]
    pub house_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
#[instruction(gameweek_id: u32)]
pub struct CloseEntry<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    #[account(mut, seeds = [b"gw".as_ref(), &gameweek_id.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(mut, close = owner, seeds = [b"entry".as_ref(), &gameweek_id.to_le_bytes(), owner.key().as_ref()], bump = entry.bump)]
    pub entry: Account<'info, Entry>,
    /// CHECK: Entry's owner; constrained by its PDA seed.
    #[account(mut)]
    pub owner: UncheckedAccount<'info>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: PDA signing authority only.
    #[account(seeds = [b"treasury"], bump = config.treasury_bump)]
    pub treasury: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = treasury)]
    pub treasury_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(address = config.house_wallet)]
    pub house_authority: Signer<'info>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = house_authority)]
    pub house_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = owner)]
    pub owner_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct SponsorPrizePool<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    #[account(mut)]
    pub sponsor: Signer<'info>,
    #[account(mut, seeds = [b"gw".as_ref(), &gameweek.id.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, token::mint = usdc_mint, token::authority = sponsor)]
    pub sponsor_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    /// CHECK: PDA signing authority only.
    #[account(seeds = [b"treasury"], bump = config.treasury_bump)]
    pub treasury: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = treasury)]
    pub treasury_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct CommitStats<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub oracle: Signer<'info>,
    #[account(seeds = [b"gw".as_ref(), &gameweek.id.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(init, payer = oracle, space = StatsCommit::SPACE, seeds = [b"stats".as_ref(), &gameweek.id.to_le_bytes()], bump)]
    pub stats_commit: Account<'info, StatsCommit>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PublishResults<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub oracle: Signer<'info>,
    #[account(mut, seeds = [b"gw".as_ref(), &gameweek.id.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(
        seeds = [b"stats".as_ref(), &gameweek.id.to_le_bytes()],
        bump = stats_commit.bump,
    )]
    pub stats_commit: Account<'info, StatsCommit>,
}

#[derive(Accounts)]
#[instruction(gameweek_id: u32)]
pub struct ClaimPrize<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"gw".as_ref(), &gameweek_id.to_le_bytes()], bump = gameweek.bump)]
    pub gameweek: Account<'info, Gameweek>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(init, payer = owner, space = ClaimReceipt::SPACE, seeds = [b"claim".as_ref(), &gameweek_id.to_le_bytes(), owner.key().as_ref()], bump)]
    pub claim_receipt: Account<'info, ClaimReceipt>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: PDA signing authority only.
    #[account(seeds = [b"treasury"], bump = config.treasury_bump)]
    pub treasury: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = treasury)]
    pub treasury_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = owner)]
    pub owner_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    pub system_program: Program<'info, System>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct WithdrawHouse<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    #[account(address = config.house_wallet)]
    pub house_authority: Signer<'info>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = house_authority)]
    pub house_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, token::mint = usdc_mint)]
    pub recipient_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
}

#[derive(Accounts)]
pub struct WithdrawTreasury<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: PDA signing authority only.
    #[account(seeds = [b"treasury"], bump = config.treasury_bump)]
    pub treasury: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = treasury)]
    pub treasury_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, token::mint = usdc_mint)]
    pub recipient_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
}

#[cfg(feature = "bracket")]
#[derive(Accounts)]
pub struct InitBracket<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = BracketState::SPACE, seeds = [b"bracket"], bump)]
    pub bracket: Account<'info, BracketState>,
    pub system_program: Program<'info, System>,
}

#[cfg(feature = "bracket")]
#[derive(Accounts)]
pub struct ManageBracket<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub admin: Signer<'info>,
    #[account(mut, seeds = [b"bracket"], bump = bracket.bump)]
    pub bracket: Account<'info, BracketState>,
}

#[cfg(feature = "bracket")]
#[derive(Accounts)]
pub struct RegisterBracketPrediction<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(seeds = [b"bracket"], bump = bracket.bump)]
    pub bracket: Account<'info, BracketState>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(init, payer = owner, space = BracketEntry::SPACE, seeds = [b"bpred".as_ref(), owner.key().as_ref()], bump)]
    pub bracket_entry: Account<'info, BracketEntry>,
    pub system_program: Program<'info, System>,
}

#[cfg(feature = "bracket")]
#[derive(Accounts)]
pub struct ResolveBracket<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    pub oracle: Signer<'info>,
    #[account(mut, seeds = [b"bracket"], bump = bracket.bump)]
    pub bracket: Account<'info, BracketState>,
    #[account(mut, seeds = [b"bpred".as_ref(), bracket_entry.owner.as_ref()], bump = bracket_entry.bump)]
    pub bracket_entry: Account<'info, BracketEntry>,
}

#[cfg(feature = "bracket")]
#[derive(Accounts)]
pub struct ClaimBracketPrize<'info> {
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"bracket"], bump = bracket.bump)]
    pub bracket: Account<'info, BracketState>,
    #[account(mut)]
    pub owner: Signer<'info>,
    #[account(mut, seeds = [b"bpred".as_ref(), owner.key().as_ref()], bump = bracket_entry.bump)]
    pub bracket_entry: Account<'info, BracketEntry>,
    #[account(address = config.usdc_mint)]
    pub usdc_mint: Box<InterfaceAccount<'info, Mint>>,
    /// CHECK: PDA signing authority only.
    #[account(seeds = [b"treasury"], bump = config.treasury_bump)]
    pub treasury: UncheckedAccount<'info>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = treasury)]
    pub treasury_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(mut, associated_token::mint = usdc_mint, associated_token::authority = owner)]
    pub owner_ata: Box<InterfaceAccount<'info, TokenAccount>>,
    #[account(address = anchor_spl::token::ID)]
    pub token_program: Interface<'info, TokenInterface>,
}

#[cfg(feature = "bracket")]
#[account]
pub struct BracketState {
    pub status: u8,
    pub prize_allocated: u64,
    pub prize_claimed: u64,
    pub bump: u8,
}
#[cfg(feature = "bracket")]
impl BracketState {
    pub const SPACE: usize = 8 + 1 + 8 + 8 + 1;
}

#[cfg(feature = "bracket")]
#[account]
pub struct BracketEntry {
    pub owner: Pubkey,
    pub group_ranks: [u8; 48],
    pub third_order: [u8; 12],
    pub ko_winners: [u8; 32],
    pub score: u32,
    pub rank: u32,
    pub prize: u64,
    pub claimed: bool,
    pub bump: u8,
}
#[cfg(feature = "bracket")]
impl BracketEntry {
    pub const SPACE: usize = 8 + 32 + 48 + 12 + 32 + 4 + 4 + 8 + 1 + 1;
}

#[account]
pub struct Config {
    pub admins: [Pubkey; MAX_ADMINS],
    pub admin_count: u8,
    pub oracle: Pubkey,
    pub usdc_mint: Pubkey,
    pub house_wallet: Pubkey,
    pub entry_fee: u64,
    pub prize_pool_bps: u16,
    pub current_gameweek: u32,
    pub paused: bool,
    pub version: u16,
    /// Sum owed to all still-claimable prizes, across all gameweeks.
    pub total_prize_obligation: u64,
    pub treasury_bump: u8,
    pub bump: u8,
}
impl Config {
    pub const SPACE: usize =
        8 + (32 * MAX_ADMINS) + 1 + 32 + 32 + 32 + 8 + 2 + 4 + 1 + 2 + 8 + 1 + 1;
}

#[account]
pub struct Gameweek {
    pub id: u32,
    pub status: u8,
    pub prize_pool: u64,
    pub total_entries: u32,
    pub results_root: [u8; 32],
    pub prize_allocated: u64,
    pub prize_claimed: u64,
    pub bump: u8,
}
impl Gameweek {
    pub const SPACE: usize = 8 + 4 + 1 + 8 + 4 + 32 + 8 + 8 + 1;
}

#[account]
pub struct Entry {
    pub owner: Pubkey,
    pub gameweek_id: u32,
    pub player_ids: [u32; TEAM_SIZE],
    pub positions: [u8; TEAM_SIZE],
    pub clubs: [u16; TEAM_SIZE],
    pub captain_index: u8,
    pub fee_paid: u64,
    /// The prize leg actually routed to treasury at registration time.
    pub prize_contribution: u64,
    pub created_at: i64,
    pub bump: u8,
}
impl Entry {
    pub const SPACE: usize =
        8 + 32 + 4 + (4 * TEAM_SIZE) + TEAM_SIZE + (2 * TEAM_SIZE) + 1 + 8 + 8 + 8 + 1;
}

#[account]
pub struct ClaimReceipt {
    pub owner: Pubkey,
    pub gameweek_id: u32,
    pub rank: u32,
    pub amount: u64,
    pub claimed_at: i64,
    pub bump: u8,
}
impl ClaimReceipt {
    pub const SPACE: usize = 8 + 32 + 4 + 4 + 8 + 8 + 1;
}

#[account]
pub struct StatsCommit {
    pub gameweek_id: u32,
    pub stats_hash: [u8; 32],
    pub uri: String,
    pub updated_at: i64,
    pub bump: u8,
}
impl StatsCommit {
    pub const SPACE: usize = 8 + 4 + 32 + 4 + MAX_URI_BYTES + 8 + 1;
}

#[event]
pub struct ResultsPublished {
    pub gameweek_id: u32,
    pub root: [u8; 32],
    pub total_entries: u32,
    pub prize_allocated: u64,
}

#[event]
pub struct PrizeClaimed {
    pub gameweek_id: u32,
    pub owner: Pubkey,
    pub rank: u32,
    pub amount: u64,
}

/// The participant list is rebuilt off-chain from this event — the gameweek account
/// deliberately does not carry an unbounded roster.
#[event]
pub struct TeamRegistered {
    pub gameweek_id: u32,
    pub owner: Pubkey,
    pub fee_paid: u64,
    pub prize_contribution: u64,
}

#[event]
pub struct EntryClosed {
    pub gameweek_id: u32,
    pub owner: Pubkey,
    pub refunded: u64,
}

#[event]
pub struct SurplusReleased {
    pub gameweek_id: u32,
    pub amount: u64,
}

fn is_admin(config: &Config, key: &Pubkey) -> bool {
    config.admins.iter().any(|admin| admin == key)
}

fn require_admin(config: &Config, key: &Pubkey) -> Result<()> {
    require!(is_admin(config, key), ErrorCode::UnauthorizedAdmin);
    Ok(())
}

fn validate_team(
    player_ids: &[u32; TEAM_SIZE],
    positions: &[u8; TEAM_SIZE],
    clubs: &[u16; TEAM_SIZE],
) -> Result<()> {
    for index in 0..TEAM_SIZE {
        require!(player_ids[index] != 0, ErrorCode::InvalidPlayer);
        for compared in 0..index {
            require!(
                player_ids[index] != player_ids[compared],
                ErrorCode::DuplicatePlayer
            );
        }
        let same_club = clubs.iter().filter(|club| **club == clubs[index]).count();
        require!(same_club <= 3, ErrorCode::TooManyFromClub);
    }
    // Bench positions decide auto-substitutions off-chain, so they are validated too.
    for position in positions.iter().skip(STARTERS) {
        require!(*position <= POSITION_FWD, ErrorCode::InvalidPosition);
    }
    let mut goalkeepers = 0;
    let mut defenders = 0;
    let mut midfielders = 0;
    let mut forwards = 0;
    for position in positions.iter().take(STARTERS) {
        match *position {
            POSITION_GK => goalkeepers += 1,
            POSITION_DEF => defenders += 1,
            POSITION_MID => midfielders += 1,
            POSITION_FWD => forwards += 1,
            _ => return err!(ErrorCode::InvalidPosition),
        }
    }
    // Allowed XI: 4-3-3 or 3-4-3. Bench slots are position-checked above, not counted here.
    require!(
        goalkeepers == 1
            && forwards == 3
            && ((defenders == 4 && midfielders == 3)
                || (defenders == 3 && midfielders == 4)),
        ErrorCode::InvalidFormation
    );
    Ok(())
}

/// One step of a Merkle path. `sum` is the total prize money under the sibling
/// subtree; carrying it is what lets the program add up the whole tree from a
/// single proof.
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, Debug, PartialEq, Eq)]
pub struct ProofNode {
    pub hash: [u8; 32],
    pub sum: u64,
}

fn result_leaf(
    owner: &Pubkey,
    gameweek_id: u32,
    rank: u32,
    final_points: u32,
    amount: u64,
) -> [u8; 32] {
    hashv(&[
        &[LEAF_DOMAIN],
        owner.as_ref(),
        &gameweek_id.to_le_bytes(),
        &rank.to_le_bytes(),
        &final_points.to_le_bytes(),
        &amount.to_le_bytes(),
    ])
    .to_bytes()
}

/// Sorted-pair Merkle proof over a sum tree. Pairs are ordered by hash so the
/// off-chain tree needs no left/right metadata; each internal node commits to both
/// child hashes *and* both child sums, so the running total cannot be understated.
/// Returns the total prize money committed by the root.
fn verify_proof(
    leaf: [u8; 32],
    leaf_amount: u64,
    proof: &[ProofNode],
    root: [u8; 32],
) -> Result<u64> {
    let mut hash = leaf;
    let mut sum = leaf_amount;
    for node in proof {
        let (low, low_sum, high, high_sum) = if hash <= node.hash {
            (hash, sum, node.hash, node.sum)
        } else {
            (node.hash, node.sum, hash, sum)
        };
        hash = hashv(&[
            &[NODE_DOMAIN],
            &low,
            &low_sum.to_le_bytes(),
            &high,
            &high_sum.to_le_bytes(),
        ])
        .to_bytes();
        sum = sum
            .checked_add(node.sum)
            .ok_or(ErrorCode::ArithmeticOverflow)?;
    }
    require!(hash == root, ErrorCode::InvalidMerkleProof);
    Ok(sum)
}

fn transfer_from_owner<'info>(
    token_program: &Interface<'info, TokenInterface>,
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    authority: &Signer<'info>,
    mint: &InterfaceAccount<'info, Mint>,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    transfer_checked(
        CpiContext::new(
            token_program.key(),
            TransferChecked {
                from: from.to_account_info(),
                mint: mint.to_account_info(),
                to: to.to_account_info(),
                authority: authority.to_account_info(),
            },
        ),
        amount,
        mint.decimals,
    )
}

fn transfer_from_treasury<'info>(
    token_program: &Interface<'info, TokenInterface>,
    from: &InterfaceAccount<'info, TokenAccount>,
    to: &InterfaceAccount<'info, TokenAccount>,
    treasury: &UncheckedAccount<'info>,
    mint: &InterfaceAccount<'info, Mint>,
    treasury_bump: u8,
    amount: u64,
) -> Result<()> {
    if amount == 0 {
        return Ok(());
    }
    let signer_seeds: &[&[u8]] = &[b"treasury", &[treasury_bump]];
    transfer_checked(
        CpiContext::new_with_signer(
            token_program.key(),
            TransferChecked {
                from: from.to_account_info(),
                mint: mint.to_account_info(),
                to: to.to_account_info(),
                authority: treasury.to_account_info(),
            },
            &[signer_seeds],
        ),
        amount,
        mint.decimals,
    )
}

#[error_code]
pub enum ErrorCode {
    #[msg("The provided basis points exceed 10,000.")]
    InvalidBasisPoints,
    #[msg("The signer is not a configured admin.")]
    UnauthorizedAdmin,
    #[msg("The configured oracle did not sign.")]
    UnauthorizedOracle,
    #[msg("The program is paused.")]
    ProgramPaused,
    #[msg("The gameweek is not open.")]
    GameweekNotOpen,
    #[msg("The gameweek is not closed.")]
    GameweekNotClosed,
    #[msg("The gameweek has not resolved results.")]
    GameweekNotResolved,
    #[msg("The gameweek status does not allow this action.")]
    InvalidGameweekStatus,
    #[msg("The gameweek id is invalid.")]
    InvalidGameweekId,
    #[msg("A prize has already been claimed for this gameweek.")]
    GameweekAlreadyClaimed,
    #[msg("Arithmetic overflow or underflow.")]
    ArithmeticOverflow,
    #[msg("The prize allocation is larger than the gameweek prize pool.")]
    PrizeAllocationTooLarge,
    #[msg("The claimed amount exceeds the allocated prize pool.")]
    PrizeAllocationExceeded,
    #[msg("The Merkle proof does not match the published root.")]
    InvalidMerkleProof,
    #[msg("An admin key is invalid.")]
    InvalidAdmin,
    #[msg("That admin is already configured.")]
    AdminAlreadyExists,
    #[msg("The admin capacity has been reached.")]
    AdminCapacityReached,
    #[msg("Cannot remove the last admin.")]
    CannotRemoveLastAdmin,
    #[msg("The admin is not configured.")]
    AdminNotFound,
    #[msg("The team contains an invalid player id.")]
    InvalidPlayer,
    #[msg("The team contains duplicate player ids.")]
    DuplicatePlayer,
    #[msg("The team contains too many players from one club.")]
    TooManyFromClub,
    #[msg("The player position is invalid.")]
    InvalidPosition,
    #[msg("The starting eleven has an invalid formation.")]
    InvalidFormation,
    #[msg("Captain must be a starter slot index 0-10.")]
    InvalidCaptain,
    #[msg("The URI is too long.")]
    UriTooLong,
    #[msg("Stats must be committed before results can be published.")]
    StatsNotCommitted,
    #[msg("The stats hash cannot be empty.")]
    InvalidStatsHash,
    #[msg("The published count does not equal registered entries.")]
    UnexpectedEntryCount,
    #[msg("An entry can be closed only while the gameweek is OPEN or CLOSED.")]
    EntryCannotBeClosed,
    #[msg("Treasury balance is insufficient.")]
    InsufficientTreasuryBalance,
    #[msg("The withdrawal would consume unpaid prize funds.")]
    OutstandingPrizeObligations,
    #[msg("Only the configured initializer may bootstrap the config.")]
    UnauthorizedInitializer,
    #[msg("The oracle key is invalid.")]
    InvalidOracle,
    #[msg("The house wallet is invalid.")]
    InvalidHouseWallet,
    #[msg("The house token account cannot cover its share of the refund.")]
    HouseBalanceInsufficient,
    #[msg("The Merkle proof is longer than the supported depth.")]
    ProofTooLong,
    #[msg("The results tree does not total the published allocation.")]
    TreeTotalMismatch,
    #[msg("There is no unallocated prize money to release.")]
    NoUnallocatedSurplus,
    #[msg("The bracket is not open.")]
    BracketNotOpen,
    #[msg("The bracket is not closed.")]
    BracketNotClosed,
    #[msg("This bracket prediction has already been claimed.")]
    BracketAlreadyClaimed,
}
