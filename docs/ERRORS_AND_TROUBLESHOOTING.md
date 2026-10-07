# BazaarX — Errors, Edge Cases & Troubleshooting Guide

This guide documents the real errors encountered during development, testing, and deployment, their root causes, and verified resolutions.

---

## 1. Compilation & Build Errors

### 1.1. TypeScript TS2307: Missing `@solana/spl-token` in Backend

#### Symptom (Vercel Build Log)
```text
> bazaarx-backend@0.1.0 build
> tsc

src/solana.ts(3,47): error TS2307: Cannot find module '@solana/spl-token' or its corresponding type declarations.
Error: Command "npm run build" exited with 2
```

#### Root Cause
[`backend/src/solana.ts`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/backend/src/solana.ts) imports `getAssociatedTokenAddressSync` from `@solana/spl-token`. While the workspace root had `@solana/spl-token` installed, [`backend/package.json`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/backend/package.json) was missing the dependency. When Vercel builds the backend in an isolated container, it only runs `npm install` inside `backend/`, causing `tsc` to fail.

#### Resolution
1. Added `"@solana/spl-token": "^0.4.8"` to [`backend/package.json`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/backend/package.json).
2. Executed `npm install --prefix backend` to synchronize [`backend/package-lock.json`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/backend/package-lock.json).
3. Verified clean build: `npm --prefix backend run build` (Exit code: 0).

---

### 1.2. Anchor Client Error: `Missing signature for public key [orderPda]`

#### Symptom
```text
Error: Missing signature for public key [59FW4U91GqR4pJENsuZKbaiB3358x31Xd9vL7oxEy3aa]
    at AnchorProvider.sendAndConfirm ...
```

#### Root Cause
Automated `anchor idl build` previously marked newly initialized PDAs (`order` and `vault`) with `"signer": true` in [`frontend/idl/bazaarx.json`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/frontend/idl/bazaarx.json). When Anchor’s TypeScript client serialized transaction instructions, it asserted that `orderPda` must have a matching client-side secret key signature, failing because PDAs have no private keys and sign via program seed derivations.

#### Resolution
Corrected the IDL definition for `order` and `vault` accounts in [`frontend/idl/bazaarx.json`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/frontend/idl/bazaarx.json) and [`backend/src/idl/bazaarx.json`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/backend/src/idl/bazaarx.json):
```json
{
  "name": "order",
  "writable": true
  // Removed: "signer": true
}
```

---

### 1.3. Local Development API Routing: `Unexpected token '<', "<!DOCTYPE ..."`

#### Symptom
```text
Fatal test runner error: SyntaxError: Unexpected token '<', "<!DOCTYPE "... is not valid JSON
    at JSON.parse (<anonymous>)
```

#### Root Cause
In local development, the Next.js frontend runs on port `3000` while Express runs on port `5000`. Test scripts hitting `http://localhost:3000/api/...` were receiving Next.js HTML 404 pages because Next.js had no reverse proxy configured to forward `/api` routes to Express.

#### Resolution
Configured automatic local development rewrites in [`frontend/next.config.js`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/frontend/next.config.js):
```javascript
module.exports = {
  // ...
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://localhost:5000/api/:path*',
      },
    ];
  },
};
```

---

## 2. On-Chain Error Catalog & Program Error Codes

The deployed smart contract (`BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`) enforces strict error codes defined in `programs/bazaarx/src/errors.rs`:

| Hex Code | Decimal Code | Error Name | Trigger Condition | How to Resolve |
|---|---|---|---|---|
| `0x1770` | **6000** | `InvalidSupplier` | Order creation where `supplier == buyer` | Ensure buyer and supplier wallet addresses are distinct. |
| `0x1771` | **6001** | `InvalidAmount` | Order creation where `amount == 0` | Provide an order amount greater than 0 micro-USDC. |
| `0x1772` | **6002** | `InvalidMint` | Order mint does not match `config.usdc_mint` | Use canonical Devnet USDC (`4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU`). |
| `0x1773` | **6003** | `UnauthorizedSupplier` | Non-designated supplier attempts `accept_order` or `mark_shipped` | Transact with the keypair specified in `order.supplier`. |
| `0x1774` | **6004** | `UnauthorizedBuyer` | Non-designated buyer attempts `fund_escrow` or `confirm_delivery` | Transact with the keypair specified in `order.buyer`. |
| `0x1775` | **6005** | `InvalidTokenAccount` | Token account owner or mint does not match order | Ensure the ATA belongs to the actor and matches the USDC mint. |
| `0x1776` | **6006** | `InvalidOrderState` | State machine transition attempted out of order | Ensure order has completed prerequisite lifecycle steps. |
| `0x0bc4` | **3012** | `AccountNotInitialized` | Attempting to access vault or order PDA before initialization | Initialize the account via prerequisite instruction (`create_order` or `fund_escrow`). |

---

## 3. Solana Devnet Network & RPC Issues

### 3.1. HTTP Status 429: Rate Limiting
* **Symptom**: `Server responded with 429 Too Many Requests. Retrying after 500ms delay...`
* **Cause**: Public Devnet RPC IP request caps reached.
* **Fix**: Built-in exponential backoff in `sendWithRetry`. In production, supply a private RPC URL (Helius/QuickNode).

### 3.2. Insufficient Devnet USDC Balance
* **Symptom**: `Transaction simulation failed: Error processing Instruction 0: custom program error: 0x1` (SPL Token Insufficient Funds).
* **Cause**: Buyer wallet ATA does not hold enough USDC for `order.amount`.
* **Fix**: Request genuine Devnet USDC from Circle's official faucet:
  * URL: [https://faucet.circle.com](https://faucet.circle.com)
  * Token: **USDC (Solana Devnet)**
  * Destination: Buyer Wallet Address (`6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K`)

### 3.3. Insufficient SOL Gas / Rent Exemption
* **Symptom**: `Attempt to debit an account but found no record of a prior credit.`
* **Cause**: Wallet has 0 SOL to pay transaction base fees (~0.000005 SOL) or rent (~0.002 SOL for ATA).
* **Fix**: Transfer 0.1 SOL from the admin keypair (`HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`) or use `solana airdrop 1 <wallet> --url devnet`.
