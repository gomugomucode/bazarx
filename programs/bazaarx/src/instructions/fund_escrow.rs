use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use crate::errors::BazaarXError;
use crate::state::{Order, OrderState};

#[derive(Accounts)]
pub struct FundEscrow<'info> {
    #[account(mut)]
    pub buyer: Signer<'info>,

    #[account(
        mut,
        has_one = buyer @ BazaarXError::UnauthorizedBuyer,
    )]
    pub order: Account<'info, Order>,

    #[account(
        address = order.mint @ BazaarXError::InvalidMint
    )]
    pub mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = buyer_token_account.owner == buyer.key() @ BazaarXError::InvalidTokenAccount,
        constraint = buyer_token_account.mint == order.mint @ BazaarXError::InvalidMint,
    )]
    pub buyer_token_account: Account<'info, TokenAccount>,

    #[cfg(feature = "idl-build")]
    #[account(
        init_if_needed,
        payer = buyer,
        token::mint = mint,
        token::authority = order,
    )]
    pub vault: Account<'info, TokenAccount>,

    #[cfg(not(feature = "idl-build"))]
    #[account(
        init_if_needed,
        payer = buyer,
        seeds = [b"vault", order.key().as_ref()],
        bump,
        token::mint = mint,
        token::authority = order,
    )]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<FundEscrow>) -> Result<()> {
    let order = &mut ctx.accounts.order;

    // State machine check: Order must be in Accepted state
    require!(
        order.state == OrderState::Accepted,
        BazaarXError::InvalidOrderState
    );

    // CPI transfer buyer USDC into program-controlled vault
    let transfer_ctx = CpiContext::new(
        ctx.accounts.token_program.to_account_info(),
        Transfer {
            from: ctx.accounts.buyer_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.buyer.to_account_info(),
        },
    );
    token::transfer(transfer_ctx, order.amount)?;

    order.state = OrderState::Funded;

    Ok(())
}
