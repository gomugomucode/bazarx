import { Router, Request, Response } from 'express';
import { store } from '../store';
import { Order, TransactionRecord } from '../types';
import { getAuthUser } from './auth';

const router = Router();

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
    const orders = store.getOrders(queryWallet, role);
    return res.json({ success: true, orders });
  }

  // Non-admin users are strictly scoped to their own registered settlement wallet
  const targetWallet = user.wallet || undefined;
  const orders = store.getOrders(targetWallet, role);
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

    const product = store.getProductById(productId);
    if (!product) {
      return res.status(400).json({ success: false, error: 'Product not found' });
    }

    const calculatedAmount = product.priceUsdc * (Number(quantity) || 1);
    const orderIdNum = blockchainOrderId || Math.floor(1000 + Math.random() * 9000);
    const orderIdStr = `ord-${orderIdNum}`;
    const now = new Date().toISOString();

    const isRealOnChainTx = Boolean(signature && !signature.startsWith('simulated') && !signature.startsWith('sim_'));

    const initialTx: TransactionRecord = {
      step: 'Created',
      signature: isRealOnChainTx ? signature : undefined,
      timestamp: now,
      signer: buyerWallet || 'UnknownBuyer',
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
      quantity: Number(quantity) || 1,
      unit: product.unit,
      amountUsdc: calculatedAmount,
      buyerWallet: buyerWallet || user.wallet || 'DemoBuyerWallet',
      buyerName: user.businessName || user.fullName || req.body.buyerName || 'Nepal Wholesale Retailer',
      buyerEmail: user.email,
      supplierWallet: product.supplierWallet,
      supplierName: product.supplierName,
      shippingAddress: shippingAddress || 'Kathmandu, Nepal',
      state: 'Created',
      orderPda: orderPda || `PDA_${orderIdNum}`,
      mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
      createdAt: now,
      transactions: [initialTx],
    };

    const savedOrder = store.addOrder(newOrder);
    res.json({ success: true, order: savedOrder });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// PATCH /api/orders/:id (Update order state)
router.patch('/:id', (req: Request, res: Response) => {
  try {
    const { nextState, signature, signer, action } = req.body;
    const existingOrder = store.getOrderById(req.params.id);

    if (!existingOrder) {
      return res.status(404).json({ success: false, error: 'Order not found' });
    }

    const isRealOnChainTx = Boolean(signature && !signature.startsWith('simulated') && !signature.startsWith('sim_'));

    const txRecord: TransactionRecord = {
      step: nextState,
      signature: isRealOnChainTx ? signature : undefined,
      timestamp: new Date().toISOString(),
      signer: signer || 'SignerWallet',
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
