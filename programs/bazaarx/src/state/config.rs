use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub usdc_mint: Pubkey,
    pub bump: u8,
}

impl Config {
    pub const SEED_PREFIX: &'static [u8] = b"config";

    // Space: 8 (discriminator) + 32 (admin) + 32 (usdc_mint) + 1 (bump) = 73 bytes
    pub const LEN: usize = 8 + 32 + 32 + 1;
}
