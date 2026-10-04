use anchor_lang::prelude::*;
use crate::errors::BazaarXError;
use crate::state::{Order, OrderState};

#[derive(Accounts)]
pub struct ConfirmDelivery<'info> {
    pub buyer: Signer<'info>,

    #[account(
        mut,
        seeds = [
            Order::SEED_PREFIX,
            order.buyer.as_ref(),
            &order.order_id.to_le_bytes()
        ],
        bump = order.bump,
        has_one = buyer @ BazaarXError::UnauthorizedBuyer,
    )]
    pub order: Account<'info, Order>,
}

pub fn handler(ctx: Context<ConfirmDelivery>) -> Result<()> {
    let order = &mut ctx.accounts.order;

    // State machine check: Order must be in Shipped state
    require!(
        order.state == OrderState::Shipped,
        BazaarXError::InvalidOrderState
    );

    order.state = OrderState::Delivered;

    Ok(())
}
