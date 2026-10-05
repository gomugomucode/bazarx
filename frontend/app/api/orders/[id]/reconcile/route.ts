import { NextResponse } from 'next/server';
import { reconcileOrderOnChain } from '@/lib/solana';
import { Order, OrderState, TransactionRecord } from '@/lib/types';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';

  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${params.id}/reconcile`, {
      method: 'POST',
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
      const token =
        (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) ||
        (match ? decodeURIComponent(match[1]) : undefined);

      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Authentication required to reconcile orders.' },
          { status: 401 }
        );
      }

      const { getOrderById, getSession, getUserById, updateOrderState } = await import(
        '@/lib/store'
      );
      const session = getSession(token);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Authentication required to reconcile orders.' },
          { status: 401 }
        );
      }

      const user = getUserById(session.userId);
      if (!user) {
        return NextResponse.json(
          { success: false, error: 'User account not found.' },
          { status: 401 }
        );
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
        return NextResponse.json(
          { success: false, error: 'Access denied: You do not have permission to reconcile this order.' },
          { status: 403 }
        );
      }

      const reconciliation = await reconcileOrderOnChain(order);

      if (reconciliation.actionTaken === 'CHAIN_ADVANCED_UPDATED') {
        const advancedState = reconciliation.onChainState as OrderState;
        const now = new Date().toISOString();
        const reconcileTx: TransactionRecord = {
          step: advancedState,
          timestamp: now,
          signer: 'OnChainReconciliation',
          action: `reconcile_to_${advancedState.toLowerCase()}`,
          isSimulated: false,
        };
        const updated = updateOrderState(order.id, advancedState, reconcileTx);
        reconciliation.order = updated || undefined;
      }

      return NextResponse.json({ success: true, reconciliation });
    } catch (fallbackErr: any) {
      return NextResponse.json(
        { success: false, error: fallbackErr.message || 'Reconciliation failed' },
        { status: 500 }
      );
    }
  }
}
