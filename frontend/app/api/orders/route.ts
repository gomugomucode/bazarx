import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const match = cookieHeader.match(/bazarx_session=([^;]+)/);
  const token =
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) ||
    (match ? decodeURIComponent(match[1]) : undefined);

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required to view orders', orders: [] },
      { status: 401 }
    );
  }

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';

  // 1. Try proxying to Express backend first
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders${qs}`, {
      headers: {
        'Cookie': cookieHeader,
        'Authorization': authHeader || `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    // 2. Local store fallback
    try {
      const { getSession, getUserById, getOrdersForUser, getAllOrders } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session expired. Please log in again.', orders: [] },
          { status: 401 }
        );
      }

      const user = getUserById(session.userId);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User account not found', orders: [] },
          { status: 401 }
        );
      }

      const role = searchParams.get('role');
      const queryWallet = searchParams.get('wallet');
      const queryState = searchParams.get('state');
      const querySearch = searchParams.get('search');
      const queryProduct = searchParams.get('productId');

      const isAdmin = Boolean(user.roles?.includes('ADMIN') || user.role === 'ADMIN');

      if (isAdmin) {
        return NextResponse.json({
          success: true,
          orders: getAllOrders({
            wallet: queryWallet || undefined,
            role: role || undefined,
            state: queryState || undefined,
            search: querySearch || undefined,
            productId: queryProduct || undefined,
          }),
        });
      }

      // Non-admin users are strictly scoped to orders matching their authenticated identity
      return NextResponse.json({
        success: true,
        orders: getOrdersForUser(user, role),
      });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const match = cookieHeader.match(/bazarx_session=([^;]+)/);
  const token =
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) ||
    (match ? decodeURIComponent(match[1]) : undefined);

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required. Please log in to create wholesale orders.' },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // 1. Try Express backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Authorization': authHeader || `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    // 2. Local store fallback
    try {
      const { getSession, getUserById, addOrder, getProductById } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session expired. Please log in again.' },
          { status: 401 }
        );
      }

      const user = getUserById(session.userId);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User account not found' }, { status: 401 });
      }

      const product = getProductById(body?.productId);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 400 });
      }

      if (product.status && product.status !== 'Published') {
        return NextResponse.json(
          { success: false, error: 'This product listing is not published or available for purchase.' },
          { status: 400 }
        );
      }

      const parsedQty = Number(body.quantity);
      if (isNaN(parsedQty) || parsedQty <= 0) {
        return NextResponse.json(
          { success: false, error: 'Order quantity must be greater than zero.' },
          { status: 400 }
        );
      }

      if (parsedQty < (product.minOrder || 1)) {
        return NextResponse.json(
          {
            success: false,
            error: `Order quantity (${parsedQty}) must meet minimum order quantity (${product.minOrder || 1} ${product.unit}).`,
          },
          { status: 400 }
        );
      }

      if (product.availableStock < parsedQty) {
        return NextResponse.json(
          {
            success: false,
            error: `Insufficient stock available. Requested: ${parsedQty} ${product.unit}, available: ${product.availableStock} ${product.unit}.`,
          },
          { status: 400 }
        );
      }

      const effectiveBuyerWallet = (body.buyerWallet || user.wallet || '').trim().toLowerCase();
      if (
        (product.supplierId && product.supplierId === user.id) ||
        (effectiveBuyerWallet && product.supplierWallet.trim().toLowerCase() === effectiveBuyerWallet)
      ) {
        return NextResponse.json(
          { success: false, error: 'Suppliers cannot purchase their own products (self-trading prohibited).' },
          { status: 400 }
        );
      }
      const orderIdNum = body.blockchainOrderId || Math.floor(10000 + Math.random() * 90000);
      const isReal = Boolean(
        body.signature && !body.signature.startsWith('simulated') && !body.signature.startsWith('sim_')
      );

      const newOrder = addOrder({
        id: `ord-${orderIdNum}`,
        blockchainOrderId: orderIdNum,
        productId: product.id,
        productName: product.name,
        quantity: parsedQty,
        unit: product.unit,
        amountUsdc: product.priceUsdc * parsedQty,
        buyerWallet: body.buyerWallet || user.wallet || 'DemoBuyerWallet',
        buyerName: user.businessName || user.fullName || body.buyerName || 'Buyer',
        buyerEmail: user.email,
        supplierWallet: product.supplierWallet,
        supplierName: product.supplierName,
        shippingAddress: body.shippingAddress || 'Kathmandu, Nepal',
        state: 'Created',
        orderPda: body.orderPda || 'PDA_Pending',
        mint: '4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU',
        createdAt: new Date().toISOString(),
        transactions: [
          {
            step: 'Created',
            signature: isReal ? body.signature : undefined,
            timestamp: new Date().toISOString(),
            signer: body.buyerWallet || user.wallet || 'Buyer',
            explorerUrl: isReal ? `https://explorer.solana.com/tx/${body.signature}?cluster=devnet` : undefined,
            action: 'create_order',
            isSimulated: !isReal,
          },
        ],
      });
      return NextResponse.json({ success: true, order: newOrder });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }
}
