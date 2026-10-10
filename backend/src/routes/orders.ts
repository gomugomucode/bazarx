import { Router, Request, Response } from 'express';
import { PublicKey } from '@solana/web3.js';
import { store } from '../store';
import { Order, OrderState, TransactionRecord } from '../types';
import { getAuthUser } from './auth';
import {
  deriveOrderPda,
  deriveVaultPda,
  fetchOnChainOrder,
  verifyTransaction,
  reconcileOrderOnChain,
  DEVNET_USDC_MINT,
} from '../solana';

const router = Router();

// Valid state machine forward progression
const VALID_TRANSITIONS: Record<OrderState, OrderState[]> = {
  Created: ['Accepted'],
  Accepted: ['Funded'],
  Funded: ['Shipped'],
  Shipped: ['Delivered'],
  Delivered: ['Completed'],
  Completed: [],
  Disputed: [],
  Refunded: [],
};

// GET /api/orders (Protected: Requires authenticated business session)
router.get('/', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required to view orders.',
      orders: [],
    });
  }

  const role = req.query.role as string | undefined;
  const isAdmin = user.roles?.includes('ADMIN') || user.role === 'ADMIN';

  // Admin can view all orders or filter by query parameters
  if (isAdmin) {
    const queryWallet = req.query.wallet as string | undefined;
    const queryState = req.query.state as string | undefined;
    const querySearch = req.query.search as string | undefined;
    const queryProduct = req.query.productId as string | undefined;
    const orders = store.getAllOrders({
      wallet: queryWallet,
      role,
      state: queryState,
      search: querySearch,
      productId: queryProduct,
    });
    return res.json({ success: true, orders });
  }

  // Non-admin users are strictly scoped to their own orders based on authenticated identity
  const orders = store.getOrdersForUser(user, role);
  return res.json({ success: true, orders });
});

// GET /api/orders/:id
router.get('/:id', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({
      success: false,
      error: 'Authentication required. Please sign in to view this wholesale order.',
    });
  }

  const order = store.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  // Authorization check: User must be buyer, supplier, or admin
  const isAdmin = user.roles?.includes('ADMIN') || user.role === 'ADMIN';
  const isBuyer =
    Boolean(user.wallet && order.buyerWallet.toLowerCase() === user.wallet.toLowerCase()) ||
    Boolean(user.email && order.buyerEmail?.toLowerCase() === user.email.toLowerCase()) ||
    order.buyerName === user.businessName ||
    order.buyerName === user.fullName;
  const isSupplier =
    Boolean(user.wallet && order.supplierWallet.toLowerCase() === user.wallet.toLowerCase()) ||
    Boolean(user.email && order.supplierEmail?.toLowerCase() === user.email.toLowerCase()) ||
    order.supplierName === user.businessName;

  if (!isAdmin && !isBuyer && !isSupplier) {
    return res.status(403).json({
      success: false,
      error: 'Access denied: You do not have permission to view this wholesale trade order.',
    });
  }

  return res.json({ success: true, order });
});

