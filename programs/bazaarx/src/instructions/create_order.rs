use anchor_lang::prelude::*;
use crate::errors::BazaarXError;
use crate::state::{Config, Order, OrderState};

#[derive(Accounts)]
#[instruction(order_id: u64)]
pub struct CreateOrder<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        seeds = [Config::SEED_PREFIX],
        bump = config.bump
    )]
    pub config: Account<'info, Config>,

    #[account(
        init,
        payer = buyer,
        space = Order::LEN,
        seeds = [
            Order::SEED_PREFIX,
            buyer.key().as_ref(),
            &order_id.to_le_bytes()
        ],
        bump
    )]
    pub order: Account<'info, Order>,

    pub system_program: Program<'info, System>,
}

pub fn handler(
    ctx: Context<CreateOrder>,
    order_id: u64,
    supplier: Pubkey,
    mint: Pubkey,
    amount: u64,
) -> Result<()> {
    // 1. Amount must be positive
    require!(amount > 0, BazaarXError::InvalidAmount);

    // 2. Buyer cannot be the supplier (no self-trading)
    require_keys_neq!(
        ctx.accounts.buyer.key(),
        supplier,
        BazaarXError::InvalidSupplier
    );

    // 3. Mint must match the configured canonical USDC mint
    require_keys_eq!(
        mint,
        ctx.accounts.config.usdc_mint,
        BazaarXError::InvalidMint
    );

    let order = &mut ctx.accounts.order;
    let clock = Clock::get()?;

    // Program controls buyer, state, created_at, accepted_at, bump
    order.order_id = order_id;
    order.buyer = ctx.accounts.buyer.key();
    order.supplier = supplier;
    order.mint = mint;
    order.amount = amount;
    order.state = OrderState::Created;
    order.created_at = clock.unix_timestamp;
    order.accepted_at = 0;
    order.bump = ctx.bumps.order;

    Ok(())
}
