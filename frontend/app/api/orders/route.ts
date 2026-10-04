import { NextResponse } from 'next/server';
import { getOrders, addOrder, getProductById } from '@/lib/store';
import { Order, TransactionRecord } from '@/lib/types';
import { DEVNET_USDC_MINT } from '@/lib/solana';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const role = searchParams.get('role');
  const wallet = searchParams.get('wallet');

  let orders = getOrders();

  if (wallet) {
    if (role === 'buyer') {
      orders = orders.filter((o) => o.buyerWallet === wallet);
    } else if (role === 'supplier') {
      orders = orders.filter((o) => o.supplierWallet === wallet);
    } else {
      orders = orders.filter(
        (o) => o.buyerWallet === wallet || o.supplierWallet === wallet
      );
    }
  }

  return NextResponse.json({ success: true, orders });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      productId,
      quantity,
      buyerWallet,
      buyerName,
      shippingAddress,
      orderPda,
      signature,
      blockchainOrderId,
    } = body;

    const product = getProductById(productId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 400 }
      );
    }

    const calculatedAmount = product.priceUsdc * quantity;
    const orderIdNum = blockchainOrderId || Math.floor(1000 + Math.random() * 9000);
    const orderIdStr = `ord-${orderIdNum}`;
    const now = new Date().toISOString();

    const isSimulated = Boolean(
      body.isSimulated ||
      !signature ||
      signature.startsWith('simulated')
    );

    const initialTx: TransactionRecord = {
      step: 'Created',
      signature: signature || `simulated_create_${Date.now()}`,
      timestamp: now,
      signer: buyerWallet || 'UnknownBuyer',
      explorerUrl: isSimulated
        ? undefined
        : `https://explorer.solana.com/tx/${signature}?cluster=devnet`,
      action: 'create_order',
      isSimulated,
    };

    const newOrder: Order = {
      id: orderIdStr,
      blockchainOrderId: orderIdNum,
      productId: product.id,
      productName: product.name,
      quantity,
      unit: product.unit,
      amountUsdc: calculatedAmount,
      buyerWallet: buyerWallet || 'DemoBuyerWallet',
      buyerName: buyerName || 'Nepal Wholesale Retailer',
      supplierWallet: product.supplierWallet,
      supplierName: product.supplierName,
      shippingAddress: shippingAddress || 'Kathmandu, Nepal',
      state: 'Created',
      orderPda: orderPda || `PDA_${orderIdNum}`,
      mint: DEVNET_USDC_MINT.toBase58(),
      createdAt: now,
      transactions: [initialTx],
    };

    const savedOrder = addOrder(newOrder);

    return NextResponse.json({ success: true, order: savedOrder });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}
