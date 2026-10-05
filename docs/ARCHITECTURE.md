# BazaarX — System Architecture & Topology

**Target Network:** Solana Devnet  
**Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`  
**Architecture Pattern:** Authentication-First B2B Marketplace with Non-Custodial Solana Escrow Settlement  

---

## 1. High-Level Architecture Diagram

```text
                               PUBLIC INTERNET
                                      │
            ┌─────────────────────────┴─────────────────────────┐
            ▼                                                   ▼
  Wholesale Marketplace                                   Authentication
   (/marketplace, /)                                    (/login, /register)
   • Public commodity catalog                           • Role Selection (Buyer / Supplier)
   • Specifications & Pricing                           • Secure PBKDF2 Password Verification
            │                                                   │
            │                                                   ▼
            │                                         HTTP-Only Cookie Session
            │                                            (bazarx_session)
            │                                                   │
            └─────────────────────────┬─────────────────────────┘
                                      │
                                      ▼
                       Next.js 14 Edge Middleware
                          (frontend/middleware.ts)
                                      │
               ┌──────────────────────┴──────────────────────┐
               │                                             │
      Authenticated Request                         Unauthenticated Request
               │                                             │
               ▼                                             ▼
       Protected Routes                              HTTP 307 Redirect
 • Unified /dashboard                                  to /login?redirect=...
 • /profile (masked PII)
 • /orders/[id] (party-restricted)
 • /admin (server-enforced 403 for non-admins)
               │
               ▼
   Connect Settlement Wallet
 (Prompted ONLY when signing required)
               │
               ▼ Direct WebSockets / RPC
┌─────────────────────────────────────────────────────────────┐
│                    Solana Devnet Cluster                    │
│                                                             │
│  Anchor Program: BHHaiHFRMyVRqQYp2rdC41DECeNBE544...        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ Config PDA: ["config"]                                │  │
│  │ Order PDA:  ["order", buyer_pubkey, order_id_bytes]   │  │
│  │ Vault PDA:  ["vault", order_pda]                      │  │
│  │ SPL Token Program (CPI Transfers for USDC Devnet)     │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

---

## 2. Architectural Separation of Concerns

BazaarX enforces a strict separation between three distinct operational domains:

| Domain | Authority | Responsibilities | Key Security Boundary |
| :--- | :--- | :--- | :--- |
| **Application Authentication** | Next.js Server & Backend Express | User credentials, sessions (`bazarx_session`), organization profiles, role membership (`BUYER`, `SUPPLIER`, `ADMIN`), order indexing. | Never possesses or manages Solana private keys. Cannot fabricate blockchain signatures. |
| **Edge Route Guard** | Next.js Edge Middleware (`middleware.ts`) | Server-side request interception (`HTTP 307` redirects for unauthenticated users, `HTTP 403` for non-admin `/admin` access). | Executes before React hydration. Prevents unauthorized HTML/JS payload leakage. |
| **Settlement Signer** | Solana Wallet Adapter (Phantom, Solflare, etc.) | Non-custodial cryptographic signing of Anchor instructions. | Prompted only when a blockchain transaction is ready for signature. |
| **On-Chain Protocol** | Solana Anchor Smart Contract | Custody of escrow funds in Program-Derived Address (PDA) vaults, validation of state invariants, programmatic payout execution. | Sole financial authority. Backend database changes have zero influence over vault balances. |

---

## 3. Component Breakdown

### 3.1. Frontend (`frontend/`)
* **Framework:** Next.js 14 (App Router) with React 18, TypeScript, TailwindCSS.
* **Edge Middleware (`frontend/middleware.ts`):**
  * Intercepts `/dashboard`, `/profile`, `/orders/:path*`, and `/admin`.
  * Validates session cookies server-side against `/api/auth/me`.
  * Emits `HTTP 307` for unauthenticated requests and `HTTP 403` for non-admin access to `/admin`.
