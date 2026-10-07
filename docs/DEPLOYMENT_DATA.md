# BazaarX — Deployment Data & On-Chain Reference

This document catalogs all verified on-chain addresses, Program Derived Addresses (PDAs), Associated Token Accounts (ATAs), deployed contract parameters, and cloud hosting topologies for BazaarX on Solana Devnet.

---

## 1. Solana Devnet Program Identity

| Parameter | Value | Verification Notes |
|---|---|---|
| **Network Cluster** | Solana Devnet (`https://api.devnet.solana.com`) | Genesis Hash verified |
| **Deterministic Program ID** | `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN` | Verified executable on-chain account |
| **Program Owner** | `BPFLoaderUpgradeab1e11111111111111111111111` | Canonical Solana BPF Loader |
| **Program Executable Size** | 258,208 bytes | ProgramData account contains compiled ELF binary |
| **Deployer / Admin Address** | `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV` | Initial admin & config authority |
| **Program Keypair File** | `target/deploy/bazaarx-keypair.json` | Local deployment secret key (git-ignored) |
| **Anchor IDL File** | `frontend/idl/bazaarx.json` / `backend/src/idl/bazaarx.json` | Deserialization IDL |

---

## 2. Protocol Global State (Config PDA)

The protocol is governed by a deterministic global Configuration PDA:

