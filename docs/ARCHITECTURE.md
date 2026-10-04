# BazaarX — System Architecture & Topology

**Target Network:** Solana Devnet  
**Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`  
**Architecture Pattern:** Non-Custodial Decentralized Marketplace with Off-Chain Metadata Cache  

---

## 1. High-Level Architecture Diagram

```text
                   ┌──────────────────────────────────────────────┐
                   │               User / Client                  │
                   │   Browser with Solana Wallet (Phantom, etc.)  │
                   └──────────────────────┬───────────────────────┘
                                          │
                  ┌───────────────────────┴───────────────────────┐
                  │          Vercel Multi-Services Edge           │
                  │   vercel.json (Top-Level Routing & Rewrites)  │
                  └───────────┬───────────────────────┬───────────┘
                              │                       │
                       /(.*)  │                       │  /api/(.*)
                              ▼                       ▼
                   ┌─────────────────────┐ ┌─────────────────────┐
                   │      Frontend       │ │       Backend       │
                   │   Next.js 14 App    │ │   Express Service   │
                   │   Tailwind + Lucide │ │   Order/Product API │
                   │   Anchor Provider   │ │   Prisma Data Store │
                   └──────────┬──────────┘ └─────────────────────┘
                              │ (Internal Service Binding: BACKEND_URL)
                              │
                              ▼ Direct RPC WebSockets / HTTP
                   ┌──────────────────────────────────────────────┐
                   │            Solana Devnet Cluster             │
                   │                                              │
                   │  Program ID: BHHaiHFRMyVRqQYp2rdC41DECe...   │
                   │  ┌────────────────────────────────────────┐  │
                   │  │ Config PDA: ["config"]                 │  │
                   │  │ Order PDA:  ["order", buyer, id]       │  │
                   │  │ Vault PDA:  ["vault", orderPda]        │  │
                   │  │ SPL Token Program (CPI Transfers)      │  │
                   │  └────────────────────────────────────────┘  │
                   └──────────────────────────────────────────────┘
```

---

## 2. Component Descriptions

### 2.1. Frontend (`frontend/`)
* **Framework:** Next.js 14 (App Router) with React 18, TypeScript, TailwindCSS.
* **Solana Integration:** `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/wallet-adapter-react`, `@solana/wallet-adapter-react-ui`.
* **IDL Integration:** Dynamically binds with compiled Anchor IDL (`frontend/idl/bazaarx.json`).
* **Core Modular Components:**
  * `WalletButton.tsx`: Non-intrusive B2B button with States A (Disconnected), B (Connecting), and C (Connected). Account dropdown with live balances, 1-click copy, and safe Explorer links.
  * `NetworkStatus.tsx`: Explicit `SOLANA DEVNET` indicator with cluster mismatch detection.
  * `ConfirmModal.tsx`: Cryptographic intent verification before high-value escrow transactions.
  * `TransactionStatus.tsx`: 6-stage lifecycle feedback (`ready`, `waiting_approval`, `sending`, `confirming`, `confirmed`, `failed`).
  * `Timeline.tsx`: Step-by-step visual progression with on-chain signature verification badges.
  * `useWalletBalance.ts`: Live balance hook polling native SOL and Devnet USDC ATA directly from Solana RPC.

### 2.2. Backend (`backend/`)
* **Framework:** Express.js with TypeScript and Prisma ORM.
* **Responsibilities:**
  * Off-chain commodity catalog management, search, and category filtering.
  * Indexing and caching on-chain order metadata for sub-second UI rendering.
  * REST endpoints: `/api/products`, `/api/orders`, `/health`.

### 2.3. On-Chain Smart Contract (`programs/bazaarx/`)
* **Framework:** Anchor 0.31 on Solana.
* **Responsibilities:**
  * Non-custodial escrow vault custody and lifecycle state enforcement.
  * Deterministic PDA derivation model preventing administrative asset diversion.
  * Automated CPI transfer of token balances upon verified physical delivery.

---

## 3. PDA Derivation Model

### 1. Config PDA
Stores protocol administrator and canonical USDC settlement token mint.
* **Seeds:** `[b"config"]`
* **Address:** `DscHbC3D6FXeaRZ29WA8qeM61ex8dQUMCsLxpqxVVDDX` (Bump: 255)

### 2. Order PDA
Unique, deterministic trade account binding an individual buyer to a specific order ID.
* **Seeds:** `[b"order", buyer.key().as_ref(), order_id.to_le_bytes().as_ref()]`
* **Example Order #80024 PDA:** `GivpLzmmEH5M2WVbWqbjGRsSSSZxTvcGLFoC6rvwWFUm`

### 3. Vault PDA
Token account owned by the Anchor program instance holding escrowed USDC tokens.
* **Seeds:** `[b"vault", order.key().as_ref()]`
* **Authority:** The Order PDA itself via program seeds (`bump`).

---

## 4. End-to-End Escrow Settlement Flow

```text
1. Buyer initiates order:
   Buyer Wallet ──(create_order)──> Order PDA [Created]

2. Supplier confirms inventory:
   Supplier Wallet ──(accept_order)──> Order PDA [Accepted]

3. Buyer funds escrow:
   Buyer ATA ──(fund_escrow CPI)──> Vault PDA [Funded]

4. Supplier dispatches freight:
   Supplier Wallet ──(mark_shipped)──> Order PDA [Shipped]

5. Buyer confirms physical receipt:
   Buyer Wallet ──(confirm_delivery)──> Order PDA [Delivered]

6. Program releases payout:
   Vault PDA ──(release_payment CPI)──> Supplier ATA [Completed]
```
