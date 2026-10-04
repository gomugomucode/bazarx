'use client';

import React from 'react';
import { Order, OrderState } from '@/lib/types';
import { Check, Clock, ExternalLink, Circle, AlertCircle } from 'lucide-react';
import { shortenAddress, getExplorerTxUrl } from '@/lib/solana';

interface Props {
  order: Order;
}

interface StepDefinition {
  state: OrderState;
  title: string;
  actor: 'Buyer' | 'Supplier' | 'Settlement Protocol';
  description: string;
  actionRequiredText: string;
}

export const Timeline: React.FC<Props> = ({ order }) => {
  const steps: StepDefinition[] = [
    {
      state: 'Created',
      title: 'Order Created',
      actor: 'Buyer',
      description: 'Buyer creates Order PDA, committing quantity, agreed unit price, and designated supplier.',
      actionRequiredText: 'Waiting for supplier review and acceptance.',
    },
    {
      state: 'Accepted',
      title: 'Supplier Acceptance',
      actor: 'Supplier',
      description: 'Designated supplier cryptographically commits to inventory fulfillment and dispatch SLA.',
      actionRequiredText: 'Wholesale buyer must fund the USDC escrow vault.',
    },
    {
      state: 'Funded',
      title: 'USDC Escrow Funded',
      actor: 'Buyer',
      description: 'Buyer locks wholesale settlement funds into the program-owned escrow vault PDA.',
      actionRequiredText: 'Supplier must dispatch freight along designated highway trade corridor.',
    },
    {
      state: 'Shipped',
      title: 'Freight Dispatched',
      actor: 'Supplier',
      description: 'Consignment handed over to highway carrier; bill of lading / tracking reference recorded.',
      actionRequiredText: 'Buyer inspects delivered consignment at receiving warehouse.',
    },
    {
      state: 'Delivered',
      title: 'Delivery Confirmed',
      actor: 'Buyer',
      description: 'Buyer physically verifies count and quality, then cryptographically signs delivery confirmation.',
      actionRequiredText: 'Settlement protocol or supplier can release escrow funds.',
    },
    {
      state: 'Completed',
      title: 'Payment Released',
      actor: 'Settlement Protocol',
      description: 'Solana smart contract executes CPI transfer of USDC from vault directly to supplier wallet.',
      actionRequiredText: 'Trade cycle fully finalized and settled on Solana Devnet.',
    },
  ];

  const stateOrder: OrderState[] = [
    'Created',
    'Accepted',
    'Funded',
    'Shipped',
    'Delivered',
    'Completed',
  ];

  const currentIndex = stateOrder.indexOf(order.state);

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-100">
        <div>
          <h3 className="text-base font-bold text-slate-900">
            On-Chain Settlement Lifecycle
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Deterministic cryptographic state progression on Solana Devnet
          </p>
        </div>
        <div className="text-right">
          <span className="text-[10px] font-mono uppercase tracking-wider text-slate-400 block">
            Current Stage
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            {order.state.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="relative pl-6 sm:pl-8 space-y-7 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {steps.map((step, idx) => {
          const isDone = currentIndex > idx;
          const isCurrent = currentIndex === idx;
          const isPending = currentIndex < idx;

          // Find matching transaction record
          const tx = order.transactions?.find((t) => t.step === step.state);

          return (
            <div key={step.state} className="relative group">
              {/* Timeline marker icon */}
              <div
                className={`absolute -left-6 sm:-left-8 top-0.5 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center font-bold text-xs border-2 transition-all ${
                  isDone
                    ? 'bg-emerald-600 border-emerald-600 text-white shadow-sm'
                    : isCurrent
                    ? 'bg-white border-amber-500 text-amber-600 shadow-md ring-4 ring-amber-50'
                    : 'bg-white border-slate-300 text-slate-300'
                }`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                ) : isCurrent ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
                ) : (
                  <span className="text-[11px] font-mono">{idx + 1}</span>
                )}
              </div>

              {/* Step Content */}
              <div
                className={`rounded-xl p-4 transition-all ${
                  isCurrent
                    ? 'bg-amber-50/40 border border-amber-200/80 shadow-sm'
                    : isDone
                    ? 'bg-white border border-slate-100'
                    : 'bg-slate-50/50 border border-transparent'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm font-bold ${
                        isDone
                          ? 'text-slate-900'
                          : isCurrent
                          ? 'text-slate-900'
                          : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </h4>

                    <span
                      className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                        step.actor === 'Buyer'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : step.actor === 'Supplier'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {step.actor}
                    </span>
                  </div>

                  {/* Stage Tag */}
                  <div>
                    {isDone && (
                      <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                        <Check className="w-3 h-3 text-emerald-600 stroke-[3]" /> Completed
                      </span>
                    )}
                    {isCurrent && (
                      <span className="text-[11px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-600 animate-ping"></span>
                        Action Required
                      </span>
                    )}
                    {isPending && (
                      <span className="text-[11px] text-slate-400 font-medium">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                <p
                  className={`text-xs leading-relaxed ${
                    isPending ? 'text-slate-400' : 'text-slate-600'
                  }`}
                >
                  {step.description}
                </p>

                {/* If current, show clear prompt of what happens next */}
                {isCurrent && (
                  <div className="mt-2 pt-2 border-t border-amber-200/60 text-[11px] font-medium text-amber-900 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                    <span>{step.actionRequiredText}</span>
                  </div>
                )}

                {/* Transaction Signature / Execution Audit */}
                {tx && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500 font-mono">
                    <div className="flex items-center gap-1.5">
                      {tx.isSimulated || !tx.explorerUrl ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Off-chain / Demo ({tx.signature})
                        </span>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="text-slate-400 font-sans">On-chain:</span>
                          <a
                            href={tx.explorerUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline flex items-center gap-1"
                          >
                            <span>{shortenAddress(tx.signature, 6)}</span>
                            <ExternalLink className="w-3 h-3 shrink-0" />
                          </a>
                        </div>
                      )}
                    </div>
                    {tx.timestamp && (
                      <span className="text-slate-400 text-[10px]">
                        {new Date(tx.timestamp).toLocaleString([], {
                          dateStyle: 'short',
                          timeStyle: 'medium',
                        })}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
