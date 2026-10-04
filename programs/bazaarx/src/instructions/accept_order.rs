use anchor_lang::prelude::*;
use crate::errors::BazaarXError;
use crate::state::{Order, OrderState};

#[derive(Accounts)]
pub struct AcceptOrder<'info> {
    pub supplier: Signer<'info>,

    #[account(
        mut,
        seeds = [
            Order::SEED_PREFIX,
            order.buyer.as_ref(),
            &order.order_id.to_le_bytes()
        ],
        bump = order.bump,
        has_one = supplier @ BazaarXError::UnauthorizedSupplier,
    )]
    pub order: Account<'info, Order>,
}

pub fn handler(ctx: Context<AcceptOrder>) -> Result<()> {
    let order = &mut ctx.accounts.order;
    let clock = Clock::get()?;

    // State machine requirement: Only an order in Created state can be Accepted
    require!(
        order.state == OrderState::Created,
        BazaarXError::InvalidOrderState
    );

    order.state = OrderState::Accepted;
    order.accepted_at = clock.unix_timestamp;

    Ok(())
}
