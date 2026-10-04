import { Router, Request, Response } from 'express';
import { store, hashPassword } from '../store';
import { UserAccount, UserProfile, UserRole } from '../types';

const router = Router();
const SOLANA_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

// GET /api/users/profile?wallet=...
router.get('/profile', (req: Request, res: Response) => {
  const wallet = (req.query.wallet as string) || (req.headers['x-wallet-address'] as string);
  if (!wallet || !SOLANA_PUBKEY_REGEX.test(wallet.trim())) {
    return res.status(400).json({ success: false, error: 'Valid Solana wallet address required' });
  }

  const cleanWallet = wallet.trim();
  const profile = store.getUserProfile(cleanWallet);
  if (!profile) {
    return res.json({ success: false, profile: null });
  }

  return res.json({ success: true, profile });
});

// GET /api/users/me (alias for current connected wallet)
router.get('/me', (req: Request, res: Response) => {
  const wallet = (req.query.wallet as string) || (req.headers['x-wallet-address'] as string);
  if (!wallet || !SOLANA_PUBKEY_REGEX.test(wallet.trim())) {
    return res.status(400).json({ success: false, error: 'Valid Solana wallet address required' });
  }

  const cleanWallet = wallet.trim();
  const profile = store.getUserProfile(cleanWallet);
  if (!profile) {
    return res.json({ success: false, profile: null });
  }

  return res.json({ success: true, profile });
});

// POST /api/users/profile (Onboard new business profile via wallet)
router.post('/profile', (req: Request, res: Response) => {
  try {
    const { wallet, businessName, role, roles } = req.body;
    if (!wallet || typeof wallet !== 'string' || !SOLANA_PUBKEY_REGEX.test(wallet.trim())) {
      return res.status(400).json({
        success: false,
        error: 'Valid Solana wallet address required (Base58, 32-44 characters)',
      });
    }

    if (!businessName || typeof businessName !== 'string' || businessName.trim().length < 2 || businessName.trim().length > 100) {
      return res.status(400).json({
        success: false,
        error: 'Business name must be between 2 and 100 characters',
      });
    }

    const cleanWallet = wallet.trim();
    const cleanBusinessName = businessName.trim();

    // Security: Check if profile already exists to prevent profile hijacking/unauthorized overwrites
    const existing = store.getUserProfile(cleanWallet);
    if (existing) {
      return res.status(409).json({
        success: false,
        error: 'A business profile already exists for this wallet address. Existing profiles cannot be overwritten without authenticated wallet ownership.',
      });
    }

    // Security: Public registration only allows BUYER and SUPPLIER. ADMIN cannot be self-assigned.
    let resolvedRoles: UserRole[] = [];
    const candidateRoles = Array.isArray(roles) ? roles : role ? [role] : [];
    for (const r of candidateRoles) {
      const norm = String(r).toUpperCase().trim();
      if (norm === 'BUYER' || norm === 'SUPPLIER') {
        if (!resolvedRoles.includes(norm as UserRole)) {
          resolvedRoles.push(norm as UserRole);
        }
      }
    }

    if (resolvedRoles.length === 0) {
      resolvedRoles = ['BUYER'];
    }

    const now = new Date().toISOString();
    const newAccount: UserAccount = {
      id: `usr_${Date.now()}_${cleanWallet.slice(0, 6)}`,
      email: `${cleanWallet.slice(0, 8).toLowerCase()}@wallet.bazarx.internal`,
      passwordHash: hashPassword('wallet_onboarded_' + cleanWallet),
      fullName: cleanBusinessName,
      businessName: cleanBusinessName,
      phone: '+977-9800000000',
      citizenshipNumber: '00-00-00-00000',
      role: resolvedRoles[0],
      roles: resolvedRoles,
      verificationStatus: 'PENDING',
      wallet: cleanWallet,
      createdAt: now,
      updatedAt: now,
    };

    const saved = store.createUser(newAccount);
    return res.json({ success: true, profile: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
