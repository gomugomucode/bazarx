'use client';

import React, { useState } from 'react';
import { PublicKey } from '@solana/web3.js';
import { Order, ReconciliationResult } from '@/lib/types';
import {
  shortenAddress,
  getExplorerAccountUrl,
  deriveVaultPda,
  DEVNET_USDC_MINT,
  PROGRAM_ID_STRING,
} from '@/lib/solana';
import {
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Clock,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface BlockchainVerificationCardProps {
  order: Order;
  onOrderReconciled?: (updatedOrder: Order) => void;
  onChainState?: string | null;
  vaultUsdcBalance?: number | null;
}

export function BlockchainVerificationCard({
  order,
  onOrderReconciled,
  onChainState,
  vaultUsdcBalance,
}: BlockchainVerificationCardProps) {
  const [reconciling, setReconciling] = useState(false);
  const [reconcileResult, setReconcileResult] = useState<ReconciliationResult | null>(null);
  const [reconcileError, setReconcileError] = useState<string | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  let orderPdaKey = order.orderPda;
  let vaultAddress = 'Unresolved';
  try {
    if (orderPdaKey && !orderPdaKey.startsWith('PDA_')) {
      const [vault] = deriveVaultPda(new PublicKey(orderPdaKey));
      vaultAddress = vault.toBase58();
    }
  } catch {
    vaultAddress = 'Unresolved';
  }

  const handleCopy = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(label);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleReconcile = async () => {
    setReconciling(true);
    setReconcileError(null);
    try {
      const res = await fetch(`/api/orders/${order.id}/reconcile`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to reconcile on-chain state');
      }
      setReconcileResult(data.reconciliation);
      if (data.reconciliation.order && onOrderReconciled) {
        onOrderReconciled(data.reconciliation.order);
      }
    } catch (err: any) {
      setReconcileError(err.message || 'Reconciliation failed');
    } finally {
      setReconciling(false);
    }
  };

  // State comparison
  const displayOnChainState = reconcileResult?.onChainState || onChainState || 'Syncing...';
  const isStateMatched =
    displayOnChainState !== 'Syncing...' &&
    displayOnChainState !== 'NonExistent' &&
    displayOnChainState === order.state;
  const isConflict =
    displayOnChainState !== 'Syncing...' &&
    displayOnChainState !== 'NonExistent' &&
    displayOnChainState !== order.state;

  return (
    <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              Blockchain Verification
              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 uppercase tracking-wider">
                Devnet Authoritative
              </span>
            </h3>
            <p className="text-[11px] text-slate-500">
              Deterministic Anchor PDA state, SPL escrow vault, and live Devnet verification.
            </p>
          </div>
        </div>

        <button
          onClick={handleReconcile}
          disabled={reconciling}
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${reconciling ? 'animate-spin text-emerald-400' : ''}`} />
          <span>{reconciling ? 'Querying Devnet RPC...' : 'Sync & Reconcile with Solana'}</span>
        </button>
      </div>

      {/* Grid of Verified Blockchain Metadata */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
        {/* Network & Program */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-slate-400 block text-[11px] font-sans">Network / Cluster</span>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="font-bold text-slate-900">Solana Devnet</span>
          </div>
          <a
            href={getExplorerAccountUrl(PROGRAM_ID_STRING, 'devnet')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-emerald-700 hover:text-emerald-800 flex items-center gap-1 text-[11px] truncate pt-0.5"
          >
            {shortenAddress(PROGRAM_ID_STRING, 5)} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
        </div>

        {/* Order PDA */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center justify-between font-sans">
            <span className="text-slate-400 text-[11px]">Order PDA</span>
            <button
              onClick={() => handleCopy(orderPdaKey, 'orderPda')}
              className="text-slate-400 hover:text-slate-700 transition-colors"
              title="Copy Order PDA"
            >
              {copiedKey === 'orderPda' ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
          <a
            href={getExplorerAccountUrl(orderPdaKey, 'devnet')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-900 font-bold hover:text-emerald-700 flex items-center gap-1 truncate"
          >
            {shortenAddress(orderPdaKey, 5)} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
          <span className="text-[10px] text-slate-400 block font-sans">Program Authority</span>
        </div>

        {/* Vault PDA */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <div className="flex items-center justify-between font-sans">
            <span className="text-slate-400 text-[11px]">Escrow Vault</span>
            <button
              onClick={() => handleCopy(vaultAddress, 'vault')}
              className="text-slate-400 hover:text-slate-700 transition-colors"
              title="Copy Vault PDA"
            >
              {copiedKey === 'vault' ? (
                <Check className="w-3 h-3 text-emerald-600" />
              ) : (
                <Copy className="w-3 h-3" />
              )}
            </button>
          </div>
          <a
            href={getExplorerAccountUrl(vaultAddress, 'devnet')}
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-900 font-bold hover:text-emerald-700 flex items-center gap-1 truncate"
          >
            {shortenAddress(vaultAddress, 5)} <ExternalLink className="w-2.5 h-2.5 shrink-0" />
          </a>
          <span className="text-[10px] text-slate-400 block font-sans">Non-Custodial Escrow</span>
        </div>

        {/* Vault USDC Balance */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
          <span className="text-slate-400 block text-[11px] font-sans">Vault USDC Balance</span>
          <div className="text-sm font-black text-slate-900">
            {vaultUsdcBalance !== null && vaultUsdcBalance !== undefined
              ? `${vaultUsdcBalance.toFixed(2)} USDC`
              : '0.00 USDC'}
          </div>
          <span className="text-[10px] text-emerald-800 font-sans font-semibold block">
            {vaultUsdcBalance && vaultUsdcBalance > 0 ? 'Locked in Escrow' : 'Awaiting Buyer Deposit'}
          </span>
        </div>
      </div>

      {/* State Machine Cross-Check: Backend vs On-Chain */}
      <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <span className="font-bold text-slate-800 flex items-center gap-1.5 font-sans">
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            Dual-Layer State Verification:
          </span>
          <div className="flex items-center gap-1.5 font-sans">
            {isStateMatched && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-full border border-emerald-300">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                ✓ MATCHED ON SOLANA DEVNET
              </span>
            )}
            {isConflict && (
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 px-2 py-0.5 rounded-full border border-rose-300">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                ⚠ STATE DISCREPANCY DETECTED
              </span>
            )}
            {!isStateMatched && !isConflict && (
              <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-200/60 px-2 py-0.5 rounded-full">
                <Clock className="w-3 h-3 text-slate-400" />
                Verifying on-chain state...
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-sans">Application Backend State:</span>
            <span className="font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
              {order.state.toUpperCase()}
            </span>
          </div>

          <div className="bg-white p-3 rounded-lg border border-slate-200 flex items-center justify-between">
            <span className="text-slate-500 font-sans">Solana Devnet On-Chain State:</span>
            <span className="font-mono font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {displayOnChainState.toUpperCase()}
            </span>
          </div>
        </div>
      </div>

      {/* Reconciliation Report Banner (if run) */}
      {reconcileResult && (
        <div
          className={`p-4 rounded-xl text-xs space-y-2 border ${
            reconcileResult.stateMatch
              ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
              : 'bg-amber-50/70 border-amber-200 text-amber-950'
          }`}
        >
          <div className="flex items-center justify-between font-bold">
            <span className="flex items-center gap-1.5 font-sans">
              {reconcileResult.stateMatch ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600" />
              )}
              {reconcileResult.stateMatch
                ? '✓ Backend and Solana State Match (Authoritative)'
                : '⚠ Blockchain State Differs from Application State'}
            </span>
            <span className="text-[10px] text-slate-500 font-mono">
              Reconciled: {new Date(reconcileResult.reconciledAt).toLocaleTimeString()}
            </span>
          </div>

          {reconcileResult.discrepancies.length > 0 ? (
            <div className="space-y-1 pt-1 font-sans">
              <span className="font-bold text-[11px] block">Observed Discrepancies:</span>
              <ul className="list-disc pl-4 space-y-0.5 text-[11px] text-amber-900">
                {reconcileResult.discrepancies.map((d, i) => (
                  <li key={i}>{d}</li>
                ))}
              </ul>
              <p className="text-[10px] text-amber-800 italic pt-1">
                Note: Per non-custodial invariants, blockchain state was not blindly overwritten. Review is required.
              </p>
            </div>
          ) : (
            <p className="text-[11px] text-emerald-900 font-sans">
              All 5 security invariants verified against Solana Devnet. Vault balance matches expected escrow terms.
            </p>
          )}
        </div>
      )}

      {/* Error Message */}
      {reconcileError && (
        <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2 font-sans">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{reconcileError}</span>
        </div>
      )}
    </div>
  );
}
