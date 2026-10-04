'use client';

import React from 'react';
import { AlertCircle, Lock, ShieldCheck, X } from 'lucide-react';
import { shortenAddress } from '@/lib/solana';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  actionName: string;
  description: string;
  details: { label: string; value: string; isMono?: boolean }[];
  impactNotice?: string;
  connectedWalletAddress?: string;
  confirmButtonText?: string;
  confirmButtonClass?: string;
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  details,
  impactNotice,
  connectedWalletAddress,
  confirmButtonText = 'Confirm & Sign Transaction',
  confirmButtonClass = 'bg-emerald-600 hover:bg-emerald-500',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-xs shadow-sm">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{title}</h3>
              <p className="text-[11px] text-slate-500">Requires Solana cryptographic signature</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-4 text-xs">
          <p className="text-slate-600 leading-relaxed">{description}</p>

          {/* Details Table */}
          <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 space-y-2">
            {details.map((item, idx) => (
              <div key={idx} className="flex items-center justify-between gap-2">
                <span className="text-slate-400">{item.label}</span>
                <span
                  className={`text-slate-900 font-semibold truncate ${
                    item.isMono ? 'font-mono' : ''
                  }`}
                >
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          {/* Impact Alert */}
          {impactNotice && (
            <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-[11px] flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>{impactNotice}</span>
            </div>
          )}

          {/* Signer verification */}
          {connectedWalletAddress && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Signing Wallet:
              </span>
              <span className="font-mono font-bold text-slate-800">
                {shortenAddress(connectedWalletAddress, 5)}
              </span>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onClose();
              onConfirm();
            }}
            className={`px-4 py-2 rounded-xl text-white font-bold text-xs shadow-sm transition-all ${confirmButtonClass}`}
          >
            {confirmButtonText}
          </button>
        </div>
      </div>
    </div>
  );
};
