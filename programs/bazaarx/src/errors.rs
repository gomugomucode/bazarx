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

    #[msg("Order state transition is invalid for this instruction")]
    InvalidOrderState,

    #[msg("Only the designated admin can perform this action")]
    UnauthorizedAdmin,
}
