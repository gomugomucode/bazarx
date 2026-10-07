'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { Product } from '@/lib/types';
import { useAuth } from '@/lib/AuthContext';
import {
  Search,
  MapPin,
  ArrowRight,
  ShieldCheck,
  Building,
  ArrowUpDown,
  Boxes,
  PlusCircle,
  Package,
  Layers,
  Sparkles,
  AlertCircle,
  CheckCircle2,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react';

const CATEGORIES = [
  'All',
  'Grocery',
  'Rice & Grains',
  'Cooking Oil',
  'Lentils',
  'Tea',
  'Packaging',
  'Other',
];

export default function MarketplacePage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<
    'newest' | 'price-asc' | 'price-desc' | 'stock-desc' | 'name-asc'
  >('newest');

  const isSupplier = Boolean(
    user && (user.role === 'SUPPLIER' || user.roles?.includes('SUPPLIER') || user.role === 'ADMIN')
  );

  async function fetchProducts() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/products');
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        throw new Error(data.error || 'Failed to fetch active products');
      }
    } catch (err: any) {
      console.error('Failed to load products:', err);
      setError(err.message || 'Unable to connect to the marketplace inventory service.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchProducts();
  }, []);

  const processedProducts = useMemo(() => {
    let list = products.filter((p) => {
      // Category filter
      const matchesCategory =
        selectedCategory === 'All' ||
        p.category.toLowerCase() === selectedCategory.toLowerCase();

      // Search filter
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.supplierName.toLowerCase().includes(q) ||
        (p.supplierLocation && p.supplierLocation.toLowerCase().includes(q)) ||
        (p.sku && p.sku.toLowerCase().includes(q));

      return matchesCategory && matchesSearch;
    });

    switch (sortBy) {
      case 'price-asc':
        list.sort((a, b) => a.priceUsdc - b.priceUsdc);
        break;
      case 'price-desc':
        list.sort((a, b) => b.priceUsdc - a.priceUsdc);
        break;
      case 'stock-desc':
        list.sort((a, b) => b.availableStock - a.availableStock);
        break;
      case 'name-asc':
        list.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'newest':
      default:
        list.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
        break;
    }

    return list;
  }, [products, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Verified Commercial Procurement — Nepal
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              B2B Wholesale Commodity Marketplace
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed">
              Source bulk grains, edible oils, pulses, tea, and industrial packaging directly from verified mills and authorized distributors across Nepal. Settlements secured via Solana smart contract escrow.
            </p>
          </div>

          {/* Supplier Portal Entry Point */}
          <div className="shrink-0 flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {isSupplier ? (
              <Link
                href="/dashboard/products"
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-xs transition-colors"
                id="supplier-manage-listings-btn"
              >
                <PlusCircle className="w-4 h-4 text-emerald-400" />
                <span>Supplier Portal: Add & Manage Products</span>
              </Link>
            ) : (
              <Link
                href={user ? '/dashboard' : '/register?role=SUPPLIER'}
                className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-semibold text-xs transition-colors"
                id="supplier-sell-on-bazaarx-btn"
              >
                <Building className="w-4 h-4 text-emerald-700" />
                <span>Sell on BazaarX (Supplier Registration)</span>
              </Link>
            )}
          </div>
        </div>

        {/* Search, Filter & Sort Controls */}
        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Search Box */}
          <div className="relative w-full lg:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by commodity, description, supplier, SKU..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all"
              id="marketplace-search-input"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-slate-600"
              >
                Clear
              </button>
            )}
          </div>

          {/* Sort Dropdown */}
          <div className="flex items-center gap-2 self-start lg:self-auto">
            <span className="text-xs text-slate-500 flex items-center gap-1 font-medium whitespace-nowrap">
              <ArrowUpDown className="w-3.5 h-3.5 text-slate-400" /> Sort by:
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
              id="marketplace-sort-select"
            >
              <option value="newest">Newest Listings</option>
              <option value="price-asc">Price: Low to High</option>
              <option value="price-desc">Price: High to Low</option>
              <option value="stock-desc">Available Stock (Highest)</option>
              <option value="name-asc">Commodity Name (A–Z)</option>
            </select>
          </div>
        </div>

        {/* Category Pills Bar */}
        <div className="mt-4 flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory.toLowerCase() === cat.toLowerCase()
                  ? 'bg-slate-900 text-white shadow-2xs font-bold'
                  : 'bg-slate-50 text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200/80'
              }`}
              id={`cat-filter-${cat.toLowerCase().replace(/\s+/g, '-')}`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        /* Loading Skeletons */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div
              key={i}
              className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4 animate-pulse h-96"
            >
              <div className="h-44 bg-slate-100 rounded-xl" />
              <div className="h-4 bg-slate-100 rounded w-3/4" />
              <div className="h-3 bg-slate-100 rounded w-1/2" />
              <div className="h-8 bg-slate-100 rounded mt-4" />
            </div>
          ))}
        </div>
      ) : error ? (
        /* Error State */
        <div className="bg-white rounded-2xl border border-rose-200 p-10 text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <p className="text-slate-900 font-bold text-sm">Failed to Load Marketplace</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">{error}</p>
          <button
            onClick={fetchProducts}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Try Again</span>
          </button>
        </div>
      ) : processedProducts.length === 0 ? (
        /* Empty State */
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
            <Package className="w-7 h-7" />
          </div>
          <p className="text-slate-900 font-bold text-base">No Wholesale Products Found</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {searchQuery || selectedCategory !== 'All'
              ? 'No active published listings match your search keywords or category filter.'
              : 'There are currently no published products available in the wholesale marketplace.'}
          </p>
          <div className="pt-2 flex items-center justify-center gap-3">
            {(searchQuery || selectedCategory !== 'All') && (
              <button
                onClick={() => {
                  setSelectedCategory('All');
                  setSearchQuery('');
                  setSortBy('newest');
                }}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
              >
                Reset All Filters
              </button>
            )}
            {isSupplier && (
              <Link
                href="/dashboard/products"
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
              >
                Add the First Listing
              </Link>
            )}
          </div>
        </div>
      ) : (
        /* Real Product Card Grid */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {processedProducts.map((product) => {
            const isLowStock = product.availableStock <= product.minOrder * 2;
            return (
              <div
                key={product.id}
                className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-xs hover:border-slate-300 transition-all flex flex-col group"
                id={`product-card-${product.id}`}
              >
                {/* Product Image & Badges */}
                <div className="relative h-48 bg-slate-100 overflow-hidden">
                  <img
                    src={product.imageUrl}
                    alt={product.name}
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    onError={(e) => {
                      // Fallback image if image fails to load
                      (e.target as HTMLImageElement).src =
                        'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800';
                    }}
                  />
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    <span className="bg-white/95 backdrop-blur-xs text-slate-800 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md border border-slate-200 shadow-2xs">
                      {product.category}
                    </span>
                    {product.sku && (
                      <span className="bg-slate-900/90 text-white text-[9px] font-mono font-medium px-1.5 py-0.5 rounded shadow-2xs">
                        {product.sku}
                      </span>
                    )}
                  </div>
                  <div className="absolute bottom-3 right-3 bg-white/95 backdrop-blur-xs text-slate-900 text-[11px] font-bold px-2 py-0.5 rounded-md shadow-2xs border border-slate-200 flex items-center gap-1">
                    <span className="text-slate-500 font-medium">MOQ:</span>
                    <span className="text-emerald-700 font-extrabold">
                      {product.minOrder} {product.unit}
                    </span>
                  </div>
                </div>

                {/* Product Details Content */}
                <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                  <div className="space-y-1.5">
                    <h3 className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-emerald-800 transition-colors line-clamp-1">
                      {product.name}
                    </h3>
                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                      {product.description}
                    </p>
                  </div>

                  {/* Supplier & Stock Metrics */}
                  <div className="pt-3 border-t border-slate-100 space-y-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800 truncate flex items-center gap-1.5">
                        <Building className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{product.supplierName}</span>
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-slate-500 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        {product.supplierLocation || 'Nepal'}
                      </span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded border ${
                          isLowStock
                            ? 'bg-amber-50 text-amber-800 border-amber-200'
                            : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        }`}
                      >
                        Stock: {product.availableStock} {product.unit}
                      </span>
                    </div>
                  </div>

                  {/* Pricing & CTA Buttons */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className="text-lg font-black text-slate-900">
                          {product.priceUsdc} USDC
                        </span>
                        <span className="text-xs font-semibold text-slate-500">
                          / {product.unit}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium">
                        NPR {product.priceNpr.toLocaleString()}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <Link
                        href={`/marketplace/${product.id}`}
                        className="inline-flex items-center gap-1 px-3 py-2 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold text-xs transition-colors"
                        id={`view-details-${product.id}`}
                      >
                        <span>Details</span>
                      </Link>

                      <Link
                        href={`/marketplace/${product.id}`}
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors shadow-2xs"
                        id={`place-order-${product.id}`}
                      >
                        <span>Buy</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
