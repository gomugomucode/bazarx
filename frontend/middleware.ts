import { NextResponse, type NextRequest } from 'next/server';

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const sessionCookie = request.cookies.get('bazarx_session');
  const sessionToken = sessionCookie?.value;

  const isProtectedRoute =
    pathname === '/dashboard' ||
    pathname.startsWith('/dashboard/') ||
    pathname === '/profile' ||
    pathname.startsWith('/profile/') ||
    pathname === '/orders' ||
    pathname.startsWith('/orders/') ||
    pathname === '/admin' ||
    pathname.startsWith('/admin/');

  if (!isProtectedRoute) {
    return NextResponse.next();
  }

  // 1. Unauthenticated request: Immediate Server-Side HTTP 307 Redirect
  if (!sessionToken) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname + search);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Validate session against backend service
  try {
    const authRes = await fetch(`${BACKEND_URL}/api/auth/me`, {
      headers: {
        Cookie: `bazarx_session=${sessionToken}`,
        Authorization: `Bearer ${sessionToken}`,
      },
      cache: 'no-store',
    });

    // Invalid or expired session: Redirect to login and clear cookie
    if (!authRes.ok) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname + search);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete('bazarx_session');
      return res;
    }

    const authData = await authRes.json();
    const user = authData?.user;

    if (!user) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname + search);
      const res = NextResponse.redirect(loginUrl);
      res.cookies.delete('bazarx_session');
      return res;
    }

    // 3. Admin Authorization Enforcement (Server-Side)
    if (pathname === '/admin' || pathname.startsWith('/admin/')) {
      const isAdmin = user && (user.roles?.includes('ADMIN') || user.role === 'ADMIN');
      if (!isAdmin) {
        // Return strict HTTP 403 Forbidden response
        return new NextResponse(
          `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>403: Administrator Access Denied - BazaarX</title>
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body { font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 1.5rem; }
    .card { background: #1e293b; border: 1px solid #334155; border-radius: 1.25rem; max-width: 30rem; width: 100%; padding: 2.25rem; text-align: center; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.5); }
    .badge { display: inline-block; background: #881337; color: #fecdd3; padding: 0.35rem 0.85rem; border-radius: 9999px; font-size: 0.75rem; font-weight: 700; margin-bottom: 1.25rem; border: 1px solid #be123c; }
    h1 { font-size: 1.5rem; font-weight: 800; margin: 0 0 0.75rem 0; color: #ffffff; letter-spacing: -0.025em; }
    p { font-size: 0.875rem; color: #94a3b8; line-height: 1.6; margin: 0 0 1.75rem 0; }
    .btn { display: inline-block; background: #059669; color: #ffffff; text-decoration: none; padding: 0.75rem 1.5rem; border-radius: 0.75rem; font-size: 0.875rem; font-weight: 700; transition: background 0.15s; }
    .btn:hover { background: #047857; }
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">HTTP 403 Forbidden</div>
    <h1>Administrator Access Denied</h1>
    <p>Your authenticated business account (${escapeHtml(user?.email || 'authenticated user')}) does not possess the internally assigned ADMIN role required to inspect or administer Solana smart contract governance.</p>
    <a href="/dashboard" class="btn">Return to Dashboard</a>
  </div>
</body>
</html>`,
          {
            status: 403,
            headers: { 'Content-Type': 'text/html; charset=utf-8' },
          }
        );
      }
    }

    return NextResponse.next();
  } catch (err) {
    // If backend service is momentarily unreachable from edge middleware,
    // allow the request through to let the page-level AuthContext / API proxy handle it
    console.warn('Middleware auth verification error:', err);
    return NextResponse.next();
  }
}

function escapeHtml(str: string): string {
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  }[m] || m));
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/dashboard',
    '/profile/:path*',
    '/profile',
    '/orders/:path*',
    '/admin/:path*',
    '/admin',
  ],
};
