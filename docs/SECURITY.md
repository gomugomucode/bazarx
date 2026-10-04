# BazaarX — Smart Contract Security & Cryptographic Audit

**Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`  
**Network:** Solana Devnet  
**Audit Date:** October 4, 2026  
**Status:** **AUDITED & TESTED ON DEVNET**

---

## 1. Threat Model & Core Design Principles

The security model of BazaarX is built on the foundation of **Non-Custodial Financial Settlement**:

1. **Untrusted Off-Chain Layer**: The Next.js frontend, Express backend, and PostgreSQL database are treated as completely untrusted metadata caches. The database possesses zero capability to move, redirect, or freeze escrow funds.
2. **Immutable On-Chain Authority**: The Solana Anchor program is the sole arbiter of trade lifecycle states and escrow vault balances.
3. **No Private Key Custody**: BazaarX never requests, handles, or stores private keys or seed phrases. All interactions adhere to the Solana Wallet Standard.
4. **Deterministic PDAs**: Program-Derived Addresses ensure that funds are held strictly by program vaults derived from order public keys, preventing third-party or administrative asset drainage.

---

## 2. Smart Contract Constraints & Access Control Matrix

| Instruction | Required Signer | Program PDA Checked | State Check | Token Constraints | Error Code on Failure |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `initialize_config` | Admin (`Signer`) | `seeds = [b"config"]` | One-time `init` | Validates canonical mint | `AlreadyInUse` / `ConstraintSeeds` |
| `create_order` | Buyer (`Signer`) | `seeds = [b"order", buyer, order_id]` | Sets `Created` | `amount > 0`, `buyer != supplier`, `mint == config.usdc_mint` | `6001`, `6008`, `6002` |
| `accept_order` | Supplier (`Signer`) | Existing Order PDA | `state == Created` | `has_one = supplier` | `6003`, `6004` |
| `fund_escrow` | Buyer (`Signer`) | `seeds = [b"vault", order.key()]` | `state == Accepted` | `buyer_token_account.owner == buyer`, `buyer_token_account.mint == order.mint` | `6004`, `ConstraintTokenOwner` |
| `mark_shipped` | Supplier (`Signer`) | Existing Order PDA | `state == Funded` | `has_one = supplier` | `6003`, `6004` |
| `confirm_delivery` | Buyer (`Signer`) | Existing Order PDA | `state == Shipped` | `has_one = buyer` | `6004`, `ConstraintHasOne` |
| `release_payment` | Caller (`Signer`) | `seeds = [b"vault", order.key()]` | `state == Delivered` | `supplier_token_account.owner == order.supplier`, `supplier_token_account.mint == order.mint` | `6004`, `ConstraintTokenOwner` |

---

## 3. Real On-Chain Security & Exploit Test Results (Solana Devnet)

The automated security exploit test suite (`scripts/test_security_devnet.ts`) was executed directly against deployed program `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`:

| Attack Scenario | Tested Exploit | Expected Program Error | Devnet Runtime Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Zero Amount Order** | Buyer attempts to create order with `amount = 0` | `BazaarXError::InvalidAmount` | Transaction failed with error code `6001` | **BLOCKED ON-CHAIN** |
| **2. Self-Trading** | Buyer sets `supplier = buyer.key()` | `BazaarXError::InvalidSupplier` | Transaction failed with error code `6008` | **BLOCKED ON-CHAIN** |
| **3. Fake Mint Substitution** | Buyer creates order with unapproved arbitrary mint | `BazaarXError::InvalidMint` | Transaction failed with error code `6002` | **BLOCKED ON-CHAIN** |
| **4. Unauthorized Acceptance** | Attacker calls `accept_order` on someone else's order | `BazaarXError::UnauthorizedSupplier` | Transaction failed with error code `6003` (`has_one` check) | **BLOCKED ON-CHAIN** |
| **5. State Skipping** | Supplier calls `mark_shipped` on order in `Created` state | `BazaarXError::InvalidOrderState` | Transaction failed with error code `6004` | **BLOCKED ON-CHAIN** |
| **6. Unauthorized Delivery** | Attacker calls `confirm_delivery` on buyer's order | `BazaarXError::UnauthorizedBuyer` | Transaction failed with error code `6004` | **BLOCKED ON-CHAIN** |
| **7. Premature Payment Release** | Attacker calls `release_payment` before goods are delivered | `BazaarXError::InvalidOrderState` / `AccountNotInitialized` | Transaction rejected by Anchor runtime | **BLOCKED ON-CHAIN** |

---

## 4. Frontend Security & Anti-Phishing Measures

In addition to smart contract level constraints, the client application enforces defensive security controls:

1. **Purged Simulated Signatures**: All fallbacks generating mock hashes (`demo_preview_...`, `preview_mode_...`) were removed. State mutations strictly require verified cryptographic signatures.
2. **Pre-Flight Balance Validation**: Before triggering wallet popups, client checks that:
   * SOL gas balance is sufficient to cover network fees ($\ge 0.001\text{ SOL}$).
   * USDC balance is sufficient to cover order funding ($\ge \text{amount}$).
3. **Transparent Confirmation Modals**: Every high-impact financial action triggers a `ConfirmModal` detailing exact consignment, destination (`Solana escrow vault`), amount, and non-custodial terms.
4. **Hardened External Links**: All external Solana Explorer and faucet links enforce `target="_blank" rel="noopener noreferrer"` to prevent reverse tabnabbing and window tampering.
5. **Cluster Isolation**: NetworkStatus detects the active RPC cluster and warns users if their wallet is connected to a cluster other than Solana Devnet.
6. **Sanitized Error Messaging**: Raw error stack traces are intercepted and mapped to user-friendly status updates (`Transaction cancelled`, `Insufficient USDC balance`, `Insufficient SOL for transaction fees`).

---

## 5. Account Space & Serialization Verification

The `Order` account struct is defined as:

* **Anchor Discriminator:** 8 bytes
* `order_id` (`u64`): 8 bytes
* `buyer` (`Pubkey`): 32 bytes
* `supplier` (`Pubkey`): 32 bytes
* `mint` (`Pubkey`): 32 bytes
* `amount` (`u64`): 8 bytes
* `state` (`OrderState` enum): 1 byte
* `created_at` (`i64`): 8 bytes
* `accepted_at` (`i64`): 8 bytes
* `bump` (`u8`): 1 byte

**Total Exact Account Space:** `138 bytes` (accurately declared in `Order::LEN`). No reallocation is necessary during state transitions.
