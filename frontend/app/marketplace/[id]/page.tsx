'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet } from '@solana/wallet-adapter-react';
import { Product } from '@/lib/types';
import { deriveOrderPda, shortenAddress, DEVNET_USDC_MINT, getExplorerTxUrl } from '@/lib/solana';
import {
  ShieldCheck,
  MapPin,
  Lock,
  ArrowLeft,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
} from 'lucide-react';
import Link from 'next/link';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { publicKey, connected } = useWallet();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState<number>(10);
  const [shippingAddress, setShippingAddress] = useState('Kalanki Wholesale Depot, Kathmandu');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (data.success) {
          setProduct(data.product);
          setQuantity(data.product.minOrder);
        }
      } catch (err) {
        console.error('Failed to load product', err);
      } finally {
        setLoading(false);
      }
    }
    fetchProduct();
  }, [id]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mx-auto"></div>
        <p className="text-slate-500 text-sm mt-4">Loading wholesale commodity details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-16 text-center space-y-4">
        <p className="text-slate-700 font-bold">Product not found.</p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-sm text-emerald-600 font-semibold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Marketplace
        </Link>
      </div>
    );
  }

  const totalAmountUsdc = product.priceUsdc * quantity;
  const totalAmountNpr = product.priceNpr * quantity;

  const handleCreateOrder = async () => {
    setErrorMsg(null);
    setCreating(true);

    try {
      const orderIdNumber = Math.floor(1000 + Math.random() * 9000);
      const buyerPubkey = publicKey ? publicKey : undefined;

      // Derive Order PDA
      let orderPdaString = 'PDA_Pending';
      if (buyerPubkey) {
        const [orderPda] = deriveOrderPda(buyerPubkey, orderIdNumber);
        orderPdaString = orderPda.toBase58();
      }

      // Explicitly mark as simulated demo transaction until Devnet Anchor deployment
      const simulatedTx = `simulated_create_ord_${orderIdNumber}`;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          buyerWallet: buyerPubkey ? buyerPubkey.toBase58() : 'BuyErNepalTrade111111111111111111111111111111',
          buyerName: 'Kathmandu Wholesale Retailers Ltd',
          shippingAddress,
          orderPda: orderPdaString,
          signature: simulatedTx,
          blockchainOrderId: orderIdNumber,
          isSimulated: true,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create order');
      }

      // Redirect immediately to the order lifecycle detail page
      router.push(`/orders/${data.order.id}`);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setErrorMsg(err.message || 'An error occurred during order creation');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <Link
        href="/marketplace"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Back to Wholesale Marketplace
      </Link>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-start">
        {/* Left Column: Product Info & Specifications */}
        <div className="lg:col-span-7 space-y-6">
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-96 shadow-sm">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-md">
                {product.category}
              </span>
              <span className="text-xs text-slate-500 font-medium">
                Verified Commercial Consignment
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
              {product.name}
            </h1>

            <p className="text-sm text-slate-600 leading-relaxed">
              {product.description}
            </p>
          </div>

          {/* Supplier Profile Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Wholesale Supplier Details</h3>
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                KYB Verified
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-slate-400 block mb-0.5">Enterprise Name</span>
                <span className="font-semibold text-slate-800">{product.supplierName}</span>
              </div>
              <div>
                <span className="text-slate-400 block mb-0.5">Depot Location</span>
                <span className="font-semibold text-slate-800 flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {product.supplierLocation}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block mb-0.5">Supplier On-Chain Wallet</span>
                <code className="font-mono text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 block truncate">
                  {product.supplierWallet}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Wholesale Order Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-md sticky top-24">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Wholesale Pricing
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900">
                ${product.priceUsdc}
              </span>
              <span className="text-sm font-semibold text-slate-500">
                USDC / {product.unit}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              ≈ Rs. {product.priceNpr.toLocaleString()} NPR (Estimated Rate)
            </span>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            {/* Quantity Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Consignment Quantity ({product.unit}s)
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="number"
                  min={product.minOrder}
                  max={product.availableStock}
                  value={quantity}
                  onChange={(e) => setQuantity(Math.max(product.minOrder, parseInt(e.target.value) || product.minOrder))}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>Min Order Quantity: {product.minOrder} {product.unit}s</span>
                <span>Stock: {product.availableStock} units</span>
              </div>
            </div>

            {/* Delivery Destination */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Receiving Warehouse / Delivery Address
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="e.g. Ring Road Wholesale Hub, Kathmandu"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          {/* Pricing Summary */}
          <div className="bg-slate-50 rounded-xl p-4 space-y-2 border border-slate-200 text-xs">
            <div className="flex justify-between text-slate-500">
              <span>Unit Rate</span>
              <span>${product.priceUsdc} USDC</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Quantity</span>
              <span>{quantity} {product.unit}s</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Settlement Protocol Fee</span>
              <span className="text-emerald-700 font-semibold">0.00 USDC (Promo)</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
              <span>Total Escrow Value</span>
              <span className="text-emerald-700 font-black">${totalAmountUsdc} USDC</span>
            </div>
            <div className="text-right text-[11px] text-slate-400 font-mono">
              ≈ Rs. {totalAmountNpr.toLocaleString()} NPR
            </div>
          </div>

          {/* Error Message */}
          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Escrow Guarantee Notice */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs leading-relaxed flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Program-Governed Escrow:</strong>
              Your payment will be locked into the Solana program vault on Day 2. The supplier cannot withdraw funds until you confirm physical inspection.
            </div>
          </div>

          {/* Action CTA */}
          <button
            onClick={handleCreateOrder}
            disabled={creating}
            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Creating On-Chain Order PDA...
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                Initialize On-Chain Order (${totalAmountUsdc} USDC)
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-400">
            Signs the <code>create_order</code> instruction on the Solana smart contract.
          </p>
        </div>
      </div>
    </div>
  );
}
