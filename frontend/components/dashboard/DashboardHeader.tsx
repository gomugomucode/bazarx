'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { PublicKey } from '@solana/web3.js';
import {
  Wallet,
  ExternalLink,
  Copy,
  Check,
  Plus,
  ShoppingBag,
  Truck,
  Store,
} from 'lucide-react';
import { UserProfile, UserRole } from '@/lib/types';
import { shortenAddress, getExplorerAccountUrl } from '@/lib/solana';
import { RoleSwitcher } from './RoleSwitcher';

interface DashboardHeaderProps {
  profile: UserProfile;
  activeRole: 'BUYER' | 'SUPPLIER';
  publicKey: PublicKey;
  sol: number | null;
  usdc: number | null;
  onRoleChange: (role: 'BUYER' | 'SUPPLIER') => void;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  profile,
  activeRole,
  publicKey,
  sol,
  usdc,
  onRoleChange,
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopyWallet = () => {
    navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isBuyer = activeRole === 'BUYER';

  return (
    <div className="space-y-6">
      {/* Top Banner: Greeting, RoleSwitcher, and Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded border ${
                isBuyer
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                  : 'bg-sky-50 text-sky-800 border-sky-200'
              }`}
            >
              {isBuyer ? 'Wholesale Buyer Workspace' : 'Wholesale Supplier Hub'}
            </span>
            <RoleSwitcher
              activeRole={activeRole}
              roles={profile.roles}
              onRoleChange={onRoleChange}
            />
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
            Good morning, {profile.businessName}
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            {isBuyer
              ? 'Manage your wholesale purchases and on-chain settlement.'
              : 'Manage wholesale orders, fulfillment, and settlement.'}
          </p>
        </div>

        <div className="flex items-center gap-3">
          {isBuyer ? (
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Plus className="w-4 h-4 text-emerald-400" />
              New Wholesale Order
            </Link>
          ) : (
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all"
            >
              <Store className="w-4 h-4 text-sky-400" />
              View Marketplace
            </Link>
          )}
        </div>
      </div>

      {/* Connected Business Wallet Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shadow-xs shrink-0 ${
                isBuyer
                  ? 'bg-slate-900 text-emerald-400'
                  : 'bg-slate-900 text-sky-400'
              }`}
            >
              {isBuyer ? (
                <ShoppingBag className="w-5 h-5" />
              ) : (
                <Truck className="w-5 h-5" />
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {profile.businessName}
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Solana Devnet
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                <span className="font-mono text-slate-700 font-semibold">
                  {shortenAddress(publicKey.toBase58(), 6)}
                </span>
                <button
                  onClick={handleCopyWallet}
                  className="text-slate-400 hover:text-slate-700 transition-colors"
                  title="Copy full public key"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
                <a
                  href={getExplorerAccountUrl(publicKey.toBase58(), 'devnet')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-0.5 text-slate-400 hover:text-slate-700 transition-colors"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Devnet Balances */}
          <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs self-start md:self-auto">
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-medium">Devnet USDC</span>
              <span className="font-mono font-bold text-slate-900">
                {usdc !== null ? `${usdc} USDC` : '0.00 USDC'}
              </span>
            </div>
            <span className="text-slate-300">|</span>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 block font-medium">Network Gas</span>
              <span className="font-mono font-bold text-slate-900">
                {sol !== null ? `${sol.toFixed(3)} SOL` : '0.00 SOL'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
