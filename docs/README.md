# BazaarX Documentation Portal

Welcome to the comprehensive documentation suite for **BazaarX**, Nepal's programmable B2B wholesale settlement marketplace built on Solana.

---

## 📚 Documentation Index

| Document | Description |
| :--- | :--- |
| 📋 [**Requirements & Specifications**](./REQUIREMENTS.md) | Product context, wholesale trading problem in Nepal, full order lifecycle state machine, and access control matrix. |
| ✅ [**Work Done & Reality Audit**](./WORK_DONE.md) | Granular audit changelog: what was done, what was simulated previously and purged, compilation proofs, and roadmap. |
| 🛡️ [**Security & Cryptographic Audit**](./SECURITY.md) | Smart contract threat model, PDA seeds validation, token constraints, anti-impersonation, re-entrancy prevention, and account size verification (138 bytes). |
| 🏛️ [**System Architecture**](./ARCHITECTURE.md) | Topology diagram, Next.js frontend, Express backend, Solana Anchor smart contract, and Vercel multi-service routing. |
| 🚀 [**Deployment Guide**](./DEPLOYMENT.md) | Step-by-step procedures for deploying the program to Solana Devnet and configuring multi-service deployment on Vercel. |

---

## ⚡ Quick Reference

* **Deterministic Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`
* **Program Keypair:** `target/deploy/bazaarx-keypair.json`
* **Deployer Address:** `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`
* **Compiled Binary:** `target/deploy/bazaarx.so` (258,208 bytes)
* **Anchor IDL:** `frontend/idl/bazaarx.json`
* **Canonical Devnet USDC Mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`
* **Order Account Serialized Size:** 138 bytes
* **Protocol Config PDA Seeds:** `["config"]`
* **Order PDA Seeds:** `["order", buyer_pubkey, order_id_le_bytes]`
* **Vault PDA Seeds:** `["vault", order_pda]`
