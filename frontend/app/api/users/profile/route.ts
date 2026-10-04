import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet') || request.headers.get('x-wallet-address');

  if (!wallet) {
    return NextResponse.json(
      { success: false, error: 'Wallet address required' },
      { status: 400 }
    );
  }

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/users/profile?wallet=${encodeURIComponent(wallet)}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    // Local store fallback
    try {
      const { getUserProfile } = await import('@/lib/store');
      const profile = getUserProfile(wallet);
      return NextResponse.json({ success: true, profile: profile || null });
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    // Local store fallback
    try {
      const { saveUserProfile, getUserProfile } = await import('@/lib/store');
      const body = await request.clone().json();
      const { wallet, businessName, role, roles } = body;
      if (!wallet || !businessName) {
        return NextResponse.json(
          { success: false, error: 'Wallet and businessName required' },
          { status: 400 }
        );
      }

      let resolvedRoles = Array.isArray(roles) && roles.length > 0 ? roles : [];
      if (resolvedRoles.length === 0 && role) {
        const norm = role.toUpperCase();
        if (['BUYER', 'SUPPLIER', 'ADMIN'].includes(norm)) {
          resolvedRoles = [norm];
        }
      }
      if (resolvedRoles.length === 0) resolvedRoles = ['BUYER'];

      const existing = getUserProfile(wallet);
      const saved = saveUserProfile({
        wallet,
        businessName,
        roles: resolvedRoles,
        createdAt: existing?.createdAt || new Date().toISOString(),
      });
      return NextResponse.json({ success: true, profile: saved });
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: err.message },
        { status: 500 }
      );
    }
  }
}
