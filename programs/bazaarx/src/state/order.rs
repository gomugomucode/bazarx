use anchor_lang::prelude::*;
use super::order_state::OrderState;

#[account]
#[derive(InitSpace)]
pub struct Order {
    pub order_id: u64,
    pub buyer: Pubkey,
    pub supplier: Pubkey,
    pub mint: Pubkey,
    pub amount: u64,
    pub state: OrderState,
    pub created_at: i64,
    pub accepted_at: i64,
    pub bump: u8,
}

impl Order {
    pub const SEED_PREFIX: &'static [u8] = b"order";

    // Space: 8 (discriminator) + 8 (order_id) + 32 (buyer) + 32 (supplier)
    // + 32 (mint) + 8 (amount) + 1 (state) + 8 (created_at) + 8 (accepted_at) + 1 (bump)
    // Total = 148 bytes
    pub const LEN: usize = 8 + 8 + 32 + 32 + 32 + 8 + 1 + 8 + 8 + 1;
}
