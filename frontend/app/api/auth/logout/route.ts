import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/bazarx_session=([^;]+)/);
  const token = match ? decodeURIComponent(match[1]) : undefined;

  // 1. Try backend
  try {
    await fetch(`${BACKEND_URL}/api/auth/logout`, {
      method: 'POST',
      headers: {
        'Cookie': cookieHeader,
        ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      },
    });
  } catch (e) {
    // Ignore backend connection errors on logout
  }

  // Local fallback cleanup
  if (token) {
    try {
      const { deleteSession } = await import('@/lib/store');
      deleteSession(token);
    } catch (e) {}
  }

  const response = NextResponse.json({ success: true, message: 'Logged out successfully' });
  response.cookies.set({
    name: 'bazarx_session',
    value: '',
    httpOnly: true,
    path: '/',
    maxAge: 0,
  });

  return response;
}
