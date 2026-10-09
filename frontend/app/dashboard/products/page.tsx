'use client';

import React, { useState, useEffect, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { AddProductModal } from '@/components/dashboard/AddProductModal';
import { useAuth } from '@/lib/AuthContext';
import { Product, ProductStatus } from '@/lib/types';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Eye,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ArrowLeft,
  Search,
  Filter,
  DollarSign,
  Layers,
  Sparkles,
  RefreshCw,
  X,
  ExternalLink,
  ShieldAlert,
  Building,
  Check,
} from 'lucide-react';

const CATEGORIES = [
  'Grocery',
  'Rice & Grains',
  'Cooking Oil',
  'Lentils',
  'Tea',
  'Packaging',
  'Other',
];

const UNIT_TYPES = [
  'piece',
  'carton',
  'kilogram',
  'liter',
  'bag',
  '50L Tin',
  '100kg Sack',
  '50kg Bag',
  'Master Case (120 Packs)',
  '25kg Bulk Bag',
  'Bundle of 500',
];

const PRESET_IMAGES = [
  {
    label: 'Mustard Oil',
    url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?auto=format&fit=crop&q=80&w=800',
  },
  {
    label: 'Basmati Rice',
    url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800',
  },
  {
    label: 'Red Lentils',
    url: 'https://images.unsplash.com/photo-1515543237350-b3eea1ec8082?auto=format&fit=crop&q=80&w=800',
  },
  {
    label: 'Instant Noodles',
    url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?auto=format&fit=crop&q=80&w=800',
  },
  {
    label: 'Organic Tea',
    url: 'https://images.unsplash.com/photo-1576092768241-dec231879fc3?auto=format&fit=crop&q=80&w=800',
  },
  {
    label: 'Shipping Cartons',
    url: 'https://images.unsplash.com/photo-1589939705384-5185137a7f0f?auto=format&fit=crop&q=80&w=800',
  },
];

function SupplierProductsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading: authLoading } = useAuth();

  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | ProductStatus>('All');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Quick Stock Adjuster Modal/Prompt state
  const [stockUpdatingId, setStockUpdatingId] = useState<string | null>(null);

  // Auto-open modal if URL specifies action=add or create=true
  useEffect(() => {
    if (searchParams.get('action') === 'add' || searchParams.get('create') === 'true') {
      setEditingProduct(null);
      setModalOpen(true);
    }
  }, [searchParams]);

  // Redirect if not logged in
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace('/login?redirect=/dashboard/products');
    }
  }, [authLoading, user, router]);

  const isSupplier = Boolean(
    user && (user.role === 'SUPPLIER' || user.roles?.includes('SUPPLIER') || user.role === 'ADMIN')
  );

  const isPending = user?.verificationStatus === 'PENDING';

  async function loadSupplierProducts() {
    if (!user) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/products?supplierOnly=true', { cache: 'no-store' });
      const data = await res.json();
      if (data.success && Array.isArray(data.products)) {
        setProducts(data.products);
      } else {
        throw new Error(data.error || 'Failed to load your inventory listings');
      }
    } catch (err: any) {
      console.error('Error loading products:', err);
      setErrorMsg(err.message || 'Unable to connect to product management service.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (user && isSupplier) {
      loadSupplierProducts();
    }
  }, [user, isSupplier]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setModalOpen(true);
  };

  const openEditModal = (prod: Product) => {
    setEditingProduct(prod);
    setModalOpen(true);
  };

  const handleTogglePublish = async (prod: Product) => {
    const newStatus: ProductStatus = prod.status === 'Published' ? 'Draft' : 'Published';
    try {
      const res = await fetch(`/api/products/${prod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (data.success) {
        await loadSupplierProducts();
      } else {
        alert(data.error || 'Failed to update publication status');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const handleArchive = async (prod: Product) => {
    if (!confirm(`Are you sure you want to archive "${prod.name}"? It will no longer be visible in the marketplace.`)) {
      return;
    }
    try {
      const res = await fetch(`/api/products/${prod.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        await loadSupplierProducts();
      } else {
        alert(data.error || 'Failed to archive product');
      }
    } catch (err: any) {
      alert(err.message || 'Network error');
    }
  };

  const handleQuickStockUpdate = async (prod: Product, change: number) => {
    const newStock = Math.max(0, prod.availableStock + change);
    setStockUpdatingId(prod.id);
    try {
      const res = await fetch(`/api/products/${prod.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ availableStock: newStock }),
      });
      const data = await res.json();
      if (data.success) {
        await loadSupplierProducts();
      }
    } catch (err) {
      console.error('Quick stock error:', err);
    } finally {
      setStockUpdatingId(null);
    }
  };

  // Filtered product list
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchStatus =
        statusFilter === 'All' || (p.status || 'Published') === statusFilter;
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q));
      return matchStatus && matchSearch;
    });
  }, [products, statusFilter, searchQuery]);

  // Statistics
  const stats = useMemo(() => {
    const total = products.length;
    const published = products.filter((p) => (p.status || 'Published') === 'Published').length;
    const drafts = products.filter((p) => p.status === 'Draft').length;
    const totalStock = products.reduce((acc, p) => acc + (p.availableStock || 0), 0);
    return { total, published, drafts, totalStock };
  }, [products]);

  if (authLoading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p className="text-xs text-slate-500 font-medium">Verifying supplier account credentials...</p>
      </div>
    );
  }

  if (!isSupplier) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center mx-auto">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-xl font-bold text-slate-900">Supplier Access Required</h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Product listing and wholesale inventory management is only available to registered supplier accounts.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Top Breadcrumb & Return */}
      <div className="flex items-center justify-between">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Supplier Dashboard
        </Link>
        <Link
          href="/marketplace"
          target="_blank"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:underline"
        >
          <span>View Public Marketplace</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Pending Verification Notice Banner */}
      {isPending && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 sm:p-5 flex items-start gap-3 text-amber-950">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <h4 className="font-bold text-amber-900">Compliance Review Pending</h4>
            <p className="text-amber-800 leading-relaxed">
              Your business PAN and citizenship credentials are currently under verification review by BazaarX compliance officers. You can draft product listings, but publication to the public wholesale marketplace will be enabled once your account is fully verified.
            </p>
          </div>
        </div>
      )}

      {/* Header Banner & Add Product CTA */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-1.5">
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            {user?.businessName || 'Supplier Portal'}
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Wholesale Products & Inventory
          </h1>
          <p className="text-xs text-slate-500 max-w-xl">
            Create and maintain your wholesale commodity listings, configure minimum order quantities (MOQ), and manage real-time warehouse stock.
          </p>
        </div>

        <button
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-bold text-xs shadow-xs transition-all bg-slate-900 hover:bg-slate-800 text-white shadow-emerald-500/10"
          id="btn-add-product"
        >
          <Plus className="w-4 h-4 text-emerald-400" />
          <span>Add Wholesale Product</span>
        </button>
      </div>

      {/* Inventory KPI Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Listings
          </p>
          <p className="text-2xl font-black text-slate-900">{stats.total}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
            Active in Marketplace
          </p>
          <p className="text-2xl font-black text-emerald-800">{stats.published}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
            Draft Listings
          </p>
          <p className="text-2xl font-black text-amber-800">{stats.drafts}</p>
        </div>
        <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-1">
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Total Stock Units
          </p>
          <p className="text-2xl font-black text-slate-900">{stats.totalStock.toLocaleString()}</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-2.5" />
          <input
            type="text"
            placeholder="Search your listings by name, category, or SKU..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 focus:bg-white transition-all"
            id="supplier-products-search"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-medium">Status:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-slate-50 border border-slate-200 text-slate-800 text-xs rounded-xl px-3 py-2 font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
            id="supplier-status-filter"
          >
            <option value="All">All Statuses</option>
            <option value="Published">Published (Active)</option>
            <option value="Draft">Drafts</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Product Listings Table */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Querying supplier warehouse inventory...</p>
        </div>
      ) : errorMsg ? (
        <div className="bg-white rounded-2xl border border-rose-200 p-8 text-center space-y-3">
          <p className="text-rose-700 font-bold text-sm">{errorMsg}</p>
          <button
            onClick={loadSupplierProducts}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
          >
            Retry
          </button>
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center space-y-3">
          <div className="w-12 h-12 bg-slate-100 text-slate-400 rounded-2xl flex items-center justify-center mx-auto">
            <Package className="w-6 h-6" />
          </div>
          <p className="font-bold text-slate-900 text-sm">No Listings Found</p>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery || statusFilter !== 'All'
              ? 'No products match your current keyword or status filters.'
              : 'You have not added any wholesale products to BazaarX yet.'}
          </p>
          <button
            onClick={openCreateModal}
            className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
            id="btn-add-first-product"
          >
            Add Your First Product
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="px-5 py-3.5">Commodity Product</th>
                  <th className="px-4 py-3.5">Category</th>
                  <th className="px-4 py-3.5">Wholesale Price</th>
                  <th className="px-4 py-3.5">Inventory Stock</th>
                  <th className="px-4 py-3.5">MOQ</th>
                  <th className="px-4 py-3.5">Status</th>
                  <th className="px-5 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredProducts.map((prod) => {
                  const isPublished = (prod.status || 'Published') === 'Published';
                  const isDraft = prod.status === 'Draft';
                  const isArchived = prod.status === 'Archived';

                  return (
                    <tr
                      key={prod.id}
                      className="hover:bg-slate-50/80 transition-colors"
                      id={`supplier-product-row-${prod.id}`}
                    >
                      {/* Commodity Name & Image */}
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <img
                            src={prod.imageUrl}
                            alt={prod.name}
                            className="w-12 h-12 rounded-xl object-cover border border-slate-200 shrink-0"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src =
                                'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800';
                            }}
                          />
                          <div className="space-y-0.5">
                            <p className="font-bold text-slate-900 text-xs sm:text-sm line-clamp-1">
                              {prod.name}
                            </p>
                            <div className="flex items-center gap-2 text-[10px] text-slate-400 font-mono">
                              {prod.sku && <span>SKU: {prod.sku}</span>}
                              <span>•</span>
                              <span>ID: {prod.id}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-medium text-[11px] border border-slate-200/60">
                          {prod.category}
                        </span>
                      </td>

                      {/* Price */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div>
                          <span className="font-bold text-slate-900 text-xs">
                            {prod.priceUsdc} USDC
                          </span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            NPR {prod.priceNpr?.toLocaleString()} / {prod.unit}
                          </span>
                        </div>
                      </td>

                      {/* Stock Adjuster */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-slate-900">
                            {prod.availableStock} {prod.unit}
                          </span>
                          <div className="inline-flex rounded-lg border border-slate-200 bg-white shadow-2xs">
                            <button
                              onClick={() => handleQuickStockUpdate(prod, -5)}
                              disabled={prod.availableStock <= 0 || stockUpdatingId === prod.id}
                              className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-30"
                              title="Decrease stock by 5"
                            >
                              -5
                            </button>
                            <button
                              onClick={() => handleQuickStockUpdate(prod, 10)}
                              disabled={stockUpdatingId === prod.id}
                              className="px-1.5 py-0.5 text-[10px] font-bold text-emerald-700 hover:bg-emerald-50 border-l border-slate-200 disabled:opacity-30"
                              title="Increase stock by 10"
                            >
                              +10
                            </button>
                          </div>
                        </div>
                      </td>

                      {/* Minimum Order Quantity */}
                      <td className="px-4 py-3.5 whitespace-nowrap font-medium text-slate-600">
                        {prod.minOrder} {prod.unit}
                      </td>

                      {/* Publication Status Badge */}
                      <td className="px-4 py-3.5 whitespace-nowrap">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            Published
                          </span>
                        ) : isDraft ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200 font-bold text-[10px]">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                            Draft
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-bold text-[10px]">
                            Archived
                          </span>
                        )}
                      </td>

                      {/* Action Buttons */}
                      <td className="px-5 py-3.5 whitespace-nowrap text-right">
                        <div className="inline-flex items-center gap-1">
                          <button
                            onClick={() => handleTogglePublish(prod)}
                            disabled={isPending}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors ${
                              isPublished
                                ? 'text-amber-800 bg-amber-50 border-amber-200 hover:bg-amber-100'
                                : 'text-emerald-800 bg-emerald-50 border-emerald-200 hover:bg-emerald-100'
                            }`}
                            title={isPublished ? 'Unpublish listing' : 'Publish listing to marketplace'}
                          >
                            {isPublished ? 'Unpublish' : 'Publish'}
                          </button>

                          <button
                            onClick={() => openEditModal(prod)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                            title="Edit Product Details"
                            id={`edit-product-${prod.id}`}
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            onClick={() => handleArchive(prod)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-700 hover:bg-rose-50 transition-colors"
                            title="Archive Listing"
                            id={`archive-product-${prod.id}`}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>

                          <Link
                            href={`/marketplace/${prod.id}`}
                            target="_blank"
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors"
                            title="Preview in Marketplace"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add / Edit Product Modal */}
      <AddProductModal
        isOpen={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingProduct(null);
        }}
        onSuccess={() => {
          setModalOpen(false);
          setEditingProduct(null);
          loadSupplierProducts();
        }}
        editingProduct={editingProduct}
        userVerificationStatus={user?.verificationStatus}
      />
    </div>
  );
}

export default function SupplierProductsPage() {
  return (
    <Suspense
      fallback={
        <div className="max-w-7xl mx-auto px-4 py-20 text-center space-y-3">
          <div className="w-8 h-8 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500 font-medium">Loading Wholesale Inventory...</p>
        </div>
      }
    >
      <SupplierProductsContent />
    </Suspense>
  );
}