// POST /api/orders (Create wholesale order - requires login)
router.post('/', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in or create an account to place wholesale orders.',
      });
    }

    const {
      productId,
      quantity,
      buyerWallet,
      shippingAddress,
      orderPda,
      signature,
      blockchainOrderId,
    } = req.body;

    const parsedQty = Number(quantity);
    if (isNaN(parsedQty) || parsedQty <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Order quantity must be greater than zero.',
      });
    }

    const product = store.getProductById(productId);
    if (!product) {
      return res.status(400).json({ success: false, error: 'Product not found' });
    }

    // Product must be active and published
    if (product.status && product.status !== 'Published') {
      return res.status(400).json({
        success: false,
        error: 'This product listing is not published or available for purchase.',
      });
    }

    // Validate minimum order quantity (MOQ)
    if (parsedQty < (product.minOrder || 1)) {
      return res.status(400).json({
        success: false,
        error: `Order quantity (${parsedQty}) must meet minimum order quantity (${product.minOrder || 1} ${product.unit}).`,
      });
    }

    // Validate available stock
    if (product.availableStock < parsedQty) {
      return res.status(400).json({
        success: false,
        error: `Insufficient stock available. Requested: ${parsedQty} ${product.unit}, available: ${product.availableStock} ${product.unit}.`,
      });
    }

    // Buyer cannot trade with themselves
    const effectiveBuyerWallet = (buyerWallet || user.wallet || '').trim().toLowerCase();
    if (
      (product.supplierId && product.supplierId === user.id) ||
      (effectiveBuyerWallet && product.supplierWallet && product.supplierWallet.trim().toLowerCase() === effectiveBuyerWallet)
    ) {
      return res.status(400).json({
        success: false,
        error: 'Suppliers cannot purchase their own products (self-trading prohibited).',
      });
    }

    // Supplier settlement wallet must be configured
    const SOLANA_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!product.supplierWallet || !SOLANA_PUBKEY_REGEX.test(product.supplierWallet.trim())) {
      return res.status(400).json({
        success: false,
        error: 'This wholesale supplier has not linked a valid Solana settlement wallet yet.',
      });
    }

    const calculatedAmount = product.priceUsdc * parsedQty;
    const orderIdNum = blockchainOrderId || Math.floor(1000 + Math.random() * 9000);
    const orderIdStr = `ord-${orderIdNum}`;
    const now = new Date().toISOString();

    const isRealOnChainTx = Boolean(
      signature && !signature.startsWith('simulated') && !signature.startsWith('sim_')
    );

    // Derive order PDA if buyer wallet is valid pubkey
    let resolvedOrderPda = orderPda;
    if (!resolvedOrderPda || resolvedOrderPda.startsWith('PDA_')) {
      try {
        const buyerPubkey = new PublicKey(buyerWallet || user.wallet);
        const [derived] = deriveOrderPda(buyerPubkey, orderIdNum);
        resolvedOrderPda = derived.toBase58();
      } catch {
        resolvedOrderPda = `PDA_${orderIdNum}`;
      }
    }

    const initialTx: TransactionRecord = {
      step: 'Created',
      signature: isRealOnChainTx ? signature : undefined,
      timestamp: now,
      signer: buyerWallet || user.wallet || 'UnknownBuyer',
      explorerUrl: isRealOnChainTx
        ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        : undefined,
      action: 'create_order',
      isSimulated: !isRealOnChainTx,
    };

    const newOrder: Order = {
      id: orderIdStr,
      blockchainOrderId: orderIdNum,
      productId: product.id,
      productName: product.name,
      quantity: parsedQty,
      unit: product.unit,
      amountUsdc: calculatedAmount,
      buyerWallet: buyerWallet || user.wallet || 'DemoBuyerWallet',
      buyerName: user.businessName || user.fullName || req.body.buyerName || 'Nepal Wholesale Retailer',
      buyerEmail: user.email,
      supplierWallet: product.supplierWallet,
      supplierName: product.supplierName,
      shippingAddress: shippingAddress || 'Kathmandu, Nepal',
      state: 'Created',
      orderPda: resolvedOrderPda,
      mint: DEVNET_USDC_MINT.toBase58(),
      createdAt: now,
      transactions: [initialTx],
    };

    const savedOrder = store.addOrder(newOrder);
    res.json({ success: true, order: savedOrder });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// POST /api/orders/:id/reconcile (Authoritative On-Chain State Reconciliation)
router.post('/:id/reconcile', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to reconcile orders.',
      });
    }

    const order = store.getOrderById(req.params.id);
    if (!order) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // Authorization check
    const isAdmin = user.roles?.includes('ADMIN') || user.role === 'ADMIN';
    const isBuyer =
      Boolean(user.wallet && order.buyerWallet.toLowerCase() === user.wallet.toLowerCase()) ||
      Boolean(user.email && order.buyerEmail?.toLowerCase() === user.email.toLowerCase()) ||
      order.buyerName === user.businessName ||
      order.buyerName === user.fullName;
    const isSupplier =
      Boolean(user.wallet && order.supplierWallet.toLowerCase() === user.wallet.toLowerCase()) ||
      Boolean(user.email && order.supplierEmail?.toLowerCase() === user.email.toLowerCase()) ||
      order.supplierName === user.businessName;

    if (!isAdmin && !isBuyer && !isSupplier) {
      return res.status(403).json({
        success: false,
        error: 'Access denied: You do not have permission to reconcile this order.',
      });
    }

    // Execute idempotent on-chain inspection & reconciliation
    const reconciliation = await reconcileOrderOnChain(order);

    // If on-chain state legitimately advanced beyond local state, update local store
    if (reconciliation.actionTaken === 'CHAIN_ADVANCED_UPDATED') {
      const advancedState = reconciliation.onChainState as OrderState;
      const now = new Date().toISOString();
      const updates: Partial<Order> = { state: advancedState };

      if (advancedState === 'Accepted' && !order.acceptedAt) updates.acceptedAt = now;
      if (advancedState === 'Funded' && !order.fundedAt) updates.fundedAt = now;
      if (advancedState === 'Shipped' && !order.shippedAt) updates.shippedAt = now;
      if (advancedState === 'Delivered' && !order.deliveredAt) updates.deliveredAt = now;
      if (advancedState === 'Completed' && !order.completedAt) updates.completedAt = now;

      const reconcileTx: TransactionRecord = {
        step: advancedState,
        timestamp: now,
        signer: 'OnChainReconciliation',
        action: `reconcile_to_${advancedState.toLowerCase()}`,
        isSimulated: false,
      };

      const updated = store.updateOrderFromReconciliation(order.id, updates, reconcileTx);
      reconciliation.order = updated || undefined;
    }

    return res.json({
      success: true,
      reconciliation,
    });
  } catch (error: any) {
    console.error('Error during reconciliation:', error);
    return res.status(500).json({
      success: false,
      error: error.message || 'Failed to reconcile on-chain state',
    });
  }
});

