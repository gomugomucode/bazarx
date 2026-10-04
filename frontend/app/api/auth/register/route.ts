import { NextResponse } from 'next/server';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';
const SOLANA_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  let body: any;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ success: false, error: 'Invalid JSON request body' }, { status: 400 });
  }

  const {
    role,
    fullName,
    businessName,
    email,
    phone,
    citizenshipNumber,
    panNumber,
    password,
    wallet,
  } = body || {};

  // Input validation
  const normRole = (role || '').toUpperCase().trim();
  if (normRole !== 'BUYER' && normRole !== 'SUPPLIER') {
    return NextResponse.json({
      success: false,
      error: 'Please select a valid registration role: Buyer or Supplier',
    }, { status: 400 });
  }

  if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
    return NextResponse.json({ success: false, error: 'Full Name is required (min 2 characters)' }, { status: 400 });
  }
  if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
    return NextResponse.json({ success: false, error: 'Business Name is required (min 2 characters)' }, { status: 400 });
  }
  if (!email || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
    return NextResponse.json({ success: false, error: 'Valid business email address is required' }, { status: 400 });
  }
  if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
    return NextResponse.json({ success: false, error: 'Valid phone number is required' }, { status: 400 });
  }
  if (!citizenshipNumber || typeof citizenshipNumber !== 'string' || citizenshipNumber.trim().length < 5) {
    return NextResponse.json({ success: false, error: 'Citizenship Number is required for business identification' }, { status: 400 });
  }
  if (normRole === 'SUPPLIER' && (!panNumber || typeof panNumber !== 'string' || panNumber.trim().length < 5)) {
    return NextResponse.json({ success: false, error: 'PAN Number is required for wholesale supplier verification' }, { status: 400 });
  }
  if (!password || typeof password !== 'string' || password.length < 6) {
    return NextResponse.json({ success: false, error: 'Password must be at least 6 characters long' }, { status: 400 });
  }

  let cleanWallet: string | undefined = undefined;
  if (wallet && typeof wallet === 'string' && wallet.trim().length > 0) {
    if (!SOLANA_PUBKEY_REGEX.test(wallet.trim())) {
      return NextResponse.json({ success: false, error: 'Invalid Solana settlement wallet address' }, { status: 400 });
    }
    cleanWallet = wallet.trim();
  }

  // 1. Try backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    const nextRes = NextResponse.json(data, { status: res.status });

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
      const {
        getUserByEmail,
        saveUserAccount,
        createSession,
        hashPassword,
      } = await import('@/lib/store');

      const cleanEmail = email.trim().toLowerCase();
      const existing = getUserByEmail(cleanEmail);
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'An account with this email address already exists. Please log in.' },
          { status: 409 }
        );
      }

      const now = new Date().toISOString();
      const newAccount = {
        id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
        email: cleanEmail,
        passwordHash: hashPassword(password),
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        phone: phone.trim(),
        citizenshipNumber: citizenshipNumber.trim(),
        panNumber: panNumber ? panNumber.trim() : undefined,
        role: normRole as 'BUYER' | 'SUPPLIER',
        roles: [normRole as 'BUYER' | 'SUPPLIER'],
        verificationStatus: 'PENDING' as const,
        verificationNotes: normRole === 'SUPPLIER'
          ? 'Supplier profile submitted. Verification pending administrative compliance review.'
          : 'Buyer profile submitted. Verification pending.',
        wallet: cleanWallet,
        createdAt: now,
        updatedAt: now,
      };

      const saved = saveUserAccount(newAccount);
      const session = createSession(newAccount.id);

      const nextRes = NextResponse.json({
        success: true,
        user: saved,
        token: session.token,
      }, { status: 201 });

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
      return NextResponse.json({ success: false, error: e.message || 'Registration error' }, { status: 500 });
    }
  }
}
