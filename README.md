# BazaarX

> **Nepal's non-custodial B2B wholesale marketplace with Solana escrow settlement.**

BazaarX combines an off-chain enterprise B2B discovery and ordering platform with non-custodial Solana Anchor escrow smart contracts. By decoupling business onboarding and order management from blockchain signing, normal business buyers and suppliers can discover commodities, negotiate agreements, and manage consignments, connecting their Solana settlement wallet only when an on-chain transaction signature is required.

---

## ⚡ Live Protocol Parameters (Solana Devnet)

* **Program ID:** [`BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`](https://explorer.solana.com/address/BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN?cluster=devnet)
* **Program Deployment Tx:** [`27TpVCBYyqAuJqNs...`](https://explorer.solana.com/tx/27TpVCBYyqAuJqNsEp7xfcR31ZLu4JaRUk8ZWogv2wpMHjBNJQqWRbzpmfZoa89Kxnv7LGLi1CvPNp7b7iTV9Ey4?cluster=devnet)
* **Admin / Upgrade Authority:** `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`
* **Protocol Config PDA:** `DscHbC3D6FXeaRZ29WA8qeM61ex8dQUMCsLxpqxVVDDX` (Bump: 255)
* **Canonical Settlement Token:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Official Circle Devnet USDC)
* **Live Order #80024 PDA:** [`GivpLzmmEH5M2WVbWqbjGRsSSSZxTvcGLFoC6rvwWFUm`](https://explorer.solana.com/address/GivpLzmmEH5M2WVbWqbjGRsSSSZxTvcGLFoC6rvwWFUm?cluster=devnet) *(Accepted State)*

---

## 🏗️ New Product Principle: Authentication-First B2B Architecture

BazaarX does **not** force a wallet connection as the entry barrier to the application:

```text
LOGIN / REGISTER FIRST ➔ BUSINESS PROFILE ➔ ROLE RESOLUTION ➔ DASHBOARD ➔ WALLET WHEN SIGNING
```

1. **Visit BazaarX**: Browse public wholesale commodities and corridors without connecting a wallet.
2. **Login / Register**: Create an authenticated business account as a **Buyer** or **Supplier** with email and password.
3. **Complete Profile**: Enter business name, contact info, and tax registration details (masked for privacy).
4. **Enter Unified Dashboard**: Access active orders, fulfillment metrics, and trade analytics without an initial wallet prompt.
5. **Connect Settlement Wallet**: Prompted only when an on-chain action requires signing (e.g. Funding Escrow, Shipping, Confirming Receipt).

---

## 🛡️ Core Financial Principle: Non-Custodial Settlement

**BazaarX servers and databases NEVER take custody of buyer or supplier funds.**

* **Application Layer (Next.js + Express)**: Manages catalog search, business profiles, session authorization, and order caching.
* **On-Chain Layer (Solana Anchor Smart Contract)**: Holds exclusive financial authority, governs Program-Derived Address (PDA) escrow vaults, enforces state machine invariants, and executes automated payment release upon verified delivery.

---

## 🔄 6-Stage Programmable Settlement Lifecycle

```text
[Created] ──(Supplier accepts)──> [Accepted] ──(Buyer deposits USDC)──> [Funded]
                                                                            │
[Completed] <──(Program releases payment)── [Delivered] <──(Buyer confirms)─ [Shipped]
```

1. **Created**: Buyer places wholesale order with quantity and delivery warehouse, deriving an immutable Order PDA.
2. **Accepted**: Designated supplier cryptographically signs acceptance, committing inventory and delivery timeline.
3. **Funded**: Buyer locks wholesale USDC into the program-owned escrow vault PDA (`["vault", order_pda]`).
4. **Shipped**: Supplier dispatches freight along Nepal trade corridors (Birgunj-Kathmandu, Butwal-Pokhara).
5. **Delivered**: Buyer inspects consignment at warehouse depot and cryptographically signs delivery confirmation.
6. **Completed**: Smart contract triggers automated CPI transfer of USDC from the vault directly to the supplier wallet.

---

## 🔒 Security Architecture & Automated Test Verification

All security requirements and edge cases are validated by an automated acceptance test suite (`scripts/test-acceptance.mjs`):

* **Server-Side Route Protection**: Next.js Edge Middleware (`frontend/middleware.ts`) intercepts unauthenticated requests to `/dashboard`, `/profile`, `/orders/[id]`, and `/admin` with immediate `HTTP 307` redirects.
* **Admin Access Control**: Non-admin users attempting to access `/admin` receive a server-enforced `HTTP 403 Forbidden` response.
* **Role Tampering Neutralization**: Query parameters like `?role=SUPPLIER` or `?role=ADMIN` on Buyer accounts are strictly overridden by authenticated server session roles.
* **Smart Contract Exploit Defense**: All 7 primary smart contract attack vectors (zero-amount, self-trading, fake mints, unauthorized acceptance/shipping/delivery, premature payout) are **BLOCKED ON-CHAIN** on Solana Devnet.
* **Acceptance Suite Score**: **18/18 Tests Passed (100%)**.

```bash
# Run the acceptance test suite
node scripts/test-acceptance.mjs
```

---

## 👥 Pre-Seeded Demo Credentials

To experience the platform across all three persona roles:

| Role | Email | Password | Organization | Status |
| :--- | :--- | :--- | :--- | :--- |
| **Buyer** | `buyer@bazarx.com` | `password123` | Kathmandu Valley Wholesale Buyer | Verified |
| **Supplier** | `supplier@bazarx.com` | `password123` | Himalayan Organic Farms Pvt Ltd | Verified |
| **Admin** | `admin@bazarx.com` | `password123` | Protocol Administrator | Verified |

---

## 🚀 Getting Started

### 1. Prerequisites
* Node.js v18+
* Solana CLI tools & Anchor v0.31 (optional, for contract recompilation)
* Phantom / Solflare wallet configured for **Solana Devnet**

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-org/bazarx.git
cd bazarX

# Install dependencies
npm install
cd frontend && npm install
cd ../backend && npm install
cd ..
```

### 3. Running Locally
Run both frontend and backend dev servers:

```bash
# Terminal 1 - Backend (port 5000)
cd backend
npm run dev

# Terminal 2 - Frontend (port 3000)
cd frontend
npm run dev
```

Visit [`http://localhost:3000`](http://localhost:3000) in your browser.

---

## 📂 Project Structure

```text
bazarX/
├── docs/                     # Comprehensive architecture and security specs
│   ├── ARCHITECTURE.md       # High-level topology & PDA derivation formulas
│   ├── DEPLOYMENT.md         # Verified Devnet transactions & troubleshooting guide
│   ├── REQUIREMENTS.md       # Product requirements & 6-stage lifecycle specifications
│   ├── SECURITY.md           # Smart contract threat model & 18 acceptance test results
│   └── WORK_DONE.md          # Implementation timeline, resolved issues & changelog
├── frontend/                 # Next.js 14 App Router (Tailwind CSS, Solana Wallet Adapter)
│   ├── app/                  # Routes: /marketplace, /orders, /dashboard, /profile, /admin
│   ├── components/           # Navbar, WalletButton, NetworkStatus, ConfirmModal
│   ├── middleware.ts         # Edge middleware for server-side route & admin protection
│   ├── idl/                  # bazaarx.json (compiled Anchor IDL)
│   ├── lib/                  # solana.ts, AuthContext.tsx, store.ts
│   └── package.json
├── backend/                  # Node.js + Express API Service (port 5000)
│   ├── src/                  # Routes: /api/auth, /api/orders, /api/products
│   └── package.json
├── programs/bazaarx/         # Anchor 0.31 Solana Smart Contract (Rust)
│   └── src/lib.rs            # On-chain escrow state machine & PDA account logic
└── scripts/
    ├── test-acceptance.mjs   # 18-scenario automated authentication & route test suite
    └── test_security_devnet.ts # On-chain smart contract attack simulation suite
```

---

## 📄 License & Hackathon Notice

Built for the **Solana Hackathon 2026**. Licensed under the [MIT License](LICENSE).
