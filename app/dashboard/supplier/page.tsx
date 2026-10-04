'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@solana/wallet-adapter-react';
import { Order } from '@/lib/types';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { shortenAddress } from '@/lib/solana';
import {
  Truck,
  ArrowRight,
  CheckCircle2,
  Lock,
  Clock,
  ExternalLink,
  Building2,
} from 'lucide-react';

export default function SupplierDashboardPage() {
  const { publicKey } = useWallet();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSupplierOrders() {
      try {
        const res = await fetch('/api/orders');
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

  const pendingAcceptance = orders.filter((o) => o.state === 'Created');
  const readyToShip = orders.filter((o) => o.state === 'Funded');
  const settledRevenue = orders
    .filter((o) => o.state === 'Completed')
    .reduce((sum, o) => sum + o.amountUsdc, 0);

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
          <p className="text-xs text-slate-500 mt-1">
            Review incoming wholesale purchase requests, verify buyer escrow deposits, and dispatch shipments.
          </p>
        </div>

        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200 text-xs text-slate-700">
          <Building2 className="w-4 h-4 text-slate-500" />
          <span>Terai &amp; Himalayan Regional Suppliers</span>
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Needs Acceptance</span>
          <div className="text-2xl font-black text-amber-600">{pendingAcceptance.length}</div>
          <span className="text-[11px] text-slate-500">Incoming buyer wholesale orders</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Funded: Ready to Ship</span>
          <div className="text-2xl font-black text-emerald-600">{readyToShip.length}</div>
          <span className="text-[11px] text-slate-500">Escrow locked in smart contract</span>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-1">
          <span className="text-xs font-medium text-slate-400">Settled Revenue (USDC)</span>
          <div className="text-2xl font-black text-slate-900">${settledRevenue} USDC</div>
          <span className="text-[11px] text-slate-500">Paid out to supplier wallet</span>
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
          <div className="p-12 text-center text-slate-400 text-sm">Loading orders...</div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">No incoming orders found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-5 py-3.5">Commodity Item</th>
                  <th className="px-5 py-3.5">Buyer Enterprise</th>
                  <th className="px-5 py-3.5">Order Value</th>
                  <th className="px-5 py-3.5">Escrow State</th>
                  <th className="px-5 py-3.5 text-right">Fulfillment Action</th>
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
                      <div className="font-medium text-slate-700">{ord.buyerName}</div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {shortenAddress(ord.buyerWallet, 4)}
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
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg font-semibold text-xs transition-all shadow-sm ${
                          ord.state === 'Created'
                            ? 'bg-blue-600 hover:bg-blue-500 text-white'
                            : ord.state === 'Funded'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                            : 'bg-slate-100 hover:bg-slate-900 hover:text-white text-slate-700'
                        }`}
                      >
                        {ord.state === 'Created'
                          ? 'Sign Accept'
                          : ord.state === 'Funded'
                          ? 'Sign Ship'
                          : 'Inspect Flow'}
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
