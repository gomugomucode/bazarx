# BazaarX — Deployment Guide & Devnet Verification

**Target Network:** Solana Devnet  
**Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`  
**Deployer Authority:** `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`  

---

## 1. Verified Live Solana Devnet Deployments

### 1.1. Deterministic Program Identity
* **Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`
* **Program Keypair:** `target/deploy/bazaarx-keypair.json`
* **Compiled Binary:** `target/deploy/bazaarx.so` (258,208 bytes)
* **Status:** **LIVE ON SOLANA DEVNET**
* **Deployment Tx Signature:** `27TpVCBYyqAuJqNsEp7xfcR31ZLu4JaRUk8ZWogv2wpMHjBNJQqWRbzpmfZoa89Kxnv7LGLi1CvPNp7b7iTV9Ey4`
* **Explorer Link:** [View Program Deployment on Solana Explorer](https://explorer.solana.com/tx/27TpVCBYyqAuJqNsEp7xfcR31ZLu4JaRUk8ZWogv2wpMHjBNJQqWRbzpmfZoa89Kxnv7LGLi1CvPNp7b7iTV9Ey4?cluster=devnet)

### 1.2. Protocol Configuration (Config PDA)
* **Config PDA:** `DscHbC3D6FXeaRZ29WA8qeM61ex8dQUMCsLxpqxVVDDX` (Bump: 255)
* **Canonical Settlement Mint:** `4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU` (Official Circle Devnet USDC)
* **Initialization Tx Signature:** `5CyPFSC8WR8r4LqvPnF8EM2T89eNPyueitjRaYkHCG2KhsvUJwoyhY9hZMsjAriUMcxAe7izW9LbvGjh1eQZny7Y`
* **Explorer Link:** [View Config Initialization on Solana Explorer](https://explorer.solana.com/tx/5CyPFSC8WR8r4LqvPnF8EM2T89eNPyueitjRaYkHCG2KhsvUJwoyhY9hZMsjAriUMcxAe7izW9LbvGjh1eQZny7Y?cluster=devnet)

---

## 2. Real Verified Devnet Transactions Log

| Action | Signer Wallet | Address / PDA | Signature | Explorer Link |
| :--- | :--- | :--- | :--- | :--- |
| **Deploy Program** | Deployer | `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN` | `27TpVCBYyqAu...` | [View Tx](https://explorer.solana.com/tx/27TpVCBYyqAuJqNsEp7xfcR31ZLu4JaRUk8ZWogv2wpMHjBNJQqWRbzpmfZoa89Kxnv7LGLi1CvPNp7b7iTV9Ey4?cluster=devnet) |
| **Initialize Config** | Admin | `DscHbC3D6FXe...` | `5CyPFSC8WR8r...` | [View Tx](https://explorer.solana.com/tx/5CyPFSC8WR8r4LqvPnF8EM2T89eNPyueitjRaYkHCG2KhsvUJwoyhY9hZMsjAriUMcxAe7izW9LbvGjh1eQZny7Y?cluster=devnet) |
| **Create Order 1694** | Buyer | `AoPBVknzbgKR...` | `25Dd2XBsXkk2...` | [View Tx](https://explorer.solana.com/tx/25Dd2XBsXkk26NF21Mv79X8AEgqEo4kT8pp9qtKt9k3k3LuPHy2kjbS79aJUjJixSkfJpFcTRJmYSbJtdKgnzoTS?cluster=devnet) |
| **Accept Order 1694** | Supplier | `AoPBVknzbgKR...` | `2YMB9HjtrwXH...` | [View Tx](https://explorer.solana.com/tx/2YMB9HjtrwXH5nCTAGhx2WCi1izt9dWicAMXmCySCcvUjrcQJ5MPg1KPNxcCfL9GyEQYBHN1ZeqBT4FxiVD5e6dZ?cluster=devnet) |
| **Create Order 3435** | Buyer | `E5aL8MP9SHBJ...` | `qk67xaercdcU...` | [View Tx](https://explorer.solana.com/tx/qk67xaercdcUPdV9JRZpSyEKRkfHm1gbbUQo2xDt4RnmUwrRZvohQDUxYMj2353DN2NkoMZuLz1ZTc7gBCthu2k?cluster=devnet) |
| **Accept Order 3435** | Supplier | `E5aL8MP9SHBJ...` | `UrHvTHFer8uG...` | [View Tx](https://explorer.solana.com/tx/UrHvTHFer8uG44DiLDd8bSKUuvGpnEo5qdwMzSMkYQcApotYukKyZs4fKoHMTTGvkvFjwPWu5CJjvqkjUMgug8b?cluster=devnet) |
| **Create Order #80024** | Buyer (`6VBKbK...`) | `GivpLzmmEH5M...` | `49dkR366tVwQ...` | [View Tx](https://explorer.solana.com/tx/49dkR366tVwQfyHPHYTRfDLmip4Xq53nSi2NS4eVqw4Xs74PiECmd5irjA39yqD7Ycn7T3mvJfHpZiyiWnz2P8F6?cluster=devnet) |
| **Accept Order #80024** | Supplier (`8bhuiu...`) | `GivpLzmmEH5M...` | `4wWr852r3m27...` | [View Tx](https://explorer.solana.com/tx/4wWr852r3m27XuudrFgrJsZXvHq2xPwxKaUE7ehRYwwbEdTRJEpioMTryNT4wvuHGN5wvPnnLgCuxDGTsEbjSMUJ?cluster=devnet) |
| **Buyer ATA Provision** | Buyer (`6VBKbK...`) | `iaasMsfxp2sf...` | `4dMbY7LV84pC...` | [View Tx](https://explorer.solana.com/tx/4dMbY7LV84pCFxG4t3xphnbJkFTpk6hAgQF8SEWZLYWrvZx82TMaWh72DmBvXZDduugU9dAwBGy5KKKEvzdjP9MB?cluster=devnet) |
| **Supplier ATA Provision** | Supplier (`8bhuiu...`) | `5ByjqyhVfWwP...` | `3v83i3Csj1oW...` | [View Tx](https://explorer.solana.com/tx/3v83i3Csj1oWYnMBw9CaYP2TS5THCpvfvGurZv6dMRRYtJ7XoBpffnkGHfbdjur2n9FiCdNrf18e1mRGaXW2RU2F?cluster=devnet) |

---

## 3. Local Development & Operational Runbook

### Prerequisites
* Node.js v18+ (tested on Node.js v20)
* npm or pnpm
* Phantom / Solflare wallet configured for **Solana Devnet**

### Running the Services
1. **Start the Backend API:**
   ```powershell
   cd backend
   npm run dev
   # Runs on http://localhost:5000
   ```
2. **Start the Next.js Frontend:**
   ```powershell
   cd frontend
   npm run dev
   # Runs on http://localhost:3000
   ```

### Troubleshooting Common Dev Issues

#### Issue A: `Error: listen EADDRINUSE: address already in use :::3000`
* **Cause:** A previous Node.js process is still bound to port 3000.
* **Resolution:**
  ```powershell
  # Find and kill the process holding port 3000
  Get-NetTCPConnection -LocalPort 3000 | Select-Object -ExpandProperty OwningProcess | ForEach-Object { Stop-Process -Id $_ -Force }
  ```

#### Issue B: `MODULE_NOT_FOUND ./vendor-chunks/@solana.js` or `Cannot find module './161.js'`
* **Cause:** Running `npm run build` while `npm run dev` was actively running in the same directory overwrote `.next` chunks with production assets.
* **Resolution:**
  ```powershell
  # Kill stale next process and restart cleanly
  Stop-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess -Force
  cd frontend
  npm run dev
  ```

### 3.4. Running Verification & Acceptance Tests

1. **Type Checking:**
   ```powershell
   cd backend ; npx tsc --noEmit
   cd ../frontend ; npx tsc --noEmit
   ```

2. **Production Build:**
   ```powershell
   cd frontend ; npm run build
   ```

3. **Automated 18-Scenario Security Acceptance Suite:**
   ```powershell
   # With frontend (3000) and backend (5000) running:
   node scripts/test-acceptance.mjs
   ```

---

## 4. Vercel Multi-Services Deployment Setup

BazaarX uses Vercel's multi-service deployment format defined in root `vercel.json`:

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
      "destination": { "service": "backend" }
    },
    {
      "source": "/health",
      "destination": { "service": "backend" }
    },
    {
      "source": "/(.*)",
      "destination": { "service": "frontend" }
    }
  ]
}
```