| Parameter | Value | Details |
|---|---|---|
| **Config PDA Address** | `DscHbC3D6FXeaRZ29WA8qeM61ex8dQUMCsLxpqxVVDDX` | Derived from seeds: `[b"config"]` |
| **Config Bump** | `255` | Canonical PDA bump |
| **Canonical USDC Mint** | `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` | Official Circle Devnet USDC Mint |
| **USDC Decimals** | `6` | 1 USDC = 1,000,000 base units |
| **Initialization Signature** | `5CyPFSC8WR8r4LqvPnF8EM2T89eNPyueitjRaYkHCG2KhsvUJwoyhY9hZMsjAriUMcxAe7izW9LbvGjh1eQZny7Y` | [View Explorer](https://explorer.solana.com/tx/5CyPFSC8WR8r4LqvPnF8EM2T89eNPyueitjRaYkHCG2KhsvUJwoyhY9hZMsjAriUMcxAe7izW9LbvGjh1eQZny7Y?cluster=devnet) |

---

## 3. Verified Settlement Test Order #68497

Order #`68497` is the canonical verified on-chain order used to prove the genuine Devnet settlement flow:

| Entity | Public Key / Address | Role & Constraints |
|---|---|---|
| **Order Number** | `68497` | Commercial Order: Cooking Oil (100 units, 1.00 USDC) |
| **Order PDA** | `59FW4U91GqR4pJENsuZKbaiB3358x31Xd9vL7oxEy3aa` | Seeds: `[b"order", buyer.key(), 68497_u64_le]`, Bump: 255 |
| **Vault PDA** | `3E7esaRvyMyAchbaEUhqJMPzpMmJqiCR7aqRkHcckNMP` | Seeds: `[b"vault", order_pda.key()]`, Bump: 254 |
| **Buyer Wallet** | `6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K` | Signer for `create_order`, `fund_escrow`, `confirm_delivery` |
| **Buyer USDC ATA** | `iaasMsfxp2sfTzWMYLWobQ8CS1d9zRqJuKnX81BVArv` | Associated Token Account for `4zMMC...` |
| **Supplier Wallet** | `8bhuiuQKXQrkofbqzqv3v9TiTJKNHBkq6VR72wnKsBDP` | Signer for `accept_order`, `mark_shipped`, `release_payment` |
| **Supplier USDC ATA** | `5ByjqyhVfWwPk3BX3vxSDG9StMsFenjXEYHYP7V57vqj` | Associated Token Account for `4zMMC...` |

---

## 4. Complete On-Chain Transaction Ledger

All six phases of the settlement lifecycle were confirmed on Solana Devnet:

| Step # | Instruction | Signer | On-Chain State Change | Transaction Signature | Confirmation |
|---|---|---|---|---|---|
| **1** | `create_order` | Buyer (`6VBKb...`) | `[Uninit] → CREATED` | [`5r8i123XozUBywAogXXHsDLVGwcTMCjHZYHn8zYt3HhuRT4f7xDwv9qrhduHRYXNYuF7ERLNed4fQePnP8XtTRbm`](https://explorer.solana.com/tx/5r8i123XozUBywAogXXHsDLVGwcTMCjHZYHn8zYt3HhuRT4f7xDwv9qrhduHRYXNYuF7ERLNed4fQePnP8XtTRbm?cluster=devnet) | Confirmed (Slot: 507668455) |
| **2** | `accept_order` | Supplier (`8bhui...`) | `CREATED → ACCEPTED` | [`5X24pxwaDai2MZjgPqF32SVWPgmBxB26D3kN37BkZjrnZG2pMjGAZBupm4R7vg1CkNctCm7yigLScNBCsXpN63He`](https://explorer.solana.com/tx/5X24pxwaDai2MZjgPqF32SVWPgmBxB26D3kN37BkZjrnZG2pMjGAZBupm4R7vg1CkNctCm7yigLScNBCsXpN63He?cluster=devnet) | Confirmed (Slot: 507668460) |
| **3** | `fund_escrow` | Buyer (`6VBKb...`) | `ACCEPTED → FUNDED` | [`3x2zt9e1nGQTSmyHbz93RHXsa8A7yKRH5SmE7nLJgj1sfiJPQHtXiu1z8V8gjn5yAW8wig6aTvMZ9fd6jJ1ytHcf`](https://explorer.solana.com/tx/3x2zt9e1nGQTSmyHbz93RHXsa8A7yKRH5SmE7nLJgj1sfiJPQHtXiu1z8V8gjn5yAW8wig6aTvMZ9fd6jJ1ytHcf?cluster=devnet) | Confirmed (Buyer: 20 → 19 USDC, Vault: 0 → 1 USDC) |
| **4** | `mark_shipped` | Supplier (`8bhui...`) | `FUNDED → SHIPPED` | [`4Zg4wnMu7yf4SpwrozBfQyuBbmKEn3qkQGZzd7r3dLAffacBuiK5ft5Qy6uoS7v1dvZkbE9DvVuXWr8fL4UdLTER`](https://explorer.solana.com/tx/4Zg4wnMu7yf4SpwrozBfQyuBbmKEn3qkQGZzd7r3dLAffacBuiK5ft5Qy6uoS7v1dvZkbE9DvVuXWr8fL4UdLTER?cluster=devnet) | Confirmed (Consignment dispatched) |
| **5** | `confirm_delivery` | Buyer (`6VBKb...`) | `SHIPPED → DELIVERED` | [`2yfWnpGbtTtaFy34efEE3A35GK6AXZZA2cMHPD3kHai6gXFGzCkJS9Uh7t7ChimQgg5sxpv6o3q9s7NXvrkwoSL3`](https://explorer.solana.com/tx/2yfWnpGbtTtaFy34efEE3A35GK6AXZZA2cMHPD3kHai6gXFGzCkJS9Uh7t7ChimQgg5sxpv6o3q9s7NXvrkwoSL3?cluster=devnet) | Confirmed (Goods inspected & confirmed) |
| **6** | `release_payment` | Supplier (`8bhui...`) | `DELIVERED → COMPLETED` | [`mWdsWPDwJ119u63Ehf3cWxkByCUWPhR23voptVNQaArBEZgsaYeoTWMwWpdp3CtMB2pvqoHhWFerea8EWkyXTaW`](https://explorer.solana.com/tx/mWdsWPDwJ119u63Ehf3cWxkByCUWPhR23voptVNQaArBEZgsaYeoTWMwWpdp3CtMB2pvqoHhWFerea8EWkyXTaW?cluster=devnet) | Confirmed (Vault: 1 → 0 USDC, Supplier: 0 → 1 USDC) |

---

## 5. Vercel Multi-Service Hosting Architecture

BazaarX uses a multi-service monorepo configuration managed via [`vercel.json`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/vercel.json):

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "services": {
    "backend": {
      "root": "backend",
      "framework": "express"
    },
    "frontend": {
      "root": "frontend",
      "framework": "nextjs",
      "bindings": [
        {
          "type": "service",
          "service": "backend",
          "format": "url",
          "env": "BACKEND_URL"
        }
      ]
    }
  },
  "rewrites": [
    { "source": "/api/(.*)", "destination": { "service": "backend" } },
    { "source": "/health", "destination": { "service": "backend" } },
    { "source": "/(.*)", "destination": { "service": "frontend" } }
  ]
}
```

### Environment Variable Bindings

| Variable Name | Scope | Production Value | Development Value |
|---|---|---|---|
| `SOLANA_RPC_ENDPOINT` | Backend / Frontend | `https://api.devnet.solana.com` | `https://api.devnet.solana.com` |
| `NEXT_PUBLIC_RPC_ENDPOINT` | Frontend | `https://api.devnet.solana.com` | `https://api.devnet.solana.com` |
| `BACKEND_URL` | Frontend (Server) | Injected by Vercel Service Binding | `http://localhost:5000` |
| `PORT` | Backend | Injected by Vercel / Cloud Container | `5000` |
| `NODE_ENV` | Global | `production` | `development` |
