# BazaarX Documentation Portal

Welcome to the comprehensive documentation suite for **BazaarX**, Nepal's programmable B2B wholesale settlement marketplace built on Solana Devnet.

---

## 📚 Documentation Index

| Document | Description |
| :--- | :--- |
| 📋 [**Requirements & Specifications**](./REQUIREMENTS.md) | Product context, wholesale trust problem in Nepal, B2B fintech wallet specifications, and 6-stage lifecycle state machine. |
| ✅ [**Work Done & Timeline Log**](./WORK_DONE.md) | Granular audit changelog, execution timestamps, reality audit, completed milestones, and list of security issues solved. |
| 🛡️ [**Security & Cryptographic Audit**](./SECURITY.md) | Smart contract threat model, PDA seeds validation, token constraints, 7 on-chain exploit test results, and frontend anti-phishing controls. |
| 🏛️ [**System Architecture**](./ARCHITECTURE.md) | Topology diagram, Next.js frontend, Express backend, Solana Anchor smart contract, and Vercel multi-service routing. |
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
