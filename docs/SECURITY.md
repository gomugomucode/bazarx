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

### 2.2. Critical Attack Vectors & Mitigations

#### A. Unauthorized Acceptance / Theft by Impersonation
* **Attack:** A malicious third party calls `accept_order` on an order meant for a specific supplier.
* **Mitigation:** The `Order` account explicitly records the intended `supplier` pubkey at order creation. The `AcceptOrder` context uses `has_one = supplier`, forcing the transaction signer to match `order.supplier`.

#### B. Premature Payment Drainage
* **Attack:** Supplier attempts to trigger `release_payment` before goods are delivered, or before buyer funds the escrow.
* **Mitigation:** Strict state machine enforcement:
  * `fund_escrow` requires `order.state == OrderState::Accepted`.
  * `mark_shipped` requires `order.state == OrderState::Funded`.
  * `confirm_delivery` requires `order.state == OrderState::Shipped`.
  * `release_payment` requires `order.state == OrderState::Delivered`.
  * Upon execution, state transitions immediately to `OrderState::Completed`.

#### C. Double-Release / Re-entrancy
* **Attack:** Attacker calls `release_payment` repeatedly to drain funds from the vault.
* **Mitigation:** State transitions to `OrderState::Completed` atomically within the instruction handler. Once `Completed`, subsequent calls fail the precondition check `order.state == OrderState::Delivered`.

#### D. Fake Token Substitution
* **Attack:** Buyer deposits a worthless spoofed token into the vault instead of canonical USDC.
* **Mitigation:**
  * Protocol config enforces canonical Circle Devnet USDC mint (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`).
  * `create_order` checks `require_keys_eq!(mint, config.usdc_mint, BazaarXError::InvalidMint)`.
  * `fund_escrow` and `release_payment` check `token::mint = mint` against `order.mint`.

#### E. Vault Authority & Program Signer Seeds
* **Attack:** Attacker creates an arbitrary token account and passes it as the vault.
* **Mitigation:** The vault is derived deterministically as a PDA:
  `seeds = [b"vault", order.key().as_ref()]`
  Its token authority is the `order` PDA itself. Only the program can derive the signer seeds (`[b"order", buyer, order_id, bump]`) to authorize the SPL transfer CPI.

---

## 3. Account Serialization Space Verification
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
