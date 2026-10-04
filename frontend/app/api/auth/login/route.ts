import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 });
  }

  const { email, password } = body || {};
  if (!email || !password) {
    return NextResponse.json({ success: false, error: 'Email and password are required' }, { status: 400 });
  }

  // 1. Try Express backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const nextRes = NextResponse.json(data, { status: res.status });

    // Forward Set-Cookie header if present
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) {
      nextRes.headers.set('Set-Cookie', setCookie);
    } else if (data.token) {
      nextRes.cookies.set({
        name: 'bazarx_session',
        value: data.token,
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600,
      });
    }

    return nextRes;
  } catch (err: any) {
    // 2. Local store fallback
    try {
      const { getUserByEmail, verifyPassword, sanitizeUser, createSession } = await import('@/lib/store');
      const cleanEmail = String(email).trim().toLowerCase();
      const user = getUserByEmail(cleanEmail);

      if (!user || !verifyPassword(String(password), user.passwordHash || '')) {
        return NextResponse.json(
          { success: false, error: 'Invalid email or password. Please try again.' },
          { status: 401 }
        );
      }

      const session = createSession(user.id);
      const sanitized = sanitizeUser(user);

      const nextRes = NextResponse.json({
        success: true,
        user: sanitized,
        token: session.token,
      });

      nextRes.cookies.set({
        name: 'bazarx_session',
        value: session.token,
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 7 * 24 * 3600,
      });

      return nextRes;
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message || 'Login error' }, { status: 500 });
    }
  }
}
