import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const match = cookieHeader.match(/bazarx_session=([^;]+)/);
  const token =
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) ||
    (match ? decodeURIComponent(match[1]) : undefined);

  let body: any = {};
  try {
    body = await request.json();
  } catch (e) {
    // empty or invalid body
  }

  const userId = params.id;

  // 1. Try proxying to Express backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/users/${userId}/verification`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Cookie: cookieHeader,
        Authorization: authHeader || (token ? `Bearer ${token}` : ''),
      },
      body: JSON.stringify(body),
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    // 2. Local store fallback
    try {
      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Authentication required' },
          { status: 401 }
        );
      }
      const { getSession, getUserById, updateVerificationStatus } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session expired' },
          { status: 401 }
        );
      }
      const user = getUserById(session.userId);
      if (!user || (!user.roles?.includes('ADMIN') && user.role !== 'ADMIN')) {
        return NextResponse.json(
          { success: false, error: 'Admin access required' },
          { status: 403 }
        );
      }

      const { status, notes } = body;
      if (!status || !['VERIFIED', 'PENDING', 'REJECTED'].includes(status)) {
        return NextResponse.json(
          { success: false, error: 'Valid verification status (VERIFIED, PENDING, REJECTED) required' },
          { status: 400 }
        );
      }

      const updated = updateVerificationStatus(userId, status, notes);
      if (!updated) {
        return NextResponse.json(
          { success: false, error: 'User account not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ success: true, user: updated });
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: e.message || 'Verification update failed' },
        { status: 500 }
      );
    }
  }
}
