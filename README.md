# BazaarX

> **Nepal's programmable B2B wholesale settlement marketplace on Solana.**

BazaarX facilitates secure on-chain wholesale trade between buyers (retailers, distributors) and suppliers. In traditional trade networks, counterparty risk, delayed settlements, and payment defaults are major friction points. BazaarX solves this by anchoring trade agreements and financial custody on Solana.

---

## Core Financial Principle: Non-Custodial Security

**The BazaarX backend NEVER has custody of buyer or supplier funds.**

* **Off-Chain Backend Role**: Handles product catalog discovery, search indexing, image hosting, business profiles, and communication.
* **On-Chain Solana Program Role**: Holds absolute financial authority, controls escrow vaults, validates trade state transitions, and releases or refunds capital according to immutable rules.

---

## Day-1 Architecture & Scope

Day 1 focuses entirely on establishing the immutable on-chain trade agreement foundation:

```text
Buyer (Signer)
  │
  │ create_order(order_id, supplier, mint, amount)
  ▼
[ Order PDA ] ─── State: CREATED
  │
  │ accept_order()
  ▼
Supplier (Signer)
  │
  ▼
[ Order PDA ] ─── State: ACCEPTED
```

At the conclusion of Day 1, no token transfers occur yet. Instead, the contract establishes an authenticated, deterministic commitment between the buyer and designated supplier.

---

## On-Chain vs. Off-Chain Separation

| Data Element | Layer | Justification |
|---|---|---|
| Order State (`Created`, `Accepted`, etc.) | **On-Chain (Order PDA)** | Must be enforced by smart contract logic to prevent unauthorized state manipulation. |
| Buyer & Supplier Public Keys | **On-Chain (Order PDA)** | Authority verification for subsequent escrow funding and fulfillment steps. |
| Agreed Payment Amount & Mint | **On-Chain (Order PDA)** | Prevents price slippage or currency tampering before escrow funding. |
| Timestamps (`created_at`, `accepted_at`) | **On-Chain (Clock)** | Trusted time source for auditability, delivery SLA tracking, and dispute windows. |
| Product SKUs, Descriptions, Images | **Off-Chain (Database)** | High byte volume; non-financial metadata does not belong in expensive on-chain storage. |
| Business Registration & KYB Data | **Off-Chain (Database)** | Off-chain compliance records referenced by wallet address. |

---

## PDA Derivation Model

### 1. Config PDA
Global protocol configuration storing administrative controls and the canonical token mint accepted for settlements (e.g. USDC).

* **Seeds**: `["config"]`
* **Account Structure**:
  ```rust
  pub struct Config {
      pub admin: Pubkey,      // 32 bytes: Admin authority
      pub usdc_mint: Pubkey,  // 32 bytes: Canonical USDC mint
      pub bump: u8,           // 1 byte: Canonical PDA bump
  }
  ```
* **Space**: `8 + 32 + 32 + 1 = 73 bytes`

### 2. Order PDA
Unique, deterministic trade account binding an individual buyer to a specific order ID.

* **Seeds**: `["order", buyer.key(), order_id.to_le_bytes()]`
* **Account Structure**:
  ```rust
  pub struct Order {
      pub order_id: u64,       // 8 bytes: Order identifier
      pub buyer: Pubkey,       // 32 bytes: Buyer wallet (creator & payer)
      pub supplier: Pubkey,    // 32 bytes: Designated supplier wallet
      pub mint: Pubkey,        // 32 bytes: Settlement token mint
      pub amount: u64,         // 8 bytes: Settlement amount (in minor units)
      pub state: OrderState,   // 1 byte: Trade lifecycle state
      pub created_at: i64,     // 8 bytes: Creation timestamp
      pub accepted_at: i64,    // 8 bytes: Acceptance timestamp
      pub bump: u8,            // 1 byte: Order PDA bump
  }
  ```
* **Space**: `8 + 8 + 32 + 32 + 32 + 8 + 1 + 8 + 8 + 1 = 148 bytes`

---

## Order State Machine

The complete trade lifecycle consists of 8 distinct states:

```rust
pub enum OrderState {
    Created,    // Day 1
    Accepted,   // Day 1
    Funded,     // Day 2 (Future)
    Shipped,    // Day 3 (Future)
    Delivered,  // Day 4 (Future)
    Disputed,   // Day 5 (Future)
    Completed,  // Day 4 (Future)
    Refunded,   // Day 5 (Future)
}
```

### Day-1 Transition Rule
The only valid state transition on Day 1 is:

