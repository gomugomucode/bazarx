'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletBalance } from '@/lib/useWalletBalance';
import { useAuth } from '@/lib/AuthContext';
import { Order, UserProfile, UserRole } from '@/lib/types';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ActionRequiredCard } from '@/components/dashboard/ActionRequiredCard';
import { OrdersSection } from '@/components/dashboard/OrdersSection';
import { AdminBanner } from '@/components/dashboard/AdminBanner';
import { Lock, ArrowRight, Boxes } from 'lucide-react';

function UnifiedDashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { publicKey, connected } = useWallet();
  const { sol, usdc } = useWalletBalance();

  const [activeRole, setActiveRole] = useState<'BUYER' | 'SUPPLIER'>('BUYER');
  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // 1. Enforce authentication redirect if logged out
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/dashboard');
    }
  }, [authLoading, user, router]);

  // 2. Resolve active role based on user.roles and query params
  useEffect(() => {
    if (!user) return;

    const roleParam = searchParams.get('role')?.toUpperCase();
    if (
      roleParam &&
      (roleParam === 'BUYER' || roleParam === 'SUPPLIER') &&
      user.roles.includes(roleParam as UserRole)
    ) {
      setActiveRole(roleParam as 'BUYER' | 'SUPPLIER');
    } else if (user.roles.includes('BUYER')) {
      setActiveRole('BUYER');
    } else if (user.roles.includes('SUPPLIER')) {
      setActiveRole('SUPPLIER');
    } else {
      setActiveRole('BUYER');
    }
  }, [user, searchParams]);

  // 3. Fetch orders for authenticated business account
  const fetchOrders = useCallback(async () => {
    if (!user || !activeRole) return;
    setOrdersLoading(true);

    try {
      const roleStr = activeRole.toLowerCase();
      const res = await fetch(
        `/api/orders?role=${encodeURIComponent(roleStr)}`,
        { cache: 'no-store' }
      );
      const data = await res.json();
      if (data.success && Array.isArray(data.orders)) {
        setOrders(data.orders);
      } else {
        setOrders([]);
      }
    } catch (err) {
      console.error('Failed to load orders for active role:', err);
      setOrders([]);
    } finally {
      setOrdersLoading(false);
    }
  }, [user, connected, publicKey, activeRole]);

  useEffect(() => {
    if (user) {
      fetchOrders();
    }
  }, [user, activeRole, fetchOrders]);

  const handleRoleChange = (newRole: 'BUYER' | 'SUPPLIER') => {
    if (user?.roles?.includes(newRole)) {
      setActiveRole(newRole);
    }
  };

  // State A: Loading session
  if (authLoading) {
    return (
      <DashboardShell>
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Verifying business account session...</p>
        </div>
      </DashboardShell>
    );
  }

  // State B: Unauthenticated visitor (Hard protect: do not render any dashboard data)
  if (!user) {
    return (
      <DashboardShell>
        <div className="py-24 text-center space-y-4 max-w-md mx-auto">
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto shadow-xs">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Sign In Required</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Please sign in with your business account to access the BazaarX wholesale dashboard and trade activity.
          </p>
          <div className="pt-2">
            <Link
              href="/login?redirect=/dashboard"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-md transition-all"
            >
              <span>Sign In to Continue</span>
              <ArrowRight className="w-4 h-4 text-emerald-400" />
            </Link>
          </div>
        </div>
      </DashboardShell>
    );
  }

  // State C: Authenticated User (Render role-tailored dashboard)
  const isAdmin = user.roles.includes('ADMIN');

  return (
    <DashboardShell>
      {/* Admin Indicator if user has ADMIN role */}
      {isAdmin && <AdminBanner />}

      {/* Primary Role-Aware Header */}
      <DashboardHeader
        profile={user}
        activeRole={activeRole}
        publicKey={connected && publicKey ? publicKey : null}
        sol={sol}
        usdc={usdc}
        onRoleChange={handleRoleChange}
      />

      {/* Role-Specific Metric Summary Cards */}
      <DashboardStats
        activeRole={activeRole}
        orders={orders}
      />

      {/* Supplier Products Quick Action Banner */}
      {activeRole === 'SUPPLIER' && (
        <div className="bg-white border border-slate-200 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                Wholesale Product Listings & Inventory
              </h4>
              <p className="text-[11px] text-slate-500">
                Manage your published commodities, add new products, and adjust warehouse stock.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/products"
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors shrink-0"
            id="supplier-dashboard-manage-products"
          >
            <span>Manage Products</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      )}

      {/* Highest Priority Action Required Card */}
      <ActionRequiredCard
        activeRole={activeRole}
        orders={orders}
      />

      {/* My Orders / My Sales Register */}
      <OrdersSection
        activeRole={activeRole}
        orders={orders}
        loading={ordersLoading}
      />
    </DashboardShell>
  );
}

export default function UnifiedDashboardPage() {
  return (
    <Suspense
      fallback={
        <DashboardShell>
          <div className="py-24 text-center space-y-3">
            <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-500 font-medium">Loading BazaarX Dashboard...</p>
          </div>
        </DashboardShell>
      }
    >
      <UnifiedDashboardContent />
    </Suspense>
  );
}
