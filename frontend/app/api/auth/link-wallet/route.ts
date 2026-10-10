import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
const SOLANA_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// SECURITY ARCHITECTURE NOTE:
// Validates Base58 public key format and enforces address uniqueness across business accounts.
// Links the settlement address for business order routing and profile display.
// This does NOT claim cryptographic proof-of-ownership (SIWS).
// Cryptographic transaction signing is strictly enforced on-chain by the Solana Anchor runtime
// via the browser wallet adapter when dispatching escrow instructions.
export async function POST(request: Request) {
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

  const { wallet } = body || {};
  if (wallet === '' || wallet === 'UNLINK' || wallet === null) {
    try {
      const res = await fetch(`${BACKEND_URL}/api/auth/link-wallet`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cookie': cookieHeader,
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ wallet: '' }),
      });
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch (e) {
      const { getSession, updateUserAccount } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
      const updated = updateUserAccount(session.userId, { wallet: undefined });
      return NextResponse.json({ success: true, user: updated });
    }
  }

  if (!wallet || typeof wallet !== 'string' || !SOLANA_PUBKEY_REGEX.test(wallet.trim())) {
    return NextResponse.json(
      { success: false, error: 'Valid Solana wallet address required (Base58, 32-44 characters)' },
      { status: 400 }
    );
  }

  const cleanWallet = wallet.trim();

  // 1. Try backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/link-wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ wallet: cleanWallet }),
    });

    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (e) {
    // Local store fallback
    try {
      const { getSession, getUserByWallet, updateUserAccount } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Session expired. Please log in.' }, { status: 401 });
      }
      const existingOwner = getUserByWallet(cleanWallet);
      if (existingOwner && existingOwner.id !== session.userId) {
        return NextResponse.json(
          { success: false, error: 'This Solana settlement wallet address is already linked to another business account.' },
          { status: 400 }
        );
      }
      const updated = updateUserAccount(session.userId, { wallet: cleanWallet });
      return NextResponse.json({ success: true, user: updated });
    } catch (err: any) {
      return NextResponse.json({ success: false, error: err.message || 'Failed to link wallet' }, { status: 500 });
    }
  }
}
