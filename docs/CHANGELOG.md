# BazaarX — Project Changelog & Implementation History

All notable technical updates, architectural changes, audit milestones, and bug fixes across all phases of the BazaarX project are documented here.

---

## [Phase 5] — Vercel Multi-Service Hardening & Dependency Parity
**Date:** October 7–8, 2026

### Added
* Configured local development API proxying in [`frontend/next.config.js`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/frontend/next.config.js) via `rewrites` to route `/api/:path*` directly to the Express backend on port `5000`.
* Synchronized `@solana/spl-token` (`^0.4.8`) directly into [`backend/package.json`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/backend/package.json) and lockfile.
* Created comprehensive documentation suite in [`docs/`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/docs).

### Fixed
* **Resolved Vercel Build Error TS2307**: Fixed compilation error in `backend/src/solana.ts` where `@solana/spl-token` failed to resolve in isolated container builds.
* **Resolved Next.js HTML 404 on API calls in local testing**: Enabled seamless proxying between port `3000` and port `5000`.

### Verified
* Clean backend TypeScript compilation: `npm --prefix backend run build` (Exit code: 0).
* Clean frontend production build: `npm --prefix frontend run build` (Exit code: 0, 15 static pages).

---

## [Phase 4] — Real Solana Devnet Escrow Settlement Verification
**Date:** October 7, 2026

### Added
* Implemented complete automated end-to-end escrow flow script in [`scripts/e2e_escrow_flow.ts`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/scripts/e2e_escrow_flow.ts) with exponential backoff retry logic.
* Added on-chain transaction history discovery via `getSignaturesForAddress` to resume existing orders without duplicate initialization.
* Authored [`PHASE4_DEVNET_SETTLEMENT_REPORT.md`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/PHASE4_DEVNET_SETTLEMENT_REPORT.md) detailing genuine verified transactions on Devnet.

### Changed
* Synchronized Anchor IDLs between frontend and backend to remove erroneous `"signer": true` flag on Program Derived Addresses (`order` and `vault`).

### Verified On-Chain
* **Genuine Devnet USDC Escrow Settlement Completed**:
  $$\text{CREATED} \longrightarrow \text{ACCEPTED} \longrightarrow \text{FUNDED} \longrightarrow \text{SHIPPED} \longrightarrow \text{DELIVERED} \longrightarrow \text{COMPLETED}$$
* **Order #68497 Transactions**:
  1. `create_order`: `5r8i123XozUBywAogXXHsDLVGwcTMCjHZYHn8zYt3HhuRT4f7xDwv9qrhduHRYXNYuF7ERLNed4fQePnP8XtTRbm`
  2. `accept_order`: `5X24pxwaDai2MZjgPqF32SVWPgmBxB26D3kN37BkZjrnZG2pMjGAZBupm4R7vg1CkNctCm7yigLScNBCsXpN63He`
  3. `fund_escrow`: `3x2zt9e1nGQTSmyHbz93RHXsa8A7yKRH5SmE7nLJgj1sfiJPQHtXiu1z8V8gjn5yAW8wig6aTvMZ9fd6jJ1ytHcf`
  4. `mark_shipped`: `4Zg4wnMu7yf4SpwrozBfQyuBbmKEn3qkQGZzd7r3dLAffacBuiK5ft5Qy6uoS7v1dvZkbE9DvVuXWr8fL4UdLTER`
  5. `confirm_delivery`: `2yfWnpGbtTtaFy34efEE3A35GK6AXZZA2cMHPD3kHai6gXFGzCkJS9Uh7t7ChimQgg5sxpv6o3q9s7NXvrkwoSL3`
  6. `release_payment`: `mWdsWPDwJ119u63Ehf3cWxkByCUWPhR23voptVNQaArBEZgsaYeoTWMwWpdp3CtMB2pvqoHhWFerea8EWkyXTaW`
* **Balance Proof**:
  * Buyer USDC: `20.00 USDC` $\rightarrow$ `19.00 USDC` ($-1.00$ USDC).
  * Vault PDA: `0.00 USDC` $\rightarrow$ `1.00 USDC` $\rightarrow$ `0.00 USDC` ($0.00$ retained).
  * Supplier USDC: `0.00 USDC` $\rightarrow$ `1.00 USDC` ($+1.00$ USDC).
  * Unauthorized movement: `0.00 USDC`.

---

## [Phase 3] — Settlement Wallet, Role Authorization & Ledger Isolation
**Date:** October 6–7, 2026

### Added
* Restored **Settlement Wallet** connection section in authenticated user dashboards.
* Implemented role-based ledger isolation in [`backend/src/routes/orders.ts`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/backend/src/routes/orders.ts):
  * Buyers only view purchase orders.
  * Suppliers only view incoming consignment orders.
  * Administrators retain full platform oversight and reconciliation authority.
* Added user profile dropdown in Navbar with hover/click toggle, profile routing, and logout.
* Removed non-functional "DEVNET" text and badges from Navbar header.

### Verified
* Automated test suite `scripts/test_role_visibility.mjs`: **15 / 15 PASSED**.
* Automated test suite `scripts/test_navbar_dropdown.mjs`: **7 / 7 PASSED**.

---

## [Phase 2] — B2B Wholesale Marketplace Overhaul
**Date:** October 5–6, 2026

### Added
* Modern light-theme B2B wholesale marketplace UI tailored for Nepali merchants.
* Supplier product publishing flow: title, category, price, minimum order quantity (MOQ), description, stock.
* Buyer product browsing, filtering (category, search, sorting), MOQ enforcement, and automated stock deductions.
* Automated reconciliation endpoint `POST /api/orders/[id]/reconcile` ensuring database-to-blockchain alignment.

### Verified
* Marketplace end-to-end test suite `scripts/test_marketplace_workflow.mjs`: **26 / 26 PASSED**.

---

## [Phase 1] — Smart Contract Architecture & Deployment
**Date:** October 4, 2026

### Added
* Anchor smart contract in `programs/bazaarx/` implementing non-custodial escrow for B2B orders.
* Global Configuration PDA (`DscHbC3D6FXe...`) locking canonical USDC mint (`4zMMC9srt5...`).
* Six-step lifecycle state machine: `Created`, `Accepted`, `Funded`, `Shipped`, `Delivered`, `Completed`.
* Security exploit test suite `scripts/test_security_devnet.ts` covering 7 primary attack vectors.
* Boundary failure audit suite `scripts/test_boundary_failures.ts` covering 19 failure scenarios.

### Verified On-Chain
* Deployed Anchor program to Solana Devnet (`BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`).
* Verified all 7 exploit tests blocked on-chain.
