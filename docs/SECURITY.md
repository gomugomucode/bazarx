# BazaarX — Security Architecture & Threat Audit

**Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`  
**Network:** Solana Devnet  
**Audit Date:** October 4, 2026  
**Status:** **AUDITED, HARDENED & TESTED (Devnet & Acceptance Suite)**

---

## 1. Threat Model & Core Design Principles

The BazaarX security architecture enforces **Non-Custodial Financial Settlement** combined with **Zero-Trust Application Authentication**:

1. **Untrusted Application Layer**: The Next.js frontend, Express backend, and JSON/database stores are treated as off-chain routing layers. The application possesses zero authority to move, redirect, or freeze escrow funds.
2. **Immutable On-Chain Authority**: The Solana Anchor program is the sole arbiter of trade lifecycle states, escrow vault balances, and automated fund releases.
3. **No Private Key Custody**: BazaarX never requests, handles, transmits, or stores private keys or seed phrases.
4. **Server-Side Route Protection**: Protected routes (`/dashboard`, `/profile`, `/orders/[id]`, `/admin`) are intercepted at the server edge by Next.js middleware, preventing unauthenticated clients from accessing private order or dashboard data.
5. **Separation of Identity vs. Signing**: Application authentication (`bazarx_session`) authorizes access to business dashboards; only the connected Solana wallet can sign on-chain transactions.

---

## 2. On-Chain Smart Contract Exploit Defense (Solana Devnet)

All 7 core smart contract attack vectors were verified directly on Solana Devnet (`scripts/test_security_devnet.ts`) and proven **BLOCKED ON-CHAIN**:

| Attack Scenario | Tested Exploit | Expected Program Error | Devnet Runtime Result | Status |
| :--- | :--- | :--- | :--- | :--- |
| **1. Zero Amount Order** | Buyer attempts to create order with `amount = 0` | `BazaarXError::InvalidAmount` | Transaction failed with error code `6001` | **BLOCKED ON-CHAIN** |
| **2. Self-Trading** | Buyer sets `supplier = buyer.key()` | `BazaarXError::InvalidSupplier` | Transaction failed with error code `6008` | **BLOCKED ON-CHAIN** |
| **3. Fake Mint Substitution** | Buyer creates order with unapproved arbitrary mint | `BazaarXError::InvalidMint` | Transaction failed with error code `6002` | **BLOCKED ON-CHAIN** |
| **4. Unauthorized Acceptance** | Attacker calls `accept_order` on someone else's order | `BazaarXError::UnauthorizedSupplier` | Transaction failed with error code `6003` (`has_one` check) | **BLOCKED ON-CHAIN** |
| **5. State Skipping** | Supplier calls `mark_shipped` on order in `Created` state | `BazaarXError::InvalidOrderState` | Transaction failed with error code `6004` | **BLOCKED ON-CHAIN** |
| **6. Unauthorized Delivery** | Attacker calls `confirm_delivery` on buyer's order | `BazaarXError::UnauthorizedBuyer` | Transaction failed with error code `6004` | **BLOCKED ON-CHAIN** |
| **7. Premature Payment Release** | Attacker calls `release_payment` before goods are delivered | `BazaarXError::InvalidOrderState` / `AccountNotInitialized` | Transaction rejected by Anchor runtime | **BLOCKED ON-CHAIN** |

---

## 3. Application Authentication & Route Protection Audit

The application layer was hardened with server-side edge interception and tested across 18 distinct security scenarios via `scripts/test-acceptance.mjs`:

```text
====================================================
BazaarX Acceptance Test Suite - 18 Security Scenarios
====================================================
[PASS] Test 1: GET / Public Navbar: Login/Register visible; Dashboard & Connect Wallet absent
[PASS] Test 2: Logged-out GET /dashboard redirects to /login?redirect=/dashboard via HTTP 307
[PASS] Test 3: Logged-out GET /profile redirects to /login?redirect=/profile via HTTP 307
[PASS] Test 4: Logged-out GET /orders/<id> redirects to /login?redirect=/orders/<id> via HTTP 307
[PASS] Test 5: Logged-out GET /admin redirects to /login?redirect=/admin via HTTP 307
[PASS] Test 6: Buyer login receives valid HTTP-only session cookie and role BUYER
[PASS] Test 7: Supplier login receives valid HTTP-only session cookie and role SUPPLIER
[PASS] Test 8: Admin login receives valid HTTP-only session cookie and role ADMIN
[PASS] Test 9: Buyer requesting ?role=SUPPLIER is strictly constrained to BUYER authority
[PASS] Test 10: Authenticated BUYER attempting GET /admin is denied with HTTP 403 Forbidden
[PASS] Test 11: Authenticated SUPPLIER attempting GET /admin is denied with HTTP 403 Forbidden
[PASS] Test 12: Unauthenticated GET /api/orders/<id> returns HTTP 401 Unauthorized
[PASS] Test 13: Authenticated unrelated user requesting another user order returns HTTP 403 Forbidden
[PASS] Test 14: ADMIN self-registration attempt is strictly rejected with HTTP 400
[PASS] Test 15: Duplicate settlement wallet linking is rejected with HTTP 400
[PASS] Test 16: Invalid wallet public key format rejected with HTTP 400
[PASS] Test 17: PAN & Citizenship numbers are never exposed publicly and are masked in user profiles
[PASS] Test 18: Logout invalidates session token server-side and re-locks protected routes
====================================================
ACCEPTANCE SUMMARY: 18/18 PASSED (100%)
====================================================
```

---

## 4. Key Security Controls & Defenses

### 4.1. Edge Middleware Protection
Next.js Edge Middleware (`frontend/middleware.ts`) intercepts requests before rendering or executing client JavaScript:
* Unauthenticated visitors attempting to reach `/dashboard`, `/profile`, `/orders/:path*`, or `/admin` receive an immediate `HTTP 307 Temporary Redirect` to `/login?redirect=...`.
* Authenticated users without the internally assigned `ADMIN` role attempting to access `/admin` receive an immediate server-side `HTTP 403 Forbidden` response.

### 4.2. Role Tampering Neutralization
* The requested role via query parameters (e.g., `?role=SUPPLIER`) is strictly checked against the authenticated user's server-verified `user.roles` list. A buyer cannot access supplier views, and normal users cannot escalate to `ADMIN`.

### 4.3. Cross-User Data Isolation
* `GET /api/orders/:id` requires an active session and verifies that the requester is the buyer, designated supplier, or an admin. Unrelated users receive `HTTP 403 Forbidden`.
* `GET /api/orders` scopes order queries strictly to the authenticated user's registered settlement wallet.

### 4.4. PII & Government Credential Privacy
* National Citizenship and PAN numbers are collected for business compliance but are **strictly masked** (`•••••••1234`) in profile API responses.
* Zero government credentials or personal identifiers are ever written to Solana PDA seeds, instruction data, transaction memos, or public URLs.

---

## 5. Explicit Security Limitations & Production Roadmap

1. **Wallet Linking vs. Cryptographic Ownership (SIWS)**:
   * Current wallet linking validates Base58 public key format and enforces address uniqueness across accounts.
   * It links the settlement address for business order routing and profile display, but does **not** perform an Ed25519 signature challenge over a server-issued nonce.
   * Non-custodial cryptographic signing is strictly enforced on-chain by the Solana Anchor runtime at instruction dispatch time.
2. **Identity Verification Scope**:
   * New registrations start in `PENDING` status. BazaarX does **not** claim automated or government-integrated KYC for this hackathon version; verification is labeled as manual compliance review.
3. **Session Persistence**:
   * Sessions use PBKDF2 salted password hashing and 32-byte hex tokens stored in `.bazaarx_sessions.json`. Multi-region production deployment should migrate to Redis or PostgreSQL with distributed session locks.
