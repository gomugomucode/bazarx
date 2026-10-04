# BazaarX Unified Role-Aware Dashboard Specification

**Document Date:** 2026-10-04  
**Status:** In Review / Approved  
**Author:** Senior Product Architect & Frontend Engineer  
**Scope:** Consolidate `/dashboard/buyer` and `/dashboard/supplier` into ONE unified `/dashboard`.

---

## 1. Executive Summary & Product Decision

BazaarX is Nepal's non-custodial on-chain B2B wholesale marketplace. Previously, users navigated between two segregated dashboards:
- `/dashboard/buyer` (Wholesale procurement & escrow funding)
- `/dashboard/supplier` (Order acceptance & fulfillment)

This design consolidates both interfaces into a single, unified entry point:
`/dashboard`

The connected Solana wallet serves as the cryptographic identity reference. The application resolves the business profile and active role, rendering the appropriate role-tailored workspace with shared high-fidelity components, consistent design tokens, and real-time on-chain transparency.

```
CONNECTED WALLET (Solana Devnet)
       ↓
USER / BUSINESS PROFILE
       ↓
ROLE RESOLUTION (BUYER | SUPPLIER | ADMIN)
       ↓
UNIFIED DASHBOARD (/dashboard)
```

---

## 2. Core Architecture & Data Flow

