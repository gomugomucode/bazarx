import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { store, hashPassword, verifyPassword, sanitizeUser } from '../store';
import { UserAccount, UserRole, VerificationStatus } from '../types';

const router = Router();
const SOLANA_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to extract session token from cookies or Authorization header
export function getSessionToken(req: Request): string | undefined {
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    return req.headers.authorization.slice(7).trim();
  }
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/bazarx_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

// Helper to resolve currently authenticated user
export function getAuthUser(req: Request): UserAccount | null {
  const token = getSessionToken(req);
  if (!token) return null;
  const session = store.getSession(token);
  if (!session) return null;
  return store.getUserById(session.userId) || null;
}

// POST /api/auth/register
router.post('/register', (req: Request, res: Response) => {
  try {
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
    } = req.body;

    // 1. Role validation (only BUYER or SUPPLIER allowed for public registration)
    const normRole = (role || '').toUpperCase().trim();
    if (normRole !== 'BUYER' && normRole !== 'SUPPLIER') {
      return res.status(400).json({
        success: false,
        error: 'Please select a valid registration role: Buyer or Supplier',
      });
    }

    // 2. Required fields validation
    if (!fullName || typeof fullName !== 'string' || fullName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Full Name is required (min 2 characters)' });
    }
    if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2) {
      return res.status(400).json({ success: false, error: 'Business Name is required (min 2 characters)' });
    }
    if (!email || !EMAIL_REGEX.test(email.trim().toLowerCase())) {
      return res.status(400).json({ success: false, error: 'Valid business email address is required' });
    }
    if (!phone || typeof phone !== 'string' || phone.trim().length < 7) {
      return res.status(400).json({ success: false, error: 'Valid phone number is required' });
    }
    if (!citizenshipNumber || typeof citizenshipNumber !== 'string' || citizenshipNumber.trim().length < 5) {
      return res.status(400).json({ success: false, error: 'Citizenship Number is required for business identification' });
    }
    if (normRole === 'SUPPLIER' && (!panNumber || typeof panNumber !== 'string' || panNumber.trim().length < 5)) {
      return res.status(400).json({ success: false, error: 'PAN Number is required for wholesale supplier verification' });
    }
    if (!password || typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const existing = store.getUserByEmail(cleanEmail);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'An account with this email address already exists. Please log in.',
      });
    }

    // Validate wallet if provided at registration
    let cleanWallet: string | undefined = undefined;
    if (wallet && typeof wallet === 'string' && wallet.trim().length > 0) {
      if (!SOLANA_PUBKEY_REGEX.test(wallet.trim())) {
        return res.status(400).json({ success: false, error: 'Invalid Solana settlement wallet address' });
      }
      cleanWallet = wallet.trim();
      const existingWalletUser = store.getUserByWallet(cleanWallet);
      if (existingWalletUser) {
        return res.status(400).json({
          success: false,
          error: 'This Solana settlement wallet address is already linked to another business account',
        });
      }
    }

    const now = new Date().toISOString();
    const newAccount: UserAccount = {
      id: `usr_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`,
      email: cleanEmail,
      passwordHash: hashPassword(password),
      fullName: fullName.trim(),
      businessName: businessName.trim(),
      phone: phone.trim(),
      citizenshipNumber: citizenshipNumber.trim(),
      panNumber: panNumber ? panNumber.trim() : undefined,
      role: normRole as UserRole,
      roles: [normRole as UserRole],
      // Verification status starts as PENDING for all new accounts
      verificationStatus: 'PENDING',
      verificationNotes: normRole === 'SUPPLIER'
        ? 'Supplier profile submitted. Verification pending administrative compliance review.'
        : 'Buyer profile submitted. Verification pending.',
      wallet: cleanWallet,
      createdAt: now,
      updatedAt: now,
    };

    const created = store.createUser(newAccount);
    const session = store.createSession(newAccount.id);

    // Set secure HTTP-only session cookie
    res.setHeader(
      'Set-Cookie',
      `bazarx_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );

    return res.status(201).json({
      success: true,
      user: created,
      token: session.token,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Registration failed' });
  }
});

// POST /api/auth/login
router.post('/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Email and password are required' });
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const user = store.getUserByEmail(cleanEmail);
    if (!user || !verifyPassword(String(password), user.passwordHash)) {
      return res.status(401).json({
        success: false,
        error: 'Invalid email or password. Please try again.',
      });
    }

    const session = store.createSession(user.id);
    const sanitized = sanitizeUser(user);

    res.setHeader(
      'Set-Cookie',
      `bazarx_session=${session.token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 3600}`
    );

    return res.json({
      success: true,
      user: sanitized,
      token: session.token,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message || 'Login failed' });
  }
});

// POST /api/auth/logout
router.post('/logout', (req: Request, res: Response) => {
  const token = getSessionToken(req);
  if (token) {
    store.deleteSession(token);
  }
  res.setHeader('Set-Cookie', `bazarx_session=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`);
  return res.json({ success: true, message: 'Logged out successfully' });
});

// GET /api/auth/me (Current authenticated user session)
router.get('/me', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, user: null, error: 'Unauthorized' });
  }
  return res.json({ success: true, user: sanitizeUser(user) });
});

// POST /api/auth/link-wallet (Link connected Solana settlement wallet)
// SECURITY ARCHITECTURE NOTE:
// This endpoint validates Base58 public key format and enforces address uniqueness across accounts.
// It links the settlement address for business order routing and profile representation.
// It is NOT cryptographic proof-of-ownership (e.g. Sign-In-With-Solana / Ed25519 signature challenge).
// True non-custodial authorization is strictly enforced on-chain by the Solana Anchor runtime:
// the connected wallet adapter must directly sign every transaction instruction.
router.post('/link-wallet', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const { wallet } = req.body;
  if (wallet === '' || wallet === 'UNLINK' || wallet === null) {
    const updated = store.updateUser(user.id, { wallet: undefined });
    return res.json({ success: true, user: updated });
  }

  if (!wallet || typeof wallet !== 'string' || !SOLANA_PUBKEY_REGEX.test(wallet.trim())) {
    return res.status(400).json({
      success: false,
      error: 'Valid Solana wallet address required (Base58, 32-44 characters)',
    });
  }

  const cleanWallet = wallet.trim();
  const existingOwner = store.getUserByWallet(cleanWallet);
  if (existingOwner && existingOwner.id !== user.id) {
    return res.status(400).json({
      success: false,
      error: 'This Solana settlement wallet address is already linked to another business account.',
    });
  }

  const updated = store.updateUser(user.id, { wallet: cleanWallet });
  return res.json({ success: true, user: updated });
});

// PATCH /api/auth/profile (Update permitted business details)
router.patch('/profile', (req: Request, res: Response) => {
  const user = getAuthUser(req);
  if (!user) {
    return res.status(401).json({ success: false, error: 'Authentication required' });
  }

  const { businessName, fullName, phone } = req.body;
  const updates: Partial<UserAccount> = {};

  if (businessName && typeof businessName === 'string' && businessName.trim().length >= 2) {
    updates.businessName = businessName.trim();
  }
  if (fullName && typeof fullName === 'string' && fullName.trim().length >= 2) {
    updates.fullName = fullName.trim();
  }
  if (phone && typeof phone === 'string' && phone.trim().length >= 7) {
    updates.phone = phone.trim();
  }

  const updated = store.updateUser(user.id, updates);
  return res.json({ success: true, user: updated });
});

export default router;
