import { Router, Request, Response } from 'express';
import { store } from '../store';
import { UserProfile, UserRole } from '../types';

const router = Router();

// GET /api/users/profile?wallet=...
router.get('/profile', (req: Request, res: Response) => {
  const wallet = (req.query.wallet as string) || (req.headers['x-wallet-address'] as string);
  if (!wallet) {
    return res.status(400).json({ success: false, error: 'Wallet address required' });
  }

  const profile = store.getUserProfile(wallet);
  if (!profile) {
    return res.json({ success: false, profile: null });
  }

  return res.json({ success: true, profile });
});

// GET /api/users/me (alias for current connected wallet)
router.get('/me', (req: Request, res: Response) => {
  const wallet = (req.query.wallet as string) || (req.headers['x-wallet-address'] as string);
  if (!wallet) {
    return res.status(400).json({ success: false, error: 'Wallet address required' });
  }

  const profile = store.getUserProfile(wallet);
  if (!profile) {
    return res.json({ success: false, profile: null });
  }

  return res.json({ success: true, profile });
});

// POST /api/users/profile
router.post('/profile', (req: Request, res: Response) => {
  try {
    const { wallet, businessName, role, roles } = req.body;
    if (!wallet || !businessName) {
      return res.status(400).json({
        success: false,
        error: 'Wallet and businessName are required fields',
      });
    }

    let resolvedRoles: UserRole[] = [];
    if (Array.isArray(roles) && roles.length > 0) {
      resolvedRoles = roles;
    } else if (role) {
      const normalized = role.toUpperCase();
      if (['BUYER', 'SUPPLIER', 'ADMIN'].includes(normalized)) {
        resolvedRoles = [normalized as UserRole];
      }
    }

    if (resolvedRoles.length === 0) {
      resolvedRoles = ['BUYER'];
    }

    const existing = store.getUserProfile(wallet);
    const newProfile: UserProfile = {
      wallet,
      businessName,
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
