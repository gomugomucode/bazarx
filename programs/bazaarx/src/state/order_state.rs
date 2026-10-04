use anchor_lang::prelude::*;

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, Debug, InitSpace)]
pub enum OrderState {
    Created,
    Accepted,
    Funded,
    Shipped,
    Delivered,
    Disputed,
    Completed,
    Refunded,
}
