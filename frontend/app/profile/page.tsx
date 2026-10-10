'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import {
  User,
  Building,
  Mail,
  Phone,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  Wallet,
  ExternalLink,
  Edit2,
  Save,
  X,
  FileText,
  CreditCard,
  ArrowLeft,
  Lock,
  Link as LinkIcon,
  Trash2,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { shortenAddress, getExplorerAccountUrl } from '@/lib/solana';
import { SettlementWalletCard } from '@/components/SettlementWalletCard';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, linkWallet, refreshUser } = useAuth();
  const { publicKey, connected } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();

  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [phone, setPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [linking, setLinking] = useState(false);
  const [manualWallet, setManualWallet] = useState('');
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/profile');
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user) {
      setFullName(user.fullName || '');
      setBusinessName(user.businessName || '');
      setPhone(user.phone || '');
    }
  }, [user]);

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Loading business profile...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-xl font-bold text-slate-900">Sign In Required</h2>
        <p className="text-xs text-slate-500">
          Please log in to manage your BazaarX business profile and settlement settings.
        </p>
        <Link
          href="/login?redirect=/profile"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-bold text-xs"
        >
          Sign In
        </Link>
      </div>
    );
  }

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatusMsg(null);
    setSaving(true);

    try {
      const res = await fetch('/api/auth/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fullName, businessName, phone }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update profile');
      }

      await refreshUser();
      setEditing(false);
      setStatusMsg({ type: 'success', message: 'Business profile updated successfully.' });
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Error saving profile' });
    } finally {
      setSaving(false);
    }
  };

  const handleLinkConnectedWallet = async () => {
    if (!publicKey) {
      openWalletModal(true);
      return;
    }

    setStatusMsg(null);
    setLinking(true);

    try {
      const walletAddress = publicKey.toBase58();
      await linkWallet(walletAddress);
      setStatusMsg({
        type: 'success',
        message: `Settlement wallet ${shortenAddress(walletAddress, 4)} linked successfully.`,
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Failed to link wallet' });
    } finally {
      setLinking(false);
    }
  };

  const handleSaveManualWallet = async (addrToSave?: string) => {
    const target = (addrToSave || manualWallet).trim();
    if (!target) {
      setStatusMsg({ type: 'error', message: 'Please enter a valid Solana wallet address' });
      return;
    }
    const SOLANA_PUBKEY_REGEX = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
    if (!SOLANA_PUBKEY_REGEX.test(target)) {
      setStatusMsg({
        type: 'error',
        message: 'Invalid Solana address format. Must be Base58, 32-44 characters.',
      });
      return;
    }

    setStatusMsg(null);
    setLinking(true);
    try {
      await linkWallet(target);
      setStatusMsg({
        type: 'success',
        message: `Settlement wallet ${shortenAddress(target, 4)} linked successfully.`,
      });
      setManualWallet('');
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Failed to link wallet' });
    } finally {
      setLinking(false);
    }
  };

  const handleUnlinkWallet = async () => {
    setStatusMsg(null);
    setLinking(true);
    try {
      await linkWallet('');
      setStatusMsg({
        type: 'success',
        message: 'Settlement wallet unlinked successfully.',
      });
    } catch (err: any) {
      setStatusMsg({ type: 'error', message: err.message || 'Failed to unlink wallet' });
    } finally {
      setLinking(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Dashboard
        </Link>

        <span className="text-[11px] font-mono text-slate-400">
          Account ID: {user.id}
        </span>
      </div>

      {/* Header */}
      <div className="border-b border-slate-200 pb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
              B2B Business Profile
            </span>
            <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200">
              {user.roles?.join(' & ')}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            {user.businessName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Registered business identity, compliance credentials, and settlement wallet configuration.
          </p>
        </div>

        {!editing ? (
          <button
            onClick={() => setEditing(true)}
            className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
          >
            <Edit2 className="w-3.5 h-3.5" />
            <span>Edit Profile</span>
          </button>
        ) : (
          <button
            onClick={() => setEditing(false)}
            className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-500 font-semibold text-xs"
          >
            <X className="w-3.5 h-3.5" />
            <span>Cancel</span>
          </button>
        )}
      </div>

      {/* Status Notice */}
      {statusMsg && (
        <div
          className={`p-4 rounded-2xl text-xs flex items-center gap-2.5 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-900'
              : 'bg-rose-50 border border-rose-200 text-rose-900'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.message}</span>
        </div>
      )}

      {/* Profile Form / Display */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Personal & Business Information */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500" />
              1. Business &amp; Contact Details
            </h3>
            {editing && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                Editing Mode
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Registered Business Name
              </label>
              {editing ? (
                <input
                  type="text"
                  required
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-900"
                />
              ) : (
                <div className="font-bold text-sm text-slate-900">{user.businessName}</div>
              )}
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Full Legal Representative Name
              </label>
              {editing ? (
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-900"
                />
              ) : (
                <div className="font-semibold text-slate-800">{user.fullName}</div>
              )}
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Business Email Address (Primary Identity)
              </label>
              <div className="font-mono text-slate-700 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                {user.email}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Email address is locked as primary login key
              </span>
            </div>

            <div>
              <label className="block text-slate-400 font-medium mb-1">
                Official Phone Number
              </label>
              {editing ? (
                <input
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 text-xs font-semibold text-slate-900"
                />
              ) : (
                <div className="font-semibold text-slate-800">{user.phone}</div>
              )}
            </div>
          </div>

          {editing && (
            <div className="pt-4 border-t border-slate-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(false)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs disabled:opacity-50"
              >
                <Save className="w-3.5 h-3.5 text-emerald-400" />
                <span>{saving ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Verification Status & Protected Compliance Details */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              2. Profile Verification &amp; Compliance Status
            </h3>
            {user.verificationStatus === 'PENDING' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-xs font-semibold">
                <Clock className="w-3.5 h-3.5 text-amber-600" />
                <span>Verification Pending</span>
              </span>
            ) : user.verificationStatus === 'VERIFIED' ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Verified Account</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-800 border border-rose-200 text-xs font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Verification Requires Attention</span>
              </span>
            )}
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <p className="font-semibold text-slate-800">
              Application Compliance &amp; KYB Verification
            </p>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Government credentials are collected for compliance identification under BazaarX trade standards. Information is reviewed manually by compliance officers. Verified credentials cannot be modified without formal re-verification.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 text-xs">
            <div>
              <span className="text-slate-400 font-medium block mb-1">
                Citizenship Certificate (Masked)
              </span>
              <div className="font-mono text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 font-semibold">
                {user.maskedCitizenship || '••••••••••••'}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Protected private record • Not exposed publicly
              </span>
            </div>

            <div>
              <span className="text-slate-400 font-medium block mb-1">
                Permanent Account Number (PAN)
              </span>
              <div className="font-mono text-slate-800 bg-slate-50 px-3 py-2 rounded-xl border border-slate-200 font-semibold">
                {user.maskedPan || (user.role === 'SUPPLIER' ? 'Required (Pending)' : 'Not Provided')}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">
                Protected tax credential
              </span>
            </div>
          </div>
        </div>

        {/* Section 3: Solana Settlement Wallet */}
        <div id="wallet" className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-6">
          <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-slate-500" />
              3. Solana Settlement Wallet
            </h3>
            <span className="text-[10px] font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              Solana Devnet
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1">
            <span className="font-semibold text-slate-800 block">
              Non-Custodial Blockchain Signer
            </span>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Your linked Solana wallet signs on-chain escrow funding, shipment, and payout transactions. BazaarX never possesses your private keys or seed phrases.
            </p>
          </div>

          {/* Active Browser Settlement Wallet Control */}
          <div className="space-y-2">
            <span className="text-xs font-semibold text-slate-700 block">
              Active Browser Wallet Signer
            </span>
            <SettlementWalletCard
              title="Browser Wallet Signer"
              description="Connect your Solana wallet to approve and sign escrow transactions."
            />
          </div>

          {/* Linked Settlement Address on Account */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Account Linked Settlement Address
                </label>
                {user.wallet && (
                  <button
                    type="button"
                    onClick={handleUnlinkWallet}
                    disabled={linking}
                    className="text-[11px] font-semibold text-rose-600 hover:text-rose-700 hover:underline flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" />
                    <span>Unlink / Clear Wallet</span>
                  </button>
                )}
              </div>

              {user.wallet ? (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50 border border-slate-200 p-3.5 rounded-xl">
                  <div className="font-mono text-xs font-bold text-slate-900 break-all">
                    {user.wallet}
                  </div>
                  <a
                    href={getExplorerAccountUrl(user.wallet, 'devnet')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-emerald-700 hover:text-emerald-800 font-semibold shrink-0"
                  >
                    <span>Solana Explorer</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              ) : (
                <div className="p-4 rounded-xl border border-dashed border-slate-300 text-center space-y-1.5 bg-slate-50/50">
                  <p className="text-xs font-medium text-slate-600">
                    No Solana settlement wallet is currently linked to this account.
                  </p>
                  <p className="text-[11px] text-slate-400">
                    Enter your wallet address manually below or connect via browser wallet adapter.
                  </p>
                </div>
              )}
            </div>

            {/* Manual Wallet Input */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-xs font-semibold text-slate-700">
                {user.wallet ? 'Change / Update Wallet Address Manually' : 'Add Wallet Address Manually'}
              </label>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                <input
                  type="text"
                  placeholder="Paste Solana address (Base58, e.g. 7abc...)"
                  value={manualWallet}
                  onChange={(e) => setManualWallet(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-xs font-mono bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                />
                <button
                  type="button"
                  onClick={() => handleSaveManualWallet()}
                  disabled={linking || !manualWallet.trim()}
                  className="px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50 shrink-0 shadow-2xs"
                >
                  <LinkIcon className="w-3.5 h-3.5 text-emerald-400" />
                  <span>{linking ? 'Saving...' : 'Link Address'}</span>
                </button>
              </div>
            </div>

            {/* Browser Wallet Option */}
            <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-t border-slate-100 text-xs">
              <div className="text-slate-500">
                {connected && publicKey ? (
                  <span>
                    Browser Wallet Active:{' '}
                    <code className="font-mono font-bold text-slate-800">
                      {shortenAddress(publicKey.toBase58(), 5)}
                    </code>
                  </span>
                ) : (
                  <span>Browser wallet not connected</span>
                )}
              </div>

              {connected && publicKey ? (
                user.wallet !== publicKey.toBase58() && (
                  <button
                    type="button"
                    onClick={handleLinkConnectedWallet}
                    disabled={linking}
                    className="px-3.5 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-800 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                  >
                    <LinkIcon className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Use Active Browser Wallet</span>
                  </button>
                )
              ) : (
                <button
                  type="button"
                  onClick={() => openWalletModal(true)}
                  className="px-3.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 font-semibold text-xs flex items-center justify-center gap-1.5 transition-all"
                >
                  <Wallet className="w-3.5 h-3.5 text-slate-500" />
                  <span>Connect Wallet to Link</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
