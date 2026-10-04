import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';

  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${params.id}`, {
      headers: {
        'Cookie': cookieHeader,
        'Authorization': authHeader,
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    try {
      const match = cookieHeader.match(/bazarx_session=([^;]+)/);
      const token = (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) || (match ? decodeURIComponent(match[1]) : undefined);

      if (!token) {
        return NextResponse.json({
          success: false,
          error: 'Authentication required. Please sign in to view this wholesale order.',
        }, { status: 401 });
      }

      const { getOrderById, getSession, getUserById } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) {
        return NextResponse.json({
          success: false,
          error: 'Authentication required. Please sign in to view this wholesale order.',
        }, { status: 401 });
      }

      const user = getUserById(session.userId);
      if (!user) {
        return NextResponse.json({
          success: false,
          error: 'User account not found.',
        }, { status: 401 });
      }

      const order = getOrderById(params.id);
      if (!order) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }

      // Check authorization
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
        return NextResponse.json({
          success: false,
          error: 'Access denied: You do not have permission to view this wholesale trade order.',
        }, { status: 403 });
      }

      return NextResponse.json({ success: true, order });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${params.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`Backend status: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    try {
      const { updateOrderState } = await import('@/lib/store');
      const updated = updateOrderState(params.id, body.nextState, {
        step: body.nextState,
        signature: body.signature || undefined,
        timestamp: new Date().toISOString(),
        signer: body.signer || 'Signer',
        action: body.action || 'update',
        isSimulated: body.isSimulated,
      });
      return NextResponse.json({ success: !!updated, order: updated });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: err.message }, { status: 500 });
    }
  }
}
