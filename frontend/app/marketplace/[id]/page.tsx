'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Product } from '@/lib/types';
import {
  deriveOrderPda,
  deriveConfigPda,
  shortenAddress,
  DEVNET_USDC_MINT,
  getExplorerTxUrl,
  getConnection,
  getAnchorProgram,
} from '@/lib/solana';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import {
  ShieldCheck,
  MapPin,
  Lock,
  ArrowLeft,
  Truck,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Wallet,
  Building,
  Info,
  Minus,
  Plus,
  Package,
} from 'lucide-react';
import Link from 'next/link';
import { TransactionStatus, TxLifecycleStage } from '@/components/TransactionStatus';
import { useAuth } from '@/lib/AuthContext';

export default function ProductDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { publicKey, connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { setVisible: openWalletModal } = useWalletModal();

  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState<number>(10);
  const [shippingAddress, setShippingAddress] = useState('Kalanki Wholesale Depot, Kathmandu');
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);

  // Transaction stage tracking
  const [txStage, setTxStage] = useState<TxLifecycleStage>('ready');
  const [txSig, setTxSig] = useState<string | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      try {
        const res = await fetch(`/api/products/${id}`);
        const data = await res.json();
        if (data.success && data.product) {
          setProduct(data.product);
          setQuantity(data.product.minOrder || 1);
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
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="animate-spin rounded-full h-9 w-9 border-2 border-emerald-600 border-t-transparent mx-auto" />
        <p className="text-slate-500 text-xs font-medium">Loading wholesale commodity details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-14 h-14 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto text-slate-400">
          <Package className="w-7 h-7" />
        </div>
        <h2 className="text-slate-800 font-bold text-lg">Wholesale Commodity Not Found</h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          This product listing may have been archived or removed from the marketplace.
        </p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Wholesale Marketplace
        </Link>
      </div>
    );
  }

  const isOwner = Boolean(
    user &&
      (product.supplierId === user.id ||
        product.supplierName === (user.businessName || user.fullName) ||
        (user.wallet && product.supplierWallet.toLowerCase() === user.wallet.toLowerCase()))
  );

  const totalAmountUsdc = product.priceUsdc * quantity;
  const totalAmountNpr = product.priceNpr * quantity;

  const handleCreateOrder = async () => {
    // 1. Protected action: Creating wholesale order requires authenticated business account
    if (!user) {
      router.push(`/login?redirect=/marketplace/${id}`);
      return;
    }

    // 2. Prevent self-trading
    if (isOwner) {
      setErrorMsg('Suppliers cannot purchase their own products. Self-trading is prohibited.');
      return;
    }

    // 3. Validate quantity against MOQ and stock
    if (quantity < product.minOrder) {
      setErrorMsg(`Order quantity must be at least the MOQ (${product.minOrder} ${product.unit}).`);
      return;
    }
    if (quantity > product.availableStock) {
      setErrorMsg(`Order quantity exceeds available warehouse stock (${product.availableStock} ${product.unit}).`);
      return;
    }

    setErrorMsg(null);
    setCreating(true);

    try {
      const orderIdNumber = Math.floor(10000 + Math.random() * 90000);
      const buyerWalletStr = (connected && publicKey ? publicKey.toBase58() : user.wallet || '').trim();

      // Derive Order PDA if valid pubkey
      let orderPdaString = 'PDA_Pending';
      let realSignature = '';
      let isSimulated = true;

      if (connected && publicKey && anchorWallet) {
        try {
          const connection = getConnection();
          const program = getAnchorProgram(connection, anchorWallet);
          const [configPda] = deriveConfigPda();
          const [orderPda] = deriveOrderPda(publicKey, orderIdNumber);
          orderPdaString = orderPda.toBase58();

          // Amount in micro-USDC (6 decimals)
          const amountMicroUsdc = new BN(totalAmountUsdc).mul(new BN(1_000_000));
          const supplierPubkey = new PublicKey(product.supplierWallet);

          setTxStage('sending');

          // Submit real Anchor transaction to Solana Devnet
          const txSignature = await program.methods
            .createOrder(
              new BN(orderIdNumber),
              supplierPubkey,
              DEVNET_USDC_MINT,
              amountMicroUsdc
            )
            .accounts({
              buyer: publicKey,
              config: configPda,
              order: orderPda,
              systemProgram: SystemProgram.programId,
            })
            .rpc();

          realSignature = txSignature;
          isSimulated = false;
          setTxSig(realSignature);

          setTxStage('confirming');
          await connection.confirmTransaction(realSignature, 'confirmed');
          setTxStage('confirmed');
        } catch (chainErr: any) {
          console.error('On-chain order creation failed:', chainErr);
          setCreating(false);
          setTxStage('failed');
          const rawMsg = chainErr.message || String(chainErr);
          const lower = rawMsg.toLowerCase();
          if (
            lower.includes('reject') ||
            lower.includes('declined') ||
            lower.includes('user rejected') ||
            lower.includes('cancel')
          ) {
            setErrorMsg('Wallet signature request was cancelled by user.');
          } else if (rawMsg.includes('0x1') || lower.includes('insufficient lamports') || lower.includes('insufficient funds')) {
            setErrorMsg('Insufficient SOL to pay for order account rent on Solana Devnet.');
          } else {
            setErrorMsg(`Solana transaction failed: ${rawMsg.slice(0, 160)}`);
          }
          return;
        }
      }

      // Sync with backend order registry (atomic stock deduction & authorization)
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          buyerWallet: buyerWalletStr || 'DemoBuyerWallet',
          buyerName: user.businessName || user.fullName || 'Wholesale Buyer',
          shippingAddress: shippingAddress.trim() || 'Kathmandu, Nepal',
          orderPda: orderPdaString,
          signature: realSignature || undefined,
          blockchainOrderId: orderIdNumber,
          isSimulated,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create order record');
      }

      setSuccessMsg(`Order #${data.order.blockchainOrderId} created successfully! Redirecting...`);

      // Short delay for user feedback before redirecting to order dashboard
      setTimeout(() => {
        router.push(`/orders/${data.order.id}`);
      }, 1000);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setErrorMsg(err.message || 'An error occurred during order creation');
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
          <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100 h-96 shadow-xs">
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                (e.target as HTMLImageElement).src =
                  'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800';
              }}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-semibold px-2.5 py-1 rounded-md">
                {product.category}
              </span>
              {product.sku && (
                <span className="bg-slate-100 text-slate-700 text-xs font-mono font-medium px-2 py-0.5 rounded border border-slate-200">
                  SKU: {product.sku}
                </span>
              )}
              <span className="text-xs text-slate-500 font-medium">
                Verified Wholesale Consignment
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
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-xs">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-500" />
                Wholesale Supplier Details
              </h3>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Verified Supplier
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
                  {product.supplierLocation || 'Nepal'}
                </span>
              </div>
              <div className="sm:col-span-2">
                <span className="text-slate-400 block mb-0.5">Supplier Settlement Wallet</span>
                <code className="font-mono text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 block truncate">
                  {product.supplierWallet}
                </code>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Wholesale Order Form */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-xs sticky top-24">
          <div>
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
              Wholesale Pricing
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-3xl font-black text-slate-900">
                ${product.priceUsdc}
              </span>
              <span className="text-xs font-semibold text-slate-500">
                USDC / {product.unit}
              </span>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              ≈ NPR {product.priceNpr.toLocaleString()}
            </span>
          </div>

          <div className="space-y-4 pt-4 border-t border-slate-100">
            {/* Quantity Selector */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Consignment Quantity ({product.unit}s)
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.max(product.minOrder, prev - 1))}
                  disabled={quantity <= product.minOrder}
                  className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Minus className="w-4 h-4" />
                </button>
                <input
                  type="number"
                  min={product.minOrder}
                  max={product.availableStock}
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value, 10);
                    if (!isNaN(val)) setQuantity(val);
                  }}
                  className="w-full px-4 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500 text-center"
                  id="order-quantity-input"
                />
                <button
                  type="button"
                  onClick={() => setQuantity((prev) => Math.min(product.availableStock, prev + 1))}
                  disabled={quantity >= product.availableStock}
                  className="w-9 h-9 rounded-xl border border-slate-200 flex items-center justify-center text-slate-600 hover:bg-slate-50 disabled:opacity-40"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1.5">
                <span>MOQ: {product.minOrder} {product.unit}s</span>
                <span className="font-medium text-emerald-700">Available Stock: {product.availableStock} units</span>
              </div>
            </div>

            {/* Delivery Destination */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Receiving Warehouse / Delivery Destination
              </label>
              <input
                type="text"
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                placeholder="e.g. Kalanki Wholesale Depot, Kathmandu"
                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
                id="order-shipping-input"
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
              <span>Order Quantity</span>
              <span>{quantity} {product.unit}s</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Protocol Fee</span>
              <span className="text-emerald-700 font-semibold">0.00 USDC (Waived)</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
              <span>Total Settlement Value</span>
              <span className="text-emerald-700 font-black">${totalAmountUsdc.toFixed(2)} USDC</span>
            </div>
            <div className="text-right text-[11px] text-slate-400 font-mono">
              ≈ NPR {totalAmountNpr.toLocaleString()}
            </div>
          </div>

          {/* Alerts */}
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Self-trading Warning */}
          {isOwner && (
            <div className="p-3 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-center gap-2">
              <Building className="w-4 h-4 text-slate-500 shrink-0" />
              <span>You own this wholesale listing. Self-trading is prohibited by marketplace rules.</span>
            </div>
          )}

          {/* Unauthenticated notice */}
          {!user && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-2">
              <div className="flex items-start gap-2">
                <Building className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <div>
                  <strong className="block font-semibold">Business Account Required</strong>
                  Sign in or register a verified business profile to create wholesale escrow orders.
                </div>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <Link
                  href={`/login?redirect=/marketplace/${product.id}`}
                  className="px-3 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
                >
                  Sign In
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 rounded-lg bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-bold text-xs"
                >
                  Register Business
                </Link>
              </div>
            </div>
          )}

          {/* Escrow Guarantee Notice */}
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950 text-xs leading-relaxed flex items-start gap-2.5">
            <Lock className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-semibold">Program-Governed Escrow:</strong>
              Your payment will be locked into the Solana program vault. The supplier cannot withdraw funds until you confirm physical inspection.
            </div>
          </div>

          {/* Settlement Wallet Connection Indicator / Trigger */}
          {!connected ? (
            <button
              type="button"
              onClick={() => openWalletModal(true)}
              className="w-full py-2.5 rounded-xl border border-slate-300 hover:border-slate-400 bg-white text-slate-800 font-semibold text-xs transition-all flex items-center justify-center gap-2 shadow-2xs hover:bg-slate-50"
              id="btn-connect-wallet-detail"
            >
              <Wallet className="w-3.5 h-3.5 text-emerald-600" />
              <span>Connect Settlement Wallet</span>
            </button>
          ) : (
            <div className="flex items-center justify-between px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs">
              <div className="flex items-center gap-2 font-mono text-slate-800">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span className="font-bold text-[11px]">{shortenAddress(publicKey?.toBase58() || '', 4)}</span>
              </div>
              <span className="text-[10px] font-bold uppercase text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Solana Devnet
              </span>
            </div>
          )}

          {/* Action CTA: Place Order */}
          <button
            onClick={handleCreateOrder}
            disabled={creating || isOwner || Boolean(successMsg)}
            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-xs transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            id="btn-place-wholesale-order"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>{connected ? 'Submitting to Solana Devnet...' : 'Creating Order Record...'}</span>
              </>
            ) : isOwner ? (
              <span>Self-Trading Prohibited</span>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>
                  {connected
                    ? `Sign & Create Order (${totalAmountUsdc.toFixed(2)} USDC)`
                    : `Place Order (Draft - Connect Wallet to Sign)`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
