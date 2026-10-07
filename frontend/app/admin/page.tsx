'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/AuthContext';
import { Order, OrderState } from '@/lib/types';
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
  const [activeTab, setActiveTab] = useState<'transactions' | 'governance'>('transactions');

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
        <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
          <button
            onClick={() => setActiveTab('transactions')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'transactions'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Marketplace Transactions ({orders.length})
          </button>
          <button
            onClick={() => setActiveTab('governance')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
              activeTab === 'governance'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            Protocol Parameters &amp; Invariants
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
                              <span className="text-[10px] text-slate-400 font-mono">
                                PDA: {shortenAddress(ord.orderPda, 4)}
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
