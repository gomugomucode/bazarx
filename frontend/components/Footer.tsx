import React from 'react';
import { ShieldCheck, Lock, ExternalLink } from 'lucide-react';
import Link from 'next/link';

export const Footer = () => {
  return (
    <footer className="bg-slate-50 text-slate-600 border-t border-slate-200 text-sm mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="md:col-span-2 space-y-3">
            <div className="flex items-center gap-2 text-slate-900 font-bold text-lg">
              <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-black text-sm">
                BX
              </div>
              BazaarX Protocol
            </div>
            <p className="text-slate-600 text-xs leading-relaxed max-w-md">
              Nepal&apos;s programmable B2B wholesale settlement platform. By decoupling wholesale
              marketplace data from on-chain escrow custody, funds are locked in a Solana escrow
              program and released only when cryptographically verified delivery criteria are fulfilled.
            </p>
            <div className="flex items-center gap-2 text-xs text-emerald-800 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-lg w-fit">
              <Lock className="w-3.5 h-3.5 text-emerald-600" />
              Non-custodial: Backend never holds or controls escrow funds
            </div>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Wholesale Corridors
            </h4>
            <ul className="space-y-2 text-xs text-slate-600">
              <li>Birgunj ⟷ Kathmandu Valley</li>
              <li>Butwal ⟷ Pokhara Food Wholesale</li>
              <li>Janakpur ⟷ Chitwan Agro Supplies</li>
              <li>Biratnagar ⟷ East-West Freight</li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-900 uppercase tracking-wider mb-3">
              Smart Contract
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <span className="text-slate-500 block">Anchor Program ID</span>
                <a
                  href="https://explorer.solana.com/address/BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN?cluster=devnet"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 px-2 py-0.5 rounded inline-flex items-center gap-1 font-mono transition-colors"
                >
                  BHHaiHFR...vQoN <ExternalLink className="w-2.5 h-2.5 text-slate-400" />
                </a>
              </li>
              <li className="text-slate-600">
                <span className="text-slate-500 block">Settlement Asset</span>
                <span>USDC (Solana Devnet)</span>
              </li>
              <li className="pt-1">
                <Link
                  href="/admin"
                  className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 font-medium"
                >
                  View Protocol State <ExternalLink className="w-3 h-3" />
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500">
          <p>© 2026 BazaarX Network. Built for the Solana Hackathon.</p>
          <p className="flex items-center gap-1.5 mt-2 sm:mt-0">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            Verified Anchor 0.31.0 State Machine on Devnet
          </p>
        </div>
      </div>
    </footer>
  );
};

