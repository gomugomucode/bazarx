'use client';

import React from 'react';
import Link from 'next/link';
import { Cpu, ExternalLink, ShieldCheck } from 'lucide-react';

export const AdminBanner: React.FC = () => {
  return (
    <div className="bg-gradient-to-r from-purple-900 to-slate-900 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-purple-800/50 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-purple-800/50 border border-purple-600/40 text-purple-300 flex items-center justify-center shrink-0">
          <Cpu className="w-5 h-5 text-purple-300" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-purple-300">
              Protocol Governance Mode
            </span>
            <span className="text-[10px] bg-purple-500/20 text-purple-200 border border-purple-400/30 px-2 py-0.5 rounded font-mono">
              Admin Keypair Active
            </span>
          </div>
          <p className="text-xs text-purple-100/80 mt-0.5">
            Your connected wallet has Anchor contract administrative authority on Solana Devnet.
          </p>
        </div>
      </div>

      <Link
        href="/admin"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-sm transition-colors shrink-0 self-start sm:self-auto"
      >
        <span>Open Protocol Admin</span>
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </div>
  );
};