### 2.1 Identity & Role Resolution
- **Identity Key:** `wallet.publicKey.toBase58()`
- **Profile Endpoint:** `GET /api/users/profile?wallet={publicKey}` (also aliased to `GET /api/users/me?wallet={publicKey}`)
- **Persistence Store:** Dual-persisted in backend `backend/src/store.ts` (`.bazaarx_users.json`) and Next.js proxy route `frontend/app/api/users/profile/route.ts` (with `frontend/lib/store.ts` fallback).
- **Pre-Seeded Test Profiles:**
  1. `6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K`
     - Business Name: `Kathmandu Valley Wholesale Buyer`
     - Roles: `["BUYER"]`
     - Primary Order: `#80024` (Mustang Pure Mustard Cooking Oil, 1 USDC, state `Accepted` $\rightarrow$ action: Fund Escrow)
  2. `8bhuiuQKXQrkofbqzqv3v9TiTJKNHBkq6VR72wnKsBDP`
     - Business Name: `Terai Edible Oils & Food Industries`
     - Roles: `["SUPPLIER"]`
     - Primary Order: `#80024` (Supplier for order #80024, plus sales orders)
  3. `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV` (Program Deployer & Admin)
     - Business Name: `BazaarX Protocol Administrator`
     - Roles: `["ADMIN", "BUYER", "SUPPLIER"]`
- **Unknown Wallets:**
  - If a wallet is connected but has no stored profile, display an **Onboarding Card**:
    - Input: Business Name (e.g., "Pokhara Provision Traders")
    - Role Selector: `Buyer` or `Supplier`
    - Submitting dispatches `POST /api/users/profile`, registering the profile and immediately activating the selected dashboard view.
- **Multi-Role Businesses:**
  - If `roles` includes both `BUYER` and `SUPPLIER` (e.g. `["BUYER", "SUPPLIER"]`), render a `RoleSwitcher`:
    - `Viewing as: Buyer ▾` / `Viewing as: Supplier ▾`
    - Allows seamless switching between procurement and supply views without disconnecting or reconnecting the wallet.

### 2.2 Security & Smart Contract Boundary
- Frontend role resolution **only** controls UI views and navigation.
- All on-chain actions (Escrow Funding, Shipment, Delivery Confirmation, Payment Release) remain cryptographically authorized by the Solana smart contract Anchor program (`BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`) using PDA seeds and signer constraints.
- No passwords, private keys, or custodial credentials are ever stored or transmitted.

---

## 3. Component Hierarchy & Modular Decomposition

Rather than maintaining duplicate page structures, the unified `/dashboard` uses modular, role-configurable components:

```
frontend/app/dashboard/page.tsx
└── DashboardShell
    ├── WalletGuard (if disconnected)
    ├── OnboardingCard (if connected but unknown profile)
    ├── DashboardHeader
    │   ├── Business Greeting ("Good morning, {businessName}")
    │   ├── Role Subtitle & Badges
    │   ├── WalletSummary (Address, Copy, Explorer link, SOL/USDC Devnet Balances)
    │   ├── RoleSwitcher (if user has multiple roles)
    │   └── Primary Action CTA (e.g. "New Wholesale Order" / "Marketplace")
    ├── AdminBanner (if user is ADMIN)
    ├── DashboardStats
    │   └── 4 Metric Cards (Role-configured metrics & counts)
    ├── ActionRequiredCard
    │   └── Highlights highest-priority order requiring on-chain action
    ├── OrdersSection
    │   ├── Order Search & Filter Tabs
    │   └── OrderTable (with Status Badges, Devnet Tags, and Action CTAs)
    └── EmptyState (role-specific empty states when 0 orders exist)
```

### 3.1 Component Specifications

1. **`DashboardShell`**
   - Clean container with `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8`.
   - Responsive background and typography matching BazaarX fintech aesthetic.

2. **`DashboardHeader`**
   - Displays `Good morning, {businessName}`.
   - Subtitle:
     - Buyer: *"Manage your wholesale purchases and on-chain settlement."*
     - Supplier: *"Manage wholesale orders, fulfillment, and settlement."*
   - Displays real Devnet SOL and USDC balances via `useWalletBalance()`.

3. **`RoleSwitcher`**
   - Appears in header when `profile.roles.length > 1`.
   - Dropdown pill: `Viewing as: [Buyer | Supplier]`.
   - Updates `activeRole` state and persists user's viewing preference in session/local storage.

4. **`DashboardStats`**
   - **Buyer View:**
     - `Active Orders` (Total active non-completed orders)
     - `Awaiting Action` (Orders in `Accepted` or `Shipped` requiring buyer transaction)
     - `In Escrow` (Total USDC value locked in program escrow vaults)
     - `Completed Trades` (Successfully settled orders)
   - **Supplier View:**
     - `Incoming Orders` (New orders awaiting acceptance)
     - `Awaiting Shipment` (Orders funded in escrow, ready for fulfillment)
     - `In Transit` (Shipped orders awaiting delivery verification)
     - `Completed Trades` (Total settled revenue received)

5. **`ActionRequiredCard`**
   - Automatically prioritizes the most urgent order requiring wallet action:
     - **Buyer:**
       - `Accepted` $\rightarrow$ **"Fund Escrow"** (Links to `/orders/[id]` with funding CTA)
       - `Shipped` $\rightarrow$ **"Confirm Delivery"** (Links to `/orders/[id]` with delivery sign CTA)
       - `Disputed` $\rightarrow$ **"Review Dispute"**
     - **Supplier:**
       - `Created` $\rightarrow$ **"Accept Order"** (Links to `/orders/[id]` with accept CTA)
       - `Funded` $\rightarrow$ **"Mark Shipped"** (Links to `/orders/[id]` with dispatch CTA)
       - `Delivered` $\rightarrow$ **"Release Payment"** (Links to `/orders/[id]` to verify settlement)
   - If no orders require immediate action, displays a calm "All Caught Up" status card.

6. **`OrdersSection` / `OrderTable`**
   - Enforces wallet-based filtering:
     - Buyer: `order.buyerWallet === publicKey`
     - Supplier: `order.supplierWallet === publicKey`
   - Columns:
     - `Order ID` (e.g., `#80024`)
     - `Commodity Item` (Product name, quantity, unit)
     - `Counterparty` (Supplier name for Buyer, Buyer name for Supplier)
     - `Amount` ($ USDC, with "On-chain" or "Off-chain demo" badge)
     - `Status` (`OrderStatusBadge`)
     - `Next Action` (Direct action button or "Inspect")
   - Responsive cards on mobile (<768px), tabular format on desktop (>=768px).

7. **`OnboardingCard`**
   - Clean, professional card for newly connected wallets:
     - Headline: *"Welcome to BazaarX"*
     - Subhead: *"Connect your business identity to start trading on Solana Devnet."*
     - Radio or button cards:
       - `Buyer`: *"Purchase wholesale commodities and use Solana escrow for risk-free settlement."*
       - `Supplier`: *"Sell wholesale goods and receive automated settlement through Solana escrow."*
     - Business Name input field.
     - Single-click onboarding that immediately sets state and registers profile via API.

8. **`WalletGuard` (Disconnected State)**
   - When no wallet is connected:
     - Headline: *"Connect your wallet"*
     - Description: *"Your wallet identifies your BazaarX business account and is required for trading and on-chain settlement."*
     - Primary button: `[ Connect Wallet ]` (triggers Solana wallet adapter modal).
     - **No fake statistics** or simulated orders are displayed.

9. **`AdminBanner`**
   - When connected wallet is `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV` (or has `ADMIN` role):
     - Displays subtle purple/emerald banner: *"Connected as BazaarX Protocol Administrator"*.
     - Action link: `Open Protocol Admin (/admin)` for smart contract parameter inspection and governance.

---

## 4. Navigation & Route Compatibility

### 4.1 Navbar Reorganization
- Remove distinct `Buyer Orders` and `Supplier Hub` links from primary navigation.
- Standardized Navbar items:
  1. `Marketplace` (`/marketplace`)
  2. `Dashboard` (`/dashboard`)
  3. `On-Chain Protocol` (`/admin`)
  4. Devnet Network Badge & `WalletButton`

### 4.2 Legacy Route Compatibility
- `/dashboard/buyer`: Thin compatibility wrapper that redirects to `/dashboard?role=buyer` (or sets viewing role to Buyer and loads `/dashboard`).
- `/dashboard/supplier`: Thin compatibility wrapper that redirects to `/dashboard?role=supplier` (or sets viewing role to Supplier and loads `/dashboard`).
- Eliminates code duplication while preserving external bookmarks or links.

---

## 5. API Endpoints

### 5.1 `GET /api/users/profile?wallet={publicKey}` (and `/api/users/me`)
- Returns:
  ```json
  {
    "success": true,
    "profile": {
      "wallet": "6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K",
      "businessName": "Kathmandu Valley Wholesale Buyer",
      "roles": ["BUYER"],
      "createdAt": "2026-10-04T08:00:00.000Z"
    }
  }
  ```
- If not found: `{ "success": false, "profile": null }`

### 5.2 `POST /api/users/profile`
- Body:
  ```json
  {
    "wallet": "...",
    "businessName": "...",
    "role": "BUYER" | "SUPPLIER"
  }
  ```
- Registers the profile and returns `{ "success": true, "profile": { ... } }`.

### 5.3 `GET /api/orders?wallet={publicKey}&role={buyer|supplier}`
- Backend and frontend proxy routes enforce filtering:
  - If `role === 'buyer'`, returns orders where `order.buyerWallet === wallet`.
  - If `role === 'supplier'`, returns orders where `order.supplierWallet === wallet`.
  - Fallback in `frontend/lib/store.ts` updated to respect `wallet` and `role` parameters identically.

---

## 6. Verification & Quality Gates

1. **Static Analysis & TypeScript:**
   - `npx tsc --noEmit` must pass with 0 errors across frontend and backend.
   - `npm run build` in `frontend` must compile without warnings.
2. **Scenario Testing:**
   - Scenario A: Disconnected wallet $\rightarrow$ clean connection guard prompt.
   - Scenario B: Buyer wallet (`6VBKbK...`) $\rightarrow$ "Good morning, Kathmandu Valley Wholesale Buyer", active metrics, Order #80024 "Fund Escrow" action.
   - Scenario C: Supplier wallet (`8bhuiu...`) $\rightarrow$ "Good morning, Terai Edible Oils & Food Industries", supplier metrics, sales orders.
   - Scenario D: Unknown wallet $\rightarrow$ Onboarding card with role selection and business profile registration.
   - Scenario E: Admin wallet (`HZT8Ut...`) $\rightarrow$ Administrator badge with direct route to `/admin`.
   - Scenario F: Multi-role wallet $\rightarrow$ `Viewing as: Buyer ▾` / `Viewing as: Supplier ▾` switcher toggles view without disconnect.
3. **Responsive Viewport Verification:**
   - 375px (Mobile): Action cards stack, table converts to responsive card rows, wallet balance does not overflow.
   - 768px (Tablet): Grid cards display 2-column, header flexes cleanly.
   - 1280px (Desktop): Full 4-column metric grid, spacious order register table.
