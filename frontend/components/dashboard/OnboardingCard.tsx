'use client';

import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { ShoppingBag, Truck, ArrowRight, ShieldCheck, Check } from 'lucide-react';
import { UserProfile, UserRole } from '@/lib/types';
import { shortenAddress } from '@/lib/solana';

interface OnboardingCardProps {
  publicKey: PublicKey;
  onProfileCreated: (profile: UserProfile) => void;
}

export const OnboardingCard: React.FC<OnboardingCardProps> = ({
  publicKey,
  onProfileCreated,
}) => {
  const [businessName, setBusinessName] = useState('');
  const [selectedRole, setSelectedRole] = useState<'BUYER' | 'SUPPLIER'>('BUYER');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!businessName.trim()) {
      setError('Please enter your business or trading entity name');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/users/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          wallet: publicKey.toBase58(),
          businessName: businessName.trim(),
          role: selectedRole,
        }),
      });

      const data = await res.json();
      if (data.success && data.profile) {
        onProfileCreated(data.profile);
      } else {
        setError(data.error || 'Failed to initialize profile. Please try again.');
      }
    } catch (err: any) {
      setError(err.message || 'Network error connecting to profile service.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-3xl border border-slate-200 shadow-md p-6 sm:p-10 space-y-8 animate-in fade-in zoom-in-95 duration-200">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-xl mx-auto shadow-sm">
          B<span className="text-white">X</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Welcome to BazaarX
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Connect your business identity to start trading wholesale commodities with programmable on-chain Solana escrow settlement.
        </p>
      </div>

      {/* Wallet badge */}
      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 flex items-center justify-between text-xs">
        <span className="text-slate-500 font-medium">Connected Wallet</span>
        <span className="font-mono font-bold text-slate-800">
          {shortenAddress(publicKey.toBase58(), 6)}
        </span>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Business Name Field */}
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Business or Entity Name
          </label>
          <input
            type="text"
            required
            placeholder="e.g., Pokhara Provisions & Traders Pvt. Ltd."
            value={businessName}
            onChange={(e) => {
              setBusinessName(e.target.value);
              if (error) setError(null);
            }}
            className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-800 transition-all"
          />
          <span className="text-[11px] text-slate-400 block">
            This name will be displayed on purchase contracts and counterparty trade logs.
          </span>
        </div>

        {/* Role Selection Cards */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wider">
            Choose Your Primary Trading Role
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Buyer Card */}
            <button
              type="button"
              onClick={() => setSelectedRole('BUYER')}
              className={`p-4 rounded-2xl border text-left transition-all relative ${
                selectedRole === 'BUYER'
                  ? 'border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/10'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                  <ShoppingBag className="w-5 h-5" />
                </div>
                {selectedRole === 'BUYER' && (
                  <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <h4 className="font-bold text-sm text-slate-900">Wholesale Buyer</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Purchase wholesale goods and use Solana escrow for risk-free delivery settlement.
              </p>
            </button>

            {/* Supplier Card */}
            <button
              type="button"
              onClick={() => setSelectedRole('SUPPLIER')}
              className={`p-4 rounded-2xl border text-left transition-all relative ${
                selectedRole === 'SUPPLIER'
                  ? 'border-sky-600 bg-sky-50/40 ring-2 ring-sky-600/10'
                  : 'border-slate-200 hover:border-slate-300 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="w-9 h-9 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center font-bold">
                  <Truck className="w-5 h-5" />
                </div>
                {selectedRole === 'SUPPLIER' && (
                  <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center text-xs">
                    <Check className="w-3 h-3 stroke-[3]" />
                  </span>
                )}
              </div>
              <h4 className="font-bold text-sm text-slate-900">Wholesale Supplier</h4>
              <p className="text-[11px] text-slate-500 mt-1 leading-relaxed">
                Sell wholesale goods and receive guaranteed payouts through Solana smart contract escrow.
              </p>
            </button>
          </div>
          <span className="text-[10px] text-slate-400 block pt-1">
            * You can enable multi-role trading later or switch roles as your business expands.
          </span>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {submitting ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
          ) : (
            <>
              <span>Complete Business Profile</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </>
          )}
        </button>
      </form>
    </div>
  );
};
