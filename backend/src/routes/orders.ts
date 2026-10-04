import { Router, Request, Response } from 'express';
import { store } from '../store';
import { Order, TransactionRecord } from '../types';

const router = Router();

// GET /api/orders
router.get('/', (req: Request, res: Response) => {
  const wallet = req.query.wallet as string | undefined;
  const role = req.query.role as string | undefined;
  const orders = store.getOrders(wallet, role);
  res.json({ success: true, orders });
});

// GET /api/orders/:id
router.get('/:id', (req: Request, res: Response) => {
  const order = store.getOrderById(req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  res.json({ success: true, order });
});

// POST /api/orders (Create wholesale order)
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      productId,
      quantity,
      buyerWallet,
      buyerName,
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
      buyerWallet: buyerWallet || 'DemoBuyerWallet',
      buyerName: buyerName || 'Nepal Wholesale Retailer',
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
