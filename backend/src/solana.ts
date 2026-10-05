import { Connection, PublicKey, clusterApiUrl, VersionedTransactionResponse } from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import bazaarxIdl from './idl/bazaarx.json';
import { OnChainOrderSnapshot, OrderState, ReconciliationResult, Order } from './types';

// Canonical BazaarX Solana Devnet Program ID
export const PROGRAM_ID_STRING = 'BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN';
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);

// Solana Devnet Circle USDC Mint
export const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

export const SOLANA_RPC_ENDPOINT = process.env.SOLANA_RPC_ENDPOINT || process.env.NEXT_PUBLIC_RPC_ENDPOINT || 'https://api.devnet.solana.com';

let connectionInstance: Connection | null = null;

export function getConnection(): Connection {
  if (!connectionInstance) {
    connectionInstance = new Connection(SOLANA_RPC_ENDPOINT, 'confirmed');
  }
  return connectionInstance;
}

/**
 * Derives the global Config PDA
 * Seeds: ["config"]
 */
export function deriveConfigPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  );
}

/**
 * Derives the unique Order PDA for a buyer and order ID
 * Seeds: ["order", buyerPubkey, orderId (8-byte little-endian)]
 */
export function deriveOrderPda(
  buyerPubkey: PublicKey,
  orderId: number | BN,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const orderIdBn = BN.isBN(orderId) ? orderId : new BN(orderId);
  const orderIdBuffer = orderIdBn.toArrayLike(Buffer, 'le', 8);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('order'), buyerPubkey.toBuffer(), orderIdBuffer],
    programId
  );
}

/**
 * Derives the program-controlled Escrow Token Vault PDA for an Order PDA
 * Seeds: ["vault", orderPda]
 */
export function deriveVaultPda(
  orderPda: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), orderPda.toBuffer()],
    programId
  );
}

/**
 * Derives the Associated Token Account (ATA) for an owner and token mint
 */
export function getAssociatedTokenAccount(owner: PublicKey, mint: PublicKey = DEVNET_USDC_MINT): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner);
}

/**
 * Fetches and decodes an on-chain Order PDA snapshot from Solana Devnet.
 * Returns null if the account does not exist or cannot be parsed.
 */
export async function fetchOnChainOrder(
  orderPda: PublicKey,
  conn: Connection = getConnection()
): Promise<OnChainOrderSnapshot | null> {
  try {
    const provider = new AnchorProvider(conn, {} as any, { commitment: 'confirmed' });
    const program = new Program(bazaarxIdl as Idl, provider);

    const [orderData, slot] = await Promise.all([
      (program.account as any).order.fetch(orderPda).catch(() => null),
      conn.getSlot('confirmed').catch(() => undefined),
    ]);

    if (!orderData) {
      return null;
    }

    const rawState = Object.keys(orderData.state)[0];
    const capitalState = (rawState.charAt(0).toUpperCase() + rawState.slice(1)) as OrderState;

    const [vaultPda] = deriveVaultPda(orderPda);
    const vaultBal = await fetchVaultTokenBalance(vaultPda, conn);

    const rawAmount = orderData.amount ? Number(orderData.amount.toString()) : 0;
    const amountUsdc = rawAmount / 1e6;

    const snapshot: OnChainOrderSnapshot = {
      orderPda: orderPda.toBase58(),
      orderId: orderData.orderId ? Number(orderData.orderId.toString()) : 0,
      state: capitalState,
      buyer: orderData.buyer.toBase58(),
      supplier: orderData.supplier.toBase58(),
      amount: rawAmount,
      amountUsdc,
      mint: orderData.mint.toBase58(),
      vault: vaultPda.toBase58(),
      vaultBalance: vaultBal,
      createdAt: orderData.createdAt ? orderData.createdAt.toNumber() : 0,
      acceptedAt: orderData.acceptedAt ? orderData.acceptedAt.toNumber() : 0,
      exists: true,
      fetchedAt: new Date().toISOString(),
      slot,
    };

    return snapshot;
  } catch (err) {
    console.warn(`[solana-helper] fetchOnChainOrder failed for ${orderPda.toBase58()}:`, err);
    return null;
  }
}

/**
 * Fetches token balance for the program vault.
 */
export async function fetchVaultTokenBalance(
  vaultPda: PublicKey,
  conn: Connection = getConnection()
): Promise<number | null> {
  return fetchTokenBalance(vaultPda, conn);
}

/**
 * Fetches token balance for any given SPL token account.
 */
