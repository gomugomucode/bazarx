'use client';

import React from 'react';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Clock,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { shortenAddress, getExplorerTxUrl } from '@/lib/solana';

export type TxLifecycleStage =
  | 'ready'
  | 'waiting_approval'
  | 'sending'
  | 'confirming'
  | 'confirmed'
  | 'failed';

interface TransactionStatusProps {
  stage: TxLifecycleStage;
  actionTitle?: string;
  signature?: string | null;
  errorMessage?: string | null;
  onRetry?: () => void;
  onDismiss?: () => void;
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  stage,
  actionTitle = 'Transaction',
  signature,
  errorMessage,
  onRetry,
  onDismiss,
}) => {
  if (stage === 'ready') return null;

  const isRealSignature =
    signature &&
    !signature.startsWith('demo_') &&
    !signature.startsWith('preview_') &&
    !signature.startsWith('simulated_');

  return (
    <div
      className={`rounded-2xl border p-4 text-xs space-y-3 transition-all animate-in fade-in duration-150 ${
        stage === 'confirmed'
          ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950'
          : stage === 'failed'
          ? 'bg-rose-50/80 border-rose-200 text-rose-950'
          : 'bg-slate-50 border-slate-200 text-slate-800'
      }`}
    >
      {/* Stage Step Bar */}
      <div className="flex items-center justify-between border-b pb-2.5 border-current/10">
        <div className="flex items-center gap-2 font-bold text-xs">
          {stage === 'waiting_approval' && (
            <>
              <Clock className="w-4 h-4 text-amber-600 animate-pulse shrink-0" />
              <span className="text-amber-900">Waiting for Wallet Approval</span>
            </>
          )}

          {stage === 'sending' && (
            <>
              <Loader2 className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
              <span className="text-blue-900">Submitting to Solana Devnet...</span>
            </>
          )}

          {stage === 'confirming' && (
            <>
              <Loader2 className="w-4 h-4 text-indigo-600 animate-spin shrink-0" />
              <span className="text-indigo-900">Confirming on Solana Ledger...</span>
            </>
          )}

          {stage === 'confirmed' && (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="text-emerald-900">
                {actionTitle} Confirmed on Solana Devnet
              </span>
            </>
          )}

          {stage === 'failed' && (
            <>
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span className="text-rose-900">{actionTitle} Failed</span>
            </>
          )}
        </div>

        {/* Status indicator pill */}
        <span
          className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${
            stage === 'confirmed'
              ? 'bg-emerald-100 text-emerald-800'
              : stage === 'failed'
              ? 'bg-rose-100 text-rose-800'
              : stage === 'waiting_approval'
              ? 'bg-amber-100 text-amber-800'
              : 'bg-blue-100 text-blue-800'
          }`}
        >
          {stage.replace('_', ' ')}
        </span>
      </div>

      {/* Narrative descriptions per phase */}
      <div className="space-y-1.5 text-[11px] leading-relaxed">
        {stage === 'waiting_approval' && (
          <p className="text-amber-800">
            Please approve the transaction prompt in your connected wallet. Your private key never leaves your device.
          </p>
        )}

        {stage === 'sending' && (
          <p className="text-blue-800">
            Transaction signed and broadcast to Devnet validator nodes. Awaiting slot inclusion.
          </p>
        )}

        {stage === 'confirming' && (
          <p className="text-indigo-800">
            Transaction broadcast. Verifying cryptographic confirmation commitment (&apos;confirmed&apos; level).
          </p>
        )}

        {stage === 'confirmed' && (
          <div className="space-y-1">
            <p className="text-emerald-800">
              The on-chain state transition has been permanently committed to the Solana blockchain.
            </p>
            {isRealSignature && signature ? (
              <div className="pt-1.5 flex items-center gap-2">
                <a
                  href={getExplorerTxUrl(signature, 'devnet')}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 font-mono text-emerald-700 font-bold hover:text-emerald-900 hover:underline bg-white px-2.5 py-1 rounded-lg border border-emerald-200"
                >
                  <span>Tx: {shortenAddress(signature, 8)}</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            ) : signature ? (
              <div className="pt-1 text-[10px] font-mono text-slate-500">
                (Simulated / Preview mode: {signature})
              </div>
            ) : null}
          </div>
        )}

        {stage === 'failed' && (
          <div className="space-y-2">
            <p className="text-rose-800 font-medium">
              {errorMessage || 'The on-chain transaction could not be processed.'}
            </p>
            {onRetry && (
              <button
                onClick={onRetry}
                className="px-3 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-semibold text-xs transition-colors"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
