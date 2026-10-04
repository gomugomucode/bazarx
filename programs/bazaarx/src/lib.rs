use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;
pub mod state;

use instructions::*;

declare_id!("BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN");

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

    /// Buyer locks wholesale funds into the program-controlled vault PDA.
    /// Transitions state from Accepted to Funded.
    pub fn fund_escrow(ctx: Context<FundEscrow>) -> Result<()> {
        instructions::fund_escrow::handler(ctx)
    }

    /// Designated supplier marks the consignment dispatched.
    /// Transitions state from Funded to Shipped.
    pub fn mark_shipped(ctx: Context<MarkShipped>) -> Result<()> {
        instructions::mark_shipped::handler(ctx)
    }

    /// Buyer inspects delivered goods and confirms delivery.
    /// Transitions state from Shipped to Delivered.
    pub fn confirm_delivery(ctx: Context<ConfirmDelivery>) -> Result<()> {
        instructions::confirm_delivery::handler(ctx)
    }

    /// Releases escrowed USDC directly from the vault PDA to supplier.
    /// Transitions state from Delivered to Completed.
    pub fn release_payment(ctx: Context<ReleasePayment>) -> Result<()> {
        instructions::release_payment::handler(ctx)
    }
}
