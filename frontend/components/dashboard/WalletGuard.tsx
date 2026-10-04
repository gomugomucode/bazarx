'use client';

import React from 'react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Wallet, ShieldCheck, ArrowRight, Lock } from 'lucide-react';

export const WalletGuard: React.FC = () => {
  const { setVisible: openWalletModal } = useWalletModal();

  return (
    <div className="max-w-xl mx-auto my-12 bg-white rounded-3xl border border-slate-200 shadow-md p-8 sm:p-12 text-center space-y-6 animate-in fade-in zoom-in-95 duration-200">
      <div className="w-16 h-16 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center mx-auto shadow-sm">
        <Wallet className="w-8 h-8" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Connect your wallet
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
          Your wallet identifies your BazaarX business account and is required for wholesale trading, role-aware dashboard access, and on-chain escrow settlement.
        </p>
      </div>

      <div className="pt-2">
        <button
          onClick={() => openWalletModal(true)}
          className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2"
        >
          <Wallet className="w-4 h-4 text-emerald-400" />
          <span>Connect Wallet</span>
          <ArrowRight className="w-4 h-4 text-slate-400" />
        </button>
      </div>

      <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-4 text-[11px] text-slate-400">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          <span>Non-Custodial</span>
        </div>
        <span>•</span>
        <div className="flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5 text-slate-400" />
          <span>Solana Devnet Escrow</span>
        </div>
      </div>
    </div>
  );
};
