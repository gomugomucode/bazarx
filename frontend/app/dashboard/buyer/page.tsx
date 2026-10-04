'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Order } from '@/lib/types';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { shortenAddress } from '@/lib/solana';
import { useWalletBalance } from '@/lib/useWalletBalance';
import {
  ShoppingBag,
  ArrowRight,
  Lock,
  Truck,
  CheckCheck,
  ExternalLink,
  Plus,
  Wallet,
  Clock,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
} from 'lucide-react';

export default function BuyerDashboardPage() {
  const { publicKey, connected } = useWallet();
  const { setVisible: openWalletModal } = useWalletModal();
  const { sol, usdc } = useWalletBalance();

  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function fetchBuyerOrders() {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.success) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error('Failed to load orders', err);
      } finally {
        setLoading(false);
      }
    }
    fetchBuyerOrders();
  }, [publicKey]);

  const handleCopyWallet = () => {
    if (!publicKey) return;
    navigator.clipboard.writeText(publicKey.toBase58());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Metric computations
  const totalEscrowUsdc = orders
    .filter((o) => ['Accepted', 'Funded', 'Shipped'].includes(o.state))
    .reduce((sum, o) => sum + o.amountUsdc, 0);

  const awaitingBuyerAction = orders.filter(
    (o) => o.state === 'Accepted' || o.state === 'Shipped'
  );
  const inTransitCount = orders.filter((o) => o.state === 'Shipped').length;
  const completedCount = orders.filter((o) => o.state === 'Completed').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Dashboard Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block">
            Buyer Procurement Portal
          </span>
          <h1 className="text-3xl font-black text-slate-900 tracking-tight">
            Wholesale Purchase Orders
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Manage wholesale commodity orders, fund on-chain escrow vaults, and verify deliveries.
          </p>
        </div>

        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition-all"
        >
          <Plus className="w-4 h-4" />
          New Wholesale Order
        </Link>
      </div>

      {/* Connected Wallet Status Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-sm shadow-sm shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-900">
                  {connected ? 'Buyer Wallet Connected' : 'Wallet Disconnected'}
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
                </div>
              ) : (
                <p className="text-xs text-slate-500 mt-0.5">
                  Connect your wallet to sign escrow funding transactions and approve delivery receipts.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3 self-start md:self-auto">
            {connected ? (
              <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 px-3.5 py-1.5 rounded-xl text-xs">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block font-medium">Devnet Assets</span>
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

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Total Purchase Orders</span>
          <div className="text-2xl font-black text-slate-900">{orders.length}</div>
          <span className="text-[11px] text-slate-500">Across Nepal Trade Corridors</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">On-Chain Escrowed Value</span>
          <div className="text-2xl font-black text-emerald-600">${totalEscrowUsdc} USDC</div>
          <span className="text-[11px] text-slate-500">Protected in program vault</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Orders Awaiting Buyer Action</span>
          <div className="text-2xl font-black text-amber-600">
            {awaitingBuyerAction.length}
          </div>
          <span className="text-[11px] text-amber-800 font-medium">Needs funding or delivery check</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Completed Trades</span>
          <div className="text-2xl font-black text-teal-600">{completedCount}</div>
          <span className="text-[11px] text-slate-500">100% on-chain settled</span>
        </div>
      </div>

      {/* Orders List Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">Purchase Orders Register</h3>
          <span className="text-xs text-slate-400 font-mono">
            {orders.length} active records
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-2 text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p>Loading orders from database and Solana Devnet...</p>
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-slate-500">No purchase orders found.</p>
            <Link
              href="/marketplace"
              className="text-xs text-emerald-700 font-bold hover:underline"
            >
              Explore wholesale marketplace to place your first order.
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-5 py-3.5">Commodity Item</th>
                  <th className="px-5 py-3.5">Designated Supplier</th>
                  <th className="px-5 py-3.5">Escrow Amount</th>
                  <th className="px-5 py-3.5">Settlement Status</th>
                  <th className="px-5 py-3.5 text-right">Lifecycle Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => {
                  const isActionNeeded = ord.state === 'Accepted' || ord.state === 'Shipped';

                  return (
                    <tr
                      key={ord.id}
                      className={`transition-colors ${
                        isActionNeeded ? 'bg-amber-50/20 hover:bg-amber-50/40' : 'hover:bg-slate-50'
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
                        <div className="font-medium text-slate-700">{ord.supplierName}</div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {shortenAddress(ord.supplierWallet, 4)}
                        </div>
                      </td>
                      <td className="px-5 py-4 font-bold text-slate-900">
                        ${ord.amountUsdc} USDC
                        <span className="text-[10px] block text-slate-400 font-normal font-sans">
                          On-chain settlement
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <OrderStatusBadge state={ord.state} size="sm" />
                      </td>
                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/orders/${ord.id}`}
                          className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-sm ${
                            ord.state === 'Accepted'
                              ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                              : ord.state === 'Shipped'
                              ? 'bg-teal-600 hover:bg-teal-500 text-white'
                              : 'bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700'
                          }`}
                        >
                          {ord.state === 'Accepted'
                            ? 'Fund Escrow'
                            : ord.state === 'Shipped'
                            ? 'Confirm Delivery'
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
