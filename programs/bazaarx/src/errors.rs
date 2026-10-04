use anchor_lang::prelude::*;

#[error_code]
pub enum BazaarXError {
    #[msg("Supplier wallet cannot be identical to buyer wallet")]
    InvalidSupplier,

    #[msg("Order amount must be greater than zero")]
    InvalidAmount,

    #[msg("Supplied token mint does not match configured USDC mint")]
    InvalidMint,

    #[msg("Only the designated supplier can accept this order")]
    UnauthorizedSupplier,

    #[msg("Only the designated buyer can perform this action")]
    UnauthorizedBuyer,

    #[msg("Token account does not match designated owner or mint")]
    InvalidTokenAccount,

    #[msg("Order state transition is invalid for this instruction")]
    InvalidOrderState,

    #[msg("Only the designated admin can perform this action")]
    UnauthorizedAdmin,
}
