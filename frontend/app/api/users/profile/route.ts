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
      `${BACKEND_URL}/api/users/profile?wallet=${encodeURIComponent(cleanWallet)}`,
      { cache: 'no-store' }
    );
    if (!res.ok) {
      throw new Error(`Backend returned status ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json(data);
  } catch (err: any) {
    // Local store fallback
    try {
      const { getUserProfile } = await import('@/lib/store');
      const profile = getUserProfile(cleanWallet);
      return NextResponse.json({ success: true, profile: profile || null });
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: e.message || 'Profile fetch failed' },
        { status: 500 }
      );
    }
  }
}

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json(
      { success: false, error: 'Invalid JSON request body' },
      { status: 400 }
    );
  }

  const { wallet, businessName, role, roles } = body || {};

  // Security & Input validation
  if (!wallet || typeof wallet !== 'string' || !SOLANA_PUBKEY_REGEX.test(wallet.trim())) {
    return NextResponse.json(
      { success: false, error: 'Valid Solana wallet address required (Base58, 32-44 chars)' },
      { status: 400 }
    );
  }

  if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2 || businessName.trim().length > 100) {
    return NextResponse.json(
      { success: false, error: 'Business name must be between 2 and 100 characters' },
      { status: 400 }
    );
  }

  const cleanWallet = wallet.trim();
  const cleanBusinessName = businessName.trim();

  // Privilege escalation prevention:
  // Public registration only permits BUYER or SUPPLIER roles. ADMIN can never be self-assigned.
  let resolvedRoles: ('BUYER' | 'SUPPLIER')[] = [];
  const candidateRoles = Array.isArray(roles) ? roles : role ? [role] : [];
  for (const r of candidateRoles) {
    const norm = String(r).toUpperCase().trim();
    if (norm === 'BUYER' || norm === 'SUPPLIER') {
      if (!resolvedRoles.includes(norm)) {
        resolvedRoles.push(norm);
      }
    }
  }

  if (resolvedRoles.length === 0) {
    resolvedRoles = ['BUYER'];
  }

  const sanitizedPayload = {
    wallet: cleanWallet,
    businessName: cleanBusinessName,
    roles: resolvedRoles,
  };

  try {
    const res = await fetch(`${BACKEND_URL}/api/users/profile`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(sanitizedPayload),
    });
    if (!res.ok) {
      throw new Error(`Backend returned status ${res.status}`);
    }
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    // Local store fallback
    try {
      const { saveUserProfile, getUserProfile } = await import('@/lib/store');
      const existing = getUserProfile(cleanWallet);
      const saved = saveUserProfile({
        wallet: cleanWallet,
        businessName: cleanBusinessName,
        roles: existing?.roles?.includes('ADMIN') ? ['ADMIN', ...resolvedRoles] : resolvedRoles,
        createdAt: existing?.createdAt || new Date().toISOString(),
      });
      return NextResponse.json({ success: true, profile: saved });
    } catch (e: any) {
      return NextResponse.json(
        { success: false, error: e.message || 'Profile save failed' },
        { status: 500 }
      );
    }
  }
}
