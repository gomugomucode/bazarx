'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Order } from '@/lib/types';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { shortenAddress } from '@/lib/solana';
import {
  ShoppingBag,
  ArrowRight,
  Lock,
  Truck,
  CheckCheck,
  ExternalLink,
  Plus,
} from 'lucide-react';

export default function BuyerDashboardPage() {
  const { publicKey } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBuyerOrders() {
      try {
        const res = await fetch('/api/orders');
        const data = await res.json();
        if (data.success) {
          // Show all demo orders or filter by buyer
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

  const totalEscrowUsdc = orders
    .filter((o) => ['Accepted', 'Funded', 'Shipped'].includes(o.state))
    .reduce((sum, o) => sum + o.amountUsdc, 0);

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
          <p className="text-xs text-slate-500 mt-1">
            Manage your commodity orders, monitor escrow funding, and confirm freight receipts.
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

      {/* Summary KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Total Purchase Orders</span>
          <div className="text-2xl font-black text-slate-900">{orders.length}</div>
          <span className="text-[11px] text-slate-500">Across Nepal Trade Corridors</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Escrow Value Protected</span>
          <div className="text-2xl font-black text-emerald-600">${totalEscrowUsdc} USDC</div>
          <span className="text-[11px] text-slate-500">Locked in Solana smart contract</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Freight in Transit</span>
          <div className="text-2xl font-black text-indigo-600">{inTransitCount}</div>
          <span className="text-[11px] text-slate-500">Awaiting depot arrival</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Settled &amp; Fulfilled</span>
          <div className="text-2xl font-black text-teal-600">{completedCount}</div>
          <span className="text-[11px] text-slate-500">100% dispute-free delivery</span>
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
          <div className="p-12 text-center text-slate-400 text-sm">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center space-y-3">
            <p className="text-sm text-slate-500">No purchase orders found.</p>
            <Link
              href="/marketplace"
              className="text-xs text-emerald-600 font-semibold hover:underline"
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
                  <th className="px-5 py-3.5">Amount (USDC)</th>
                  <th className="px-5 py-3.5">Settlement Status</th>
                  <th className="px-5 py-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((ord) => (
                  <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
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
                    </td>
                    <td className="px-5 py-4">
                      <OrderStatusBadge state={ord.state} size="sm" />
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        href={`/orders/${ord.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700 font-semibold text-xs transition-all"
                      >
                        Inspect Lifecycle
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
