# BazaarX Auth-First & Non-Custodial Settlement Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform BazaarX from a wallet-first entry model into a modern B2B SaaS authentication-first architecture (Login/Register -> Business Profile -> Role -> Unified Dashboard -> Settlement Wallet when blockchain signing is required), without breaking the existing Solana Anchor escrow program or cryptographic settlement security.

**Architecture:** Implement dual application authentication and session management via secure HTTP-only cookies (`bazarx_session`) across the Express backend and Next.js frontend proxy routes. Protect private routes (`/dashboard`, `/orders/[id]`, `/profile`, `/admin`) from unauthenticated access. Decouple wallet connection from login identity: wallet becomes the "Settlement Wallet" used strictly for Anchor instruction signing (Escrow Funding, Shipment, Delivery Confirmation, Payment Release), while business identity and role resolution govern application access.

**Tech Stack:** Next.js 14 App Router, React 18, TypeScript, Tailwind CSS, Express, Solana Web3.js, Coral Anchor 0.30/0.31, `@solana/wallet-adapter-react`, Node.js Crypto (PBKDF2).

**Spec:** [docs/superpowers/specs/2026-10-04-unified-dashboard-design.md](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/docs/superpowers/specs/2026-10-04-unified-dashboard-design.md) and User Architecture Prompt.

## Global Constraints

- **No Solana Program Changes:** Never modify Program ID (`BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`), PDAs, Anchor IDL, or smart contract instructions.
- **Privacy Barrier:** Never broadcast PAN, citizenship numbers, phone numbers, or emails to the Solana blockchain, transaction memos, PDA seeds, or public URLs.
- **Verification Honesty:** Never claim "Government verified" or "Identity verified"; use "Verification pending", "Supplier verification required", or "Profile submitted for review".
- **Dashboard Gate:** Logged-out visitors must never access `/dashboard` or private order details; redirect to `/login`.
- **Wallet Decoupling:** Unconnected wallet must not block access to `/dashboard`; prompt to connect wallet only when executing on-chain actions.
- **Role Isolation:** Disallow `?role=SUPPLIER` or `?role=ADMIN` privilege escalation. Admin role is strictly internally assigned.
- **Strict Quality Gates:** `npx tsc --noEmit` must pass with 0 errors across backend and frontend, and `npm run build` must succeed.

---

### Task 1: Store Synchronization, Seed Accounts & Type Definition Alignment

**Files:**
- Modify: `backend/src/store.ts`
- Modify: `backend/.bazaarx_users.json`
- Modify: `frontend/lib/store.ts`
- Modify: `frontend/app/api/users/profile/route.ts`

**Interfaces:**
- Consumes: `UserAccount`, `UserProfile`, `SessionRecord` from `types.ts`
- Produces: Synced user storage and helper functions `saveUserAccount`, `saveUserProfile`, `getUserByEmail`, `getUserById`, `createSession`, `getSession` with consistent demo accounts (`buyer@bazarx.com`, `supplier@bazarx.com`, `admin@bazarx.com`).

- [ ] **Step 1: Inspect and fix `frontend/app/api/users/profile/route.ts` type error**
Replace outdated `saveUserProfile` call with `saveUserAccount` or export `saveUserProfile` in `frontend/lib/store.ts`.

- [ ] **Step 2: Update `backend/src/store.ts` and `frontend/lib/store.ts` to seamlessly handle demo accounts**
Ensure that `.bazaarx_users.json` is initialized with full `INITIAL_ACCOUNTS` so `buyer@bazarx.com`, `supplier@bazarx.com`, and `admin@bazarx.com` with password `password123` can authenticate immediately.

- [ ] **Step 3: Run backend and frontend typecheck**
Run: `npx tsc --noEmit` in `backend` and `npx tsc --noEmit` in `frontend`.
Expected: 0 errors.

---

### Task 2: Backend & Proxy Order Route Protection and Authorization

**Files:**
- Modify: `backend/src/routes/orders.ts`
- Modify: `frontend/app/api/orders/[id]/route.ts`
- Modify: `frontend/app/api/orders/route.ts`

**Interfaces:**
- Consumes: Session token from cookie (`bazarx_session`) or `Authorization: Bearer <token>`
- Produces: Protected `GET /api/orders/:id` returning 401 if unauthenticated and 403 if authenticated user is neither buyer, supplier, nor admin.

- [ ] **Step 1: Add session inspection in `backend/src/routes/orders.ts`**
In `GET /api/orders/:id`, extract session token, resolve `auth` user. If unauthenticated or user doesn't own order (and not admin), reject or restrict private fields.

- [ ] **Step 2: Forward session headers in `frontend/app/api/orders/[id]/route.ts`**
Pass incoming `Cookie` and `Authorization` headers to Express backend, and evaluate ownership in local fallback if backend is offline.

- [ ] **Step 3: Test route protection via curl / fetch test script**
Verify that fetching `/api/orders/ord-80024` without session returns 401 Unauthorized or filtered response, while authenticated buyer/supplier/admin succeeds.

---

### Task 3: Public Registration Page (`/register`) with Buyer & Supplier Workflows