// PATCH /api/orders/:id (Hardened state machine update with on-chain verification)
router.patch('/:id', async (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required to update order state.',
      });
    }

    const { nextState, signature, signer, action } = req.body;
    const existingOrder = store.getOrderById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    // 1. Validate State Machine progression
    const validNextStates = VALID_TRANSITIONS[existingOrder.state] || [];
    if (!validNextStates.includes(nextState)) {
      return res.status(400).json({
        success: false,
        error: `Invalid state transition: Cannot transition from '${existingOrder.state}' to '${nextState}'. Valid next states: [${validNextStates.join(', ')}]`,
      });
    }

    // 2. Validate Counterparty Role Authorization
    const isAdmin = user.roles?.includes('ADMIN') || user.role === 'ADMIN';
    const isBuyer =
      Boolean(user.wallet && existingOrder.buyerWallet.toLowerCase() === user.wallet.toLowerCase()) ||
      Boolean(user.email && existingOrder.buyerEmail?.toLowerCase() === user.email.toLowerCase());
    const isSupplier =
      Boolean(user.wallet && existingOrder.supplierWallet.toLowerCase() === user.wallet.toLowerCase()) ||
      Boolean(user.email && existingOrder.supplierEmail?.toLowerCase() === user.email.toLowerCase());

    if (['Accepted', 'Shipped'].includes(nextState) && !isSupplier && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: `Unauthorized: Only the designated supplier can advance the order to '${nextState}'.`,
      });
    }

    if (['Funded', 'Delivered'].includes(nextState) && !isBuyer && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: `Unauthorized: Only the designated buyer can advance the order to '${nextState}'.`,
      });
    }

    // 3. For blockchain-backed states, verify against Solana
    let isRealOnChainTx = Boolean(
      signature && !signature.startsWith('simulated') && !signature.startsWith('sim_')
    );

    if (['Funded', 'Shipped', 'Delivered', 'Completed'].includes(nextState)) {
      let orderPdaPubkey: PublicKey | null = null;
      try {
        if (existingOrder.orderPda && !existingOrder.orderPda.startsWith('PDA_')) {
          orderPdaPubkey = new PublicKey(existingOrder.orderPda);
        }
      } catch {
        orderPdaPubkey = null;
      }

      if (isRealOnChainTx && orderPdaPubkey) {
        // Verify transaction exists, succeeded, and touched this Order PDA
        const verifyRes = await verifyTransaction(signature, orderPdaPubkey);
        if (!verifyRes.verified) {
          return res.status(400).json({
            success: false,
            error: `On-chain transaction verification failed: ${verifyRes.error}`,
          });
        }
      } else if (orderPdaPubkey) {
        // If no tx signature provided, inspect on-chain account directly
        const snapshot = await fetchOnChainOrder(orderPdaPubkey);
        if (!snapshot || snapshot.state !== nextState) {
          return res.status(400).json({
            success: false,
            error: `Blockchain state mismatch: Solana Anchor program is currently at state '${snapshot?.state || 'Unknown'}'. Cannot set backend state to '${nextState}' without verified on-chain confirmation.`,
          });
        }
      }
    }

    const txRecord: TransactionRecord = {
      step: nextState,
      signature: isRealOnChainTx ? signature : undefined,
      timestamp: new Date().toISOString(),
      signer: signer || user.wallet || 'SignerWallet',
      explorerUrl: isRealOnChainTx
        ? `https://explorer.solana.com/tx/${signature}?cluster=devnet`
        : undefined,
      action: action || `execute_${nextState.toLowerCase()}`,
      isSimulated: !isRealOnChainTx,
    };

    const updated = store.updateOrderState(existingOrder.id, nextState, txRecord);
    res.json({ success: true, order: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

export default router;
