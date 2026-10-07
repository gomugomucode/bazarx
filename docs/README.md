# BazaarX Documentation Portal

Welcome to the comprehensive technical documentation portal for **BazaarX**, Nepal's programmable B2B wholesale settlement marketplace built on Solana Devnet.

---

## 📚 Master Documentation Index

| Document | Topic & Focus Area |
| :--- | :--- |
| 🛡️ [**Security & Threat Audit**](./SECURITY_AUDIT.md) | On-chain smart contract exploit defense (7/7 blocked), 19 boundary failure tests, 18 application acceptance tests, role-based ledger isolation. |
| 🚀 [**Deployment Data & Addresses**](./DEPLOYMENT_DATA.md) | Canonical Program ID, Config PDA, Order #68497 full transaction signatures, Vault PDA, ATAs, and Vercel multi-service topology. |
| ⚡ [**Rate Limits & RPC Handling**](./RATE_LIMITS_AND_RPC.md) | Solana Devnet HTTP 429 throttling, WebSocket drop resilience, `sendWithRetry` exponential backoff, connection pooling, and dedicated RPCs. |
| 🛠️ [**Errors & Troubleshooting**](./ERRORS_AND_TROUBLESHOOTING.md) | TS2307 `@solana/spl-token` fix, Anchor IDL PDA signer correction, local development Next.js proxying, and on-chain error code catalog. |
| 📜 [**Changelog & Implementation History**](./CHANGELOG.md) | Chronological progress log covering all project phases (Phases 1–5), bug fixes, on-chain evidence, and releases. |
| 🏛️ [**System Architecture**](./ARCHITECTURE.md) | Non-custodial escrow model, Next.js Edge Middleware route enforcement, Express API layer, and Anchor smart contract. |
| 📋 [**Requirements & Specifications**](./REQUIREMENTS.md) | Nepali wholesale business context, trust problem, auth-first onboarding, and 6-stage trade lifecycle state machine. |

---

## ⚡ Quick Protocol Reference

* **Network:** Solana Devnet (`https://api.devnet.solana.com`)
* **Deterministic Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`
* **Program Binary:** `target/deploy/bazaarx.so` (258,208 bytes, BPFLoaderUpgradeab1e)
* **Deployer / Admin Authority:** `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`
* **Canonical USDC Mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Official Circle Devnet USDC, 6 decimals)
* **Config PDA:** `DscHbC3D6FXeaRZ29WA8qeM61ex8dQUMCsLxpqxVVDDX` (Seeds: `[b"config"]`, Bump: 255)
* **Order PDA Derivation:** `[b"order", buyer_pubkey, order_id_u64_le]`
* **Vault PDA Derivation:** `[b"vault", order_pda_pubkey]`
* **Canonical Verified Settlement Order:** Order #`68497` (`COMPLETED` on-chain)
  * **Order PDA:** `59FW4U91GqR4pJENsuZKbaiB3358x31Xd9vL7oxEy3aa`
  * **Vault PDA:** `3E7esaRvyMyAchbaEUhqJMPzpMmJqiCR7aqRkHcckNMP` (0.00 USDC retained)
  * **Buyer Wallet:** `6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K` (ATA: `iaasMsfxp2sfTzWMYLWobQ8CS1d9zRqJuKnX81BVArv`)
  * **Supplier Wallet:** `8bhuiuQKXQrkofbqzqv3v9TiTJKNHBkq6VR72wnKsBDP` (ATA: `5ByjqyhVfWwPk3BX3vxSDG9StMsFenjXEYHYP7V57vqj`)

---

## 🧪 Verification Commands

Run the automated audit and regression suites:

```powershell
# 1. On-Chain Smart Contract Security Exploit Suite (7 Tests)
npx tsx scripts/test_security_devnet.ts

# 2. Adversarial Boundary Failure & Invariant Suite (19 Tests)
npx tsx scripts/test_boundary_failures.ts

# 3. Application Authentication & Route Hardening (18 Tests)
node scripts/test-acceptance.mjs

# 4. Role-Based Ledger Isolation (15 Tests)
node scripts/test_role_visibility.mjs

# 5. Marketplace Buyer-Seller Workflow (26 Tests)
node scripts/test_marketplace_workflow.mjs

# 6. Navbar & UI Dropdown Suite (7 Tests)
node scripts/test_navbar_dropdown.mjs
```
