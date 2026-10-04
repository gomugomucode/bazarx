'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { useWalletBalance } from '@/lib/useWalletBalance';
import { shortenAddress, getExplorerAccountUrl } from '@/lib/solana';
import {
  Wallet,
  ChevronDown,
  Copy,
  Check,
  ExternalLink,
  LogOut,
  RefreshCw,
  Coins,
  ShieldCheck,
  AlertCircle,
} from 'lucide-react';

export const WalletButton: React.FC = () => {
  const { publicKey, connected, connecting, disconnect, wallet } = useWallet();
  const { setVisible } = useWalletModal();
  const { sol, usdc, loading: balanceLoading, refresh } = useWalletBalance();

  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on Escape
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleCopy = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDisconnect = async () => {
    setIsOpen(false);
    await disconnect();
  };

  // State 1: Connecting...
  if (connecting) {
    return (
      <button
        disabled
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 font-semibold text-xs sm:text-sm cursor-not-allowed select-none shadow-sm"
        title="Connecting to Solana wallet..."
      >
        <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
        <span>Connecting...</span>
      </button>
    );
  }

  // State 2: Disconnected -> [ Connect Wallet ]
  if (!connected || !publicKey) {
    return (
      <button
        onClick={() => setVisible(true)}
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98]"
        title="Connect your Solana wallet for on-chain settlement"
      >
        <Wallet className="w-4 h-4 text-emerald-400" />
        <span>Connect Wallet</span>
      </button>
    );
  }

  // State 3: Connected -> B2B Account Pill & Dropdown
  const addressStr = publicKey.toBase58();
  const truncatedAddress = shortenAddress(addressStr, 4);

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

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Account Pill Trigger */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2.5 px-3 py-1.5 rounded-xl border transition-all text-xs font-medium ${
          isOpen
            ? 'bg-slate-100 border-slate-400 shadow-inner'
            : 'bg-white hover:bg-slate-50 border-slate-300 shadow-sm'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {/* Balance Display */}
        <span className="font-mono text-slate-700 hidden sm:inline-block font-semibold">
          {formattedSol}
        </span>

        <span className="hidden sm:inline-block text-slate-300">|</span>

        {/* Truncated Address */}
        <div className="flex items-center gap-1.5 font-mono text-slate-900 font-bold">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{truncatedAddress}</span>
        </div>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Account Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-88 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header: Network & Wallet Provider */}
          <div className="p-4 bg-slate-50/70 flex items-center justify-between">
            <div className="flex items-center gap-2">
              {wallet?.adapter.icon ? (
                <img
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  className="w-5 h-5 rounded-full"
                />
              ) : (
                <Wallet className="w-4 h-4 text-slate-700" />
              )}
              <span className="text-xs font-bold text-slate-800">
                {wallet?.adapter.name || 'Solana Wallet'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              Solana Devnet
            </div>
          </div>

          {/* Address & Copy / Explorer Actions */}
          <div className="p-4 space-y-2">
            <span className="text-[11px] font-medium text-slate-400 block uppercase tracking-wider">
              Connected Account
            </span>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="font-mono text-xs font-semibold text-slate-800 truncate pr-2 select-all">
                {shortenAddress(addressStr, 6)}
              </span>

              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={handleCopy}
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
                  title="Copy full public key"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>

                <a
                  href={getExplorerAccountUrl(addressStr, 'devnet')}
                  target="_blank"
                  rel="noreferrer"
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/60 rounded-lg transition-colors"
                  title="View on Solana Explorer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Real Balances Section */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3 h-3 text-slate-400" /> Devnet Assets
              </span>
              <button
                onClick={() => refresh()}
                disabled={balanceLoading}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors disabled:opacity-50"
                title="Refresh balances"
              >
                <RefreshCw
                  className={`w-3 h-3 ${balanceLoading ? 'animate-spin text-emerald-600' : ''}`}
                />
                <span>Refresh</span>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* SOL Balance */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">SOL Balance</span>
                <span className="font-mono font-bold text-slate-900 text-sm block mt-0.5 truncate">
                  {formattedSol}
                </span>
                <span className="text-[10px] text-slate-400">Gas & Fees</span>
              </div>

              {/* USDC Balance */}
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <span className="text-[10px] text-slate-400 block font-medium">USDC Balance</span>
                <span className="font-mono font-bold text-emerald-700 text-sm block mt-0.5 truncate">
                  {formattedUsdc}
                </span>
                <span className="text-[10px] text-emerald-800 font-medium">Circle Devnet</span>
              </div>
            </div>

            {/* Hint if USDC is 0 */}
            {usdc === 0 && (
              <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] space-y-1">
                <div className="flex items-center gap-1 font-semibold text-amber-950">
                  <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Buyer USDC Faucet</span>
                </div>
                <p className="text-[10px] text-amber-800 leading-snug">
                  Need Devnet USDC to test funding wholesale escrow?
                </p>
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-900 underline hover:text-amber-700 pt-0.5"
                >
                  Request Circle Test USDC <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </div>

          {/* Security & Disconnect Footer */}
          <div className="p-3 bg-slate-50/80 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Non-custodial
            </span>

            <button
              onClick={handleDisconnect}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-rose-700 hover:text-rose-800 hover:bg-rose-50 text-xs font-semibold transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Disconnect</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
