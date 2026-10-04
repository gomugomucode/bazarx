'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Order } from '@/lib/types';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { shortenAddress, getExplorerAccountUrl } from '@/lib/solana';
import { useWalletBalance } from '@/lib/useWalletBalance';
import {
  Truck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  ExternalLink,
  Building2,
  Wallet,
  Check,
  Copy,
  PackageCheck,
  ShieldCheck,
  AlertTriangle,
} from 'lucide-react';

export default function SupplierDashboardPage() {
  const { publicKey, connected } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const { sol, usdc } = useWalletBalance();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchSupplierOrders() {
      try {
        const res = await fetch('/api/orders', { cache: 'no-store' });
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error('Failed to load supplier orders', err);
      } finally {
        setLoading(false);
      }
    }
    fetchSupplierOrders();
  }, [publicKey]);

  const handleCopyWallet = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Status segmentation for supplier clarity
  const pendingAcceptance = orders.filter((o) => o.state === 'Created');
  const awaitingBuyerFunding = orders.filter((o) => o.state === 'Accepted');
  const readyToShip = orders.filter((o) => o.state === 'Funded');
  const inTransit = orders.filter((o) => o.state === 'Shipped');
  const awaitingRelease = orders.filter((o) => o.state === 'Delivered');
  const completedTrades = orders.filter((o) => o.state === 'Completed');

  const settledRevenue = completedTrades.reduce((sum, o) => sum + o.amountUsdc, 0);

  // Helper function for supplier payment state clarity
  const getPaymentStatusBadge = (state: string) => {
    switch (state) {
      case 'Created':
      case 'Accepted':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" /> Not Funded
          </span>
        );
      case 'Funded':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-300">
            <Lock className="w-3 h-3 text-emerald-600" /> Escrow Funded
          </span>
        );
      case 'Shipped':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-800 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            <Truck className="w-3 h-3 text-sky-600" /> In Transit
          </span>
        );
      case 'Delivered':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-teal-800 bg-teal-50 px-2 py-0.5 rounded border border-teal-200">
            <PackageCheck className="w-3 h-3 text-teal-600" /> Ready to Release
          </span>
        );
      case 'Completed':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-700" /> Payment Released
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-amber-800 uppercase tracking-wider block">
            Supplier Fulfillment Hub
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Wholesale Merchant Operations
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Review incoming wholesale requests, verify buyer escrow deposits on-chain, and dispatch shipments.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span>Regional Wholesale Suppliers Hub</span>
        </div>
      </div>

      {/* Connected Supplier Wallet Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {connected ? 'Supplier Wallet Connected' : 'Wallet Disconnected'}
                </span>
                <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  Solana Devnet
                </span>
              </div>
              {connected && publicKey ? (
                <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                  <span className="font-mono text-slate-800 font-semibold">
                    {shortenAddress(publicKey.toBase58(), 6)}
                  </span>
                  <button
                    onClick={handleCopyWallet}
                    className="text-slate-400 hover:text-slate-700 transition-colors"
                    title="Copy full address"
                  >
                    {copied ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <a
                    href={getExplorerAccountUrl(publicKey.toBase58(), 'devnet')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1 text-slate-400 hover:text-slate-700 transition-colors rounded-lg"
                    title="View wallet on Solana Explorer (Devnet)"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect your supplier wallet to accept purchase orders and record highway dispatch on-chain.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {connected ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">USDC Balance</span>
                  <span className="font-mono font-bold text-slate-800">
                    {usdc !== null ? `${usdc} USDC` : '0.00 USDC'}
                  </span>
                </div>
                <span className="text-slate-300">|</span>
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Gas Balance</span>
                  <span className="font-mono font-bold text-slate-800">
                    {sol !== null ? `${sol.toFixed(3)} SOL` : '0.00 SOL'}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => openWalletModal(true)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                Connect Wallet
              </button>
            )}
          </div>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Incoming (Needs Acceptance)</span>
          <div className="text-2xl font-black text-blue-600">{pendingAcceptance.length}</div>
          <span className="text-[11px] text-slate-500">Awaiting supplier sign</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Escrow Funded: Ready to Ship</span>
          <div className="text-2xl font-black text-emerald-600">{readyToShip.length}</div>
          <span className="text-[11px] text-emerald-800 font-semibold">Payment locked in vault</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">In Transit (Awaiting Delivery)</span>
          <div className="text-2xl font-black text-sky-600">{inTransit.length}</div>
          <span className="text-[11px] text-slate-500">Freight en route to depot</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Settled Revenue (USDC)</span>
          <div className="text-2xl font-black text-slate-900">${settledRevenue} USDC</div>
          <span className="text-[11px] text-slate-500">{completedTrades.length} trades settled</span>
        </div>
      </div>

      {/* Actionable Incoming Orders Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Wholesale Orders Ledger</h3>
          <span className="text-xs text-slate-400 font-mono">
            {orders.length} active orders
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-2 text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading merchant orders...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">No orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-5 py-3.5">Commodity Item</th>
                  <th className="px-5 py-3.5">Buyer Enterprise</th>
                  <th className="px-5 py-3.5">Order Value</th>
                  <th className="px-5 py-3.5">Payment State</th>
                  <th className="px-5 py-3.5 text-right">Fulfillment Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => {
                  const isActionable =
                    ord.state === 'Created' || ord.state === 'Funded' || ord.state === 'Delivered';

                  return (
                    <tr
                      key={ord.id}
                      className={`transition-colors ${
                        isActionable ? 'bg-slate-50/60 hover:bg-slate-100/60' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        #{ord.blockchainOrderId}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-800">{ord.productName}</div>
                        <span className="text-[11px] text-slate-400">
                          {ord.quantity} {ord.unit}s
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-700">{ord.buyerName}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {shortenAddress(ord.buyerWallet, 4)}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        ${ord.amountUsdc} USDC
                        <span className="text-[10px] block text-slate-400 font-normal font-sans">
                          On-chain settlement
                        </span>
                      </td>
                      <td className="px-5 py-4 space-y-1">
                        <div><OrderStatusBadge state={ord.state} size="sm" /></div>
                        <div>{getPaymentStatusBadge(ord.state)}</div>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/orders/${ord.id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-sm ${
                            ord.state === 'Created'
                              ? 'bg-blue-600 hover:bg-blue-500 text-white'
                              : ord.state === 'Funded'
                              ? 'bg-indigo-600 hover:bg-indigo-500 text-white'
                              : ord.state === 'Delivered'
                              ? 'bg-slate-900 hover:bg-slate-800 text-white'
                              : ord.state === 'Completed'
                              ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 font-bold hover:bg-emerald-100'
                              : 'bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700'
                          }`}
                        >
                          {ord.state === 'Created'
                            ? 'Sign Accept'
                            : ord.state === 'Accepted'
                            ? 'Awaiting Funding'
                            : ord.state === 'Funded'
                            ? 'Sign Ship'
                            : ord.state === 'Shipped'
                            ? 'In Transit'
                            : ord.state === 'Delivered'
                            ? 'Release Payment'
                            : ord.state === 'Completed'
                            ? 'Completed ✓'
                            : 'Inspect'}
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
