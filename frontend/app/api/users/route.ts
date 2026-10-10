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

  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';

  // 1. Try proxying to Express backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/users${qs}`, {
      headers: {
        Cookie: cookieHeader,
        Authorization: authHeader || (token ? `Bearer ${token}` : ''),
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    // 2. Local store fallback
    try {
      if (!token) {
        return NextResponse.json(
          { success: false, error: 'Authentication required', users: [] },
          { status: 401 }
        );
      }
      const { getSession, getUserById, getAllUsers } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session expired', users: [] },
          { status: 401 }
        );
      }
      const user = getUserById(session.userId);
      if (!user || (!user.roles?.includes('ADMIN') && user.role !== 'ADMIN')) {
        return NextResponse.json(
          { success: false, error: 'Admin access required', users: [] },
          { status: 403 }
        );
      }

      let allUsers = getAllUsers();
      const status = searchParams.get('status');
      const role = searchParams.get('role');
      if (status && status !== 'All') {
        allUsers = allUsers.filter((u) => u.verificationStatus === status);
      }
      if (role && role !== 'All') {
        allUsers = allUsers.filter((u) => u.roles?.includes(role as any) || u.role === role);
      }

      return NextResponse.json({ success: true, users: allUsers });
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: e.message || 'Failed to fetch users', users: [] },
        { status: 500 }
      );
    }
  }
}
