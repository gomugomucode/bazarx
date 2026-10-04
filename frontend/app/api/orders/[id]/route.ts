import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const res = await fetch(`${BACKEND_URL}/api/orders/${params.id}`, { cache: 'no-store' });
    if (!res.ok) throw new Error(`Backend status: ${res.status}`);
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    try {
      const { getOrderById } = await import('@/lib/store');
      const order = getOrderById(params.id);
      return NextResponse.json({ success: !!order, order });
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
