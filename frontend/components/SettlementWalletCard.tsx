'use client';

import React, { useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletBalance } from '@/lib/useWalletBalance';
import { useAuth } from '@/lib/AuthContext';
import { shortenAddress, getExplorerAccountUrl } from '@/lib/solana';
import {
  Wallet,
  ExternalLink,
  Copy,
  Check,
  LogOut,
  RefreshCw,
  Coins,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Lock,
} from 'lucide-react';
import Link from 'next/link';

interface SettlementWalletCardProps {
  title?: string;
  description?: string;
  compact?: boolean;
  className?: string;
  showBalances?: boolean;
}

export const SettlementWalletCard: React.FC<SettlementWalletCardProps> = ({
  title = 'Settlement Wallet',
  description,
  compact = false,
  className = '',
  showBalances = true,
}) => {
  const { user } = useAuth();
  const { publicKey, connected, connecting, disconnect, wallet } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const { sol, usdc, loading: balanceLoading, refresh } = useWalletBalance();

  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!publicKey) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicKey.toBase58());
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = publicKey.toBase58();
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.warn('Copy failed:', err);
    }
  };

  const isMismatch = Boolean(
    connected &&
    publicKey &&
    user?.wallet &&
    publicKey.toBase58().toLowerCase() !== user.wallet.trim().toLowerCase()
  );

  const formattedSol =
    sol !== null
      ? `${sol.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 3 })} SOL`
      : balanceLoading
      ? 'Loading...'
      : '0.00 SOL';

  const formattedUsdc =
    usdc !== null
      ? `${usdc.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} USDC`
      : balanceLoading
      ? 'Loading...'
      : '0.00 USDC';

  // 1. CONNECTING STATE
  if (connecting) {
    return (
      <div
        className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs ${className}`}
      >
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">{title}</span>
                <span className="text-[10px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Connecting...
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Waiting for signature or connection approval from your Solana wallet extension...
              </p>
            </div>
          </div>

          <button
            disabled
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 border border-slate-300 text-slate-400 font-semibold text-xs cursor-not-allowed select-none shrink-0"
          >
            <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
            <span>Connecting...</span>
          </button>
        </div>
      </div>
    );
  }

  // 2. DISCONNECTED STATE
  if (!connected || !publicKey) {
    return (
      <div
        className={`bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 shadow-xs ${className}`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold text-slate-900">{title}</span>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                  Not Connected
                </span>
                <span className="text-[10px] font-mono font-bold uppercase text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                  Devnet
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                {description ||
                  'Connect your Solana wallet to approve and sign escrow transactions.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => openWalletModal(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm hover:shadow transition-all shrink-0 active:scale-[0.99]"
          >
            <Wallet className="w-4 h-4 text-emerald-400" />
            <span>Connect Settlement Wallet</span>
          </button>
        </div>
      </div>
    );
  }

  // 3. CONNECTED STATE
  const addressStr = publicKey.toBase58();

  return (
    <div
      className={`bg-white rounded-2xl border ${
        isMismatch ? 'border-amber-300 ring-1 ring-amber-200' : 'border-slate-200'
      } p-4 sm:p-5 shadow-xs space-y-4 ${className}`}
    >
      {/* Wallet Mismatch Warning if active wallet != linked account wallet */}
      {isMismatch && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-bold block text-amber-900">
              Settlement Wallet Mismatch Detected
            </span>
            <p className="text-[11px] text-amber-800 leading-relaxed">
              Your active browser wallet (<code className="font-mono font-bold">{shortenAddress(addressStr, 4)}</code>) differs from your business account&apos;s linked settlement wallet (<code className="font-mono font-bold">{shortenAddress(user?.wallet || '', 4)}</code>).
              On-chain escrow settlement transactions require the designated settlement wallet.
            </p>
            <div className="pt-1 flex items-center gap-3">
              <Link
                href="/profile"
                className="font-semibold text-emerald-800 hover:text-emerald-900 underline text-[11px]"
              >
                Update Linked Wallet in Profile →
              </Link>
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Left: Identity & Address */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
            {wallet?.adapter.icon ? (
              <img
                src={wallet.adapter.icon}
                alt={wallet.adapter.name}
                className="w-5 h-5 rounded-full"
              />
            ) : (
              <Wallet className="w-5 h-5" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-bold text-slate-900">
                {wallet?.adapter.name || 'Solana Wallet'}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                Devnet Connected
              </span>
              {user?.wallet && !isMismatch && (
                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  Linked Settlement Address
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-slate-500 flex-wrap">
              <span className="font-mono text-slate-800 font-bold">
                {shortenAddress(addressStr, 6)}
              </span>

              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors px-1 py-0.5 rounded hover:bg-slate-100 text-[11px]"
                title="Copy public key to clipboard"
              >
                {copied ? (
                  <>
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span className="text-emerald-700 font-semibold">Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3 h-3" />
                    <span>Copy</span>
                  </>
                )}
              </button>

              <a
                href={getExplorerAccountUrl(addressStr, 'devnet')}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-slate-500 hover:text-slate-800 transition-colors px-1 py-0.5 rounded hover:bg-slate-100 text-[11px]"
                title="View account on Solana Explorer (Devnet)"
              >
                <ExternalLink className="w-3 h-3" />
                <span>Explorer</span>
              </a>
            </div>
          </div>
        </div>

        {/* Right: Balances & Actions */}
        <div className="flex items-center gap-3 self-start lg:self-auto flex-wrap sm:flex-nowrap">
          {showBalances && (
            <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 px-3.5 py-2 rounded-xl text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">SOL Balance</span>
                <span className="font-mono font-bold text-slate-900">{formattedSol}</span>
              </div>
              <span className="text-slate-300">|</span>
              <div>
                <span className="text-[10px] text-slate-400 block font-medium">Devnet USDC</span>
                <span className="font-mono font-bold text-emerald-700">{formattedUsdc}</span>
              </div>
              <button
                type="button"
                onClick={() => refresh()}
                disabled={balanceLoading}
                className="p-1 text-slate-400 hover:text-slate-700 transition-colors disabled:opacity-50"
                title="Refresh on-chain balances"
              >
                <RefreshCw
                  className={`w-3.5 h-3.5 ${balanceLoading ? 'animate-spin text-emerald-600' : ''}`}
                />
              </button>
            </div>
          )}

          {/* Disconnect Action */}
          <button
            type="button"
            onClick={() => disconnect()}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 hover:border-rose-200 hover:bg-rose-50 text-slate-600 hover:text-rose-700 font-semibold text-xs transition-colors shrink-0"
            title="Disconnect Solana wallet"
          >
            <LogOut className="w-3.5 h-3.5" />
            <span>Disconnect</span>
          </button>
        </div>
      </div>
    </div>
  );
};
