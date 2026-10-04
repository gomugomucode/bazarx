import React from 'react';
import { OrderState } from '@/lib/types';
import {
  Clock,
  CheckCircle2,
  Lock,
  Truck,
  PackageCheck,
  CheckCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';

interface Props {
  state: OrderState;
  size?: 'sm' | 'md' | 'lg';
}

export const OrderStatusBadge: React.FC<Props> = ({ state, size = 'md' }) => {
  const configs: Record<
    OrderState,
    { label: string; bg: string; text: string; border: string; icon: React.ComponentType<{ className?: string }> }
  > = {
    Created: {
      label: 'Order Created',
      bg: 'bg-amber-50',
      text: 'text-amber-800',
      border: 'border-amber-200',
      icon: Clock,
    },
    Accepted: {
      label: 'Supplier Accepted',
      bg: 'bg-blue-50',
      text: 'text-blue-800',
      border: 'border-blue-200',
      icon: CheckCircle2,
    },
    Funded: {
      label: 'Escrow Funded',
      bg: 'bg-emerald-50',
      text: 'text-emerald-800',
      border: 'border-emerald-200',
      icon: Lock,
    },
    Shipped: {
      label: 'Dispatched / In Transit',
      bg: 'bg-indigo-50',
      text: 'text-indigo-800',
      border: 'border-indigo-200',
      icon: Truck,
    },
    Delivered: {
      label: 'Delivery Confirmed',
      bg: 'bg-teal-50',
      text: 'text-teal-800',
      border: 'border-teal-200',
      icon: PackageCheck,
    },
    Completed: {
      label: 'Settled & Paid',
      bg: 'bg-green-50',
      text: 'text-green-800',
      border: 'border-green-300',
      icon: CheckCheck,
    },
    Disputed: {
      label: 'Dispute Raised',
      bg: 'bg-rose-50',
      text: 'text-rose-800',
      border: 'border-rose-200',
      icon: AlertTriangle,
    },
    Refunded: {
      label: 'Refunded to Buyer',
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-300',
      icon: RotateCcw,
    },
  };

  const config = configs[state] || configs.Created;
  const Icon = config.icon;

  const sizeClasses = {
    sm: 'text-xs px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5 font-medium',
    lg: 'text-sm px-3.5 py-1.5 gap-2 font-semibold',
  };

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-sm ${config.bg} ${config.text} ${config.border} ${sizeClasses[size]}`}
    >
      <Icon className={iconSizes[size]} />
      {config.label}
    </span>
  );
};
