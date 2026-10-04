# BazaarX — System Architecture & Topology

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
                   │   Anchor Provider   │ │   Prisma Store      │
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
* **Solana Integration:** `@coral-xyz/anchor`, `@solana/web3.js`, `@solana/wallet-adapter-react`.
* **IDL Integration:** Dynamically loads `frontend/idl/bazaarx.json` generated directly from the compiled Anchor smart contract.
* **Responsibilities:**
  * Renders wholesale marketplace catalog, buyer dashboard, supplier dashboard, and admin console.
  * Prompts connected wallet to sign blockchain transactions for order lifecycle operations.
  * Direct client RPC interaction with Solana Devnet.

### 2.2. Backend (`backend/`)
* **Framework:** Express.js with TypeScript and Prisma ORM.
* **Responsibilities:**
  * Off-chain commodity catalog management, search, and category filtering.
  * Indexing and caching on-chain order metadata for fast UI rendering.
  * Exposes REST endpoints (`/api/products`, `/api/orders`, `/health`).

### 2.3. On-Chain Smart Contract (`programs/bazaarx/`)
* **Framework:** Anchor 0.31 on Solana.
* **Responsibilities:**
  * Trustless financial settlement and escrow custody.
  * Program-Derived Addresses (PDAs) ensure that neither BazaarX servers nor any intermediary can access or siphon buyer funds.
  * Atomically transfers funds upon verified delivery.
