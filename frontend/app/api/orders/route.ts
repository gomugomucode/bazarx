import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function GET(request: Request) {
  try {
    const { search } = new URL(request.url);
    const res = await fetch(`${BACKEND_URL}/api/orders${search}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    try {
      const { getOrders } = await import('@/lib/store');
      return NextResponse.json({ success: true, orders: getOrders() });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    try {
      const { addOrder, getProductById } = await import('@/lib/store');
      const body = await request.clone().json();
      const product = getProductById(body.productId);
      if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 400 });
      const newOrder = addOrder({
        id: `ord-${body.blockchainOrderId || Date.now()}`,
        blockchainOrderId: body.blockchainOrderId || Date.now(),
        productId: product.id,
        productName: product.name,
        quantity: body.quantity,
        unit: product.unit,
        amountUsdc: product.priceUsdc * body.quantity,
        buyerWallet: body.buyerWallet,
        buyerName: body.buyerName || 'Buyer',
        supplierWallet: product.supplierWallet,
        supplierName: product.supplierName,
        shippingAddress: body.shippingAddress || 'Kathmandu, Nepal',
        state: 'Created',
        orderPda: body.orderPda || 'PDA_Pending',
        mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        createdAt: new Date().toISOString(),
        transactions: [],
      });
      return NextResponse.json({ success: true, order: newOrder });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }
}