export async function fetchTokenBalance(
  tokenAccount: PublicKey,
  conn: Connection = getConnection()
): Promise<number | null> {
  try {
    const resp = await conn.getTokenAccountBalance(tokenAccount, 'confirmed');
    return resp.value.uiAmount ?? 0;
  } catch {
    return null;
  }
}

/**
 * Verifies a Solana transaction signature on-chain.
 * Checks that the transaction exists, succeeded, and involved the expected program.
 */
export async function verifyTransaction(
  signature: string,
  expectedOrderPda?: PublicKey,
  conn: Connection = getConnection()
): Promise<{ verified: boolean; slot?: number; error?: string }> {
  try {
    if (!signature || signature.startsWith('simulated') || signature.startsWith('sim_')) {
      return { verified: false, error: 'Signature is simulated or placeholder' };
    }

    const tx = await conn.getTransaction(signature, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx) {
      return { verified: false, error: 'Transaction not found on Solana Devnet' };
    }

    if (tx.meta?.err) {
      return {
        verified: false,
        error: `Transaction failed on-chain: ${JSON.stringify(tx.meta.err)}`,
      };
    }

    // Check if BazaarX program was invoked in this transaction
    const accountKeys = tx.transaction.message.getAccountKeys();
    const invokedProgram = accountKeys.staticAccountKeys.some(
      (k) => k.toBase58() === PROGRAM_ID_STRING
    );

    if (!invokedProgram) {
      return {
        verified: false,
        error: 'Transaction did not invoke the BazaarX program',
      };
    }

    // Check if expected Order PDA was touched
    if (expectedOrderPda) {
      const orderPdaStr = expectedOrderPda.toBase58();
      const touchedOrder = accountKeys.staticAccountKeys.some(
        (k) => k.toBase58() === orderPdaStr
      );
      if (!touchedOrder) {
        return {
          verified: false,
          error: `Transaction did not involve expected Order PDA ${orderPdaStr}`,
        };
      }
    }

    return { verified: true, slot: tx.slot };
  } catch (err: any) {
    return { verified: false, error: err.message || 'Failed to inspect transaction on Devnet' };
  }
}

/**
 * Safe, idempotent reconciliation logic comparing local backend order with authoritative Solana Devnet state.
 *
 * Rules:
 * 1. MATCH: Backend and chain agree -> report verified.
 * 2. CHAIN ADVANCED: Chain contains a legitimate forward transition not yet reflected locally -> update local state safely.
 * 3. CHAIN CONFLICT: Backend claims a state impossible relative to chain (e.g. backend FUNDED, chain ACCEPTED) -> record discrepancy, DO NOT overwrite chain, DO NOT erase discrepancy.
 * 4. NOT FOUND: Order PDA not yet initialized on chain -> report non-existent, stateMatch false if backend claims active state.
 */
