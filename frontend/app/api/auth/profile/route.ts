import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function PATCH(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const match = cookieHeader.match(/bazarx_session=([^;]+)/);
  const token = (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) || (match ? decodeURIComponent(match[1]) : undefined);

  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { businessName, fullName, phone } = body || {};

  // 1. Try backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ businessName, fullName, phone }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    // Local store fallback
    try {
      const { getSession, updateUserAccount } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Session expired. Please log in.' }, { status: 401 });
      }
      const updates: any = {};
      if (businessName && typeof businessName === 'string' && businessName.trim().length >= 2) {
        updates.businessName = businessName.trim();
      }
      if (fullName && typeof fullName === 'string' && fullName.trim().length >= 2) {
        updates.fullName = fullName.trim();
      }
      if (phone && typeof phone === 'string' && phone.trim().length >= 7) {
        updates.phone = phone.trim();
      }
      const updated = updateUserAccount(session.userId, updates);
      return NextResponse.json({ success: true, user: updated });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed to update profile' }, { status: 500 });
    }
  }
}
