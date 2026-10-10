'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Order, OrderState, UserProfile, VerificationStatus } from '@/lib/types';
import {
  deriveConfigPda,
  DEVNET_USDC_MINT,
  PROGRAM_ID_STRING,
  shortenAddress,
  getExplorerAccountUrl,
  getExplorerTxUrl,
} from '@/lib/solana';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import {
  ShieldCheck,
  Cpu,
  ExternalLink,
  Lock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  DollarSign,
  ArrowUpDown,
  ShoppingBag,
  Building,
  RefreshCw,
  Clock,
  Coins,
  AlertTriangle,
  ArrowRight,
  Eye,
  Users,
  UserCheck,
  UserX,
  Check,
  X,
  FileText,
  BadgeCheck,
  Phone,
  Mail,
  Loader2,
  Sparkles,
} from 'lucide-react';

export default function AdminProtocolPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [configPda, configBump] = deriveConfigPda();

  const [orders, setOrders] = useState<Order[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [stateFilter, setStateFilter] = useState<string>('All');
  const [selectedProduct, setSelectedProduct] = useState<string>('All');
  const [activeTab, setActiveTab] = useState<'transactions' | 'compliance' | 'governance'>('transactions');

  // Compliance & KYC State
  const [usersList, setUsersList] = useState<
    (UserProfile & { citizenshipNumber?: string; panNumber?: string })[]
  >([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('All');
  const [userRoleFilter, setUserRoleFilter] = useState<string>('All');
  const [processingUserId, setProcessingUserId] = useState<string | null>(null);
  const [actionNotice, setActionNotice] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  useEffect(() => {
    async function fetchAllOrders() {
      if (!user || !user.roles?.includes('ADMIN')) return;
      setOrdersLoading(true);
      try {
        const res = await fetch('/api/orders', { cache: 'no-store' });
        const data = await res.json();
        if (data.success && Array.isArray(data.orders)) {
          setOrders(data.orders);
        }
      } catch (err) {
        console.error('Failed to load marketplace orders for admin:', err);
      } finally {
        setOrdersLoading(false);
      }
    }

    if (user) {
      fetchAllOrders();
    }
  }, [user]);

  // Financial metrics calculations - strictly distinguished
  const metrics = useMemo(() => {
    const totalOrders = orders.length;
    const totalValueUsdc = orders.reduce((sum, o) => sum + o.amountUsdc, 0);

    // Funds currently locked in escrow program vault
    const inEscrowOrders = orders.filter((o) =>
      ['Funded', 'Shipped', 'Delivered'].includes(o.state)
    );
    const inEscrowValueUsdc = inEscrowOrders.reduce((sum, o) => sum + o.amountUsdc, 0);

    // Completed settlements paid to suppliers
    const completedOrders = orders.filter((o) => o.state === 'Completed');
    const completedValueUsdc = completedOrders.reduce((sum, o) => sum + o.amountUsdc, 0);

    // Disputed or refunded orders
    const disputedOrders = orders.filter((o) => o.state === 'Disputed' || o.state === 'Refunded');
    const disputedValueUsdc = disputedOrders.reduce((sum, o) => sum + o.amountUsdc, 0);

    // Breakdown by state
    const stateCounts: Record<OrderState, number> = {
      Created: orders.filter((o) => o.state === 'Created').length,
      Accepted: orders.filter((o) => o.state === 'Accepted').length,
      Funded: orders.filter((o) => o.state === 'Funded').length,
      Shipped: orders.filter((o) => o.state === 'Shipped').length,
      Delivered: orders.filter((o) => o.state === 'Delivered').length,
      Completed: orders.filter((o) => o.state === 'Completed').length,
      Disputed: orders.filter((o) => o.state === 'Disputed').length,
      Refunded: orders.filter((o) => o.state === 'Refunded').length,
    };

    return {
      totalOrders,
      totalValueUsdc,
      inEscrowOrdersCount: inEscrowOrders.length,
      inEscrowValueUsdc,
      completedOrdersCount: completedOrders.length,
      completedValueUsdc,
      disputedOrdersCount: disputedOrders.length,
      disputedValueUsdc,
      stateCounts,
    };
  }, [orders]);

  // Unique products for filter dropdown
  const uniqueProducts = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      if (o.productId && o.productName) map.set(o.productId, o.productName);
    });
    return Array.from(map.entries());
  }, [orders]);

  // Filtered orders list
  const filteredOrders = useMemo(() => {
    return orders.filter((ord) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        ord.id.toLowerCase().includes(q) ||
        String(ord.blockchainOrderId).includes(q) ||
        ord.productName.toLowerCase().includes(q) ||
        ord.buyerName.toLowerCase().includes(q) ||
        ord.supplierName.toLowerCase().includes(q) ||
        ord.buyerWallet.toLowerCase().includes(q) ||
        ord.supplierWallet.toLowerCase().includes(q);

      const matchesState = stateFilter === 'All' || ord.state === stateFilter;
      const matchesProduct = selectedProduct === 'All' || ord.productId === selectedProduct;

      return matchesSearch && matchesState && matchesProduct;
    });
  }, [orders, searchQuery, stateFilter, selectedProduct]);

  // Fetch registered users for compliance verification
  const fetchUsers = async () => {
    if (!user || !user.roles?.includes('ADMIN')) return;
    setUsersLoading(true);
    try {
      const res = await fetch('/api/users', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.users)) {
        setUsersList(data.users);
      }
    } catch (err) {
      console.error('Failed to load user directory for admin:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  useEffect(() => {
    if (user && user.roles?.includes('ADMIN')) {
      fetchUsers();
    }
  }, [user]);

  // Compliance Metrics
  const complianceMetrics = useMemo(() => {
    const totalUsers = usersList.length;
    const pendingUsers = usersList.filter((u) => u.verificationStatus === 'PENDING');
    const verifiedUsers = usersList.filter((u) => u.verificationStatus === 'VERIFIED');
    const rejectedUsers = usersList.filter((u) => u.verificationStatus === 'REJECTED');
    const supplierCount = usersList.filter((u) => u.roles?.includes('SUPPLIER') || u.role === 'SUPPLIER').length;
    const buyerCount = usersList.filter((u) => u.roles?.includes('BUYER') || u.role === 'BUYER').length;

    return {
      totalUsers,
      pendingCount: pendingUsers.length,
      verifiedCount: verifiedUsers.length,
      rejectedCount: rejectedUsers.length,
      supplierCount,
      buyerCount,
    };
  }, [usersList]);

  // Filtered users list for compliance review
  const filteredUsers = useMemo(() => {
    return usersList.filter((u) => {
      if (userStatusFilter !== 'All' && u.verificationStatus !== userStatusFilter) {
        return false;
      }
      if (userRoleFilter !== 'All') {
        const hasRole = u.roles?.includes(userRoleFilter as any) || u.role === userRoleFilter;
        if (!hasRole) return false;
      }
      if (userSearchQuery.trim()) {
        const q = userSearchQuery.trim().toLowerCase();
        const matchesName = u.fullName?.toLowerCase().includes(q);
        const matchesBusiness = u.businessName?.toLowerCase().includes(q);
        const matchesEmail = u.email?.toLowerCase().includes(q);
        const matchesPhone = u.phone?.toLowerCase().includes(q);
        const matchesPan = u.panNumber?.toLowerCase().includes(q);
        const matchesCitizenship = u.citizenshipNumber?.toLowerCase().includes(q);
        const matchesWallet = u.wallet?.toLowerCase().includes(q);
        return Boolean(
          matchesName ||
          matchesBusiness ||
          matchesEmail ||
          matchesPhone ||
          matchesPan ||
          matchesCitizenship ||
          matchesWallet
        );
      }
      return true;
    });
  }, [usersList, userStatusFilter, userRoleFilter, userSearchQuery]);

  // Handle Approve / Reject / Reset Verification
  const handleSetVerificationStatus = async (
    targetUserId: string,
    nextStatus: 'VERIFIED' | 'REJECTED' | 'PENDING',
    customNotes?: string
  ) => {
    setProcessingUserId(targetUserId);
    setActionNotice(null);
    try {
      const defaultNotes =
        nextStatus === 'VERIFIED'
          ? 'Approved & Verified: Business PAN and citizenship compliance confirmed by BazaarX Compliance Officer.'
          : nextStatus === 'REJECTED'
          ? 'Rejected: Business compliance documents failed verification review.'
          : 'Compliance review pending administrative inspection.';

      const res = await fetch(`/api/users/${targetUserId}/verification`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: nextStatus,
          notes: customNotes || defaultNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to update verification status');
      }

      setUsersList((prev) =>
        prev.map((u) =>
          u.id === targetUserId
            ? {
                ...u,
                verificationStatus: nextStatus,
                verificationNotes: customNotes || defaultNotes,
              }
            : u
        )
      );

      setActionNotice({
        type: 'success',
        message: `Business account #${targetUserId} successfully updated to ${nextStatus}.`,
      });
      setTimeout(() => setActionNotice(null), 5000);
    } catch (err: any) {
      setActionNotice({
        type: 'error',
        message: err.message || 'Verification update failed',
      });
      setTimeout(() => setActionNotice(null), 6000);
    } finally {
      setProcessingUserId(null);
    }
  };

  if (authLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-24 text-center space-y-3">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-emerald-600 border-t-transparent mx-auto" />
        <p className="text-slate-500 text-xs font-medium">Verifying administrator credentials...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center mx-auto">
          <Lock className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Authentication Required</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          You must be logged in with an authorized internal Administrator account to view protocol governance.
        </p>
        <Link
          href="/login?redirect=/admin"
          className="inline-block px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
        >
          Sign In as Administrator
        </Link>
      </div>
    );
  }

  if (!user.roles?.includes('ADMIN')) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">403: Administrator Access Denied</h2>
        <p className="text-xs text-slate-500 leading-relaxed">
          Your authenticated account (<span className="font-semibold text-slate-700">{user.email}</span>) does not possess the internally assigned <code className="bg-slate-100 px-1 py-0.5 rounded text-rose-600 font-mono">ADMIN</code> role.
        </p>
        <div className="pt-2">
          <Link
            href="/dashboard"
            className="inline-block px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  const rules = [
    {
      rule: 'Created ➔ Accepted',
      auth: 'Designated Supplier Only (has_one = supplier)',
      enforcement: 'Anchor Account Constraint + State Guard',
      active: true,
    },
    {
      rule: 'Accepted ➔ Funded',
      auth: 'Buyer Only (seeds = [order, buyer, order_id])',
      enforcement: 'SPL Token Transfer to Program Vault PDA',
      active: true,
    },
    {
      rule: 'Funded ➔ Shipped',
      auth: 'Designated Supplier Only',
      enforcement: 'State Check (order.state == Funded)',
      active: true,
    },
    {
      rule: 'Shipped ➔ Delivered',
      auth: 'Buyer Only',
      enforcement: 'Cryptographic Delivery Receipt Signature',
      active: true,
    },
    {
      rule: 'Delivered ➔ Completed',
      auth: 'Smart Contract / Authorized Counterparty',
      enforcement: 'Automated CPI Release of USDC from Vault to Supplier',
      active: true,
    },
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Administrative Governance Portal
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-1">
              Marketplace Trade Surveillance &amp; Settlement Oversight
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Comprehensive audit visibility across all marketplace buyers, suppliers, escrow vaults, and Devnet transaction states.
            </p>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <span className="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
              Admin: {user.email}
            </span>
          </div>
        </div>

        {/* Legal & Custodial Scope Notice */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-600 text-[11px] leading-relaxed flex items-start gap-2">
          <Lock className="w-3.5 h-3.5 text-slate-500 shrink-0 mt-0.5" />
          <span>
            <strong>Custody &amp; Authority Notice:</strong> Administrator role grants audit visibility and state reconciliation capabilities only. Administrative authority does not hold custody and cannot redirect or withdraw buyer or supplier escrow funds.
          </span>
        </div>

        {/* View Switcher Tabs */}
        <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-2">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Marketplace Transactions ({orders.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'compliance'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
            <span>Compliance &amp; KYC Reviews</span>
            {complianceMetrics.pendingCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 bg-amber-500 text-white text-[10px] font-bold rounded-full animate-pulse">
                {complianceMetrics.pendingCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('governance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              activeTab === 'governance'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Protocol Parameters &amp; Invariants</span>
          </button>
        </div>
      </div>

      {activeTab === 'transactions' ? (
        <div className="space-y-6">
          {/* Key Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Order Volume */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 block">Total Order Volume</span>
              <div className="text-2xl font-black text-slate-900">
                ${metrics.totalValueUsdc.toLocaleString()} USDC
              </div>
              <span className="text-[11px] text-slate-400 block">
                {metrics.totalOrders} total marketplace orders
              </span>
            </div>

            {/* Funds in Escrow Vaults */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 block">Locked in Escrow Vaults</span>
              <div className="text-2xl font-black text-emerald-700">
                ${metrics.inEscrowValueUsdc.toLocaleString()} USDC
              </div>
              <span className="text-[11px] text-emerald-700 font-medium block">
                {metrics.inEscrowOrdersCount} orders currently held in PDA vaults
              </span>
            </div>

            {/* Completed Settlements */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 block">Settled to Suppliers</span>
              <div className="text-2xl font-black text-slate-900">
                ${metrics.completedValueUsdc.toLocaleString()} USDC
              </div>
              <span className="text-[11px] text-slate-400 block">
                {metrics.completedOrdersCount} orders fully released on-chain
              </span>
            </div>

            {/* Disputed / Refunded */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-1.5">
              <span className="text-xs font-semibold text-slate-500 block">Disputed / Refunded</span>
              <div className="text-2xl font-black text-slate-700">
                ${metrics.disputedValueUsdc.toLocaleString()} USDC
              </div>
              <span className="text-[11px] text-slate-400 block">
                {metrics.disputedOrdersCount} non-standard trade resolutions
              </span>
            </div>
          </div>

          {/* Lifecycle State Counts Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-2 text-xs">
            <span className="text-slate-400 font-semibold mr-1">Lifecycle Breakdown:</span>
            {Object.entries(metrics.stateCounts).map(([state, count]) => (
              <button
                key={state}
                onClick={() => setStateFilter(stateFilter === state ? 'All' : state)}
                className={`px-2.5 py-1 rounded-lg font-mono text-[11px] transition-all border ${
                  stateFilter === state
                    ? 'bg-slate-900 text-white border-slate-900'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{state}:</span> <strong className="ml-0.5">{count}</strong>
              </button>
            ))}
          </div>

          {/* Transaction Table & Filter Controls */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <h2 className="font-bold text-sm text-slate-900">
                  All Marketplace Goods Transactions ({filteredOrders.length})
                </h2>
                <span className="text-[11px] text-slate-400">
                  Global ledger view • Unrestricted cross-party visibility
                </span>
              </div>

              {/* Filters Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by order #, buyer, supplier..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {/* State Filter */}
                <div>
                  <select
                    value={stateFilter}
                    onChange={(e) => setStateFilter(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="All">All Lifecycle States</option>
                    <option value="Created">Created</option>
                    <option value="Accepted">Accepted</option>
                    <option value="Funded">Funded</option>
                    <option value="Shipped">Shipped</option>
                    <option value="Delivered">Delivered</option>
                    <option value="Completed">Completed</option>
                    <option value="Disputed">Disputed</option>
                    <option value="Refunded">Refunded</option>
                  </select>
                </div>

                {/* Product Filter */}
                <div>
                  <select
                    value={selectedProduct}
                    onChange={(e) => setSelectedProduct(e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  >
                    <option value="All">All Wholesale Commodities</option>
                    {uniqueProducts.map(([pid, pname]) => (
                      <option key={pid} value={pid}>
                        {pname}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {ordersLoading ? (
              <div className="p-12 text-center text-slate-400 text-xs space-y-2">
                <div className="w-6 h-6 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
                <p>Loading global transaction register...</p>
              </div>
            ) : filteredOrders.length === 0 ? (
              <div className="p-12 text-center text-slate-500 text-xs space-y-2">
                <p className="font-semibold text-slate-700">No transactions match these filters</p>
                <button
                  onClick={() => {
                    setSearchQuery('');
                    setStateFilter('All');
                    setSelectedProduct('All');
                  }}
                  className="text-emerald-700 font-bold hover:underline"
                >
                  Clear search filters
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                    <tr>
                      <th className="px-5 py-3">Order ID</th>
                      <th className="px-5 py-3">Commodity &amp; Lot</th>
                      <th className="px-5 py-3">Buyer (Ordering Party)</th>
                      <th className="px-5 py-3">Supplier (Fulfilling Party)</th>
                      <th className="px-5 py-3">Amount (USDC)</th>
                      <th className="px-5 py-3">Lifecycle State</th>
                      <th className="px-5 py-3">On-Chain Verification</th>
                      <th className="px-5 py-3 text-right">Inspect</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredOrders.map((ord) => {
                      const latestTx = ord.transactions?.[ord.transactions.length - 1];
                      const hasRealSig = Boolean(
                        latestTx?.signature &&
                        !latestTx.signature.startsWith('simulated') &&
                        !latestTx.signature.startsWith('sim_')
                      );

                      return (
                        <tr key={ord.id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-5 py-3.5 font-mono font-bold text-slate-900">
                            #{ord.blockchainOrderId}
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-semibold text-slate-900 block line-clamp-1">
                              {ord.productName}
                            </span>
                            <span className="text-[11px] text-slate-400">
                              {ord.quantity} {ord.unit}s
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-medium text-slate-800 block line-clamp-1">
                              {ord.buyerName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {shortenAddress(ord.buyerWallet, 4)}
                            </span>
                          </td>

                          <td className="px-5 py-3.5">
                            <span className="font-medium text-slate-800 block line-clamp-1">
                              {ord.supplierName}
                            </span>
                            <span className="font-mono text-[10px] text-slate-400">
                              {shortenAddress(ord.supplierWallet, 4)}
                            </span>
                          </td>

                          <td className="px-5 py-3.5 font-bold text-slate-900">
                            ${ord.amountUsdc.toLocaleString()} USDC
                          </td>

                          <td className="px-5 py-3.5">
                            <OrderStatusBadge state={ord.state} size="sm" />
                          </td>

                          <td className="px-5 py-3.5">
                            {hasRealSig ? (
                              <a
                                href={getExplorerTxUrl(latestTx!.signature!)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold inline-flex items-center gap-1"
                              >
                                {shortenAddress(latestTx!.signature!, 4)}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                                Off-Chain Record
                              </span>
                            )}
                          </td>

                          <td className="px-5 py-3.5 text-right">
                            <Link
                              href={`/orders/${ord.id}`}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors"
                            >
                              <Eye className="w-3 h-3 text-slate-500" />
                              <span>Audit</span>
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
      ) : activeTab === 'compliance' ? (
        /* Compliance & KYC Reviews View */
        <div className="space-y-6">
          {/* Action Notice Alert */}
          {actionNotice && (
            <div
              className={`p-4 rounded-2xl border text-xs flex items-center justify-between gap-3 transition-all ${
                actionNotice.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-rose-50 border-rose-200 text-rose-900'
              }`}
            >
              <div className="flex items-center gap-2">
                {actionNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                )}
                <span className="font-semibold">{actionNotice.message}</span>
              </div>
              <button
                onClick={() => setActionNotice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-2 py-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Compliance Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Pending Approvals */}
            <div
              onClick={() => setUserStatusFilter('PENDING')}
              className={`bg-white p-5 rounded-2xl border cursor-pointer transition-all ${
                userStatusFilter === 'PENDING'
                  ? 'border-amber-500 ring-2 ring-amber-500/20 bg-amber-50/20'
                  : 'border-slate-200 hover:border-amber-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-amber-700">Pending Reviews</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="text-2xl font-black text-amber-900">
                {complianceMetrics.pendingCount}
              </div>
              <span className="text-[11px] text-amber-700/80 mt-1 block">
                Awaiting PAN &amp; Citizenship approval
              </span>
            </div>

            {/* Verified Businesses */}
            <div
              onClick={() => setUserStatusFilter('VERIFIED')}
              className={`bg-white p-5 rounded-2xl border cursor-pointer transition-all ${
                userStatusFilter === 'VERIFIED'
                  ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-emerald-50/20'
                  : 'border-slate-200 hover:border-emerald-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-emerald-700">Verified Businesses</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="text-2xl font-black text-emerald-900">
                {complianceMetrics.verifiedCount}
              </div>
              <span className="text-[11px] text-emerald-700/80 mt-1 block">
                Authorized for wholesale trades &amp; publishing
              </span>
            </div>

            {/* Rejected Applications */}
            <div
              onClick={() => setUserStatusFilter('REJECTED')}
              className={`bg-white p-5 rounded-2xl border cursor-pointer transition-all ${
                userStatusFilter === 'REJECTED'
                  ? 'border-rose-500 ring-2 ring-rose-500/20 bg-rose-50/20'
                  : 'border-slate-200 hover:border-rose-300 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-rose-700">Rejected Applications</span>
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="text-2xl font-black text-rose-900">
                {complianceMetrics.rejectedCount}
              </div>
              <span className="text-[11px] text-rose-700/80 mt-1 block">
                Non-compliant or flagged credentials
              </span>
            </div>

            {/* Total Accounts */}
            <div
              onClick={() => {
                setUserStatusFilter('All');
                setUserRoleFilter('All');
              }}
              className={`bg-white p-5 rounded-2xl border cursor-pointer transition-all ${
                userStatusFilter === 'All' && userRoleFilter === 'All'
                  ? 'border-slate-900 ring-2 ring-slate-900/10'
                  : 'border-slate-200 hover:border-slate-400 shadow-2xs'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold text-slate-500">Total Directory</span>
                <Users className="w-4 h-4 text-slate-600" />
              </div>
              <div className="text-2xl font-black text-slate-900">
                {complianceMetrics.totalUsers}
              </div>
              <span className="text-[11px] text-slate-400 mt-1 block">
                {complianceMetrics.supplierCount} Suppliers • {complianceMetrics.buyerCount} Buyers
              </span>
            </div>
          </div>

          {/* Compliance Management Table & Filters */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="p-5 border-b border-slate-100 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h2 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                    <span>KYC &amp; Business Compliance Verification Directory</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 font-normal text-slate-600">
                      {filteredUsers.length} users
                    </span>
                  </h2>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Inspect government PAN numbers, citizenship credentials, and grant verified supplier publishing authority.
                  </p>
                </div>

                <button
                  onClick={fetchUsers}
                  disabled={usersLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors self-start sm:self-auto disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${usersLoading ? 'animate-spin' : ''}`} />
                  <span>Refresh Directory</span>
                </button>
              </div>

              {/* Filters Toolbar */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
                {/* Search */}
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search by business, PAN, citizenship, email..."
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                  />
                </div>

                {/* Status Filter */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  {(['All', 'PENDING', 'VERIFIED', 'REJECTED'] as const).map((st) => (
                    <button
                      key={st}
                      onClick={() => setUserStatusFilter(st)}
                      className={`flex-1 py-1 px-1.5 rounded-lg text-[11px] font-semibold transition-all ${
                        userStatusFilter === st
                          ? st === 'PENDING'
                            ? 'bg-amber-500 text-white shadow-2xs'
                            : st === 'VERIFIED'
                            ? 'bg-emerald-600 text-white shadow-2xs'
                            : st === 'REJECTED'
                            ? 'bg-rose-600 text-white shadow-2xs'
                            : 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {st === 'All' ? 'All Status' : st}
                    </button>
                  ))}
                </div>

                {/* Role Filter */}
                <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-xl border border-slate-200">
                  {(['All', 'SUPPLIER', 'BUYER'] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setUserRoleFilter(r)}
                      className={`flex-1 py-1 px-2 rounded-lg text-[11px] font-semibold transition-all ${
                        userRoleFilter === r
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {r === 'All' ? 'All Roles' : `${r}s`}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Users Directory Table */}
            {usersLoading ? (
              <div className="p-12 text-center space-y-2">
                <Loader2 className="w-6 h-6 animate-spin text-emerald-600 mx-auto" />
                <p className="text-xs text-slate-500">Loading user compliance registry...</p>
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto" />
                <p className="text-xs font-semibold text-slate-700">No users match filter criteria</p>
                <p className="text-[11px] text-slate-400">
                  Try adjusting search keywords or clearing status filters.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase tracking-wider text-[10px] font-semibold">
                    <tr>
                      <th className="px-5 py-3">Business &amp; Contact</th>
                      <th className="px-5 py-3">Role</th>
                      <th className="px-5 py-3">Government KYC Credentials</th>
                      <th className="px-5 py-3">Settlement Wallet</th>
                      <th className="px-5 py-3">Compliance Status</th>
                      <th className="px-5 py-3 text-right">Verification Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredUsers.map((u) => {
                      const isPending = u.verificationStatus === 'PENDING';
                      const isVerified = u.verificationStatus === 'VERIFIED';
                      const isRejected = u.verificationStatus === 'REJECTED';
                      const isCurrentProcessing = processingUserId === u.id;
                      const isUserAdmin = u.roles?.includes('ADMIN') || u.role === 'ADMIN';

                      return (
                        <tr
                          key={u.id}
                          className={`hover:bg-slate-50/80 transition-colors ${
                            isPending ? 'bg-amber-50/30' : ''
                          }`}
                        >
                          {/* Business & Contact */}
                          <td className="px-5 py-3.5">
                            <div className="space-y-0.5">
                              <span className="font-bold text-slate-900 block text-xs">
                                {u.businessName || 'Business Name Unspecified'}
                              </span>
                              <span className="text-[11px] text-slate-600 font-medium block">
                                Owner: {u.fullName}
                              </span>
                              <div className="flex flex-wrap items-center gap-2 pt-0.5 text-[11px] text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                  <Mail className="w-3 h-3 text-slate-400" />
                                  <span>{u.email}</span>
                                </span>
                                {u.phone && (
                                  <span className="inline-flex items-center gap-1">
                                    <Phone className="w-3 h-3 text-slate-400" />
                                    <span>{u.phone}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </td>

                          {/* Role */}
                          <td className="px-5 py-3.5">
                            {isUserAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                                ADMIN
                              </span>
                            ) : u.roles?.includes('SUPPLIER') || u.role === 'SUPPLIER' ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                                SUPPLIER
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-mono text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                BUYER
                              </span>
                            )}
                          </td>

                          {/* Government KYC Credentials */}
                          <td className="px-5 py-3.5">
                            <div className="space-y-1 font-mono text-[11px]">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                                  PAN:
                                </span>
                                <span className="font-bold text-slate-800 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  {u.panNumber || u.maskedPan || 'None'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-sans font-semibold">
                                  Citizenship:
                                </span>
                                <span className="font-semibold text-slate-700 bg-slate-50 px-1.5 py-0.5 rounded border border-slate-200">
                                  {u.citizenshipNumber || u.maskedCitizenship || 'None'}
                                </span>
                              </div>
                            </div>
                          </td>

                          {/* Settlement Wallet */}
                          <td className="px-5 py-3.5">
                            {u.wallet ? (
                              <a
                                href={getExplorerAccountUrl(u.wallet)}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="font-mono text-[11px] text-emerald-800 hover:text-emerald-950 font-semibold inline-flex items-center gap-1"
                              >
                                {shortenAddress(u.wallet, 4)}
                                <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : (
                              <span className="text-slate-400 text-[11px] italic">
                                Wallet not linked
                              </span>
                            )}
                          </td>

                          {/* Compliance Status */}
                          <td className="px-5 py-3.5">
                            <div className="space-y-1">
                              {isVerified ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Verified &amp; Approved</span>
                                </span>
                              ) : isRejected ? (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-800 border border-rose-200">
                                  <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                                  <span>Compliance Rejected</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-800 border border-amber-300 animate-pulse">
                                  <Clock className="w-3.5 h-3.5 text-amber-600" />
                                  <span>Review Pending</span>
                                </span>
                              )}

                              {u.verificationNotes && (
                                <p className="text-[10px] text-slate-500 italic max-w-xs line-clamp-2">
                                  &ldquo;{u.verificationNotes}&rdquo;
                                </p>
                              )}
                            </div>
                          </td>

                          {/* Actions */}
                          <td className="px-5 py-3.5 text-right">
                            {isUserAdmin ? (
                              <span className="text-[10px] text-slate-400 font-mono">
                                System Administrator
                              </span>
                            ) : isCurrentProcessing ? (
                              <div className="inline-flex items-center gap-1 text-xs text-slate-500 font-semibold">
                                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                <span>Updating...</span>
                              </div>
                            ) : isPending ? (
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleSetVerificationStatus(u.id, 'VERIFIED')}
                                  className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-2xs transition-colors"
                                  title="Approve PAN and citizenship credentials"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve &amp; Verify</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleSetVerificationStatus(u.id, 'REJECTED')}
                                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-rose-200 hover:bg-rose-50 text-rose-700 font-semibold text-xs transition-colors"
                                  title="Reject compliance review"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </div>
                            ) : isVerified ? (
                              <div className="flex items-center justify-end gap-2">
                                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                                  <BadgeCheck className="w-3.5 h-3.5 text-emerald-600" />
                                  <span>Active</span>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleSetVerificationStatus(u.id, 'PENDING', 'Re-evaluation requested by admin compliance officer.')}
                                  className="text-[11px] text-slate-400 hover:text-slate-600 underline font-medium"
                                  title="Reset account to pending review"
                                >
                                  Re-audit
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSetVerificationStatus(u.id, 'VERIFIED')}
                                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-2xs transition-colors"
                              >
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Re-approve</span>
                              </button>
                            )}
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
      ) : (
        /* Governance & Invariant Specifications */
        <div className="space-y-6">
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-2xs space-y-6">
            <h3 className="text-sm font-bold text-slate-900 border-b border-slate-100 pb-3">
              On-Chain Protocol Identifiers (Solana Devnet)
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block text-[11px]">BazaarX Anchor Program ID</span>
                <code className="text-slate-900 font-bold block break-all text-xs">
                  {PROGRAM_ID_STRING}
                </code>
                <span className="text-[10px] text-slate-500 font-sans block">
                  Declared in programs/bazaarx/src/lib.rs
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block text-[11px]">Global Config PDA (seeds: [&quot;config&quot;])</span>
                <div className="flex items-center justify-between">
                  <code className="text-emerald-800 font-bold block break-all text-xs">
                    {configPda.toBase58()}
                  </code>
                  <span className="text-[10px] text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200 font-sans">
                    bump: {configBump}
                  </span>
                </div>
                <span className="text-[10px] text-slate-500 font-sans block">
                  Stores protocol admin authority and canonical USDC mint
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block text-[11px]">Canonical Settlement Token (USDC Devnet)</span>
                <a
                  href={getExplorerAccountUrl(DEVNET_USDC_MINT.toBase58())}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-slate-900 font-bold hover:text-emerald-800 flex items-center gap-1 break-all"
                >
                  {DEVNET_USDC_MINT.toBase58()}
                  <ExternalLink className="w-3 h-3 shrink-0" />
                </a>
                <span className="text-[10px] text-slate-500 font-sans block">
                  Circle official SPL USDC Devnet mint (6 decimals)
                </span>
              </div>

              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-1">
                <span className="text-slate-400 block text-[11px]">Order PDA Derivation Formula</span>
                <code className="text-slate-800 font-semibold block text-xs">
                  [&quot;order&quot;, buyer_pubkey, order_id_le_bytes]
                </code>
                <span className="text-[10px] text-slate-500 font-sans block">
                  Guarantees deterministic 1-to-1 account mapping without client address tampering
                </span>
              </div>
            </div>
          </div>

          {/* State Machine Transition Matrix */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-4">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  State Transition &amp; Authorization Matrix
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Strictly enforced in Solana Rust program instruction boundaries
                </p>
              </div>
              <span className="text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
                5 Valid Transitions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                  <tr>
                    <th className="px-6 py-3">Allowed Transition</th>
                    <th className="px-6 py-3">Signing Authority</th>
                    <th className="px-6 py-3">Smart Contract Validation</th>
                    <th className="px-6 py-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {rules.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50 font-mono">
                      <td className="px-6 py-3.5 font-bold text-slate-900">
                        <span className="font-sans px-2.5 py-1 rounded bg-slate-100 border border-slate-200 text-xs">
                          {r.rule}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 font-sans font-medium text-slate-700">
                        {r.auth}
                      </td>
                      <td className="px-6 py-3.5 font-sans text-slate-500">
                        {r.enforcement}
                      </td>
                      <td className="px-6 py-3.5 text-right">
                        <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Active
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
