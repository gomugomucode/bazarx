import { NextResponse } from 'next/server';
import { getOrderById, updateOrderState } from '@/lib/store';
import { OrderState, TransactionRecord } from '@/lib/types';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const order = getOrderById(params.id);

  if (!order) {
    return NextResponse.json(
      { success: false, error: 'Order not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, order });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { nextState, signature, signer, action } = body as {
      nextState: OrderState;
      signature: string;
      signer: string;
      action?: string;
    };

    const existingOrder = getOrderById(params.id);
    if (!existingOrder) {
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    const txRecord: TransactionRecord = {
      step: nextState,
      signature: signature || `tx_${nextState.toLowerCase()}_${Date.now()}`,
      timestamp: new Date().toISOString(),
      signer: signer || 'SignerWallet',
      explorerUrl: `https://explorer.solana.com/tx/${signature || 'simulated'}?cluster=devnet`,
      action: action || `execute_${nextState.toLowerCase()}`,
    };

    const updated = updateOrderState(existingOrder.id, nextState, txRecord);

    return NextResponse.json({ success: true, order: updated });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order state' },
      { status: 500 }
    );
  }
}
