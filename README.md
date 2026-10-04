# BazaarX

> **Nepal's programmable B2B wholesale settlement marketplace on Solana Devnet.**

BazaarX facilitates trust-minimized on-chain wholesale trade between commodity buyers (retailers, distributors, agro-processors) and suppliers (millers, farmers, wholesale producers). By combining an off-chain discovery marketplace with non-custodial Solana escrow smart contracts, BazaarX eliminates counterparty default risk without requiring central exchange custody.

---

## ⚡ Live Protocol Parameters (Solana Devnet)

* **Program ID:** [`BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`](https://explorer.solana.com/address/BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN?cluster=devnet)
* **Program Deployment Tx:** [`27TpVCBYyqAuJqNs...`](https://explorer.solana.com/tx/27TpVCBYyqAuJqNsEp7xfcR31ZLu4JaRUk8ZWogv2wpMHjBNJQqWRbzpmfZoa89Kxnv7LGLi1CvPNp7b7iTV9Ey4?cluster=devnet)
* **Admin / Upgrade Authority:** `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`
* **Protocol Config PDA:** `DscHbC3D6FXeaRZ29WA8qeM61ex8dQUMCsLxpqxVVDDX` (Bump: 255)
* **Canonical Settlement Token:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Official Circle Devnet USDC)
* **Live Order #80024 PDA:** [`GivpLzmmEH5M2WVbWqbjGRsSSSZxTvcGLFoC6rvwWFUm`](https://explorer.solana.com/address/GivpLzmmEH5M2WVbWqbjGRsSSSZxTvcGLFoC6rvwWFUm?cluster=devnet) *(Accepted State)*

---

## 🛡️ Core Financial Principle: Non-Custodial Settlement

**BazaarX servers and databases NEVER take custody of buyer or supplier funds.**

* **Off-Chain Layer (Next.js + Express + Prisma)**: Manages catalog search, product specifications, inventory listings, order caching, and supplier contact metadata.
* **On-Chain Layer (Solana Anchor Smart Contract)**: Holds exclusive financial authority, governs Program-Derived Address (PDA) escrow vaults, enforces state machine invariants, and executes automated payment release upon verified delivery.

---

## 🔄 6-Stage Programmable Settlement Lifecycle

```text
[Created] ──(Supplier accepts)──> [Accepted] ──(Buyer deposits USDC)──> [Funded]
                                                                            │
[Completed] <──(Program releases payment)── [Delivered] <──(Buyer confirms)─ [Shipped]
```

1. **Created**: Buyer initiates order with quantity, price, and designated supplier, deriving an immutable Order PDA.
2. **Accepted**: Designated supplier cryptographically accepts the order, committing stock and delivery timeline.
3. **Funded**: Buyer locks wholesale funds into the program-owned escrow vault PDA (`["vault", order_pda]`).
4. **Shipped**: Supplier dispatches freight along Nepal trade corridors (Birgunj-Kathmandu, Butwal-Pokhara).
5. **Delivered**: Buyer verifies goods at receiving warehouse and cryptographically confirms receipt.
6. **Completed**: Smart contract triggers automated CPI transfer of USDC from the vault directly to the supplier wallet.

---

## 🔒 Security Architecture & Exploit Defense

All 7 primary smart contract attack vectors were tested directly against the deployed program on Solana Devnet (`scripts/test_security_devnet.ts`) and proven **BLOCKED ON-CHAIN**:

1. **Zero-Amount Orders**: Blocked (`BazaarXError::InvalidAmount` `6001`).
2. **Self-Trading (buyer == supplier)**: Blocked (`BazaarXError::InvalidSupplier` `6008`).
3. **Arbitrary / Fake Token Mint Substitution**: Blocked (`BazaarXError::InvalidMint` `6002`).
4. **Unauthorized Order Acceptance**: Blocked by `has_one = supplier` check (`6003`).
5. **State Skipping**: Blocked by strict state match guards (`6004`).
6. **Unauthorized Delivery Confirmation**: Blocked by `has_one = buyer` check (`6004`).
7. **Premature Payment Release**: Blocked by Anchor runtime and state checks.

### Frontend Hardening
* **Purged Simulated Signatures**: All mock preview signature fallbacks (`demo_preview_...`, `preview_mode_...`) were eliminated. Real transactions strictly require a connected Solana wallet.
* **Pre-Flight Client Checks**: Validates SOL gas balance ($\ge 0.001\text{ SOL}$) and USDC balance before transaction broadcast.
* **Standardized Error Messaging**: Mapped wallet rejections to `"Transaction cancelled"`, and balance deficits to `"Insufficient USDC balance"` and `"Insufficient SOL for transaction fees"`.
* **Anti-Phishing**: All external Solana Explorer and faucet links enforce `target="_blank" rel="noopener noreferrer"`.

---

## 📱 B2B Fintech Wallet Experience

* **Disconnected**: Prominent B2B `[ Connect Wallet ]` button opening standard Solana wallet selector.
* **Connecting**: Anti-double-click disabled state displaying `Connecting...` with animated spinner.
* **Connected**: Real-time account pill displaying `[ 0.143 SOL | 6VBK...CEM1 | DEVNET ]`.
* **Account Dropdown**:
  * Truncated address with instant one-click copy (`"Copied!"` indicator).
  * Direct Devnet Explorer link (`?cluster=devnet`).
  * Live SOL and Devnet USDC balance queries directly from Solana RPC with manual refresh button.
  * Informational Circle Devnet Faucet link for wallets with `0.00 USDC`.
  * Safe Disconnect action.
* **Responsive Viewport Support**: Tested and verified at 375px (mobile), 768px (tablet), 1280px (desktop), and 1920px (widescreen).

---

## 📂 Project Structure

```text
bazarX/
├── docs/                     # Comprehensive documentation suite
│   ├── ARCHITECTURE.md       # High-level topology, component breakdowns, PDA formulas
│   ├── DEPLOYMENT.md         # Verified Devnet transactions & troubleshooting guide
│   ├── README.md             # Documentation portal index
│   ├── REQUIREMENTS.md       # Product requirements & 6-stage lifecycle specifications
│   ├── SECURITY.md           # Smart contract threat model & 7 exploit test results
│   └── WORK_DONE.md          # Granular implementation timeline & audit changelog
├── frontend/                 # Next.js 14 App Router (Tailwind CSS, Solana Wallet Adapter)
│   ├── app/                  # Routes: /marketplace, /orders, /dashboard, /admin
│   ├── components/           # WalletButton, NetworkStatus, ConfirmModal, TransactionStatus
│   ├── idl/                  # bazaarx.json (compiled Anchor IDL)
│   ├── lib/                  # solana.ts, useWalletBalance.ts, mockData.ts
│   └── package.json
├── backend/                  # Node.js + Express API Service (port 5000)
│   ├── src/                  # Routes: /api/products, /api/orders, /health
│   └── package.json
├── programs/                 # Solana Anchor smart contract (Rust)
│   └── bazaarx/src/
│       ├── lib.rs            # Program entry point & instruction routing
│       ├── errors.rs         # Program error codes
│       ├── instructions/     # 7 lifecycle instructions
│       └── state/            # Config (73B) & Order (138B) account structures
├── scripts/                  # Automated verification & security test scripts
│   ├── test_security_devnet.ts  # 7-attack exploit test suite
│   └── e2e_escrow_flow.ts       # End-to-end escrow lifecycle runner
├── Anchor.toml               # Anchor workspace configuration
└── vercel.json               # Multi-service edge deployment routing
```

---

## 🚀 Running Locally

### 1. Start the Backend API (Port 5000)
```powershell
cd backend
npm install
npm run dev
```

### 2. Start the Frontend Application (Port 3000)
```powershell
cd frontend
npm install
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000) in your browser. Ensure your Solana wallet extension (Phantom or Solflare) is set to **Solana Devnet**.

---

## 🧪 Verification Commands

```powershell
# Verify TypeScript compilation (Frontend)
cd frontend
npx tsc --noEmit

# Verify Production Build (Frontend)
npm run build
```
