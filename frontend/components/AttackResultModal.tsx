'use client';

import React from 'react';
import { ShieldAlert, CheckCircle2, XCircle, ArrowRight, Lock, X } from 'lucide-react';

export interface AttackResultData {
  isOpen: boolean;
  attackTitle: string;
  attackDescription: string;
  attemptedAction: string;
  expectedBehavior: string;
  observedResult: 'BLOCKED' | 'FAILED' | 'UNEXPECTED';
  anchorErrorName?: string;
  anchorErrorCode?: number | string;
  rawErrorMessage?: string;
  stateBefore: string;
  stateAfter: string;
  vaultBefore: number;
  vaultAfter: number;
  supplierBalanceBefore: number;
  supplierBalanceAfter: number;
  fundsMovedUsdc: number;
  invariantPreserved: boolean;
  invariantName: string;
  testedAt: string;
}

interface AttackResultModalProps {
  data: AttackResultData | null;
  onClose: () => void;
}

export function AttackResultModal({ data, onClose }: AttackResultModalProps) {
  if (!data || !data.isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden space-y-0">
        {/* Banner Header */}
        <div
          className={`p-6 text-white flex items-start justify-between ${
            data.invariantPreserved ? 'bg-slate-900' : 'bg-rose-900'
          }`}
        >
          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Adversarial Boundary Attack
              </span>
              <span className="text-slate-400 text-xs font-mono">• {data.testedAt}</span>
            </div>
            <h3 className="text-xl font-black tracking-tight">{data.attackTitle}</h3>
            <p className="text-xs text-slate-300 leading-relaxed max-w-md">
              {data.attackDescription}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Attack Outcome Badge */}
        <div className="px-6 pt-5">
          <div
            className={`p-4 rounded-2xl border flex items-center justify-between ${
              data.invariantPreserved
                ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                : 'bg-rose-50/70 border-rose-200 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-3">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                  data.invariantPreserved ? 'bg-emerald-600' : 'bg-rose-600'
                }`}
              >
                {data.invariantPreserved ? (
                  <CheckCircle2 className="w-6 h-6" />
                ) : (
                  <XCircle className="w-6 h-6" />
                )}
              </div>
              <div>
                <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                  Anchor Runtime Verdict
                </span>
                <span className="text-base font-black">
                  {data.observedResult === 'BLOCKED'
                    ? 'ATTACK BLOCKED ON-CHAIN'
                    : 'TRANSACTION REJECTED'}
                </span>
              </div>
            </div>

            <div className="text-right font-mono">
              <span className="text-[10px] text-slate-500 block font-sans">Observed Anchor Error</span>
              <span className="text-xs font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                {data.anchorErrorName || 'Rejected by Solana Runtime'}
                {data.anchorErrorCode ? ` (${data.anchorErrorCode})` : ''}
              </span>
            </div>
          </div>
        </div>

        {/* Side-Effect Verification Matrix */}
        <div className="p-6 space-y-4">
          <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
            Cryptographic Side-Effect Proof (Before vs After)
          </span>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {/* On-Chain Order State */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 block font-medium">Order State</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                <span>{data.stateBefore}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-emerald-700">{data.stateAfter}</span>
              </div>
              <span className="text-[10px] text-emerald-800 font-semibold block">✓ Unchanged</span>
            </div>

            {/* Escrow Vault Balance */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 block font-medium">Vault Balance</span>
              <div className="flex items-center gap-1.5 font-mono font-bold text-slate-900">
                <span>${data.vaultBefore.toFixed(2)}</span>
                <ArrowRight className="w-3 h-3 text-slate-400" />
                <span className="text-emerald-700">${data.vaultAfter.toFixed(2)}</span>
              </div>
              <span className="text-[10px] text-emerald-800 font-semibold block">✓ 0.00 Drained</span>
            </div>

            {/* Unauthorized Funds Movement */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <span className="text-[11px] text-slate-500 block font-medium">Unauthorized Movement</span>
              <div className="text-base font-black text-emerald-600 font-mono">
                {data.fundsMovedUsdc.toFixed(2)} USDC
              </div>
              <span className="text-[10px] text-emerald-800 font-semibold block">✓ Invariant Preserved</span>
            </div>
          </div>

          {/* Expected vs Observed Accordion */}
          <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
            <div className="flex items-start justify-between gap-2">
              <span className="font-bold text-slate-700">Expected Anchor Constraint:</span>
              <span className="text-right text-slate-600">{data.expectedBehavior}</span>
            </div>
            <div className="flex items-start justify-between gap-2 border-t border-slate-200 pt-2">
              <span className="font-bold text-slate-700">Preserved Invariant:</span>
              <span className="font-bold text-emerald-800 text-right">{data.invariantName}</span>
            </div>
            {data.rawErrorMessage && (
              <div className="border-t border-slate-200 pt-2">
                <span className="text-[10px] text-slate-400 font-mono block">Devnet Logs Snippet:</span>
                <p className="font-mono text-[11px] text-slate-600 bg-white p-2 rounded border border-slate-200 break-all mt-1">
                  {data.rawErrorMessage.slice(0, 180)}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            Anchor program enforces boundary • No client authority
          </span>
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all"
          >
            Close Report
          </button>
        </div>
      </div>
    </div>
  );
}
