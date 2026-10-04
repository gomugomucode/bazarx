import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';

  try {
    const { search } = new URL(request.url);
    const res = await fetch(`${BACKEND_URL}/api/orders${search}`, {
      headers: {
        'Cookie': cookieHeader,
        'Authorization': authHeader,
      },
      cache: 'no-store',
    });
    if (!res.ok) throw new Error(`Backend status: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    try {
      const { searchParams } = new URL(request.url);
      const role = searchParams.get('role');
      const queryWallet = searchParams.get('wallet');
      const { getOrders, getSession, getUserById } = await import('@/lib/store');

      const match = cookieHeader.match(/bazarx_session=([^;]+)/);
      const token = (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) || (match ? decodeURIComponent(match[1]) : undefined);

      if (!token) {
        return NextResponse.json({ success: false, error: 'Authentication required to view orders', orders: [] }, { status: 401 });
      }

      const session = getSession(token);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Session expired', orders: [] }, { status: 401 });
      }

      const user = getUserById(session.userId);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found', orders: [] }, { status: 401 });
      }

      const isAdmin = user.roles?.includes('ADMIN') || user.role === 'ADMIN';
      if (isAdmin) {
        return NextResponse.json({ success: true, orders: getOrders(queryWallet || undefined, role) });
      }

      return NextResponse.json({ success: true, orders: getOrders(user.wallet || undefined, role) });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';

  try {
    const res = await fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Authorization': authHeader,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    try {
      const { addOrder, getProductById } = await import('@/lib/store');
      const product = getProductById(body?.productId);
      if (!product) return NextResponse.json({ success: false, error: 'Product not found' }, { status: 400 });
      
      const newOrder = addOrder({
        id: `ord-${body.blockchainOrderId || Date.now()}`,
        blockchainOrderId: body.blockchainOrderId || Date.now(),
        productId: product.id,
        productName: product.name,
        quantity: Number(body.quantity) || 1,
        unit: product.unit,
        amountUsdc: product.priceUsdc * (Number(body.quantity) || 1),
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
