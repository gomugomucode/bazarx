'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  Search,
  Filter,
  ExternalLink,
  ShieldCheck,
  ShoppingBag,
  Store,
} from 'lucide-react';
import { Order } from '@/lib/types';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { shortenAddress } from '@/lib/solana';

interface OrdersSectionProps {
  activeRole: 'BUYER' | 'SUPPLIER';
  orders: Order[];
  loading: boolean;
}

export const OrdersSection: React.FC<OrdersSectionProps> = ({
  activeRole,
  orders,
  loading,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'action' | 'escrow' | 'completed'>('all');

  const isBuyer = activeRole === 'BUYER';

  // State filtering logic
  const filteredOrders = orders.filter((ord) => {
    // 1. Text search
    const matchesSearch =
      ord.productName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(ord.blockchainOrderId).includes(searchQuery) ||
      (isBuyer ? ord.supplierName : ord.buyerName).toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // 2. Tab filtering
    if (selectedFilter === 'action') {
      if (isBuyer) return ord.state === 'Accepted' || ord.state === 'Shipped';
      return ord.state === 'Created' || ord.state === 'Funded' || ord.state === 'Delivered';
    }
    if (selectedFilter === 'escrow') {
      return ['Accepted', 'Funded', 'Shipped', 'Delivered'].includes(ord.state);
    }
    if (selectedFilter === 'completed') {
      return ord.state === 'Completed';
    }

    return true;
  });

  const getNextAction = (state: string) => {
    if (isBuyer) {
      switch (state) {
        case 'Created':
          return { label: 'Waiting for Supplier', style: 'bg-slate-100 text-slate-600 hover:bg-slate-200' };
        case 'Accepted':
          return { label: 'Fund Escrow', style: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' };
        case 'Funded':
          return { label: 'Awaiting Shipment', style: 'bg-slate-100 text-slate-600 hover:bg-slate-200' };
        case 'Shipped':
          return { label: 'Confirm Delivery', style: 'bg-teal-600 hover:bg-teal-500 text-white font-bold' };
        case 'Delivered':
          return { label: 'Settlement Pending', style: 'bg-slate-100 text-slate-600 hover:bg-slate-200' };
        case 'Completed':
          return { label: 'View Receipt', style: 'bg-slate-100 text-slate-700 hover:bg-slate-200' };
        default:
          return { label: 'Inspect Order', style: 'bg-slate-100 text-slate-700 hover:bg-slate-200' };
      }
    } else {
      switch (state) {
        case 'Created':
          return { label: 'Accept Order', style: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' };
        case 'Accepted':
          return { label: 'Waiting for Funding', style: 'bg-slate-100 text-slate-600 hover:bg-slate-200' };
        case 'Funded':
          return { label: 'Mark Shipped', style: 'bg-emerald-600 hover:bg-emerald-500 text-white font-bold' };
        case 'Shipped':
          return { label: 'In Transit', style: 'bg-slate-100 text-slate-600 hover:bg-slate-200' };
        case 'Delivered':
          return { label: 'Release Payment', style: 'bg-teal-600 hover:bg-teal-500 text-white font-bold' };
        case 'Completed':
          return { label: 'Settlement Closed', style: 'bg-slate-100 text-slate-700 hover:bg-slate-200' };
        default:
          return { label: 'Inspect Order', style: 'bg-slate-100 text-slate-700 hover:bg-slate-200' };
      }
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
      {/* Section Header with Tabs & Search */}
      <div className="p-5 border-b border-slate-100 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-base text-slate-900">
              {isBuyer ? 'My Purchase Orders' : 'My Wholesale Sales Orders'}
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isBuyer
                ? 'Orders placed by your buyer business identity with on-chain settlement.'
                : 'Incoming procurement orders designated to your supplier business account.'}
            </p>
          </div>

          <span className="text-xs text-slate-500 font-mono self-start sm:self-auto bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'order' : 'orders'}
          </span>
        </div>

        {/* Filter controls */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Quick Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setSelectedFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedFilter === 'all'
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              All Orders
            </button>
            <button
              onClick={() => setSelectedFilter('action')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedFilter === 'action'
                  ? 'bg-amber-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Action Required
            </button>
            <button
              onClick={() => setSelectedFilter('escrow')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedFilter === 'escrow'
                  ? 'bg-emerald-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              In Escrow
            </button>
            <button
              onClick={() => setSelectedFilter('completed')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
                selectedFilter === 'completed'
                  ? 'bg-teal-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Completed
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-64 shrink-0">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search product, order #, trader..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-slate-900/10 focus:border-slate-400"
            />
          </div>
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="p-12 text-center space-y-2 text-slate-400 text-xs">
          <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p>Querying orders from database and Solana Devnet...</p>
        </div>
      ) : filteredOrders.length === 0 ? (
        <div className="p-12 text-center space-y-3">
          <p className="text-sm font-medium text-slate-600">
            {isBuyer ? 'No wholesale orders yet.' : 'No incoming orders yet.'}
          </p>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            {isBuyer
              ? 'Browse certified Nepal producers and place your first on-chain wholesale order with Solana escrow protection.'
              : 'When buyers create wholesale orders for your listed inventory, they will appear here for fulfillment.'}
          </p>
          <div className="pt-2">
            <Link
              href="/marketplace"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
            >
              {isBuyer ? (
                <>
                  <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />
                  Browse Marketplace
                </>
              ) : (
                <>
                  <Store className="w-3.5 h-3.5 text-sky-400" />
                  View Marketplace
                </>
              )}
            </Link>
          </div>
        </div>
      ) : (
        <>
          {/* Desktop Table View (>= 768px) */}
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                <tr>
                  <th className="px-5 py-3.5">Order ID</th>
                  <th className="px-5 py-3.5">Commodity Product</th>
                  <th className="px-5 py-3.5">
                    {isBuyer ? 'Designated Supplier' : 'Procuring Buyer'}
                  </th>
                  <th className="px-5 py-3.5">Settlement Value</th>
                  <th className="px-5 py-3.5">State & Network</th>
                  <th className="px-5 py-3.5 text-right">Lifecycle Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredOrders.map((ord) => {
                  const isAction =
                    (isBuyer && (ord.state === 'Accepted' || ord.state === 'Shipped')) ||
                    (!isBuyer && (ord.state === 'Created' || ord.state === 'Funded' || ord.state === 'Delivered'));

                  const nextAction = getNextAction(ord.state);
                  const isSimulated = ord.transactions?.[0]?.isSimulated;

                  return (
                    <tr
                      key={ord.id}
                      className={`transition-colors ${
                        isAction ? 'bg-amber-50/25 hover:bg-amber-50/50' : 'hover:bg-slate-50'
                      }`}
                    >
                      <td className="px-5 py-4 font-mono font-bold text-slate-900">
                        #{ord.blockchainOrderId}
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-semibold text-slate-900">{ord.productName}</div>
                        <span className="text-[11px] text-slate-400">
                          {ord.quantity} {ord.unit}s
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="font-medium text-slate-800">
                          {isBuyer ? ord.supplierName : ord.buyerName}
                        </div>
                        <div className="text-[10px] font-mono text-slate-400">
                          {shortenAddress(isBuyer ? ord.supplierWallet : ord.buyerWallet, 4)}
                        </div>
                      </td>

                      <td className="px-5 py-4 font-bold text-slate-900">
                        ${ord.amountUsdc.toLocaleString()} USDC
                        <span className="text-[10px] block font-sans font-normal text-slate-400">
                          {isSimulated ? (
                            <span className="text-slate-400">Off-chain demo</span>
                          ) : (
                            <span className="text-emerald-700 font-semibold">On-chain</span>
                          )}
                        </span>
                      </td>

                      <td className="px-5 py-4">
                        <div className="flex flex-col gap-1 items-start">
                          <OrderStatusBadge state={ord.state} size="sm" />
                          <span className="text-[9px] font-mono text-slate-400">
                            {isSimulated ? 'Local Mock' : 'Solana Devnet'}
                          </span>
                        </div>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <Link
                          href={`/orders/${ord.id}`}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-all shadow-xs ${nextAction.style}`}
                        >
                          <span>{nextAction.label}</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile Card View (< 768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {filteredOrders.map((ord) => {
              const isAction =
                (isBuyer && (ord.state === 'Accepted' || ord.state === 'Shipped')) ||
                (!isBuyer && (ord.state === 'Created' || ord.state === 'Funded' || ord.state === 'Delivered'));

              const nextAction = getNextAction(ord.state);
              const isSimulated = ord.transactions?.[0]?.isSimulated;

              return (
                <div
                  key={ord.id}
                  className={`p-4 space-y-3 ${
                    isAction ? 'bg-amber-50/30' : 'bg-white'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-slate-900 text-sm">
                      #{ord.blockchainOrderId}
                    </span>
                    <OrderStatusBadge state={ord.state} size="sm" />
                  </div>

                  <div>
                    <h4 className="font-bold text-slate-900 text-xs">{ord.productName}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {ord.quantity} {ord.unit}s • ${ord.amountUsdc.toLocaleString()} USDC
                    </p>
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                    <div>
                      <span className="text-slate-400 block text-[10px]">
                        {isBuyer ? 'Supplier' : 'Buyer'}
                      </span>
                      <span className="font-medium text-slate-800">
                        {isBuyer ? ord.supplierName : ord.buyerName}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className="text-slate-400 block text-[10px]">Settlement</span>
                      <span className={isSimulated ? 'text-slate-500' : 'text-emerald-700 font-semibold'}>
                        {isSimulated ? 'Off-chain demo' : 'On-chain'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1">
                    <Link
                      href={`/orders/${ord.id}`}
                      className={`w-full justify-center flex items-center gap-1.5 py-2 rounded-xl text-xs transition-all ${nextAction.style}`}
                    >
                      <span>{nextAction.label}</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
