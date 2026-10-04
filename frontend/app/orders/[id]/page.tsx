'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Order, OrderState, TransactionRecord } from '@/lib/types';
import { Timeline } from '@/components/Timeline';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import {
  shortenAddress,
  getExplorerTxUrl,
  getExplorerAccountUrl,
  DEVNET_USDC_MINT,
} from '@/lib/solana';
import {
  ShieldCheck,
  Lock,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  PackageCheck,
  CheckCheck,
  Copy,
  Check,
} from 'lucide-react';
import Link from 'next/link';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [copiedPda, setCopiedPda] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error('Failed to load order', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="text-slate-500 text-sm mt-4">Querying order state...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-slate-700 font-bold">Order not found.</p>
        <Link
          href="/dashboard/buyer"
          className="inline-flex items-center gap-2 text-sm text-emerald-600 font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Buyer Orders
        </Link>
      </div>
    );
  }

  const handleCopyPda = () => {
    navigator.clipboard.writeText(order.orderPda);
    setCopiedPda(true);
    setTimeout(() => setCopiedPda(false), 2000);
  };

  // State Transition Actions
  const executeStep = async (nextState: OrderState, actionName: string, role: string) => {
    setErrorMsg(null);
    setActionInProgress(true);

    try {
      // Clearly label as simulated demo transaction until Anchor devnet deployment
      const simSig = `simulated_${nextState.toLowerCase()}_${Date.now()}`;

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nextState,
          signature: simSig,
          signer: role === 'supplier' ? order.supplierWallet : order.buyerWallet,
          action: actionName,
          isSimulated: true,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update order state');
      }

      setOrder(data.order);
    } catch (err: any) {
      console.error('Error executing step:', err);
      setErrorMsg(err.message || 'Failed to execute transaction');
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard/buyer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">Blockchain Order #{order.blockchainOrderId}</span>
          <OrderStatusBadge state={order.state} size="md" />
        </div>
      </div>

      {/* Demo / Reality Notice Banner */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3 text-amber-900 text-xs leading-relaxed">
        <span className="px-2 py-0.5 rounded bg-amber-200/80 text-amber-900 font-bold uppercase tracking-wide text-[10px] shrink-0">
          Demo Mode
        </span>
        <div>
          <span className="font-bold">Devnet Smart Contract Deployment Pending:</span> Order lifecycle state transitions are currently executed and validated via our state-machine simulation layer. Real on-chain Anchor program transactions will activate upon Devnet program deployment.
        </div>
      </div>

      {/* Main Order Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              Wholesale Settlement Contract
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {order.productName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Consignment: <strong>{order.quantity} {order.unit}s</strong> • Destination: <strong>{order.shippingAddress}</strong>
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400 font-medium block">Total Escrow Amount</span>
            <div className="text-3xl font-black text-slate-900">
              ${order.amountUsdc}{' '}
              <span className="text-sm font-semibold text-emerald-600">USDC</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              SPL Token Mint Verified
            </span>
          </div>
        </div>

        {/* Cryptographic Key Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px]">Buyer Authority</span>
            <a
              href={getExplorerAccountUrl(order.buyerWallet)}
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-semibold hover:text-emerald-600 flex items-center gap-1 truncate"
            >
              {shortenAddress(order.buyerWallet, 5)}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <span className="text-[10px] text-slate-400 block font-sans">{order.buyerName}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px]">Supplier Authority</span>
            <a
              href={getExplorerAccountUrl(order.supplierWallet)}
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-semibold hover:text-emerald-600 flex items-center gap-1 truncate"
            >
              {shortenAddress(order.supplierWallet, 5)}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <span className="text-[10px] text-slate-400 block font-sans">{order.supplierName}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 text-[11px]">Order PDA Address</span>
              <button
                onClick={handleCopyPda}
                className="text-slate-400 hover:text-slate-700"
                title="Copy PDA Address"
              >
                {copiedPda ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
            <a
              href={getExplorerAccountUrl(order.orderPda)}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 font-semibold hover:text-emerald-800 flex items-center gap-1 truncate"
            >
              {shortenAddress(order.orderPda, 5)}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <span className="text-[10px] text-slate-400 block font-sans">Derived on Solana</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px]">Settlement Token Mint</span>
            <a
              href={getExplorerAccountUrl(DEVNET_USDC_MINT.toBase58())}
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-semibold hover:text-emerald-600 flex items-center gap-1 truncate"
            >
              {shortenAddress(DEVNET_USDC_MINT.toBase58(), 5)}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <span className="text-[10px] text-emerald-700 block font-sans font-medium">Devnet USDC</span>
          </div>
        </div>
      </div>

      {/* Grid: Left = Action Operator Box, Right = Interactive Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Action Card for Current State */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-300 p-6 shadow-md space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
                <h3 className="font-bold text-sm text-slate-900">Next Action Required</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Stage: {order.state}
              </span>
            </div>

            {errorMsg && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Stage 1: Created -> Next Action: Supplier Accepts */}
            {order.state === 'Created' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-1.5">
                  <p className="font-semibold">Step 2: Supplier Acceptance</p>
                  <p className="text-[11px] leading-relaxed">
                    The wholesale order has been created by the buyer on Solana. The designated supplier
                    must now review quantities and sign the <code>accept_order</code> instruction.
                  </p>
                </div>

                <button
                  onClick={() => executeStep('Accepted', 'accept_order', 'supplier')}
                  disabled={actionInProgress}
                  className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionInProgress ? (
                    'Executing accept_order on Solana...'
                  ) : (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      Sign: Accept Wholesale Order (Supplier)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Stage 2: Accepted -> Next Action: Buyer Funds Escrow */}
            {order.state === 'Accepted' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-blue-50 border border-blue-200 rounded-xl text-xs text-blue-900 space-y-1.5">
                  <p className="font-semibold">Step 3: Fund Escrow Vault</p>
                  <p className="text-[11px] leading-relaxed">
                    The supplier has accepted your order. Now lock the wholesale payment of{' '}
                    <strong>${order.amountUsdc} USDC</strong> into the program-controlled vault.
                  </p>
                </div>

                <button
                  onClick={() => executeStep('Funded', 'fund_escrow', 'buyer')}
                  disabled={actionInProgress}
                  className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionInProgress ? (
                    'Transferring USDC to Escrow Vault...'
                  ) : (
                    <>
                      <Lock className="w-4 h-4" />
                      Sign: Fund Escrow (${order.amountUsdc} USDC)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Stage 3: Funded -> Next Action: Supplier Ships */}
            {order.state === 'Funded' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-1.5">
                  <p className="font-semibold">Step 4: Dispatch Freight</p>
                  <p className="text-[11px] leading-relaxed">
                    Funds are verified and securely locked in the smart contract escrow. The supplier can
                    now safely hand over the consignment to highway logistics.
                  </p>
                </div>

                <button
                  onClick={() => executeStep('Shipped', 'mark_shipped', 'supplier')}
                  disabled={actionInProgress}
                  className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionInProgress ? (
                    'Recording Dispatch on Solana...'
                  ) : (
                    <>
                      <Truck className="w-4 h-4" />
                      Sign: Mark Consignment Dispatched (Supplier)
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Stage 4: Shipped -> Next Action: Buyer Confirms Delivery */}
            {order.state === 'Shipped' && (
              <div className="space-y-4">
                <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl text-xs text-indigo-900 space-y-1.5">
                  <p className="font-semibold">Step 5 &amp; 6: Confirm Delivery &amp; Settle</p>
                  <p className="text-[11px] leading-relaxed">
                    Goods have arrived at your depot. Once physical quality and count are confirmed,
                    signing will release the escrowed USDC directly to the supplier.
                  </p>
                </div>

                <button
                  onClick={() => executeStep('Completed', 'confirm_delivery_and_release', 'buyer')}
                  disabled={actionInProgress}
                  className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {actionInProgress ? (
                    'Releasing USDC from Vault...'
                  ) : (
                    <>
                      <PackageCheck className="w-4 h-4" />
                      Sign: Confirm Delivery &amp; Release Payment
                    </>
                  )}
                </button>
              </div>
            )}

            {/* Stage 5: Completed -> Settlement Done */}
            {order.state === 'Completed' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-xl text-xs text-green-900 space-y-2 text-center">
                <CheckCheck className="w-8 h-8 text-green-600 mx-auto" />
                <p className="font-bold text-sm">Settlement Complete</p>
                <p className="text-[11px] text-green-800 leading-relaxed">
                  The smart contract has released ${order.amountUsdc} USDC to the supplier.
                  All conditions satisfied.
                </p>
              </div>
            )}
          </div>

          {/* Non-Custodial Security Notice */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-300 text-xs leading-relaxed space-y-2 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              Non-Custodial Enforcement
            </div>
            <p className="text-[11px] text-slate-400">
              Every action button above triggers an authenticated on-chain state transition.
              No backend server can simulate, forge, or alter this sequence.
            </p>
          </div>
        </div>

        {/* Right Column: Visual Timeline of all 6 stages */}
        <div className="lg:col-span-7">
          <Timeline order={order} />
        </div>
      </div>

      {/* Transaction Signatures Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
          <span>Transaction Ledger &amp; Verification Trail</span>
          <span className="text-[11px] font-mono text-slate-400 font-normal">
            ({order.transactions?.length || 0} records)
          </span>
        </h3>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Trade Stage</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Signer Wallet</th>
                <th className="px-4 py-3">Execution Status &amp; Signature</th>
                <th className="px-4 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.transactions && order.transactions.length > 0 ? (
                order.transactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                        {tx.step}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{tx.action}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {shortenAddress(tx.signer, 4)}
                    </td>
                    <td className="px-4 py-3">
                      {tx.isSimulated || !tx.explorerUrl ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-50 text-amber-800 border border-amber-200 font-mono text-[11px]">
                          Simulated Demo ({tx.signature})
                        </span>
                      ) : (
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline flex items-center gap-1 font-mono"
                        >
                          {shortenAddress(tx.signature, 6)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {new Date(tx.timestamp).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