**Files:**
- Create: `frontend/app/register/page.tsx`
- Modify: `frontend/lib/AuthContext.tsx`

**Interfaces:**
- Consumes: `register` from `AuthContext`
- Produces: Two-stage B2B registration:
  1. Role selection ("What are you registering as?": Buyer or Supplier)
  2. Role-specific form with validation:
     - Buyer: Full Name, Business Name, Email, Phone, Citizenship Number, Optional PAN, Password.
     - Supplier: Full Name, Business Name, Email, Phone, PAN Number, Citizenship Number, Password.
  3. Notice clearly stating verification is pending review (no fake government KYC).
  4. Redirection to `/dashboard?role=BUYER` or `/dashboard?role=SUPPLIER` upon completion.

- [ ] **Step 1: Create `frontend/app/register/page.tsx`**
Build responsive UI adhering to BazaarX design tokens with role selector, form validation, masked notices, and security badges.

- [ ] **Step 2: Wire `register` submission to `AuthContext` and test registration**
Verify that submitting Buyer creates account with `role: BUYER`, `verificationStatus: PENDING` and redirects to `/dashboard?role=BUYER`.

- [ ] **Step 3: Run `npx tsc --noEmit` in `frontend`**
Expected: 0 errors.

---

### Task 4: Login Page (`/login`) Polish and Role-Aware Redirection

**Files:**
- Modify: `frontend/app/login/page.tsx`

**Interfaces:**
- Consumes: `login` from `useAuth()`
- Produces: Refined B2B login screen with quick-fill demo buttons for Buyer, Supplier, Admin, error banners, and automatic redirection to role-tailored `/dashboard`.

- [ ] **Step 1: Update `frontend/app/login/page.tsx`**
Ensure redirect honors target return URL (e.g. `?redirect=/orders/ord-80024`) if provided, otherwise routes to `/dashboard?role=BUYER` (for buyers), `/dashboard?role=SUPPLIER` (for suppliers), or `/dashboard` (for multi-role/admin).

- [ ] **Step 2: Test login with demo accounts**
Verify quick-fill login for `buyer@bazarx.com`, `supplier@bazarx.com`, and `admin@bazarx.com`.

---

### Task 5: Navbar & Home Page Public vs Authenticated Experience

**Files:**
- Modify: `frontend/components/Navbar.tsx`
- Modify: `frontend/app/page.tsx`

**Interfaces:**
- Consumes: `user`, `loading`, `logout` from `useAuth()`
- Produces:
  - Logged-out Navbar: BazaarX, Marketplace, How It Works, Login, Register. (NO Dashboard, NO Orders, NO Profile, NO Admin, NO prominent Connect Wallet button).
  - Logged-in Navbar: BazaarX, Marketplace, Dashboard, Orders, Settlement Wallet (`WalletButton`), Profile pill (`/profile`), Logout.
  - Home Page CTAs: Logged out shows "Create Business Account" (`/register`) and "Sign In" (`/login`) / "Browse Marketplace". Removes raw dashboard links.

- [ ] **Step 1: Update `frontend/components/Navbar.tsx`**
Ensure no dashboard or private navigation links appear when `!user`.

- [ ] **Step 2: Update `frontend/app/page.tsx`**
Adjust Hero CTAs and bottom CTA banners to focus on "Create Business Account" and "Browse Wholesale Marketplace".

- [ ] **Step 3: Run `npx tsc --noEmit` in `frontend`**
Expected: 0 errors.

---

### Task 6: Unified Dashboard Auth Gate & Wallet Decoupling

**Files:**
- Modify: `frontend/app/dashboard/page.tsx`
- Modify: `frontend/components/dashboard/DashboardHeader.tsx`
- Modify: `frontend/components/dashboard/WalletGuard.tsx`
- Modify: `frontend/components/dashboard/ActionRequiredCard.tsx`
- Modify: `frontend/components/dashboard/OrdersSection.tsx`

**Interfaces:**
- Consumes: `user` from `useAuth()`, `publicKey`, `connected` from `useWallet()`, `openWalletModal` from `useWalletModal()`
- Produces:
  - If `!user` and not loading: Redirect to `/login` (no dashboard data exposed).
  - If `user`: Render role-tailored dashboard immediately even if wallet is NOT connected!
  - `DashboardHeader`:
    - If wallet disconnected: Display "Settlement Wallet: Not Connected", "Connect wallet when you are ready to perform blockchain settlement", and `[ Connect Settlement Wallet ]` button.
    - If wallet connected: Display address, copy button, Explorer link, real SOL and USDC balances.
    - Displays prominent Verification Status badge (PENDING: "Verification Pending", VERIFIED: "Verified Supplier", REJECTED: "Verification Requires Attention").
  - On-chain actions (Fund Escrow, Accept Order, Mark Shipped):
    - If clicked while wallet disconnected, prompt: "Connect your Solana wallet to fund escrow" / "Connect your Solana wallet to perform this settlement action" and open wallet modal.

- [ ] **Step 1: Update `frontend/app/dashboard/page.tsx`**
Replace wallet-first guard with auth-first session guard. Load orders using `user.wallet || publicKey?.toBase58()`.

