/// 👽👽👽👽👽👽👽👽👽
/// A Y Y  L M A O    
/// 👽👽👽👽👽👽👽👽👽
/// VIVA LA ZK COMPRESSION
/// 👽👽👽👽👽👽👽👽👽
use anchor_lang::prelude::*;
use light_sdk::{
    compressed_account::LightAccount, light_account, light_accounts, light_program,
    merkle_context::PackedAddressMerkleContext,
};

declare_id!("Y3Fdm2T4ipYdaFBKxQb8M4QE8EgpxWAMa7c3q72vQhn");

const PDA_WALLET_SEED: &[u8; 1] = b"w";
const PDA_WALLET_GUARDIAN_SEED: &[u8; 2] = b"wg";

#[light_program]
#[program]
pub mod compressed_aa_poc {
    use super::*;
    use anchor_lang::solana_program::{instruction::Instruction, program::invoke_signed};

    pub fn init_wallet<'info>(
        ctx: LightContext<'_, '_, '_, 'info, InitWallet<'info>>,
    ) -> Result<()> {
        ctx.light_accounts.wallet_guardian.wallet = ctx.accounts.wallet.key();
        ctx.light_accounts.wallet_guardian.guardian = ctx.accounts.seed_guardian.key();

        msg!(
            "Wallet {} has been initialized with guardian: {}",
            ctx.accounts.wallet.key(),
            ctx.accounts.seed_guardian.key()
        );

        Ok(())
    }

    pub fn register_keypair<'info>(
        ctx: LightContext<'_, '_, '_, 'info, RegisterKeypair<'info>>,
    ) -> Result<()> {
        ctx.light_accounts.wallet_guardian.guardian = ctx.accounts.assigned_guardian.key();
        ctx.light_accounts.wallet_guardian.wallet = ctx.accounts.wallet.key();

        msg!(
            "Wallet {} has new guardian: {}",
            ctx.accounts.wallet.key(),
            ctx.accounts.assigned_guardian.key()
        );

        Ok(())
    }

    pub fn exec_instruction<'info>(
        ctx: LightContext<'_, '_, '_, 'info, ExecInstruction<'info>>,
        instruction_data: Vec<u8>,
    ) -> Result<()> {
        require!(
            ctx.accounts
                .guardian
                .key()
                .eq(&ctx.light_accounts.wallet_guardian.guardian.key()),
            AaError::GuardianMismatch
        );

        require!(
            ctx.accounts
                .wallet
                .key()
                .eq(&ctx.light_accounts.wallet_guardian.wallet.key()),
            AaError::WalletMismatch
        );

        msg!(
            "Executing tx for AA wallet {}, approved by: {}",
            ctx.accounts.wallet.key(),
            ctx.accounts.guardian.key()
        );

        let verve_instruction: VerveInstruction =
            VerveInstruction::try_from_slice(&instruction_data)?;

        let mut account_metas: Vec<AccountMeta> = vec![];

        for (i, account_index) in verve_instruction.account_indices.iter().enumerate() {
            let account_key: Pubkey = ctx.remaining_accounts[*account_index as usize].key();
            let is_writable: bool = verve_instruction.writable_accounts[i];
            let is_signer: bool = verve_instruction.signer_accounts[i];

            let account_meta: AccountMeta = if is_writable {
                AccountMeta::new(account_key, is_signer)
            } else {
                AccountMeta::new_readonly(account_key, is_signer)
            };

            account_metas.push(account_meta);
        }

        let program_account_index: &u8 = &verve_instruction.program_account_index;

        let instruction: Instruction = Instruction {
            accounts: account_metas,
            data: verve_instruction.data,
            program_id: ctx.remaining_accounts[*program_account_index as usize].key(),
        };

        let seed_guardian_key: Pubkey = ctx.accounts.seed_guardian.key();

        let seeds: [&[u8]; 3] = [
            &PDA_WALLET_SEED[..],
            seed_guardian_key.as_ref(),
            &[ctx.bumps.wallet][..],
        ];

        let signer_seeds: &[&[&[u8]]; 1] = &[&seeds[..]];

        let cpi_accounts: Vec<AccountInfo<'info>> =
            ctx.remaining_accounts[*program_account_index as usize + 1..].to_vec();

        invoke_signed(&instruction, &cpi_accounts, signer_seeds)?;

        Ok(())
    }

    pub fn generate_idl_types_noop(_ctx: Context<GenerateIdls>, _types: Types) -> Result<()> {
        Ok(())
    }
}

