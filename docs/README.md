# BazaarX Documentation Portal

Welcome to the comprehensive documentation suite for **BazaarX**, Nepal's programmable B2B wholesale settlement marketplace built on Solana Devnet.

---

## 📚 Documentation Index

| Document | Description |
| :--- | :--- |
| 📋 [**Requirements & Specifications**](./REQUIREMENTS.md) | Product context, wholesale trust problem in Nepal, Auth-First B2B onboarding, decoupled settlement wallet, and 6-stage lifecycle state machine. |
| ✅ [**Work Done & Timeline Log**](./WORK_DONE.md) | Granular audit changelog, execution timestamps, Phases 1–10, operational error resolutions, and 18/18 acceptance test results. |
| 🛡️ [**Security & Cryptographic Audit**](./SECURITY.md) | Smart contract threat model, 7 on-chain exploit test results, Next.js Edge Middleware route protection, and 18-point automated acceptance test suite. |
| 🏛️ [**System Architecture**](./ARCHITECTURE.md) | Authentication-First B2B topology, Next.js Edge Middleware, Express backend, and Solana Anchor escrow smart contract. |
| 🚀 [**Deployment Guide**](./DEPLOYMENT.md) | Step-by-step procedures for Solana Devnet verification, real verified transactions log, and local development troubleshooting. |

---

## ⚡ Quick Reference

* **Target Network:** Solana Devnet
* **Deterministic Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`
* **Program Keypair:** `target/deploy/bazaarx-keypair.json`
* **Deployer / Admin Address:** `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`
* **Compiled Binary:** `target/deploy/bazaarx.so` (258,208 bytes)
* **Anchor IDL:** `frontend/idl/bazaarx.json`
* **Canonical Devnet USDC Mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
* **Config PDA:** `DscHbC3D6FXeaRZ29WA8qeM61ex8dQUMCsLxpqxVVDDX` (Bump: 255)
* **Order PDA Seeds:** `["order", buyer_pubkey, order_id_le_bytes]`
* **Vault PDA Seeds:** `["vault", order_pda]`
* **Order Account Serialized Size:** 138 bytes
* **Live Verified Devnet Order:** Order #80024 (`GivpLzmmEH5M2WVbWqbjGRsSSSZxTvcGLFoC6rvwWFUm`) in `Accepted` state
