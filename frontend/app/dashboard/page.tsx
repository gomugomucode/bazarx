'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { useWalletBalance } from '@/lib/useWalletBalance';
import { Order, UserProfile, UserRole } from '@/lib/types';

import { DashboardShell } from '@/components/dashboard/DashboardShell';
import { DashboardHeader } from '@/components/dashboard/DashboardHeader';
import { DashboardStats } from '@/components/dashboard/DashboardStats';
import { ActionRequiredCard } from '@/components/dashboard/ActionRequiredCard';
import { OrdersSection } from '@/components/dashboard/OrdersSection';
import { OnboardingCard } from '@/components/dashboard/OnboardingCard';
import { AdminBanner } from '@/components/dashboard/AdminBanner';
import { WalletGuard } from '@/components/dashboard/WalletGuard';

function UnifiedDashboardContent() {
  const { publicKey, connected } = useWallet();
  const { sol, usdc } = useWalletBalance();
  const searchParams = useSearchParams();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileLoading, setProfileLoading] = useState(true);
  const [activeRole, setActiveRole] = useState<'BUYER' | 'SUPPLIER'>('BUYER');

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);

  // 1. Fetch user profile when connected wallet changes
  useEffect(() => {
    if (!connected || !publicKey) {
      setProfile(null);
      setProfileLoading(false);
      return;
    }

    let isMounted = true;
    async function resolveProfile() {
      setProfileLoading(true);
      try {
        const walletAddress = publicKey!.toBase58();
        const res = await fetch(`/api/users/profile?wallet=${encodeURIComponent(walletAddress)}`, {
          cache: 'no-store',
        });
        const data = await res.json();

        if (isMounted) {
          if (data.success && data.profile) {
            setProfile(data.profile);

            // Determine initial active role: strictly enforce that requested role exists in profile.roles
            const roleParam = searchParams.get('role')?.toUpperCase();
            if (
              roleParam &&
              (roleParam === 'BUYER' || roleParam === 'SUPPLIER') &&
              data.profile.roles.includes(roleParam as UserRole)
            ) {
              setActiveRole(roleParam as 'BUYER' | 'SUPPLIER');
            } else if (data.profile.roles.includes('BUYER')) {
              setActiveRole('BUYER');
            } else if (data.profile.roles.includes('SUPPLIER')) {
              setActiveRole('SUPPLIER');
            } else {
              setActiveRole('BUYER');
            }
          } else {
            setProfile(null);
          }
        }
      } catch (err) {
        console.error('Failed to resolve wallet profile:', err);
        if (isMounted) setProfile(null);
      } finally {
        if (isMounted) setProfileLoading(false);
      }
    }

    resolveProfile();

    return () => {
      isMounted = false;
    };
  }, [connected, publicKey, searchParams]);

  // 2. Fetch orders filtered by wallet & active role
  const fetchOrders = useCallback(async () => {
    if (!publicKey || !activeRole) return;
    setOrdersLoading(true);

    try {
      const walletAddress = publicKey.toBase58();
      const roleStr = activeRole.toLowerCase();
      const res = await fetch(
        `/api/orders?wallet=${encodeURIComponent(walletAddress)}&role=${encodeURIComponent(roleStr)}`,
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
  }, [publicKey, activeRole]);

  useEffect(() => {
    if (connected && publicKey && profile) {
      fetchOrders();
    }
  }, [connected, publicKey, profile, activeRole, fetchOrders]);

  // Handle new profile created via OnboardingCard
  const handleProfileCreated = (newProfile: UserProfile) => {
    setProfile(newProfile);
    if (newProfile.roles.includes('SUPPLIER') && !newProfile.roles.includes('BUYER')) {
      setActiveRole('SUPPLIER');
    } else {
      setActiveRole('BUYER');
    }
  };

  const handleRoleChange = (newRole: 'BUYER' | 'SUPPLIER') => {
    if (profile?.roles?.includes(newRole)) {
      setActiveRole(newRole);
    }
  };

  // State A: Disconnected Wallet
  if (!connected || !publicKey) {
    return (
      <DashboardShell>
        <WalletGuard />
      </DashboardShell>
    );
  }

  // State B: Profile Loading Skeleton
  if (profileLoading) {
    return (
      <DashboardShell>
        <div className="py-24 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">
            Resolving business profile for {publicKey.toBase58().slice(0, 4)}...
          </p>
        </div>
      </DashboardShell>
    );
  }

  // State C: Connected Unknown Wallet (Show Onboarding)
  if (!profile) {
    return (
      <DashboardShell>
        <OnboardingCard
          publicKey={publicKey}
          onProfileCreated={handleProfileCreated}
        />
      </DashboardShell>
    );
  }

  // State D: Connected Known Profile (Unified Dashboard View)
  const isAdmin = profile.roles.includes('ADMIN');

  return (
    <DashboardShell>
      {/* Admin Indicator if wallet has ADMIN role */}
      {isAdmin && <AdminBanner />}

      {/* Primary Role-Aware Header */}
      <DashboardHeader
        profile={profile}
        activeRole={activeRole}
        publicKey={publicKey}
        sol={sol}
        usdc={usdc}
        onRoleChange={handleRoleChange}
      />

      {/* Role-Specific Metric Summary Cards */}
      <DashboardStats
        activeRole={activeRole}
        orders={orders}
      />

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
