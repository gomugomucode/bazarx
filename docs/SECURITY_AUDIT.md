# BazaarX — Security Architecture & Threat Audit

**Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`  
**Network:** Solana Devnet  
**Audit Standard:** Strict Zero-Simulation On-Chain Verification  
**Final Status:** **ALL AUDIT TESTS PASSED (100% INVARIANT ENFORCEMENT)**

---

## 1. Threat Model & Non-Custodial Architecture

BazaarX enforces **Non-Custodial Financial Settlement** combined with **Zero-Trust Application Authentication**:

1. **Untrusted Application Layer**: The Next.js frontend, Express backend API, and JSON/database stores are treated as off-chain routing layers. The application possesses **zero authority** to move, redirect, or freeze escrow funds.
2. **Immutable On-Chain Authority**: The Solana Anchor program is the sole arbiter of trade lifecycle states, escrow vault balances, and automated fund releases.
3. **No Private Key Custody**: BazaarX never requests, handles, transmits, or stores private keys or seed phrases.
4. **Server-Side Route Protection**: Protected routes (`/dashboard`, `/profile`, `/orders/[id]`, `/admin`) are intercepted at the server edge by Next.js middleware, preventing unauthenticated clients from accessing private order or dashboard data.
5. **Separation of Identity vs. Signing**: Application authentication (`bazarx_session`) authorizes access to business dashboards; only the connected Solana wallet can sign on-chain transactions.

```
       [Buyer Browser]                       [Supplier Browser]
              │                                      │
              ▼                                      ▼
     Session Cookie Auth                    Session Cookie Auth
              │                                      │
              ▼                                      ▼
      Next.js Middleware                     Next.js Middleware
   (Server-Side 307 Redirect)             (Server-Side 307 Redirect)
              │                                      │
              ▼                                      ▼
     [Express Backend API]                  [Express Backend API]
     • Role Authorization                   • Role Authorization
     • Privacy Masking (PAN/Citizenship)    • Privacy Masking (PAN/Citizenship)
     • Isolated Order Visibility            • Isolated Order Visibility
              │                                      │
              └───────────────────┬──────────────────┘
                                  │
                                  ▼
                     [Solana Devnet Blockchain]
                  Program: BHHaiHFRMyVRqQYp2rd...
                  • PDA State Lock (Order PDA)
                  • Program-Controlled Vault (Vault PDA)
                  • Direct SPL Token CPI Transfers
