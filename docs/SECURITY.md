# BazaarX — Smart Contract Security & Cryptographic Audit

## 1. Threat Model & Design Principles
The core security thesis of BazaarX is **Non-Custodial Financial Settlement**. The off-chain backend and database are considered untrusted metadata caches. The Solana blockchain and Anchor program remain the sole authority over order state and escrowed funds.

---

## 2. Smart Contract Constraints Audit

### 2.1. Account Validation Matrix
| Instruction | Required Signer | Program PDA Checked | State Check | Token Constraints |
| :--- | :--- | :--- | :--- | :--- |
| `initialize_config` | Admin (`Signer`) | `seeds = [b"config"]` | One-time `init` | Validates canonical mint |
| `create_order` | Buyer (`Signer`) | `seeds = [b"order", buyer, order_id]` | Sets `Created` | `amount > 0`, `buyer != supplier`, `mint == config.usdc_mint` |
| `accept_order` | Supplier (`Signer`) | Existing Order PDA | `state == Created` | `has_one = supplier` |
| `fund_escrow` | Buyer (`Signer`) | `seeds = [b"vault", order.key()]` | `state == Accepted` | `buyer_token_account.owner == buyer`, `buyer_token_account.mint == order.mint` |
| `mark_shipped` | Supplier (`Signer`) | Existing Order PDA | `state == Funded` | `has_one = supplier` |
| `confirm_delivery` | Buyer (`Signer`) | Existing Order PDA | `state == Shipped` | `has_one = buyer` |
| `release_payment` | Caller (`Signer`) | `seeds = [b"vault", order.key()]` | `state == Delivered` | `supplier_token_account.owner == order.supplier`, `supplier_token_account.mint == order.mint` |

---

## 3. Real On-Chain Security & Exploit Test Results (Solana Devnet)

Executed via `scripts/test_security_devnet.ts` directly against deployed program `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`:

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

## 4. Account Serialization Space Verification
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
* **Total Exact Account Space:** `138 bytes` (accurately declared as `Order::LEN`).
