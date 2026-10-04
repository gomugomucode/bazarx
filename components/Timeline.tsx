import React from 'react';
import { Order, OrderState } from '@/lib/types';
import { Check, Clock, ExternalLink } from 'lucide-react';
import { shortenAddress } from '@/lib/solana';

interface Props {
  order: Order;
}

interface StepDefinition {
  state: OrderState;
  title: string;
  actor: 'Buyer' | 'Supplier' | 'Program';
  description: string;
}

export const Timeline: React.FC<Props> = ({ order }) => {
  const steps: StepDefinition[] = [
    {
      state: 'Created',
      title: 'Order Created',
      actor: 'Buyer',
      description: 'Buyer creates Order PDA, locking price, quantity, and designated supplier.',
    },
    {
      state: 'Accepted',
      title: 'Supplier Acceptance',
      actor: 'Supplier',
      description: 'Designated supplier signs on-chain to commit to stock and fulfillment.',
    },
    {
      state: 'Funded',
      title: 'USDC Escrow Funded',
      actor: 'Buyer',
      description: 'Buyer locks wholesale payment into the program-controlled vault PDA.',
    },
    {
      state: 'Shipped',
      title: 'Freight Dispatched',
      actor: 'Supplier',
      description: 'Consignment handed over to highway carrier; tracking reference recorded.',
    },
    {
      state: 'Delivered',
      title: 'Delivery Confirmed',
      actor: 'Buyer',
      description: 'Buyer inspects delivered goods and cryptographically signs acceptance.',
    },
    {
      state: 'Completed',
      title: 'Payment Released',
      actor: 'Program',
      description: 'Smart contract automatically transfers USDC from vault to supplier.',
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
            Cryptographic state machine verified by the Solana program
          </p>
        </div>
        <div className="text-right">
          <span className="text-[11px] font-mono text-slate-400 block">Current State</span>
          <span className="text-xs font-semibold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            {order.state.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="relative pl-6 sm:pl-8 space-y-8 before:absolute before:left-3 sm:before:left-4 before:top-3 before:bottom-3 before:w-0.5 before:bg-slate-200">
        {steps.map((step, idx) => {
          const isDone = currentIndex >= idx;
          const isCurrent = currentIndex === idx;
          const isUpcoming = currentIndex < idx;

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
                    ? 'bg-amber-500 border-amber-500 text-white animate-pulse'
                    : 'bg-white border-slate-300 text-slate-400'
                }`}
              >
                {isDone ? (
                  <Check className="w-3.5 h-3.5 sm:w-4 sm:h-4 stroke-[3]" />
                ) : isCurrent ? (
                  <Clock className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                ) : (
                  <span>{idx + 1}</span>
                )}
              </div>

              {/* Step Content */}
              <div
                className={`rounded-xl p-4 transition-all ${
                  isCurrent
                    ? 'bg-slate-50 border border-slate-300 shadow-sm'
                    : 'bg-white'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 mb-1">
                  <div className="flex items-center gap-2">
                    <h4
                      className={`text-sm font-semibold ${
                        isDone || isCurrent ? 'text-slate-900' : 'text-slate-400'
                      }`}
                    >
                      {step.title}
                    </h4>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${
                        step.actor === 'Buyer'
                          ? 'bg-sky-50 text-sky-700 border border-sky-200'
                          : step.actor === 'Supplier'
                          ? 'bg-amber-50 text-amber-700 border border-amber-200'
                          : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      }`}
                    >
                      {step.actor} Action
                    </span>
                  </div>

                  {isDone && (
                    <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                      <Check className="w-3 h-3 text-emerald-600" /> Confirmed
                    </span>
                  )}
                  {isCurrent && (
                    <span className="text-[11px] text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                      Pending Action
                    </span>
                  )}
                </div>

                <p className="text-xs text-slate-500 leading-relaxed">
                  {step.description}
                </p>

                {/* Explorer Transaction Signature Link if step completed */}
                {tx && (
                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/60 flex flex-wrap items-center justify-between text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 font-mono">
                      <span className="text-slate-400">Tx:</span>
                      <a
                        href={tx.explorerUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="text-emerald-700 hover:text-emerald-800 font-semibold hover:underline flex items-center gap-1"
                      >
                        {shortenAddress(tx.signature, 6)}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                    {tx.timestamp && (
                      <span className="text-slate-400">
                        {new Date(tx.timestamp).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                          second: '2-digit',
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
