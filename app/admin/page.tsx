'use client';

import React from 'react';
import {
  deriveConfigPda,
  DEVNET_USDC_MINT,
  PROGRAM_ID_STRING,
  shortenAddress,
  getExplorerAccountUrl,
} from '@/lib/solana';
import { ShieldCheck, Cpu, ExternalLink, Lock, CheckCircle2, AlertCircle } from 'lucide-react';

export default function AdminProtocolPage() {
  const [configPda, configBump] = deriveConfigPda();

  const rules = [
    {
      rule: 'Created ➔ Accepted',
      auth: 'Designated Supplier Only (has_one = supplier)',
      enforcement: 'Anchor Account Constraint + State Guard',
      active: true,
    },
    {
      rule: 'Accepted ➔ Funded',
      auth: 'Buyer Only (seeds = [order, buyer, order_id])',
      enforcement: 'SPL Token Transfer to Program Vault PDA',
      active: true,
    },
    {
      rule: 'Funded ➔ Shipped',
      auth: 'Designated Supplier Only',
      enforcement: 'State Check (order.state == Funded)',
      active: true,
    },
    {
      rule: 'Shipped ➔ Delivered',
      auth: 'Buyer Only',
      enforcement: 'Cryptographic Delivery Receipt Signature',
      active: true,
    },
    {
      rule: 'Delivered ➔ Completed',
      auth: 'Smart Contract / Authorized Party',
      enforcement: 'Automated CPI Release of USDC from Vault to Supplier',
      active: true,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="border-b border-slate-200 pb-6">
        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-md mb-2 border border-emerald-200">
          <Cpu className="w-3.5 h-3.5 text-emerald-600" />
          On-Chain Protocol Dashboard
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          BazaarX Solana Smart Contract Governance
        </h1>
        <p className="text-xs text-slate-500 mt-1">
          Inspect the deterministic PDA seeds, state machine boundaries, and cryptographic escrow constraints.
        </p>
      </div>

      {/* Protocol Core Parameters Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
          On-Chain Protocol Identifiers (Solana Devnet)
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs font-mono">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-slate-400 block text-[11px]">BazaarX Anchor Program ID</span>
            <code className="text-slate-900 font-bold block break-all text-xs">
              {PROGRAM_ID_STRING}
            </code>
            <span className="text-[10px] text-slate-500 font-sans block">
              Declared in programs/bazaarx/src/lib.rs
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-slate-400 block text-[11px]">Global Config PDA (seeds: [&quot;config&quot;])</span>
            <div className="flex items-center justify-between">
              <code className="text-emerald-700 font-bold block break-all text-xs">
                {configPda.toBase58()}
              </code>
              <span className="text-[10px] text-slate-400 bg-white px-2 py-0.5 rounded border border-slate-200">
                bump: {configBump}
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-sans block">
              Stores protocol admin authority and canonical USDC mint
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-slate-400 block text-[11px]">Canonical Settlement Token (USDC Devnet)</span>
            <a
              href={getExplorerAccountUrl(DEVNET_USDC_MINT.toBase58())}
              target="_blank"
              rel="noreferrer"
              className="text-slate-900 font-bold hover:text-emerald-700 flex items-center gap-1 break-all"
            >
              {DEVNET_USDC_MINT.toBase58()}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <span className="text-[10px] text-slate-500 font-sans block">
              Circle official SPL USDC Devnet mint (6 decimals)
            </span>
          </div>

          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1.5">
            <span className="text-slate-400 block text-[11px]">Order PDA Derivation Formula</span>
            <code className="text-slate-700 font-semibold block text-xs">
              [&quot;order&quot;, buyer_pubkey, order_id_le_bytes]
            </code>
            <span className="text-[10px] text-slate-500 font-sans block">
              Guarantees deterministic 1-to-1 account mapping without client address tampering
            </span>
          </div>
        </div>
      </div>

      {/* State Machine Transition Matrix */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden space-y-4">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-slate-900">
              State Transition &amp; Authorization Matrix
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Strictly enforced in Solana Rust program instruction boundaries
            </p>
          </div>
          <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
            5 Valid Transitions
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-6 py-3.5">Allowed Transition</th>
                <th className="px-6 py-3.5">Signing Authority</th>
                <th className="px-6 py-3.5">Smart Contract Validation</th>
                <th className="px-6 py-3.5 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rules.map((r, i) => (
                <tr key={i} className="hover:bg-slate-50 font-mono">
                  <td className="px-6 py-4 font-bold text-slate-900">
                    <span className="font-sans px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs">
                      {r.rule}
                    </span>
                  </td>
                  <td className="px-6 py-4 font-sans font-medium text-slate-700">
                    {r.auth}
                  </td>
                  <td className="px-6 py-4 font-sans text-slate-500">
                    {r.enforcement}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
