# Solana Devnet Rate Limits & RPC Handling Guide

This document explains the network constraints, rate limits, retry mechanisms, and recommended infrastructure for communicating with Solana Devnet in BazaarX.

---

## 1. Solana Devnet Public RPC Constraints

The default public endpoint provided by the Solana Foundation (`https://api.devnet.solana.com`) is shared globally by thousands of developers and test runners:

| Limit Type | Public Devnet Threshold | Trigger Behavior |
|---|---|---|
| **HTTP Request Rate Limit** | ~40 requests per 10-second window per IP | HTTP Status `429 Too Many Requests` |
| **WebSocket Subscriptions** | Restricted concurrent connections | `ws error: Unexpected server response: 429` |
| **Methods Restricted** | Batch JSON-RPC (>50 calls) | Immediate drop or timeout |
| **GetProgramAccounts** | Limited to small filters | Intermittent `504 Gateway Timeout` |

During continuous end-to-end escrow settlement runs or rapid regression test cycles, the public Devnet node frequently enforces throttling.

---

## 2. BazaarX Throttling Mitigations

### 2.1. Exponential Backoff Retry Handler (`sendWithRetry`)

All mission-critical instructions in [`scripts/e2e_escrow_flow.ts`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/scripts/e2e_escrow_flow.ts) and the backend API are wrapped in an autonomous retry wrapper:

```typescript
async function sendWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 5,
  initialDelay = 1000
): Promise<T> {
  let delay = initialDelay;
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (err: any) {
      const is429 =
        err.message?.includes('429') ||
        err.message?.includes('Too Many Requests') ||
        err.message?.includes('Server responded with 429');
      
      if (is429 && i < maxRetries - 1) {
        console.warn(`[RPC Rate Limit 429] Throttled by Devnet node. Retrying in ${delay}ms...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
        delay *= 2; // Exponential backoff multiplier
        continue;
      }
      throw err;
    }
  }
  throw new Error('Exceeded maximum RPC retries');
}
```

### 2.2. RPC Singleton Connection Pooling

In [`backend/src/solana.ts`](file:///c:/Users/Anupam%20Baral/Desktop/bazarX/backend/src/solana.ts#L16), creating a new `Connection` instance per HTTP request was replaced with a pooled singleton:

```typescript
let connectionInstance: Connection | null = null;

export function getConnection(): Connection {
  if (!connectionInstance) {
    connectionInstance = new Connection(SOLANA_RPC_ENDPOINT, {
      commitment: 'confirmed',
      confirmTransactionInitialTimeout: 60000,
    });
  }
  return connectionInstance;
}
```
This avoids redundant TCP and TLS handshakes, reducing socket exhaustion.

### 2.3. WebSocket Error Resilience

When `sendAndConfirmTransaction` or Anchor `.rpc()` encounters a transient WebSocket drop (`ws error: Unexpected server response: 429`), the Anchor client automatically falls back to HTTP polling of the transaction status (`getSignatureStatus` with `searchTransactionHistory: true`), guaranteeing confirmation despite disconnected sockets.

---

## 3. Production RPC Architecture

For production or high-throughput test environments, public Devnet RPC endpoints should not be used. Instead, configure a dedicated RPC provider in `.env`:

```env
# Dedicated RPC Endpoint Configuration
SOLANA_RPC_ENDPOINT="https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY"
NEXT_PUBLIC_RPC_ENDPOINT="https://devnet.helius-rpc.com/?api-key=YOUR_API_KEY"
```

### Recommended Infrastructure Providers

| Provider | Devnet Tier | Typical Rate Limit | Features |
|---|---|---|---|
| **Helius** | Free Developer Tier | 50 RPS (10M credits/mo) | Enhanced transaction parsing, webhooks |
| **QuickNode** | Free Tier | 25 RPS | Multi-region endpoints, archive node |
| **Alchemy** | Free Tier | 300 compute units/sec | High reliability, debug trace APIs |
| **Triton RPC Pool** | Dedicated Cluster | Custom SLA | High-throughput validator node proxying |

---

## 4. Operational Best Practices

1. **Avoid Polling Loops**: Use the backend reconciliation endpoint (`/api/orders/[id]/reconcile`) on demand rather than interval timers.
2. **Commitment Levels**:
   * Use `'confirmed'` for interactive buyer/supplier UI transactions (typical latency ~400ms).
   * Use `'finalized'` only for irreversible admin ledger audits (typical latency ~12s).
3. **Graceful UI Feedback**: When throttled, the frontend displays an active `Confirming on Solana Devnet...` state rather than treating transient RPC latency as a payment failure.
