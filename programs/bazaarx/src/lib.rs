use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("BzxDay1Foundation111111111111111111111111111");

#[program]
pub mod bazaarx {
    use super::*;

    /// Initialize the BazaarX global configuration PDA.
    /// Sets the admin authority and the canonical USDC mint accepted by the protocol.
    pub fn initialize_config(
        ctx: Context<InitializeConfig>,
        usdc_mint: Pubkey,
    ) -> Result<()> {
        instructions::initialize_config::handler(ctx, usdc_mint)
    }

    /// Buyer creates a new wholesale order PDA.
    /// Locks initial state to Created and stamps creation time.
    pub fn create_order(
        ctx: Context<CreateOrder>,
        order_id: u64,
        supplier: Pubkey,
        mint: Pubkey,
        amount: u64,
    ) -> Result<()> {
        instructions::create_order::handler(ctx, order_id, supplier, mint, amount)
    }

    /// Designated supplier accepts the wholesale order.
    /// Transitions state from Created to Accepted and records acceptance timestamp.
    pub fn accept_order(ctx: Context<AcceptOrder>) -> Result<()> {
        instructions::accept_order::handler(ctx)
    }
}
