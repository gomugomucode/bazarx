# BazaarX Unified Role-Aware Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Consolidate the separate Buyer and Supplier dashboards into ONE unified, role-aware dashboard at `/dashboard` driven by the connected Solana wallet identity, with multi-role switching, unknown-wallet onboarding, modular components, and updated navigation.

**Architecture:** The connected wallet public key serves as the cryptographic identity reference. The frontend queries `/api/users/profile?wallet={pubkey}` to resolve the business profile and roles (`BUYER`, `SUPPLIER`, `ADMIN`). A single `/dashboard` route renders modular, role-tailored components (`DashboardShell`, `DashboardHeader`, `DashboardStats`, `ActionRequiredCard`, `OrdersSection`, `RoleSwitcher`, `OnboardingCard`, `AdminBanner`, `WalletGuard`). Old routes (`/dashboard/buyer`, `/dashboard/supplier`) redirect to `/dashboard`.

**Tech Stack:** Next.js 14 (App Router), React, TypeScript, Tailwind CSS, Lucide icons, Express.js (Node.js backend), Solana Wallet Adapter, Solana Web3.js / Anchor.

**Spec:** [`docs/superpowers/specs/2026-10-04-unified-dashboard-design.md`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/docs/superpowers/specs/2026-10-04-unified-dashboard-design.md)

## Global Constraints
- Do NOT touch Anchor smart contract, Program ID (`BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`), PDA seeds, or IDL.
- Never fabricate USDC or SOL balances, transaction signatures, or on-chain order states.
- Off-chain demo orders must be clearly labeled "Off-chain demo"; real blockchain orders labeled "On-chain".
- Zero-custody architecture: Role controls the UI experience only; Anchor smart contract enforces all on-chain authorization.
- Navbar must contain: `Marketplace`, `Dashboard`, `On-Chain Protocol`, and `Wallet`. No separate Buyer/Supplier primary links.
- Responsive breakpoints to verify: 375px (mobile), 768px (tablet), 1280px (desktop).
- All TypeScript (`npx tsc --noEmit`) and production build (`npm run build`) checks must pass with zero errors.

---

### Task 1: User Profile & Role Resolution Layer

**Files:**
- Modify: `backend/src/types.ts`
- Modify: `backend/src/store.ts`
- Create: `backend/src/routes/users.ts`
- Modify: `backend/src/server.ts`
- Modify: `frontend/lib/types.ts`
- Modify: `frontend/lib/store.ts`
- Create: `frontend/app/api/users/profile/route.ts`
- Create: `frontend/app/api/users/me/route.ts`

**Interfaces:**
- Produces:
  ```ts
  export type UserRole = 'BUYER' | 'SUPPLIER' | 'ADMIN';
  export interface UserProfile {
    wallet: string;
    businessName: string;
    roles: UserRole[];
    createdAt: string;
  }
  ```
- Endpoints:
  - `GET /api/users/profile?wallet={pubkey}` $\rightarrow$ `{ success: boolean, profile: UserProfile | null }`
  - `GET /api/users/me?wallet={pubkey}` $\rightarrow$ `{ success: boolean, profile: UserProfile | null }`
  - `POST /api/users/profile` $\rightarrow$ `{ success: boolean, profile: UserProfile }`

- [ ] **Step 1: Update backend types**
  Add `UserRole` and `UserProfile` to `backend/src/types.ts`.

- [ ] **Step 2: Add profile persistence in `backend/src/store.ts`**
  Add `INITIAL_PROFILES` pre-seeded with:
  - Buyer: `6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K` (`"Kathmandu Valley Wholesale Buyer"`, `["BUYER"]`)
  - Supplier: `8bhuiuQKXQrkofbqzqv3v9TiTJKNHBkq6VR72wnKsBDP` (`"Terai Edible Oils & Food Industries"`, `["SUPPLIER"]`)
  - Admin: `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV` (`"BazaarX Protocol Administrator"`, `["ADMIN", "BUYER", "SUPPLIER"]`)
  Add methods: `getUserProfile(wallet: string): UserProfile | undefined` and `saveUserProfile(profile: UserProfile): UserProfile`. Persist to `.bazaarx_users.json`.

- [ ] **Step 3: Create backend users router in `backend/src/routes/users.ts`**
  Implement `GET /profile`, `GET /me`, and `POST /profile`. Mount in `backend/src/server.ts` at `/api/users`.