export async function reconcileOrderOnChain(
  localOrder: Order,
  conn: Connection = getConnection()
): Promise<ReconciliationResult> {
  const orderId = localOrder.id;
  const blockchainOrderId = localOrder.blockchainOrderId;
  const backendState = localOrder.state;
  const backendAmount = localOrder.amountUsdc;
  const discrepancies: string[] = [];

  let orderPdaPubkey: PublicKey | null = null;
  try {
    if (localOrder.orderPda && !localOrder.orderPda.startsWith('PDA_')) {
      orderPdaPubkey = new PublicKey(localOrder.orderPda);
    } else {
      // Deterministically derive from registered buyer wallet and blockchainOrderId
      const buyerPubkey = new PublicKey(localOrder.buyerWallet);
      [orderPdaPubkey] = deriveOrderPda(buyerPubkey, blockchainOrderId);
    }
  } catch {
    orderPdaPubkey = null;
  }

  const [vaultPda] = orderPdaPubkey ? deriveVaultPda(orderPdaPubkey) : [null, 0];
  const vaultAddress = vaultPda ? vaultPda.toBase58() : 'Unresolved';

  if (!orderPdaPubkey) {
    discrepancies.push('Invalid buyer wallet address or Order PDA derivation failure.');
    return {
      orderId,
      blockchainOrderId,
      backendState,
      onChainState: 'NonExistent',
      stateMatch: false,
      backendAmount,
      onChainAmount: null,
      amountMatch: false,
      vaultAddress,
      vaultBalance: null,
      expectedVaultBalance: 0,
      vaultMatch: false,
      discrepancies,
      onChainVerified: false,
      actionTaken: 'NOT_FOUND_ON_CHAIN',
      reconciledAt: new Date().toISOString(),
      order: localOrder,
    };
  }

  // 1. Fetch live on-chain snapshot
  const snapshot = await fetchOnChainOrder(orderPdaPubkey, conn);

  if (!snapshot || !snapshot.exists) {
    if (backendState !== 'Created') {
      discrepancies.push(
        `Backend claims state '${backendState}', but Order PDA ${orderPdaPubkey.toBase58()} does not exist on Solana Devnet.`
      );
    }
    return {
      orderId,
      blockchainOrderId,
      backendState,
      onChainState: 'NonExistent',
      stateMatch: backendState === 'Created' && !localOrder.orderPda.startsWith('PDA_') ? true : false,
      backendAmount,
      onChainAmount: null,
      amountMatch: false,
      vaultAddress,
      vaultBalance: null,
      expectedVaultBalance: 0,
      vaultMatch: false,
      discrepancies,
      onChainVerified: false,
      actionTaken: 'NOT_FOUND_ON_CHAIN',
      reconciledAt: new Date().toISOString(),
      order: localOrder,
    };
  }

  // 2. State rank matrix to evaluate whether chain advanced or has conflict
  const STATE_ORDER: Record<OrderState, number> = {
    Created: 1,
    Accepted: 2,
    Funded: 3,
    Shipped: 4,
    Delivered: 5,
    Completed: 6,
    Disputed: 99,
    Refunded: 99,
  };

  const chainState = snapshot.state;
  const backendRank = STATE_ORDER[backendState] || 0;
  const chainRank = STATE_ORDER[chainState] || 0;

  // 3. Amount and Vault balance verification
  const onChainAmount = snapshot.amountUsdc;
  const amountMatch = Math.abs(backendAmount - onChainAmount) < 0.01;
  if (!amountMatch) {
    discrepancies.push(
      `Escrow amount mismatch: Backend has ${backendAmount} USDC, but On-Chain account has ${onChainAmount} USDC.`
    );
  }

  const vaultBalance = snapshot.vaultBalance;
  // Expected vault balance: if Funded, Shipped, Delivered -> order amount; if Created, Accepted, Completed -> 0
  let expectedVaultBalance = 0;
  if (['Funded', 'Shipped', 'Delivered'].includes(chainState)) {
    expectedVaultBalance = onChainAmount;
  }
  const vaultMatch = vaultBalance !== null && Math.abs(vaultBalance - expectedVaultBalance) < 0.01;

  if (!vaultMatch && vaultBalance !== null) {
    discrepancies.push(
      `Escrow vault balance unexpected: Current vault balance is ${vaultBalance} USDC, expected ${expectedVaultBalance} USDC for state ${chainState}.`
    );
  }

  // 4. Counterparty public key validation
  if (snapshot.buyer.toLowerCase() !== localOrder.buyerWallet.toLowerCase()) {
    discrepancies.push(
      `On-chain buyer mismatch: Chain has ${snapshot.buyer}, backend order recorded ${localOrder.buyerWallet}.`
    );
  }
  if (snapshot.supplier.toLowerCase() !== localOrder.supplierWallet.toLowerCase()) {
    discrepancies.push(
      `On-chain supplier mismatch: Chain has ${snapshot.supplier}, backend order recorded ${localOrder.supplierWallet}.`
    );
  }

  let actionTaken: ReconciliationResult['actionTaken'] = 'MATCH_VERIFIED';
  let stateMatch = backendState === chainState;

  if (stateMatch) {
    actionTaken = 'MATCH_VERIFIED';
  } else if (chainRank > backendRank) {
    // Chain legitimately advanced on Solana without local recording!
    actionTaken = 'CHAIN_ADVANCED_UPDATED';
  } else {
    // Backend claims a state ahead of Solana (e.g. backend FUNDED, chain ACCEPTED) -> CONFLICT!
    stateMatch = false;
    actionTaken = 'CHAIN_CONFLICT_RECORDED';
    discrepancies.push(
      `Chain Conflict: Backend claims state '${backendState}', but Solana Anchor PDA is only at state '${chainState}'. Blockchain is the authority.`
    );
  }

  return {
    orderId,
    blockchainOrderId,
    backendState,
    onChainState: chainState,
    stateMatch,
    backendAmount,
    onChainAmount,
    amountMatch,
    vaultAddress,
    vaultBalance,
    expectedVaultBalance,
    vaultMatch,
    discrepancies,
    onChainVerified: discrepancies.length === 0,
    actionTaken,
    reconciledAt: new Date().toISOString(),
    order: localOrder,
  };
}
