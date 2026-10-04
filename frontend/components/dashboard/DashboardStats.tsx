'use client';

import React from 'react';
import {
  ShoppingBag,
  Clock,
  Lock,
  CheckCircle2,
  Truck,
  PackageCheck,
  TrendingUp,
  AlertTriangle,
} from 'lucide-react';
import { Order } from '@/lib/types';

interface DashboardStatsProps {
  activeRole: 'BUYER' | 'SUPPLIER';
  orders: Order[];
}

export const DashboardStats: React.FC<DashboardStatsProps> = ({
  activeRole,
  orders,
}) => {
  const isBuyer = activeRole === 'BUYER';

  if (isBuyer) {
    const activeOrders = orders.filter((o) => o.state !== 'Completed' && o.state !== 'Refunded');
    const awaitingAction = orders.filter((o) => o.state === 'Accepted' || o.state === 'Shipped');
    const inEscrowUsdc = orders
      .filter((o) => ['Accepted', 'Funded', 'Shipped', 'Delivered'].includes(o.state))
      .reduce((sum, o) => sum + o.amountUsdc, 0);
    const completedTrades = orders.filter((o) => o.state === 'Completed').length;

    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Active Orders */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Active Orders</span>
            <div className="p-2 rounded-xl bg-slate-100 text-slate-700">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{activeOrders.length}</div>
          <span className="text-[11px] text-slate-400 block">Across active procurement corridors</span>
        </div>

        {/* Awaiting Action */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Awaiting Action</span>
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-600">{awaitingAction.length}</div>
          <span className="text-[11px] text-amber-700 font-medium block">
            Needs escrow funding or delivery check
          </span>
        </div>

        {/* In Escrow */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">In Escrow</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-700">${inEscrowUsdc.toLocaleString()} USDC</div>
          <span className="text-[11px] text-slate-400 block">Secured in Anchor escrow vault</span>
        </div>

        {/* Completed Trades */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Completed Trades</span>
            <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{completedTrades}</div>
          <span className="text-[11px] text-slate-400 block">100% on-chain settled</span>
        </div>
      </div>
    );
  }

  // Supplier View
  const incomingOrders = orders.filter((o) => o.state === 'Created').length;
  const awaitingShipment = orders.filter((o) => o.state === 'Funded').length;
  const inTransit = orders.filter((o) => o.state === 'Shipped').length;
  const completedOrders = orders.filter((o) => o.state === 'Completed');
  const settledRevenue = completedOrders.reduce((sum, o) => sum + o.amountUsdc, 0);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Incoming Orders */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Incoming Orders</span>
          <div className="p-2 rounded-xl bg-amber-50 text-amber-600 border border-amber-200">
            <Clock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900">{incomingOrders}</div>
        <span className="text-[11px] text-slate-400 block">Awaiting supplier confirmation</span>
      </div>

      {/* Awaiting Shipment */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Awaiting Shipment</span>
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Lock className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-emerald-600">{awaitingShipment}</div>
        <span className="text-[11px] text-emerald-800 font-medium block">
          Escrow funded & ready for freight
        </span>
      </div>

      {/* In Transit */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">In Transit</span>
          <div className="p-2 rounded-xl bg-sky-50 text-sky-700 border border-sky-200">
            <Truck className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900">{inTransit}</div>
        <span className="text-[11px] text-slate-400 block">Dispatched with freight logistics</span>
      </div>

      {/* Completed Trades & Revenue */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-500">Completed Trades</span>
          <div className="p-2 rounded-xl bg-teal-50 text-teal-700 border border-teal-200">
            <CheckCircle2 className="w-4 h-4" />
          </div>
        </div>
        <div className="text-2xl font-black text-slate-900">
          ${settledRevenue.toLocaleString()} USDC
        </div>
        <span className="text-[11px] text-slate-400 block">
          {completedOrders.length} wholesale orders settled
        </span>
      </div>
    </div>
  );
};
