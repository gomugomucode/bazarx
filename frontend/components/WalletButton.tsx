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
  HelpCircle,
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

  const handleCopy = async () => {
    if (!publicKey) return;
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(publicKey.toBase58());
      } else {
        // Fallback for non-secure contexts
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
      console.warn('Failed to copy to clipboard:', err);
    }
  };

  const handleDisconnect = async () => {
    setIsOpen(false);
    await disconnect();
  };

  // STATE A: Disconnected -> [ Connect Wallet ]
  if (!connected || !publicKey) {
    if (connecting) {
      // STATE B: Connecting...
      return (
        <button
          disabled
          className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-slate-100 border border-slate-300 text-slate-500 font-semibold text-xs sm:text-sm cursor-not-allowed select-none shadow-sm transition-all"
          title="Connecting to Solana wallet..."
        >
          <div className="w-3.5 h-3.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
          <span>Connecting...</span>
        </button>
      );
    }

    return (
      <button
        onClick={() => setVisible(true)}
        className="inline-flex items-center gap-2 px-3.5 sm:px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs sm:text-sm shadow-sm hover:shadow transition-all duration-150 active:scale-[0.98] shrink-0"
        title="Connect your Solana wallet for on-chain settlement"
      >
        <Wallet className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" />
        <span>Connect Wallet</span>
      </button>
    );
  }

  // STATE C: Connected -> Shortened address, SOL balance, Devnet status
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
        className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all text-xs font-medium max-w-[280px] sm:max-w-none ${
          isOpen
            ? 'bg-slate-100 border-slate-400 shadow-inner'
            : 'bg-white hover:bg-slate-50 border-slate-300 shadow-sm'
        }`}
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        {/* SOL Balance */}
        <span className="font-mono text-slate-700 hidden sm:inline-block font-semibold">
          {formattedSol}
        </span>

        <span className="hidden sm:inline-block text-slate-300">|</span>

        {/* Shortened Address */}
        <div className="flex items-center gap-1.5 font-mono text-slate-900 font-bold truncate">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
          <span>{truncatedAddress}</span>
        </div>

        {/* Devnet Tag */}
        <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 hidden md:inline-block">
          DEVNET
        </span>

        <ChevronDown
          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-150 ${
            isOpen ? 'rotate-180 text-slate-700' : ''
          }`}
        />
      </button>

      {/* Account Dropdown Menu (Guaranteed to fit 375px screens) */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[calc(100vw-2rem)] max-w-sm sm:w-88 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Section 1: WALLET & NETWORK */}
          <div className="p-4 bg-slate-50/80 flex items-center justify-between">
            <div className="flex items-center gap-2 truncate pr-2">
              {wallet?.adapter.icon ? (
                <img
                  src={wallet.adapter.icon}
                  alt={wallet.adapter.name}
                  className="w-5 h-5 rounded-full shrink-0"
                />
              ) : (
                <Wallet className="w-4 h-4 text-slate-700 shrink-0" />
              )}
              <span className="text-xs font-bold text-slate-800 truncate">
                {wallet?.adapter.name || 'Solana Wallet'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
              SOLANA DEVNET
            </div>
          </div>

          {/* Section 2: CONNECTED ACCOUNT & ACTIONS */}
          <div className="p-4 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 block uppercase tracking-wider">
              Connected Account
            </span>
            <div className="flex items-center justify-between bg-slate-50 border border-slate-200 rounded-xl p-2.5">
              <span className="font-mono text-xs font-semibold text-slate-800 truncate pr-2 select-all">
                {shortenAddress(addressStr, 6)}
              </span>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  onClick={handleCopy}
                  className="inline-flex items-center gap-1 px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors text-[11px] font-medium"
                  title="Copy full public key"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700 font-bold">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>

                <a
                  href={getExplorerAccountUrl(addressStr, 'devnet')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 rounded-lg transition-colors"
                  title="View account on Solana Explorer (Devnet)"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Section 3: BALANCES */}
          <div className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                <Coins className="w-3 h-3 text-slate-400" /> Balances (Solana Devnet)
              </span>
              <button
                onClick={() => refresh()}
                disabled={balanceLoading}
                className="text-[11px] text-slate-500 hover:text-slate-800 flex items-center gap-1 transition-colors disabled:opacity-50"
                title="Refresh live on-chain balances"
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
                <span className="text-[10px] text-slate-400">Transaction Gas</span>
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

            {/* Faucet Guidance if USDC is 0 (informational, not a purchase option) */}
            {usdc === 0 && (
              <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] space-y-1">
                <div className="flex items-center gap-1 font-semibold text-slate-700">
                  <HelpCircle className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>Need Devnet USDC?</span>
                </div>
                <p className="text-[10px] text-slate-500 leading-snug">
                  To test wholesale escrow funding, request test tokens for mint{' '}
                  <code className="font-mono font-semibold text-slate-700">4zMMC...ncDU</code>:
                </p>
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline pt-0.5"
                >
                  Request Devnet USDC from Circle Faucet <ExternalLink className="w-2.5 h-2.5" />
                </a>
              </div>
            )}
          </div>

          {/* Section 4: SECURITY & DISCONNECT */}
          <div className="p-3 bg-slate-50/80 flex items-center justify-between text-xs">
            <span className="text-[11px] text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Non-custodial settlement
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