$$\text{Created} \longrightarrow \text{Accepted}$$

All other transitions (`Accepted -> Created`, `Accepted -> Completed`, `Created -> Shipped`, etc.) are strictly rejected.

---

## Security Enforcements

1. **Self-Dealing Prevention**:
   `ctx.accounts.buyer.key() != supplier` (A buyer cannot create an order with themselves as the supplier).
2. **Positive Value Enforcement**:
   `amount > 0` (Zero-value orders are rejected).
3. **Canonical Token Mint Enforcement**:
   `mint == ctx.accounts.config.usdc_mint` (Prevents bad actors from locking orders using fake/arbitrary SPL tokens).
4. **Deterministic PDA Derivation**:
   `seeds = ["order", buyer.key().as_ref(), &order_id.to_le_bytes()]` with `bump` verification prevents arbitrary account injection.
5. **Supplier Authorization**:
   `has_one = supplier` on `accept_order` ensures only the supplier explicitly designated in the order account can accept it.
6. **State Transition Guard**:
   `accept_order` validates `order.state == OrderState::Created`, preventing double-acceptance or modifying orders in subsequent states.

---

## Future Escrow Model (Day-2 Readiness)

On Day 2, we will introduce the SPL token vault:

```text
Buyer
  │
  │ transfers USDC
  ▼
[ Vault Token Account (PDA-Owned) ]
  │
  ├── State: FUNDED
  │
  │ (Fulfillment verified)
  ▼
Supplier receives USDC
```

### Day-2 Prerequisites Completed Today:
* ✅ Order PDA uniquely stores `buyer`, `supplier`, `amount`, and canonical `mint`.
* ✅ Order PDA can act as the authority seed for deriving the Day-2 token vault (`["vault", order.key()]`).
* ✅ `OrderState::Funded` is already defined in the enum.

---

---

## Project Structure

```text
bazarX/
├── frontend/                # Next.js 14 App Router (Tailwind CSS, Solana Wallet Adapter)
│   ├── app/                 # Routes: Marketplace, Orders, Dashboards, Admin
│   ├── components/          # Reusable UI components & WalletContextProvider
│   ├── lib/                 # Solana SDK, types, mock data & client store
│   ├── package.json         # Independent frontend dependencies
│   └── tsconfig.json
├── backend/                 # Node.js + Express + Prisma API Service
│   ├── src/
│   │   ├── routes/          # /api/products, /api/orders
│   │   ├── server.ts        # Express server entry point (port 5000)
│   │   ├── store.ts         # In-memory / DB storage layer
│   │   └── types.ts         # Backend data models
│   ├── prisma/
│   │   └── schema.prisma    # Prisma relational schema (SQLite / PostgreSQL)
│   ├── package.json         # Independent backend dependencies
│   └── tsconfig.json
├── programs/
│   └── bazaarx/             # Solana Anchor smart contract (Rust)
│       └── src/
│           ├── lib.rs       # Program entry point & instruction routing
│           ├── errors.rs    # Program error codes
│           ├── instructions/# initialize_config, create_order, accept_order
│           └── state/       # Config and Order account structures
├── tests/
│   └── bazaarx.ts           # Anchor TypeScript mocha integration tests
├── Anchor.toml              # Anchor workspace configuration
├── Cargo.toml               # Rust workspace manifest
└── package.json             # Root scripts for testing & workspaces
```

---

## Running Locally

### 1. Run Backend Service (Express on Port 5000)
```bash
# From root:
npm run dev:backend

# Or directly inside backend/:
cd backend
npm run dev
```

### 2. Run Frontend Application (Next.js on Port 3000)
```bash
# From root:
npm run dev:frontend

# Or directly inside frontend/:
cd frontend
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser. API calls are automatically routed to the backend or handled via local state.

### 3. Run Smart Contract Tests (Anchor)
```bash
npm test
```

---

## Toolchain & Verification Instructions

### Prerequisites
* Rust & Cargo (`rustc >= 1.75.0`)
* Solana CLI (`>= 1.18.0` or Agave `>= 2.0.0`)
* Anchor CLI (`0.30.1`)
* Node.js (`>= 18.0.0`) & NPM

> *Note: On Windows machines, Solana SBF program compilation requires running inside **WSL 2 (Ubuntu)** due to Linux ELF linker dependencies.*

### Commands
```bash
# 1. Install client dependencies
npm install

# 2. Build program (inside Linux/WSL environment with Solana CLI)
anchor build

# 3. Execute unit and security integration test suite
anchor test
```

