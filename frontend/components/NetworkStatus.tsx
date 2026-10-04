'use client';

import React from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { AlertTriangle, Globe } from 'lucide-react';

interface NetworkStatusProps {
  variant?: 'badge' | 'full' | 'banner';
}

export const NetworkStatus: React.FC<NetworkStatusProps> = ({ variant = 'badge' }) => {
  const { connection } = useConnection();
  const { connected } = useWallet();

  // BazaarX runs on Solana Devnet
  const isDevnet =
    connection.rpcEndpoint.toLowerCase().includes('devnet') ||
    connection.rpcEndpoint.toLowerCase().includes('localhost') ||
    connection.rpcEndpoint.toLowerCase().includes('127.0.0.1');

  if (variant === 'badge') {
    return (
      <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700 select-none">
        <span
          className={`w-2 h-2 rounded-full shrink-0 ${
            connected
              ? isDevnet
                ? 'bg-emerald-500 animate-pulse'
                : 'bg-amber-500'
              : 'bg-slate-400'
          }`}
        />
        <span className="font-bold text-slate-800 text-[11px] tracking-wide uppercase">
          SOLANA DEVNET
        </span>
        {connected && isDevnet ? (
          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
            Connected
          </span>
        ) : connected && !isDevnet ? (
          <span className="text-[10px] font-semibold text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
            Wrong Cluster
          </span>
        ) : null}
      </div>
    );
  }

  if (variant === 'banner') {
    if (!isDevnet && connected) {
      return (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2.5 text-xs text-amber-950 flex items-center justify-center gap-2 text-center">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
          <span>
            Please switch your wallet to <strong>Solana Devnet</strong> to continue.
          </span>
        </div>
      );
    }
    return null;
  }

  // Full card
  return (
    <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-xs space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-slate-500 flex items-center gap-1.5">
          <Globe className="w-3.5 h-3.5 text-slate-400" /> Target Network
        </span>
        <span className="font-mono font-semibold text-slate-900 flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          SOLANA DEVNET
        </span>
      </div>
      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-200/60">
        <span>Settlement Cluster</span>
        <span className="font-mono text-slate-600 truncate max-w-[200px]">api.devnet.solana.com</span>
      </div>
    </div>
  );
};
