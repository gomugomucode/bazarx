# BazaarX — System Requirements & Specifications

**Project:** BazaarX — Programmable B2B Wholesale Settlement for Nepal  
**Target Blockchain:** Solana Devnet  
**Canonical Settlement Mint:** Circle Devnet USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`)  
**Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`  

---

## 1. Product Context & Objectives

In Nepal's wholesale economy (e.g. agricultural commodities, cooking oils, grains moving along trade corridors like Birgunj-Kathmandu or Butwal-Pokhara), commerce is heavily constrained by **counterparty trust risk**:
* **Buyer Risk**: Pre-paying 100% upfront risks supplier default, substandard crop quality, or transit damage along hazardous mountain corridors.
* **Supplier Risk**: Supplying goods on credit (30–60 day *dhukuti* / *khata*) leads to chronic defaults, working capital starvation, and collection friction.

**BazaarX** resolves this deadlock by replacing informal credit and central exchange custody with **programmable, non-custodial smart contracts on Solana**.

---

## 2. Order Lifecycle State Machine

```text
[Created] ──(Supplier accepts)──> [Accepted] ──(Buyer deposits USDC)──> [Funded]
                                                                            │
[Completed] <──(Program releases payment)── [Delivered] <──(Buyer confirms)─ [Shipped]
```

1. **Created**: Buyer creates an on-chain `Order` PDA specifying quantity, agreed unit price in USDC, and designated supplier.
2. **Accepted**: Designated supplier cryptographically signs to commit stock and delivery SLA.
3. **Funded**: Buyer transfers USDC collateral into the program-derived `Vault` PDA (`["vault", order_pda]`).
4. **Shipped**: Supplier hands freight to highway carrier and signs dispatch record.
5. **Delivered**: Buyer physically inspects consignment at warehouse and cryptographically signs delivery receipt.
6. **Completed**: Smart contract invokes Cross-Program Invocation (CPI) to transfer USDC from `Vault` directly to the supplier's token account.

---

## 3. Functional Requirements

### 3.1. Wallet Experience (B2B Fintech Standard)
* **State A (Disconnected)**: Prominent `[ Connect Wallet ]` trigger that opens the standard Solana wallet modal without page redirects.
* **State B (Connecting)**: Disabled `Connecting...` button with an active spinner to prevent repeated clicks.
* **State C (Connected)**: Displays `[ 0.143 SOL | 6VBK...CEM1 | DEVNET ]` with active pulse indicator.
* **Account Dropdown**:
  * Truncated public key with one-click copy (`"Copied!"` indicator with clipboard error fallback).
  * Direct link to Solana Explorer using `?cluster=devnet`.
  * Real-time query of native SOL balance and Devnet USDC token balance with on-demand refresh spinner.
  * Informational Circle Devnet Faucet link when USDC balance is `0.00` (does not look like a purchase option).
  * Clean `Disconnect` action and non-custodial trust statement.

### 3.2. Order Management & Escrow Funding
* **Order Detail View**: Live Solana RPC synchronization displaying verified on-chain state, Order PDA, settlement token, and vault balance.
* **Funding Pre-Validation**: Client pre-validates:
  * SOL gas balance ($\ge 0.001\text{ SOL}$) before initiating transaction.
  * USDC balance ($\ge \text{order.amountUsdc}$) before initiating transaction.
* **Confirmation Modal**: High-impact financial actions require user confirmation detailing:
  * **Amount**: Order total (e.g. `1.00 USDC`).
  * **Destination**: `Solana escrow vault`.
  * **Purpose**: `Lock payment until delivery confirmation`.
  * **Action**: `Fund Escrow`.
* **Transaction Feedback**: 6-stage lifecycle (`ready`, `waiting_approval`, `sending`, `confirming`, `confirmed`, `failed`). Explorer links rendered strictly when real signatures exist.

### 3.3. Wholesale Marketplace Catalog
* **Display Fields**: Product Name, Supplier Name, Supplier Location, Wholesale Price (USDC and NPR equivalent), Minimum Order Quantity (MOQ), and Category.
* **Filters & Search**: Fast client-side category pill filtering and instant keyword search.
* **Wallet Guard**: Disconnected buyers clicking to order receive an inline `"Wallet Connection Required"` prompt without page redirection.

---

## 4. Non-Functional & Security Requirements

1. **Absolute Non-Custodial Architecture**: Neither backend servers nor database ever hold private keys or escrow balances.
2. **Zero Simulated Signatures in Production**: Purged all `demo_preview_` and `preview_mode_` fallbacks; transactions strictly require genuine Solana wallet approval.
3. **On-Chain Attack Invariants**:
   * Order amount must be positive ($> 0$).
   * Buyer cannot equal supplier (no self-trading).
   * Token mint must match canonical protocol USDC mint (`4zMMC...ncDU`).
   * State transitions strictly enforced via Anchor account guards (`has_one` checks).
4. **Responsive Integrity**: Flawless layout and touch targets at 375px (mobile), 768px (tablet), 1280px (desktop), and 1920px (widescreen). Zero horizontal overflow.
5. **Secure Tab Isolation**: All external links enforce `rel="noopener noreferrer"`.
6. **Precise Trust Language**: Replaced marketing claims (`"Trustless"`, `"100%"`, `"BazaarX guarantees"`) with accurate cryptographic custody explanations.