#[light_account]
#[derive(Clone, Debug, Default)]
pub struct WalletGuardian {
    #[truncate]
    pub wallet: Pubkey,
    #[truncate]
    pub guardian: Pubkey,
}

#[light_account]
#[derive(Clone, Debug, Default)]
pub struct PeriodicApproval {
    #[truncate]
    pub wallet: Pubkey,
    #[truncate]
    pub from_ata: Pubkey,
    pub amount: u64,
    pub created_timestamp: i64,
    pub period_duration: i64,
    pub last_called_period_index: i64,
}

#[light_accounts]
pub struct InitWallet<'info> {
    /// CHECK: No need to have this account initialized lol
    #[account(
        seeds=[PDA_WALLET_SEED, seed_guardian.key().as_ref()],
        bump
    )]
    pub wallet: AccountInfo<'info>,

    #[light_account(
        init,
        seeds=[PDA_WALLET_GUARDIAN_SEED, wallet.key().as_ref(), seed_guardian.key().as_ref()],
    )]
    pub wallet_guardian: LightAccount<WalletGuardian>,

    #[account()]
    pub seed_guardian: Signer<'info>,

    #[account(mut)]
    #[fee_payer]
    pub payer: Signer<'info>,

    #[self_program]
    pub self_program: Program<'info, crate::program::CompressedAaPoc>,

    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,
}

#[light_accounts]
pub struct RegisterKeypair<'info> {
    /// CHECK: No need to have this account initialized lol
    #[account(
        seeds=[PDA_WALLET_SEED, seed_guardian.key().as_ref()],
        bump
    )]
    pub wallet: AccountInfo<'info>,

    #[light_account(
        init,
        seeds=[PDA_WALLET_GUARDIAN_SEED, wallet.key().as_ref(), assigned_guardian.key().as_ref()],
    )]
    pub wallet_guardian: LightAccount<WalletGuardian>,

    /// CHECK: we merely assign a new account as a guardian, no checks required
    #[account()]
    pub assigned_guardian: AccountInfo<'info>,

    #[account()]
    pub seed_guardian: Signer<'info>,

    #[account(mut)]
    #[fee_payer]
    pub payer: Signer<'info>,

    #[self_program]
    pub self_program: Program<'info, crate::program::CompressedAaPoc>,

    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,
}

#[light_accounts]
pub struct ExecInstruction<'info> {
    /// CHECK: No need to have this account initialized lol
    #[account(
        seeds=[PDA_WALLET_SEED, seed_guardian.key().as_ref()],
        bump
    )]
    pub wallet: AccountInfo<'info>,

    #[light_account(
        mut,
        seeds=[PDA_WALLET_GUARDIAN_SEED, wallet.key().as_ref(), guardian.key().as_ref()],
    )]
    pub wallet_guardian: LightAccount<WalletGuardian>,

    /// CHECK: we use this to determine the account we're invoking for.
    /// The actual access check happens using wallet_guardian.
    #[account()]
    pub seed_guardian: AccountInfo<'info>,

    #[account()]
    pub guardian: Signer<'info>,

    #[account(mut)]
    #[fee_payer]
    pub payer: Signer<'info>,

    #[self_program]
    pub self_program: Program<'info, crate::program::CompressedAaPoc>,

    /// CHECK: Checked in light-system-program.
    #[authority]
    pub cpi_signer: AccountInfo<'info>,
}

#[derive(Accounts)]
pub struct GenerateIdls {}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct Types {
    wallet_guardian: WalletGuardian,
    verve_instruction: VerveInstruction,
}

#[error_code]
pub enum AaError {
    #[msg("Guardian mismatch")]
    GuardianMismatch,

    #[msg("Wallet mismatch")]
    WalletMismatch,

    #[msg("Invalid guardian signature")]
    InvalidGuardianSignature,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Debug)]
pub struct VerveInstruction {
    pub data: Vec<u8>,
    pub account_indices: Vec<u8>,
    pub writable_accounts: Vec<bool>,
    pub signer_accounts: Vec<bool>,
    pub program_account_index: u8,
}
