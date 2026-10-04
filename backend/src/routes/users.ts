import { Router, Request, Response } from 'express';
import { store } from '../store';
import { UserProfile, UserRole } from '../types';

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

// POST /api/users/profile
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

    const existing = store.getUserProfile(cleanWallet);
    // If the account was previously an ADMIN in seed data, preserve their ADMIN privilege
    if (existing?.roles?.includes('ADMIN') && !resolvedRoles.includes('ADMIN')) {
      resolvedRoles.unshift('ADMIN');
    }

    const newProfile: UserProfile = {
      wallet: cleanWallet,
      businessName: cleanBusinessName,
      roles: resolvedRoles,
      createdAt: existing?.createdAt || new Date().toISOString(),
    };

    const saved = store.saveUserProfile(newProfile);
    return res.json({ success: true, profile: saved });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
