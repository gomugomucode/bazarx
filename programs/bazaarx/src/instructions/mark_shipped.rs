use anchor_lang::prelude::*;
use crate::errors::BazaarXError;
use crate::state::{Order, OrderState};

#[derive(Accounts)]
pub struct MarkShipped<'info> {
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

pub fn handler(ctx: Context<MarkShipped>) -> Result<()> {
    let order = &mut ctx.accounts.order;

    // State machine check: Order must be Funded
    require!(
        order.state == OrderState::Funded,
        BazaarXError::InvalidOrderState
    );

    order.state = OrderState::Shipped;

    Ok(())
}
