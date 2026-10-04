# BazaarX — Deployment Guide & Devnet Verification

## 1. Vercel Multi-Services Deployment

BazaarX is configured for deployment on Vercel as a single project composed of multiple independent services.

### Configuration (`vercel.json`)
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
    {
      "source": "/api/(.*)",
      "destination": {
        "service": "backend"
      }
    },
    {
      "source": "/health",
      "destination": {
        "service": "backend"
      }
    },
    {
      "source": "/(.*)",
      "destination": {
        "service": "frontend"
      }
    }
  ]
}
```

### Environment Variables
* `NEXT_PUBLIC_RPC_ENDPOINT`: Solana Devnet RPC endpoint (default: `https://api.devnet.solana.com`).
* `BACKEND_URL`: Injected automatically by Vercel for the internal frontend-to-backend service binding.

---

## 2. Solana Devnet Program Deployment (VERIFIED LIVE)

### 2.1. Deterministic Program Identity
* **Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`
* **Program Keypair:** `target/deploy/bazaarx-keypair.json`
* **Deployer / Admin Address:** `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`
* **Compiled Binary:** `target/deploy/bazaarx.so` (258,208 bytes)
* **Status:** **LIVE ON SOLANA DEVNET**
* **Deployment Tx Signature:** `27TpVCBYyqAuJqNsEp7xfcR31ZLu4JaRUk8ZWogv2wpMHjBNJQqWRbzpmfZoa89Kxnv7LGLi1CvPNp7b7iTV9Ey4`
* **Deployment Slot:** `507264388` | BlockTime: `2026-10-04T05:58:20.000Z`
* **Explorer Verification:** [Solana Explorer - Program Deployment](https://explorer.solana.com/tx/27TpVCBYyqAuJqNsEp7xfcR31ZLu4JaRUk8ZWogv2wpMHjBNJQqWRbzpmfZoa89Kxnv7LGLi1CvPNp7b7iTV9Ey4?cluster=devnet)

---

## 3. Protocol Configuration (VERIFIED LIVE)

### 3.1. Config PDA Details
* **Config PDA:** `DscHbC3D6FXeaRZ29WA8qeM61ex8dQUMCsLxpqxVVDDX`
* **Bump:** `255`
* **Admin Authority:** `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`
* **Canonical Settlement Mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Circle Devnet USDC)
* **Initialization Tx Signature:** `5CyPFSC8WR8r4LqvPnF8EM2T89eNPyueitjRaYkHCG2KhsvUJwoyhY9hZMsjAriUMcxAe7izW9LbvGjh1eQZny7Y`
* **Explorer Verification:** [Solana Explorer - Config Initialization](https://explorer.solana.com/tx/5CyPFSC8WR8r4LqvPnF8EM2T89eNPyueitjRaYkHCG2KhsvUJwoyhY9hZMsjAriUMcxAe7izW9LbvGjh1eQZny7Y?cluster=devnet)

---

## 4. Real Verified Devnet Transactions

| Action | Signer | Address / PDA | Signature | Explorer Link |
| :--- | :--- | :--- | :--- | :--- |
| **Deploy Program** | Deployer | `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN` | `27TpVCBYyqAu...` | [View Tx](https://explorer.solana.com/tx/27TpVCBYyqAuJqNsEp7xfcR31ZLu4JaRUk8ZWogv2wpMHjBNJQqWRbzpmfZoa89Kxnv7LGLi1CvPNp7b7iTV9Ey4?cluster=devnet) |
| **Initialize Config** | Admin | `DscHbC3D6FXe...` | `5CyPFSC8WR8r...` | [View Tx](https://explorer.solana.com/tx/5CyPFSC8WR8r4LqvPnF8EM2T89eNPyueitjRaYkHCG2KhsvUJwoyhY9hZMsjAriUMcxAe7izW9LbvGjh1eQZny7Y?cluster=devnet) |
| **Create Order** (Order 1694) | Buyer | `AoPBVknzbgKR...` | `25Dd2XBsXkk2...` | [View Tx](https://explorer.solana.com/tx/25Dd2XBsXkk26NF21Mv79X8AEgqEo4kT8pp9qtKt9k3k3LuPHy2kjbS79aJUjJixSkfJpFcTRJmYSbJtdKgnzoTS?cluster=devnet) |
| **Accept Order** (Order 1694) | Supplier | `AoPBVknzbgKR...` | `2YMB9HjtrwXH...` | [View Tx](https://explorer.solana.com/tx/2YMB9HjtrwXH5nCTAGhx2WCi1izt9dWicAMXmCySCcvUjrcQJ5MPg1KPNxcCfL9GyEQYBHN1ZeqBT4FxiVD5e6dZ?cluster=devnet) |
| **Create Order** (Order 3435) | Buyer | `E5aL8MP9SHBJ...` | `qk67xaercdcU...` | [View Tx](https://explorer.solana.com/tx/qk67xaercdcUPdV9JRZpSyEKRkfHm1gbbUQo2xDt4RnmUwrRZvohQDUxYMj2353DN2NkoMZuLz1ZTc7gBCthu2k?cluster=devnet) |
| **Accept Order** (Order 3435) | Supplier | `E5aL8MP9SHBJ...` | `UrHvTHFer8uG...` | [View Tx](https://explorer.solana.com/tx/UrHvTHFer8uG44DiLDd8bSKUuvGpnEo5qdwMzSMkYQcApotYukKyZs4fKoHMTTGvkvFjwPWu5CJjvqkjUMgug8b?cluster=devnet) |
| **Create Buyer ATA** | Buyer | `iaasMsfxp2sf...` | `4dMbY7LV84pC...` | [View Tx](https://explorer.solana.com/tx/4dMbY7LV84pCFxG4t3xphnbJkFTpk6hAgQF8SEWZLYWrvZx82TMaWh72DmBvXZDduugU9dAwBGy5KKKEvzdjP9MB?cluster=devnet) |
| **Create Supplier ATA** | Supplier | `5ByjqyhVfWwP...` | `3v83i3Csj1oW...` | [View Tx](https://explorer.solana.com/tx/3v83i3Csj1oWYnMBw9CaYP2TS5THCpvfvGurZv6dMRRYtJ7XoBpffnkGHfbdjur2n9FiCdNrf18e1mRGaXW2RU2F?cluster=devnet) |