- [ ] **Step 4: Update frontend types and store fallback**
  Add `UserRole` and `UserProfile` to `frontend/lib/types.ts`.
  Update `frontend/lib/store.ts` to support `getUserProfile(wallet)`, `saveUserProfile(profile)`, and update `getOrders(wallet?: string | null, role?: string | null)` to filter by wallet and role identically to backend.

- [ ] **Step 5: Create Next.js API proxy routes**
  Implement `frontend/app/api/users/profile/route.ts` and `frontend/app/api/users/me/route.ts` with proxying to backend and fallback to local `frontend/lib/store.ts`. Update `frontend/app/api/orders/route.ts` fallback to pass `wallet` and `role` to `getOrders()`.

- [ ] **Step 6: Test profile endpoints**
  Verify via PowerShell curl:
  `Invoke-RestMethod http://localhost:5000/api/users/profile?wallet=6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K`
  Expected: Returns Buyer profile.

---

### Task 2: Modular Reusable Dashboard UI Components

**Files:**
- Create: `frontend/components/dashboard/DashboardShell.tsx`
- Create: `frontend/components/dashboard/DashboardHeader.tsx`
- Create: `frontend/components/dashboard/RoleSwitcher.tsx`
- Create: `frontend/components/dashboard/DashboardStats.tsx`
- Create: `frontend/components/dashboard/ActionRequiredCard.tsx`
- Create: `frontend/components/dashboard/OrdersSection.tsx`
- Create: `frontend/components/dashboard/OnboardingCard.tsx`
- Create: `frontend/components/dashboard/AdminBanner.tsx`
- Create: `frontend/components/dashboard/WalletGuard.tsx`

**Interfaces:**
- Consumes: `UserProfile`, `UserRole`, `Order`, `useWalletBalance()`, `useWallet()`
- Produces: Reusable UI blocks with strictly styled B2B fintech components.

- [ ] **Step 1: Create `DashboardShell.tsx`**
  Standard layout wrapper providing max-width container, spacing, and header slots.

- [ ] **Step 2: Create `RoleSwitcher.tsx`**
  Interactive dropdown/pill: displays `Viewing as: Buyer ▾` or `Viewing as: Supplier ▾` when `roles.length > 1`. Triggers `onRoleChange(newRole)`.

- [ ] **Step 3: Create `DashboardHeader.tsx`**
  Displays `Good morning, {businessName}`, role-specific subheading, wallet address with copy button and Explorer link, real Devnet SOL/USDC balances, `RoleSwitcher`, and quick CTA button.

- [ ] **Step 4: Create `DashboardStats.tsx`**
  4 summary cards with icons, values, and subtitles:
  - Buyer: `Active Orders`, `Awaiting Action`, `In Escrow ($ USDC)`, `Completed Trades`.
  - Supplier: `Incoming Orders`, `Awaiting Shipment`, `In Transit`, `Completed Trades ($ USDC Revenue)`.

- [ ] **Step 5: Create `ActionRequiredCard.tsx`**
  Identifies highest-priority order requiring on-chain action and provides direct link/action to `/orders/[id]`:
  - Buyer: `Accepted` $\rightarrow$ "Fund Escrow", `Shipped` $\rightarrow$ "Confirm Delivery", `Disputed` $\rightarrow$ "Review Dispute".
  - Supplier: `Created` $\rightarrow$ "Accept Order", `Funded` $\rightarrow$ "Mark Shipped", `Delivered` $\rightarrow$ "Release Payment".
  - If no orders require action: Displays calm "All Caught Up" state.

- [ ] **Step 6: Create `OrdersSection.tsx`**
  Filtered orders table & responsive mobile cards with status badges (`OrderStatusBadge`), on-chain vs off-chain labels, counterparty details, and action buttons. Includes empty states:
  - Buyer empty: "No wholesale orders yet." + [ Browse Marketplace ]
  - Supplier empty: "No incoming orders yet." + [ View Marketplace ]

- [ ] **Step 7: Create `OnboardingCard.tsx`**
  Displays when connected wallet has no profile:
  - Greeting: "Welcome to BazaarX"
  - Role selection cards: `[ Buyer ]` and `[ Supplier ]` with descriptive explanations.
  - Business Name input field.
  - "Complete Business Profile" button invoking `POST /api/users/profile`.

- [ ] **Step 8: Create `AdminBanner.tsx` and `WalletGuard.tsx`**
  - `AdminBanner`: Notice for `ADMIN` role with direct button to `/admin`.
  - `WalletGuard`: Clean prompt: "Connect your wallet — Your wallet identifies your BazaarX business account and is required for trading and on-chain settlement" with `[ Connect Wallet ]` button. Zero fake metrics.

