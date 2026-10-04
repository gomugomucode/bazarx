# BazaarX — Deployment Guide

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

## 2. Solana Devnet Program Deployment

### 2.1. Deterministic Program Identity
* **Declared Program ID:** `BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN`
* **Program Keypair:** `target/deploy/bazaarx-keypair.json`
* **Deployer Address:** `HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV`
* **Compiled Binary:** `target/deploy/bazaarx.so` (258,208 bytes)
* **Rent Requirement:** ~1.31 SOL permanent account rent + ~1.31 SOL deploy buffer (Total needed: ~2.6-3.0 SOL).

### 2.2. Deployment Command
Once the deployer wallet holds sufficient Devnet SOL:
```bash
solana program deploy target/deploy/bazaarx.so \
  --program-id target/deploy/bazaarx-keypair.json \
  --keypair target/deploy/deployer-keypair.json \
  --url devnet
```

### 2.3. Initializing Protocol Configuration
After deployment, initialize the protocol config PDA on Devnet:
```typescript
await program.methods
  .initializeConfig(new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU'))
  .accounts({
    admin: adminWallet.publicKey,
    config: configPda,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```
