'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Product, ProductStatus } from '@/lib/types';
import {
  X,
  Upload,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  ExternalLink,
  Sparkles,
  Loader2,
  Package,
  Layers,
  Plus,
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

const UNIT_PRESETS = [
  'piece',
  'carton',
  'kilogram',
  'liter',
  'bag',
  'drum',
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

export interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (createdProduct: Product) => void;
  editingProduct?: Product | null;
  userVerificationStatus?: 'VERIFIED' | 'PENDING' | 'REJECTED';
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  editingProduct,
  userVerificationStatus,
}) => {
  // Form fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [sku, setSku] = useState('');
  const [description, setDescription] = useState('');
  const [priceUsdc, setPriceUsdc] = useState('50');
  const [priceNpr, setPriceNpr] = useState('6650');
  const [unit, setUnit] = useState(UNIT_PRESETS[0]);
  const [availableStock, setAvailableStock] = useState('100');
  const [minOrder, setMinOrder] = useState('5');
  const [imageUrl, setImageUrl] = useState(PRESET_IMAGES[0].url);
  const [status, setStatus] = useState<ProductStatus>('Published');

  // UI state
  const [submitting, setSubmitting] = useState(false);
  const [submitAction, setSubmitAction] = useState<ProductStatus | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [serverError, setServerError] = useState<string | null>(null);
  const [createdProduct, setCreatedProduct] = useState<Product | null>(null);

  // Initialize or reset form
  useEffect(() => {
    if (editingProduct) {
      setName(editingProduct.name);
      setCategory(editingProduct.category);
      setSku(editingProduct.sku || '');
      setDescription(editingProduct.description);
      setPriceUsdc(String(editingProduct.priceUsdc));
      setPriceNpr(String(editingProduct.priceNpr));
      setUnit(editingProduct.unit);
      setAvailableStock(String(editingProduct.availableStock));
      setMinOrder(String(editingProduct.minOrder));
      setImageUrl(editingProduct.imageUrl);
      setStatus(editingProduct.status || 'Published');
    } else {
      setName('');
      setCategory(CATEGORIES[0]);
      setSku(`SKU-${Date.now().toString().slice(-4)}`);
      setDescription('');
      setPriceUsdc('50');
      setPriceNpr('6650');
      setUnit(UNIT_PRESETS[0]);
      setAvailableStock('100');
      setMinOrder('5');
      setImageUrl(PRESET_IMAGES[0].url);
      setStatus('Published');
    }
    setFieldErrors({});
    setServerError(null);
    setCreatedProduct(null);
  }, [editingProduct, isOpen]);

  if (!isOpen) return null;

  const isPending = userVerificationStatus === 'PENDING';

  // Handle USDC price input and auto-update NPR price
  const handlePriceUsdcChange = (val: string) => {
    setPriceUsdc(val);
    const num = parseFloat(val);
    if (!isNaN(num) && num > 0) {
      setPriceNpr(String(Math.round(num * 133)));
    }
    if (fieldErrors.priceUsdc) {
      setFieldErrors((prev) => ({ ...prev, priceUsdc: '' }));
    }
  };

  // Handle local file upload
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setServerError('Please select a valid image file (PNG, JPG, WEBP).');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setServerError('Image size exceeds 5MB limit. Please choose a smaller photo.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setImageUrl(reader.result);
        setServerError(null);
      }
    };
    reader.onerror = () => {
      setServerError('Failed to read image file. Please try another image.');
    };
    reader.readAsDataURL(file);
  };

  // Client-side validation
  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 3) {
      errors.name = 'Product name is required (minimum 3 characters).';
    }

    if (!category.trim()) {
      errors.category = 'Please select a commodity category.';
    }

    if (!description.trim() || description.trim().length < 5) {
      errors.description = 'Product description is required (minimum 5 characters).';
    }

    const parsedPrice = parseFloat(priceUsdc);
    if (isNaN(parsedPrice) || parsedPrice <= 0) {
      errors.priceUsdc = 'Wholesale price must be a positive number in USDC.';
    }

    if (!unit.trim()) {
      errors.unit = 'Unit type is required (e.g. 50L Tin, carton, kg).';
    }

    const parsedStock = parseInt(availableStock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      errors.availableStock = 'Available stock must be 0 or greater.';
    }

    const parsedMinOrder = parseInt(minOrder, 10);
    if (isNaN(parsedMinOrder) || parsedMinOrder < 1) {
      errors.minOrder = 'Minimum order quantity (MOQ) must be at least 1.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (targetStatus: ProductStatus) => {
    setServerError(null);

    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    setSubmitAction(targetStatus);

    try {
      const payload = {
        name: name.trim(),
        category: category.trim(),
        sku: sku.trim() || undefined,
        description: description.trim(),
        priceUsdc: parseFloat(priceUsdc),
        priceNpr: parseInt(priceNpr, 10) || Math.round(parseFloat(priceUsdc) * 133),
        unit: unit.trim(),
        minOrder: parseInt(minOrder, 10),
        availableStock: parseInt(availableStock, 10),
        imageUrl: imageUrl.trim() || PRESET_IMAGES[0].url,
        status: targetStatus,
      };

      const url = editingProduct ? `/api/products/${editingProduct.id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save product listing');
      }

      setCreatedProduct(data.product);
      if (onSuccess) {
        onSuccess(data.product);
      }
    } catch (err: any) {
      console.error('Add product error:', err);
      setServerError(err.message || 'An unexpected error occurred while saving product.');
    } finally {
      setSubmitting(false);
      setSubmitAction(null);
    }
  };

  const handleResetForAnother = () => {
    setName('');
    setCategory(CATEGORIES[0]);
    setSku(`SKU-${Date.now().toString().slice(-4)}`);
    setDescription('');
    setPriceUsdc('50');
    setPriceNpr('6650');
    setUnit(UNIT_PRESETS[0]);
    setAvailableStock('100');
    setMinOrder('5');
    setImageUrl(PRESET_IMAGES[0].url);
    setStatus('Published');
    setFieldErrors({});
    setServerError(null);
    setCreatedProduct(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in-0 duration-150">
      <div className="bg-white rounded-3xl border border-slate-200 max-w-2xl w-full max-h-[92vh] overflow-y-auto shadow-2xl p-6 sm:p-8 space-y-6">
        {/* Modal Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="space-y-0.5">
            <h3 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Package className="w-5 h-5 text-emerald-600" />
              <span>{editingProduct ? 'Edit Wholesale Listing' : 'Add Wholesale Product'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {editingProduct
                ? 'Update pricing, warehouse stock, or specifications for this commodity.'
                : 'Publish wholesale commodity listings directly to the BazaarX Nepal B2B marketplace.'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            id="btn-add-product-modal-close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Success Screen */}
        {createdProduct ? (
          <div className="py-6 space-y-6 text-center animate-in fade-in-50 duration-200">
            <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xl font-black text-slate-900">
                {createdProduct.status === 'Published'
                  ? 'Product Listed Successfully!'
                  : 'Draft Saved to Inventory!'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {createdProduct.status === 'Published'
                  ? `"${createdProduct.name}" is now live and browseable by registered buyers on BazaarX.`
                  : `"${createdProduct.name}" has been saved as a private draft. You can publish it anytime.`}
              </p>
            </div>

            {/* Created Product Card Preview */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 text-left max-w-md mx-auto flex items-center gap-3.5">
              <img
                src={createdProduct.imageUrl}
                alt={createdProduct.name}
                className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = PRESET_IMAGES[0].url;
                }}
              />
              <div className="flex-1 min-w-0 space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    {createdProduct.category}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400">
                    ID: {createdProduct.id}
                  </span>
                </div>
                <h5 className="font-bold text-slate-900 text-xs truncate">
                  {createdProduct.name}
                </h5>
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-slate-900">
                    ${createdProduct.priceUsdc} USDC
                  </span>
                  <span className="text-slate-400">•</span>
                  <span className="text-slate-600">
                    {createdProduct.availableStock} {createdProduct.unit} in stock
                  </span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 pt-2">
              {createdProduct.status === 'Published' && (
                <Link
                  href={`/marketplace/${createdProduct.id}`}
                  target="_blank"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-colors"
                  id="btn-success-view-marketplace"
                >
                  <span>View in Marketplace</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                </Link>
              )}

              <button
                type="button"
                onClick={handleResetForAnother}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-50 text-slate-800 font-semibold text-xs transition-colors"
                id="btn-success-add-another"
              >
                <Plus className="w-3.5 h-3.5 text-slate-600" />
                <span>Add Another Product</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="w-full sm:w-auto inline-flex items-center justify-center px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-xs transition-colors"
                id="btn-success-done"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          /* Form Content */
          <div className="space-y-5">
            {/* Server Error Alert */}
            {serverError && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-rose-900 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Unable to save listing</span>
                  <p className="text-rose-700 leading-relaxed">{serverError}</p>
                </div>
              </div>
            )}

            {/* Pending Verification Notice */}
            {isPending && (
              <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-amber-950 text-xs flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <span className="font-bold">Compliance Review Pending</span>
                  <p className="text-amber-800 leading-relaxed">
                    Your business credentials are under review. You can prepare and save product listings as drafts, but marketplace publication requires verified supplier compliance.
                  </p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              {/* Product Name */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Product Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Mustang Pure Mustard Cooking Oil (50L Tin)"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    if (fieldErrors.name) setFieldErrors((prev) => ({ ...prev, name: '' }));
                  }}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                    fieldErrors.name
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-200 focus:border-emerald-600'
                  }`}
                  id="form-product-name"
                />
                {fieldErrors.name && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    {fieldErrors.name}
                  </p>
                )}
              </div>

              {/* Category & SKU */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Commodity Category *
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    id="form-product-category"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    SKU Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. SKU-TERAI-OIL-01"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    id="form-product-sku"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Product Description *
                </label>
                <textarea
                  rows={3}
                  placeholder="Detail origin district, quality specs, packaging certifications, moisture percentage..."
                  value={description}
                  onChange={(e) => {
                    setDescription(e.target.value);
                    if (fieldErrors.description)
                      setFieldErrors((prev) => ({ ...prev, description: '' }));
                  }}
                  className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 transition-all ${
                    fieldErrors.description
                      ? 'border-rose-400 focus:border-rose-500'
                      : 'border-slate-200 focus:border-emerald-600'
                  }`}
                  id="form-product-description"
                />
                {fieldErrors.description && (
                  <p className="text-[11px] text-rose-600 font-semibold mt-1">
                    {fieldErrors.description}
                  </p>
                )}
              </div>

              {/* Price & Unit */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Wholesale Price (USDC) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={priceUsdc}
                    onChange={(e) => handlePriceUsdcChange(e.target.value)}
                    className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                      fieldErrors.priceUsdc
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 focus:border-emerald-600'
                    }`}
                    id="form-product-price-usdc"
                  />
                  {fieldErrors.priceUsdc && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">
                      {fieldErrors.priceUsdc}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Equivalent NPR Price
                  </label>
                  <input
                    type="number"
                    value={priceNpr}
                    onChange={(e) => setPriceNpr(e.target.value)}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                    id="form-product-price-npr"
                  />
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    ~133 NPR / USDC
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Unit of Measurement *
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 50L Tin, carton, kg"
                    value={unit}
                    onChange={(e) => {
                      setUnit(e.target.value);
                      if (fieldErrors.unit) setFieldErrors((prev) => ({ ...prev, unit: '' }));
                    }}
                    className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                      fieldErrors.unit
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 focus:border-emerald-600'
                    }`}
                    id="form-product-unit"
                  />
                  {fieldErrors.unit && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">
                      {fieldErrors.unit}
                    </p>
                  )}
                </div>
              </div>

              {/* Stock and MOQ */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Available Warehouse Stock *
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={availableStock}
                    onChange={(e) => {
                      setAvailableStock(e.target.value);
                      if (fieldErrors.availableStock)
                        setFieldErrors((prev) => ({ ...prev, availableStock: '' }));
                    }}
                    className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                      fieldErrors.availableStock
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 focus:border-emerald-600'
                    }`}
                    id="form-product-stock"
                  />
                  {fieldErrors.availableStock && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">
                      {fieldErrors.availableStock}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">
                    Minimum Order Quantity (MOQ) *
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={minOrder}
                    onChange={(e) => {
                      setMinOrder(e.target.value);
                      if (fieldErrors.minOrder)
                        setFieldErrors((prev) => ({ ...prev, minOrder: '' }));
                    }}
                    className={`w-full px-3.5 py-2 bg-slate-50 border rounded-xl text-xs sm:text-sm text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 ${
                      fieldErrors.minOrder
                        ? 'border-rose-400 focus:border-rose-500'
                        : 'border-slate-200 focus:border-emerald-600'
                    }`}
                    id="form-product-moq"
                  />
                  {fieldErrors.minOrder && (
                    <p className="text-[11px] text-rose-600 font-semibold mt-1">
                      {fieldErrors.minOrder}
                    </p>
                  )}
                </div>
              </div>

              {/* Product Image: Upload & Presets */}
              <div className="space-y-3 pt-1">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-800">
                    Product Image & Preview
                  </label>
                  <label className="cursor-pointer inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Image</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="form-product-image-file"
                    />
                  </label>
                </div>

                {/* Image Preview & URL input */}
                <div className="flex items-start gap-3">
                  <div className="relative w-16 h-16 rounded-xl border border-slate-200 overflow-hidden bg-slate-100 shrink-0">
                    <img
                      src={imageUrl}
                      alt="Product preview"
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = PRESET_IMAGES[0].url;
                      }}
                    />
                  </div>
                  <div className="flex-1 space-y-1">
                    <input
                      type="text"
                      placeholder="Or enter image URL (https://...)"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600"
                      id="form-product-image-url"
                    />
                    <span className="text-[10px] text-slate-400 block">
                      Choose an image preset below or click Upload to select a file from your device.
                    </span>
                  </div>
                </div>

                {/* Preset Image Options */}
                <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
                  {PRESET_IMAGES.map((preset) => (
                    <button
                      key={preset.label}
                      type="button"
                      onClick={() => setImageUrl(preset.url)}
                      className={`p-1 rounded-xl border text-[10px] text-left transition-all ${
                        imageUrl === preset.url
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-900 font-bold ring-2 ring-emerald-600/20'
                          : 'border-slate-200 hover:border-slate-300 text-slate-600'
                      }`}
                    >
                      <img
                        src={preset.url}
                        alt={preset.label}
                        className="w-full h-11 object-cover rounded-lg mb-1"
                      />
                      <span className="truncate block">{preset.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Publication Status Selection */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-800 mb-1.5">
                  Initial Publication Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      status === 'Published'
                        ? 'border-emerald-600 bg-emerald-50/50 text-emerald-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={status === 'Published'}
                      onChange={() => setStatus('Published')}
                      className="text-emerald-600 focus:ring-emerald-500"
                    />
                    <div>
                      <div className="text-xs">Published (Active)</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        Visible immediately to wholesale buyers
                      </div>
                    </div>
                  </label>

                  <label
                    className={`flex items-center gap-2 p-3 rounded-xl border cursor-pointer transition-colors ${
                      status === 'Draft'
                        ? 'border-amber-500 bg-amber-50/50 text-amber-950 font-bold'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      checked={status === 'Draft'}
                      onChange={() => setStatus('Draft')}
                      className="text-amber-600 focus:ring-amber-500"
                    />
                    <div>
                      <div className="text-xs">Draft (Private)</div>
                      <div className="text-[10px] font-normal text-slate-500">
                        Saved in seller inventory, hidden from buyers
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
                id="btn-cancel-modal"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('Draft')}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-300 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors disabled:opacity-50"
                id="btn-submit-draft"
              >
                {submitting && submitAction === 'Draft' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Saving Draft...</span>
                  </>
                ) : (
                  <span>Save as Draft</span>
                )}
              </button>

              <button
                type="button"
                onClick={() => handleSubmit('Published')}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold shadow-xs transition-colors disabled:opacity-50"
                id="btn-submit-publish"
              >
                {submitting && submitAction === 'Published' ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
                    <span>Publishing...</span>
                  </>
                ) : (
                  <span>{editingProduct ? 'Save Changes' : 'Publish Product'}</span>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