---

### Task 3: Unified `/dashboard` Page Assembly

**Files:**
- Create: `frontend/app/dashboard/page.tsx`

**Interfaces:**
- Consumes: All components from Task 2, `useWallet()`, `/api/users/profile`, `/api/orders`.

- [ ] **Step 1: Implement state management and data orchestration**
  - Check `connected` and `publicKey` from `useWallet()`.
  - Fetch user profile when `publicKey` changes.
  - Support `?role=` query parameter to initialize or override active role.
  - If profile has `roles`, default `activeRole` to stored preference or first role (`BUYER` or `SUPPLIER`).
  - Fetch orders filtered by `wallet` and `role`: `/api/orders?wallet=${publicKey}&role=${activeRole.toLowerCase()}`.

- [ ] **Step 2: Wire conditional view rendering**
  - If disconnected $\rightarrow$ render `WalletGuard`.
  - If connected + loading $\rightarrow$ render spinner skeleton.
  - If connected + no profile $\rightarrow$ render `OnboardingCard`.
  - If connected + valid profile $\rightarrow$ render `DashboardHeader`, `AdminBanner` (if ADMIN), `DashboardStats`, `ActionRequiredCard`, `OrdersSection`.

- [ ] **Step 3: Wire role switching & onboarding updates**
  - Role switch changes `activeRole` and refreshes order queries dynamically without reconnecting wallet.
  - Successful onboarding immediately stores profile in state and activates dashboard view.

---

### Task 4: Navigation Reorganization & Route Redirects

**Files:**
- Modify: `frontend/components/Navbar.tsx`
- Modify: `frontend/app/dashboard/buyer/page.tsx`
- Modify: `frontend/app/dashboard/supplier/page.tsx`

**Interfaces:**
- Primary nav links: `Marketplace`, `Dashboard`, `On-Chain Protocol`.
- Compatibility wrappers: `/dashboard/buyer` $\rightarrow$ redirects to `/dashboard?role=buyer`; `/dashboard/supplier` $\rightarrow$ redirects to `/dashboard?role=supplier`.

- [ ] **Step 1: Update `frontend/components/Navbar.tsx`**
  Change `navLinks` array to:
  ```ts
  const navLinks = [
    { name: 'Marketplace', href: '/marketplace', icon: Store },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'On-Chain Protocol', href: '/admin', icon: Cpu },
  ];
  ```
  Ensure active tab styling matches `/dashboard`.

- [ ] **Step 2: Replace `frontend/app/dashboard/buyer/page.tsx`**
  Make it a thin client wrapper that redirects to `/dashboard?role=buyer` using `useRouter().replace('/dashboard?role=buyer')`.

- [ ] **Step 3: Replace `frontend/app/dashboard/supplier/page.tsx`**
  Make it a thin client wrapper that redirects to `/dashboard?role=supplier` using `useRouter().replace('/dashboard?role=supplier')`.

---

### Task 5: Verification, Building & Responsive Quality Assurance

**Files:**
- All created and modified files.

- [ ] **Step 1: TypeScript compilation check**
  Run `npx tsc --noEmit` in `frontend` and `backend`. Verify 0 errors.

- [ ] **Step 2: Production build check**
  Run `npm run build` in `frontend`. Verify clean build without warnings.

- [ ] **Step 3: Launch clean dev server and test scenarios**
  - Scenario 1: Disconnected wallet $\rightarrow$ prompt connection.
  - Scenario 2: Buyer wallet (`6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K`) $\rightarrow$ shows "Kathmandu Valley Wholesale Buyer", Order #80024 action "Fund Escrow".
  - Scenario 3: Supplier wallet (`8bhuiuQKXQrkofbqzqv3v9TiTJKNHBkq6VR72wnKsBDP`) $\rightarrow$ shows "Terai Edible Oils & Food Industries", supplier fulfillment view.
  - Scenario 4: Admin wallet (`HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`) $\rightarrow$ shows protocol administrator banner with link to `/admin`.
  - Scenario 5: Unknown wallet $\rightarrow$ shows Onboarding card with role selection and business name registration.
  - Scenario 6: Role switcher $\rightarrow$ test toggling between Buyer and Supplier view.

- [ ] **Step 4: Responsive viewport verification**
  Verify layouts at 375px (mobile), 768px (tablet), and 1280px (desktop).
