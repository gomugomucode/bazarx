import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
const SOLANA_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const wallet = searchParams.get('wallet') || request.headers.get('x-wallet-address');

  if (!wallet || !SOLANA_PUBKEY_REGEX.test(wallet.trim())) {
    return NextResponse.json(
      { success: false, error: 'Valid Solana wallet address required' },
      { status: 400 }
    );
  }

  const cleanWallet = wallet.trim();

  try {
    const res = await fetch(
      `${BACKEND_URL}/api/users/me?wallet=${encodeURIComponent(cleanWallet)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      throw new Error(`Backend returned status ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    try {
      const { getUserProfile } = await import('@/lib/store');
      const profile = getUserProfile(cleanWallet);
      return NextResponse.json({ success: true, profile: profile || null });
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: e.message || 'Profile lookup failed' },
        { status: 500 }
      );
    }
  }
}
