'use client';

import React from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Lock,
  Truck,
  CheckCircle,
  PackageCheck,
  CheckCheck,
} from 'lucide-react';
import { Order } from '@/lib/types';
import { shortenAddress } from '@/lib/solana';

interface ActionRequiredCardProps {
  activeRole: 'BUYER' | 'SUPPLIER';
  orders: Order[];
}

export const ActionRequiredCard: React.FC<ActionRequiredCardProps> = ({
  activeRole,
  orders,
}) => {
  const isBuyer = activeRole === 'BUYER';

  // Find the highest priority order requiring action for the active role
  let prioritizedOrder: Order | null = null;
  let actionTitle = '';
  let actionDescription = '';
  let buttonLabel = '';
  let badgeColor = '';
  let icon = <AlertCircle className="w-5 h-5 text-amber-600" />;

  if (isBuyer) {
    // 1. Shipped (Waiting for buyer delivery verification)
    const shippedOrder = orders.find((o) => o.state === 'Shipped');
    // 2. Accepted (Waiting for buyer escrow funding)
    const acceptedOrder = orders.find((o) => o.state === 'Accepted');
    // 3. Disputed
    const disputedOrder = orders.find((o) => o.state === 'Disputed');

    if (acceptedOrder) {
      prioritizedOrder = acceptedOrder;
      actionTitle = 'Escrow Funding Required';
      actionDescription = `Supplier has accepted Order #${prioritizedOrder.blockchainOrderId} (${prioritizedOrder.productName}). Deposit ${prioritizedOrder.amountUsdc} USDC into the Solana escrow vault to initiate shipment.`;
      buttonLabel = 'Fund Escrow';
      badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
      icon = <Lock className="w-5 h-5 text-amber-700" />;
    } else if (shippedOrder) {
      prioritizedOrder = shippedOrder;
      actionTitle = 'Delivery Verification Needed';
      actionDescription = `Order #${prioritizedOrder.blockchainOrderId} (${prioritizedOrder.productName}) has arrived at ${prioritizedOrder.shippingAddress}. Verify goods to authorize on-chain payment release.`;
      buttonLabel = 'Confirm Delivery';
      badgeColor = 'bg-teal-100 text-teal-800 border-teal-300';
      icon = <Truck className="w-5 h-5 text-teal-700" />;
    } else if (disputedOrder) {
      prioritizedOrder = disputedOrder;
      actionTitle = 'Active Dispute Under Review';
      actionDescription = `Order #${prioritizedOrder.blockchainOrderId} has an open dispute. Review protocol arbitration status.`;
      buttonLabel = 'Review Dispute';
      badgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
      icon = <AlertCircle className="w-5 h-5 text-rose-700" />;
    }
  } else {
    // Supplier priorities:
    // 1. Created (Waiting for supplier acceptance)
    const createdOrder = orders.find((o) => o.state === 'Created');
    // 2. Funded (Buyer deposited escrow; supplier must ship)
    const fundedOrder = orders.find((o) => o.state === 'Funded');
    // 3. Delivered (Ready for payout release)
    const deliveredOrder = orders.find((o) => o.state === 'Delivered');

    if (fundedOrder) {
      prioritizedOrder = fundedOrder;
      actionTitle = 'Escrow Funded — Ready for Dispatch';
      actionDescription = `Buyer has deposited ${prioritizedOrder.amountUsdc} USDC into on-chain escrow for Order #${prioritizedOrder.blockchainOrderId}. Dispatch shipment to ${prioritizedOrder.shippingAddress} and submit freight details.`;
      buttonLabel = 'Mark Shipped';
      badgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
      icon = <Truck className="w-5 h-5 text-emerald-700" />;
    } else if (createdOrder) {
      prioritizedOrder = createdOrder;
      actionTitle = 'New Wholesale Order Received';
      actionDescription = `Buyer ${prioritizedOrder.buyerName} placed Order #${prioritizedOrder.blockchainOrderId} for ${prioritizedOrder.quantity} ${prioritizedOrder.unit}s (${prioritizedOrder.productName}). Review inventory and accept order.`;
      buttonLabel = 'Accept Order';
      badgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
      icon = <AlertCircle className="w-5 h-5 text-amber-700" />;
    } else if (deliveredOrder) {
      prioritizedOrder = deliveredOrder;
      actionTitle = 'Goods Delivered — Release Payout';
      actionDescription = `Delivery confirmed by buyer for Order #${prioritizedOrder.blockchainOrderId}. Finalize settlement to release ${prioritizedOrder.amountUsdc} USDC from vault to your supplier wallet.`;
      buttonLabel = 'Release Payment';
      badgeColor = 'bg-teal-100 text-teal-800 border-teal-300';
      icon = <PackageCheck className="w-5 h-5 text-teal-700" />;
    }
  }

  // Calm State: No action required
  if (!prioritizedOrder) {
    return (
      <div className="bg-slate-50/70 border border-slate-200/80 rounded-2xl p-5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 text-slate-400 flex items-center justify-center shrink-0">
            <CheckCheck className="w-5 h-5 text-slate-500" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-800">All Caught Up</h4>
            <p className="text-[11px] text-slate-500 mt-0.5">
              No immediate on-chain actions required for your orders right now.
            </p>
          </div>
        </div>

        <Link
          href="/marketplace"
          className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0"
        >
          Explore Catalog <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border-2 border-amber-300/80 rounded-2xl p-5 sm:p-6 shadow-sm relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="flex items-start gap-4">
          <div className="w-11 h-11 rounded-xl bg-white shadow-xs border border-amber-200 flex items-center justify-center shrink-0 mt-0.5">
            {icon}
          </div>

          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[10px] font-bold text-amber-900 bg-amber-200/70 px-2 py-0.5 rounded tracking-wider uppercase">
                Action Required
              </span>
              <span className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border ${badgeColor}`}>
                Order #{prioritizedOrder.blockchainOrderId}
              </span>
              <span className="text-[10px] text-slate-500">
                {isBuyer
                  ? `Supplier: ${prioritizedOrder.supplierName}`
                  : `Buyer: ${prioritizedOrder.buyerName}`}
              </span>
            </div>

            <h3 className="text-base sm:text-lg font-black text-slate-900">
              {actionTitle}
            </h3>

            <p className="text-xs sm:text-sm text-slate-600 max-w-3xl leading-relaxed">
              {actionDescription}
            </p>
          </div>
        </div>

        <div className="shrink-0 self-start md:self-auto">
          <Link
            href={`/orders/${prioritizedOrder.id}`}
            className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all"
          >
            <span>{buttonLabel}</span>
            <ArrowRight className="w-4 h-4 text-emerald-400" />
          </Link>
        </div>
      </div>
    </div>
  );
};