- [ ] **Step 2: Update `DashboardHeader.tsx`**
Allow optional `publicKey: PublicKey | null`. Render settlement wallet connect CTA and verification status banner.

- [ ] **Step 3: Update `ActionRequiredCard.tsx` and `OrdersSection.tsx`**
Add wallet connect trigger when executing an action if wallet is disconnected.

- [ ] **Step 4: Run `npx tsc --noEmit` in `frontend`**
Expected: 0 errors.

---

### Task 7: Business Profile Page (`/profile`) with Verification Status & Wallet Linking

**Files:**
- Create: `frontend/app/profile/page.tsx`
- Modify: `frontend/lib/AuthContext.tsx`
- Modify: `backend/src/routes/auth.ts`
- Modify: `frontend/app/api/auth/profile/route.ts`

**Interfaces:**
- Consumes: `user`, `linkWallet`, `refreshUser` from `useAuth()`
- Produces: Dedicated `/profile` route with:
  1. Personal Information (Full Name, Email, Phone)
  2. Business Information (Business Name, Roles)
  3. Verification Status (Status Badge, Masked Citizenship `•••••••1234`, Masked PAN `•••••••5678`, compliance notice)
  4. Settlement Wallet Card (Linked wallet address, Connect & Link Wallet CTA)
  5. Edit details form for permitted non-sensitive fields.

- [ ] **Step 1: Create `frontend/app/profile/page.tsx`**
Build professional B2B profile management screen.

- [ ] **Step 2: Verify wallet linking endpoint and UI**
Ensure clicking "Link Connected Wallet" sends `POST /api/auth/link-wallet` and links the active Solana wallet.

- [ ] **Step 3: Run `npx tsc --noEmit` in `frontend`**
Expected: 0 errors.

---

### Task 8: Protected Order Details Page (`/orders/[id]`) Authorization & Wallet UX

**Files:**
- Modify: `frontend/app/orders/[id]/page.tsx`

**Interfaces:**
- Consumes: `user` from `useAuth()`, `publicKey`, `anchorWallet` from Solana wallet adapter
- Produces:
  1. Auth check: If logged out, redirect to `/login?redirect=/orders/[id]`.
  2. Order ownership check: If authenticated user is neither buyer, supplier, nor admin, show 403 Forbidden ("Access Denied: You do not have permission to view this wholesale order").
  3. Wallet action UX: When Buyer clicks "Fund Escrow" or Supplier clicks "Mark Shipped", if wallet is disconnected, display clear prompt to connect settlement wallet.
  4. Real Anchor transaction execution preserved with 100% fidelity.

- [ ] **Step 1: Add authentication and authorization guards to `frontend/app/orders/[id]/page.tsx`**
- [ ] **Step 2: Preserve all Anchor instructions and RPC balance synchronization**
- [ ] **Step 3: Run `npx tsc --noEmit` in `frontend`**
Expected: 0 errors.

---

### Task 9: Marketplace Order Creation Auth Check & Admin Route Protection

**Files:**
- Modify: `frontend/app/marketplace/[id]/page.tsx`
- Modify: `frontend/app/admin/page.tsx`

**Interfaces:**
- Consumes: `user` from `useAuth()`
- Produces:
  - In product page (`/marketplace/[id]`): When clicking "Create Order", if logged out, display prompt to login/register. If logged in, use `user.businessName` and proceed with Solana order creation.
  - In `/admin`: If user is not logged in or doesn't have `ADMIN` role, redirect to `/login` or show 403 Forbidden.

- [ ] **Step 1: Update `frontend/app/marketplace/[id]/page.tsx` with auth check**
- [ ] **Step 2: Protect `frontend/app/admin/page.tsx` with admin role check**
- [ ] **Step 3: Run `npx tsc --noEmit` in `frontend`**
Expected: 0 errors.

---

### Task 10: Comprehensive Validation, End-to-End Testing & Security Matrix Verification

**Files:**
- All touched files

**Verification Steps:**
- [ ] **Step 1: Backend Typecheck:** `npx tsc --noEmit` in `backend` (0 errors)
- [ ] **Step 2: Frontend Typecheck:** `npx tsc --noEmit` in `frontend` (0 errors)
- [ ] **Step 3: Frontend Build:** `npm run build` in `frontend` (successful production bundle)
- [ ] **Step 4: End-to-End Scenarios:**
  - Logged out: `/dashboard` redirects to `/login`; `/orders/ord-80024` prompts login; navbar has no dashboard; marketplace is accessible.
  - Buyer registration & login: Choose Buyer -> enter details -> redirected to Buyer dashboard -> view buyer orders -> wallet connects as settlement wallet.
  - Supplier registration & login: Choose Supplier -> enter details -> status shows "Pending Verification" -> redirected to Supplier dashboard.
  - Admin login: `admin@bazarx.com` -> Admin banner visible -> `/admin` accessible.
  - Security tests: `?role=SUPPLIER` on buyer does not grant supplier access; `?role=ADMIN` does not grant admin; sensitive credentials not leaked.
- [ ] **Step 5: Generate Final Comprehensive Report**
Cover all 21 points requested in Section 39.
