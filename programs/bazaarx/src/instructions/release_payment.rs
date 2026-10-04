use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::errors::BazaarXError;
use crate::state::{Order, OrderState};

#[derive(Accounts)]
pub struct ReleasePayment<'info> {
    pub caller: Signer<'info>,

    #[account(
        mut,
        seeds = [
            Order::SEED_PREFIX,
            order.buyer.as_ref(),
            &order.order_id.to_le_bytes()
        ],
        bump = order.bump,
    )]
    pub order: Account<'info, Order>,

    #[account(
        address = order.mint @ BazaarXError::InvalidMint
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        seeds = [b"vault", order.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = order,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = supplier_token_account.owner == order.supplier @ BazaarXError::UnauthorizedSupplier,
        constraint = supplier_token_account.mint == order.mint @ BazaarXError::InvalidMint,
    )]
    pub supplier_token_account: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

pub fn handler(ctx: Context<ReleasePayment>) -> Result<()> {
    let order = &mut ctx.accounts.order;

    // State machine check: Order must be in Delivered state
    require!(
        order.state == OrderState::Delivered,
        BazaarXError::InvalidOrderState
    );

    // Derived signer seeds for the Order PDA authority
    let buyer_key = order.buyer;
    let order_id_bytes = order.order_id.to_le_bytes();
    let bump = order.bump;

    let seeds = &[
        Order::SEED_PREFIX,
        buyer_key.as_ref(),
        &order_id_bytes,
        &[bump],
    ];
    let signer_seeds = &[&seeds[..]];

    // CPI transfer from vault to supplier's token account signed by Order PDA
    let transfer_ctx = CpiContext::new_with_signer(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.supplier_token_account.to_account_info(),
            authority: order.to_account_info(),
        },
        signer_seeds,
    );
    token::transfer(transfer_ctx, order.amount)?;

    order.state = OrderState::Completed;

    Ok(())
}
