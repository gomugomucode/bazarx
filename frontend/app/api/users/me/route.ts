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
      `${BACKEND_URL}/api/users/me?wallet=${encodeURIComponent(wallet)}`,
      { cache: 'no-store' }
    );
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
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