* **Application Pages:**
  * `/`: Public landing page with clean B2B hero, feature overview, and login/register CTAs.
  * `/marketplace`: Public wholesale commodity catalog with search and filters.
  * `/marketplace/[id]`: Commodity details; viewing is public, creating orders requires authentication.
  * `/login`: Enterprise B2B sign-in with return URL redirection.
  * `/register`: Role-gated onboarding (Buyer vs. Supplier); `ADMIN` self-registration strictly blocked.
  * `/dashboard`: Unified dashboard with dynamic `BUYER` and `SUPPLIER` presentation, masked credentials, and non-blocking settlement wallet banner.
  * `/profile`: Business identity management, masked tax records (`maskedPan`, `maskedCitizenship`), and settlement wallet linking.
  * `/orders/[id]`: Protected wholesale order view with on-chain PDA state sync and 6-stage lifecycle signing.
  * `/admin`: Server-gated protocol governance dashboard restricted to internal `ADMIN` accounts.
* **Key Components:**
  * `Navbar.tsx`: Dual-mode header displaying public links when logged out and authenticated links (`Dashboard`, `Orders`, `WalletButton`, `Profile`, `Logout`) when logged in.
  * `WalletButton.tsx`: Non-custodial settlement wallet button with real-time balance queries and network health indicators.
  * `DashboardHeader.tsx`: Organization identity, active role badge, verification state, and decoupled wallet alert.
  * `ConfirmModal.tsx` & `TransactionStatus.tsx`: Transparent financial confirmation and 6-stage Anchor transaction feedback.

### 3.2. Backend (`backend/`)
* **Framework:** Node.js + Express with TypeScript.
* **Responsibilities:**
  * Authentication endpoints: `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/link-wallet`, `/api/auth/profile`.
  * Session generation and PBKDF2 (`sha512`) password hashing with salted digests.
  * Scoped order APIs: `/api/orders` (filtered by authenticated user wallet) and `/api/orders/:id` (party ownership validation).
  * Safe data sanitization masking raw PAN and Citizenship credentials.

### 3.3. On-Chain Smart Contract (`programs/bazaarx/`)
* **Framework:** Anchor 0.31 on Solana Devnet.
* **Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`
* **Canonical USDC Mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
* **PDA Derivation:**
  * `Config PDA`: `seeds = [b"config"]` (`DscHbC3D6FXeaRZ29WA8qeM61ex8dQUMCsLxpqxVVDDX`)
  * `Order PDA`: `seeds = [b"order", buyer.key().as_ref(), order_id.to_le_bytes().as_ref()]`
  * `Vault PDA`: `seeds = [b"vault", order.key().as_ref()]`

---

## 4. End-to-End B2B Trade & Settlement Flow

```text
1. Onboarding & Authentication:
   Visitor ──(Register as Buyer)──> Password Hash & Session Cookie Issued ──> /dashboard?role=BUYER

2. Order Placement:
   Buyer selects commodity ──(POST /api/orders)──> Backend records order
   Buyer Wallet Adapter ──(create_order Anchor RPC)──> Order PDA created on Devnet [Created]

3. Supplier Acceptance:
   Supplier logs in ──> Reviews incoming order
   Supplier Wallet Adapter ──(accept_order Anchor RPC)──> Order PDA [Accepted]

4. Escrow Funding:
   Buyer clicks "Fund Escrow" ──> Prompts connected Settlement Wallet
   Buyer Wallet Adapter ──(fund_escrow CPI)──> USDC locked in Vault PDA [Funded]

5. Freight Dispatch:
   Supplier dispatches wholesale cargo 
   Supplier Wallet Adapter ──(mark_shipped Anchor RPC)──> Order PDA [Shipped]

6. Delivery Inspection & Payout Release:
   Buyer inspects goods at warehouse
   Buyer Wallet Adapter ──(confirm_delivery Anchor RPC)──> Order PDA [Delivered]
   Program triggers automated CPI payout ──> USDC transferred to Supplier [Completed]
```
