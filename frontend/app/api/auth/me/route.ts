import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const match = cookieHeader.match(/bazarx_session=([^;]+)/);
  const token = (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) || (match ? decodeURIComponent(match[1]) : undefined);

  if (!token) {
    return NextResponse.json({ success: false, user: null, error: 'Unauthorized' }, { status: 401 });
  }

  // 1. Try backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        'Cookie': cookieHeader,
        'Authorization': `Bearer ${token}`,
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    // Backend unreachable, try local store
  }

  // 2. Local store fallback
  try {
    const { getSession, getUserById, sanitizeUser } = await import('@/lib/store');
    const session = getSession(token);
    if (!session) {
      return NextResponse.json({ success: false, user: null, error: 'Unauthorized' }, { status: 401 });
    }
    const user = getUserById(session.userId);
    if (!user) {
      return NextResponse.json({ success: false, user: null, error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.json({ success: true, user: sanitizeUser(user) });
  } catch (err: any) {
    return NextResponse.json({ success: false, user: null, error: 'Unauthorized' }, { status: 401 });
  }
}