```

---

## 2. On-Chain Smart Contract Exploit Defense (Solana Devnet)

All 7 core smart contract attack vectors were verified directly against live Solana Devnet validator nodes (`scripts/test_security_devnet.ts`) and proven **BLOCKED ON-CHAIN**:

| # | Attack Scenario | Tested Exploit Vector | Expected Program Error | Devnet Runtime Result | Status |
|---|---|---|---|---|---|
| **1** | **Zero Amount Order** | Buyer attempts to create order with `amount = 0` | `BazaarXError::InvalidAmount` (6001) | Rejected on-chain (`AnchorError: InvalidAmount 6001`) | **BLOCKED ON-CHAIN** |
| **2** | **Self-Trading** | Buyer sets `supplier = buyer.key()` to wash-trade | `BazaarXError::InvalidSupplier` (6000) | Rejected on-chain (`AnchorError: InvalidSupplier 6000`) | **BLOCKED ON-CHAIN** |
| **3** | **Fake Mint Substitution** | Buyer creates order with unapproved arbitrary SPL mint | `BazaarXError::InvalidMint` (6002) | Rejected on-chain (`AnchorError: InvalidMint 6002`) | **BLOCKED ON-CHAIN** |
| **4** | **Unauthorized Acceptance** | Attacker calls `accept_order` on someone else's order | `BazaarXError::UnauthorizedSupplier` (6003) | Rejected on-chain (`has_one` check failed, error 6003) | **BLOCKED ON-CHAIN** |
| **5** | **State Skipping** | Supplier calls `mark_shipped` on order before `Accepted` & `Funded` | `BazaarXError::InvalidOrderState` (6006) | Rejected on-chain (`AnchorError: InvalidOrderState 6006`) | **BLOCKED ON-CHAIN** |
| **6** | **Unauthorized Delivery** | Attacker calls `confirm_delivery` on buyer's order | `BazaarXError::UnauthorizedBuyer` (6004) | Rejected on-chain (`has_one` check failed, error 6004) | **BLOCKED ON-CHAIN** |
| **7** | **Premature Payment Release** | Attacker or supplier calls `release_payment` before goods are delivered | `BazaarXError::InvalidOrderState` (6006) / `AccountNotInitialized` (3012) | Rejected by Anchor runtime before vault execution | **BLOCKED ON-CHAIN** |

---

## 3. Boundary Failure & Invariant Audit (19 Test Scenarios)

The adversarial boundary test suite (`scripts/test_boundary_failures.ts`) verifies failure at **every state machine boundary, authorization gate, and escrow constraint**:

### The Five Core Cryptographic Invariants
1. **Invariant 1: Funds cannot move before acceptance** — Confirmed on Devnet.
2. **Invariant 2: Funds cannot leave escrow before buyer delivery confirmation** — Confirmed on Devnet.
3. **Invariant 3: Supplier cannot manufacture delivery confirmation** — Confirmed on Devnet.
4. **Invariant 4: Payment can only go to designated supplier token account** — Confirmed on Devnet.
5. **Invariant 5: Escrow cannot be released twice (replay protection)** — Confirmed on Devnet.

### Detailed Test Results Breakdown

| Category | Test ID | Scenario | Expected Error | Observed Result | Status |
|---|---|---|---|---|---|
| **State Machine** | 1 | `CREATED → FUND` (attempt funding unaccepted order) | `InvalidOrderState (6006)` | Blocked on-chain (`6006`) | **PASS** |
| **State Machine** | 2 | `CREATED → SHIP` (attempt shipping unaccepted order) | `InvalidOrderState (6006)` | Blocked on-chain (`6006`) | **PASS** |
| **State Machine** | 3 | `CREATED → DELIVERY` (attempt confirming unaccepted order) | `InvalidOrderState (6006)` | Blocked on-chain (`6006`) | **PASS** |
| **State Machine** | 4 | `ACCEPTED → SHIP` (attempt shipping before escrow is funded) | `InvalidOrderState (6006)` | Blocked on-chain (`6006`) | **PASS** |
| **State Machine** | 5 | `ACCEPTED → DELIVERY` (attempt delivery before funded & shipped) | `InvalidOrderState (6006)` | Blocked on-chain (`6006`) | **PASS** |
| **State Machine** | 6 | `ACCEPTED → RELEASE` (premature release before delivery) | `InvalidOrderState (6006)` | Blocked on-chain (`6006`) | **PASS** |
| **Authorization** | 7 | Attacker attempts to accept Supplier A order | `UnauthorizedSupplier (6003)` | Blocked on-chain (`6003`) | **PASS** |
| **Authorization** | 8 | Buyer attempts to accept their own order | `UnauthorizedSupplier (6003)` | Blocked on-chain (`6003`) | **PASS** |
| **Authorization** | 9 | Attacker attempts to confirm delivery | `UnauthorizedBuyer (6004)` | Blocked on-chain (`6004`) | **PASS** |
| **Authorization** | 10 | Supplier attempts to manufacture delivery confirmation | `UnauthorizedBuyer (6004)` | Blocked on-chain (`6004`) | **PASS** |
| **Escrow Constraints** | 11 | Order creation with `amount == 0` | `InvalidAmount (6001)` | Blocked on-chain (`6001`) | **PASS** |
| **Escrow Constraints** | 12 | Order creation with `buyer == supplier` | `InvalidSupplier (6000)` | Blocked on-chain (`6000`) | **PASS** |
| **Escrow Constraints** | 13 | Order creation with unapproved token mint | `InvalidMint (6002)` | Blocked on-chain (`6002`) | **PASS** |
| **Escrow Constraints** | 14 | Funding attempt with insufficient buyer USDC balance | SPL Token CPI error | Rejected by SPL Token CPI | **PASS** |
| **Release Invariants** | 15 | Payment release to attacker token account substitution | `UnauthorizedSupplier (6003)` | Blocked by Anchor constraint | **PASS** |
| **Release Invariants** | 16 | Payment release diverted to buyer token account | `UnauthorizedSupplier (6003)` | Blocked by Anchor constraint | **PASS** |
| **Release Invariants** | 17 | Payment release with mismatched mint | `InvalidMint (6002)` | Blocked by Anchor constraint | **PASS** |
| **Replay Protection** | 18 | Double acceptance replay on already accepted order | `InvalidOrderState (6006)` | Blocked on-chain (`6006`) | **PASS** |
| **Concurrency** | 19 | Concurrent race-condition release attempts on Order PDA | Runtime State Lock | Both rejected on-chain | **PASS** |

---

## 4. Application Authentication & Route Protection (18 Acceptance Tests)

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
ACCEPTANCE SUMMARY: 18/18 PASSED, 0/18 FAILED
====================================================
```

---

## 5. Role-Based Ledger Isolation (15 Tests)

To ensure privacy and multi-tenant business data separation, `scripts/test_role_visibility.mjs` validates that each role only has visibility into orders where they are a legitimate counterparty:

* **Buyer Isolation**:
  * Buyers only retrieve orders where `buyerWallet == session.wallet`.
  * Buyers cannot view orders belonging to other wholesale buyers (e.g. `ord-80027`, `ord-80028`).
  * Direct GET `/api/orders/[id]` requests for other buyers' orders return **HTTP 403 Forbidden**.
* **Supplier Isolation**:
  * Suppliers only retrieve orders for goods they supply (`supplierWallet == session.wallet`).
  * Suppliers cannot view incoming orders of competing suppliers (e.g. Annapurna Agro, Ilam Tea).
  * Direct GET requests for another supplier's incoming order return **HTTP 403 Forbidden**.
* **Admin Governance**:
  * Admins have full read access to all marketplace orders across all counterparties for auditing and compliance.
  * Admins can trigger on-chain reconciliation (`POST /api/orders/[id]/reconcile`) to verify agreement between database state and Solana Devnet accounts.
* **Tampering Invariants**:
  * Query parameter role tampering (`?role=ADMIN`) does not grant administrative privileges.
  * Client-provided wallet headers cannot override verified session identity.
  * Logged-out access returns **HTTP 401 Unauthorized**.
