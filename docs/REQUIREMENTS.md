# BazaarX — System Requirements & Specifications

## 1. Product Overview
**BazaarX** is Nepal's first programmable on-chain B2B wholesale settlement marketplace built on Solana. It enables wholesale agricultural and commodity trading between buyers (retailers, distributors) and suppliers (farmers, producers, cooperatives) with cryptographic escrow protection.

---

## 2. Core Problem & Value Proposition
* **Traditional Wholesale in Nepal:** Plagued by delayed payments, informal credit risk, lack of payment guarantees, and non-delivery disputes.
* **The BazaarX Solution:** The Solana Anchor smart contract acts as an immutable, non-custodial escrow authority. The BazaarX backend **never** custodies or holds buyer funds. Payment is programmatically released only upon cryptographic confirmation of delivery.

---

## 3. Order Lifecycle State Machine
```text
[Created] ──(Supplier accepts)──> [Accepted] ──(Buyer deposits USDC)──> [Funded]
                                                                            │
[Completed] <──(Program releases payment)── [Delivered] <──(Buyer confirms)─ [Shipped]
```

1. **Created:** Buyer places wholesale order with quantity, price, and designated supplier.
2. **Accepted:** Designated supplier reviews order terms and cryptographically accepts.
3. **Funded:** Buyer deposits token collateral (USDC) into the program-derived vault PDA (`["vault", order]`).
4. **Shipped:** Supplier dispatches wholesale goods and marks consignment shipped.
5. **Delivered:** Buyer inspects goods upon physical delivery and signs delivery confirmation.
6. **Completed:** Anyone (permissionless) or supplier triggers `release_payment`. The Anchor program executes CPI to transfer funds from the Vault PDA to the supplier's token account.

---

## 4. System Roles & Access Control
| Role | Capabilities | Wallet Required |
| :--- | :--- | :--- |
| **Buyer** | Create orders, fund token escrow, confirm delivery | Yes (Solana Wallet Adapter) |
| **Supplier** | Accept wholesale orders, mark shipment dispatched | Yes (Matching supplier pubkey) |
| **Admin** | Initialize protocol config, set canonical USDC mint | Yes (Admin authority) |
| **Public / Any** | Browse commodity catalog, execute permissionless payment release | Optional |

---

## 5. Non-Functional Requirements
* **Zero Backend Custody:** BazaarX database and backend servers must never hold private keys or escrow balances.
* **Deterministic Program Identity:** Single immutable program ID (`BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`) across all configurations.
* **Real Explorer Links:** Every transaction hash shown in the UI must resolve to a valid transaction on Solana Devnet.
* **Low Latency & High Throughput:** Sub-second transaction confirmation leveraging Solana runtime.
