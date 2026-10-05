import { PublicKey, Connection, clusterApiUrl, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import bazaarxIdl from '@/idl/bazaarx.json';
import { OnChainOrderSnapshot, ReconciliationResult, Order, OrderState } from '@/lib/types';

// BazaarX Program ID (matching target/deploy/bazaarx-keypair.json)
export const PROGRAM_ID_STRING = 'BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN';
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);

// Solana Devnet canonical USDC mint (Circle Devnet USDC)
export const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

export const SOLANA_NETWORK = 'devnet';
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl('devnet');

export const getConnection = () => {
  return new Connection(RPC_ENDPOINT, 'confirmed');
};

/**
 * Creates an Anchor Program instance using a connected wallet adapter.
 */
export function getAnchorProgram(connection: Connection, wallet: any): Program {
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
    commitment: 'confirmed',
  });
  return new Program(bazaarxIdl as Idl, provider);
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
 * Derives an Order PDA for a buyer and order ID
 * Seeds: ["order", buyer.publicKey, order_id (le_bytes)]
 */
export function deriveOrderPda(
  buyerPubkey: PublicKey,
  orderId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const orderIdBn = new BN(orderId);
  const orderIdBuffer = orderIdBn.toArrayLike(Buffer, 'le', 8);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('order'), buyerPubkey.toBuffer(), orderIdBuffer],
    programId
  );
}

/**
 * Derives the Escrow Token Vault PDA
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
 * Derives the Associated Token Account (ATA) for a given owner and mint.
 */
export function getAssociatedTokenAccount(owner: PublicKey, mint: PublicKey = DEVNET_USDC_MINT): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner);
}

/**
 * Queries an on-chain Order account directly from Solana Devnet.
 */
export async function fetchOnChainOrder(orderPda: PublicKey, connection: Connection = getConnection()) {
  try {
    const provider = new AnchorProvider(connection, {} as any, { commitment: 'confirmed' });
    const program = new Program(bazaarxIdl as Idl, provider);
    const orderData = await (program.account as any).order.fetch(orderPda);
    return orderData;
  } catch (err) {
    console.warn('Could not fetch on-chain order account:', err);
    return null;
  }
}

/**
 * Queries the global on-chain Config account from Solana Devnet.
 */
export async function fetchOnChainConfig(connection: Connection = getConnection()) {
  try {
    const provider = new AnchorProvider(connection, {} as any, { commitment: 'confirmed' });
    const program = new Program(bazaarxIdl as Idl, provider);
    const [configPda] = deriveConfigPda();
    const configData = await (program.account as any).config.fetch(configPda);
    return configData;
  } catch (err) {
    console.warn('Could not fetch on-chain config account:', err);
    return null;
  }
}

/**
 * Queries token account balance directly from Solana Devnet RPC
 */
export async function fetchTokenBalance(
  connection: Connection,
  tokenAccount: PublicKey
): Promise<number | null> {
  try {
    const balance = await connection.getTokenAccountBalance(tokenAccount);
    return balance.value.uiAmount ?? 0;
  } catch (err) {
    return null;
  }
}

/**
 * Generates Solana Explorer links
 */
export function getExplorerTxUrl(txSignature: string, cluster: string = 'devnet'): string {
  return `https://explorer.solana.com/tx/${txSignature}?cluster=${cluster}`;
}

export function getExplorerAccountUrl(address: string, cluster: string = 'devnet'): string {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}

/**
 * Shortens public keys for clean UI display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}

/**
 * Fetches strongly-typed on-chain order snapshot with vault balance from Solana Devnet.
 */
export async function fetchOnChainOrderSnapshot(
  orderPda: PublicKey,
  connection: Connection = getConnection()
): Promise<OnChainOrderSnapshot | null> {
  try {
    const provider = new AnchorProvider(connection, {} as any, { commitment: 'confirmed' });
    const program = new Program(bazaarxIdl as Idl, provider);

    const [orderData, slot] = await Promise.all([
      (program.account as any).order.fetch(orderPda).catch(() => null),
      connection.getSlot('confirmed').catch(() => undefined),
    ]);

    if (!orderData) return null;

    const rawState = Object.keys(orderData.state)[0];
    const capitalState = (rawState.charAt(0).toUpperCase() + rawState.slice(1)) as OrderState;

    const [vaultPda] = deriveVaultPda(orderPda);
    const vaultBal = await fetchTokenBalance(connection, vaultPda);

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
    console.warn(`[solana-helper] fetchOnChainOrderSnapshot failed:`, err);
    return null;
  }
}

/**
 * Verifies a Solana transaction signature on-chain.
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
 * Client-side / local reconciliation evaluator
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

  const snapshot = await fetchOnChainOrderSnapshot(orderPdaPubkey, conn);

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

  const onChainAmount = snapshot.amountUsdc;
  const amountMatch = Math.abs(backendAmount - onChainAmount) < 0.01;
  if (!amountMatch) {
    discrepancies.push(
      `Escrow amount mismatch: Backend has ${backendAmount} USDC, but On-Chain account has ${onChainAmount} USDC.`
    );
  }

  const vaultBalance = snapshot.vaultBalance;
  let expectedVaultBalance = 0;
  if (['Funded', 'Shipped', 'Delivered'].includes(chainState)) {
    expectedVaultBalance = onChainAmount;
  }
  const effectiveVaultBalance = vaultBalance ?? 0;
  const vaultMatch = Math.abs(effectiveVaultBalance - expectedVaultBalance) < 0.01;

  if (!vaultMatch) {
    discrepancies.push(
      `Escrow vault balance unexpected: Current vault balance is ${effectiveVaultBalance} USDC, expected ${expectedVaultBalance} USDC for state ${chainState}.`
    );
  }

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
    actionTaken = 'CHAIN_ADVANCED_UPDATED';
  } else {
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
