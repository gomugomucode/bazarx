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
  const [showWalletPrompt, setShowWalletPrompt] = useState(false);

  // Transaction stage tracking
  const [txStage, setTxStage] = useState<TxLifecycleStage>('ready');
  const [txSig, setTxSig] = useState<string | null>(null);

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
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="animate-spin rounded-full h-9 w-9 border-2 border-emerald-600 border-t-transparent mx-auto" />
        <p className="text-slate-500 text-xs font-medium">Loading wholesale commodity details...</p>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
        <p className="text-slate-700 font-bold">Wholesale Commodity Not Found</p>
        <Link
          href="/marketplace"
          className="inline-flex items-center gap-2 text-xs text-emerald-700 font-bold hover:underline"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Wholesale Marketplace
        </Link>
      </div>
    );
  }

  const totalAmountUsdc = product.priceUsdc * quantity;
  const totalAmountNpr = product.priceNpr * quantity;

  const handleCreateOrder = async () => {
    // Protected action: Creating wholesale order requires authenticated business account
    if (!user) {
      router.push(`/login?redirect=/marketplace/${id}`);
      return;
    }

    // Settlement Wallet: If wallet is disconnected, show clean wallet connection prompt
    if (!connected || !publicKey) {
      setShowWalletPrompt(true);
      return;
    }

    setErrorMsg(null);
    setCreating(true);
    setTxStage('waiting_approval');
    setTxSig(null);

    try {
      const orderIdNumber = Math.floor(1000 + Math.random() * 9000);
      const buyerPubkey = publicKey;

      // Derive Order PDA
      let orderPdaString = 'PDA_Pending';
      let realSignature = '';
      let isSimulated = true;

      if (buyerPubkey && anchorWallet) {
        try {
          const connection = getConnection();
          const program = getAnchorProgram(connection, anchorWallet);
          const [configPda] = deriveConfigPda();
          const [orderPda] = deriveOrderPda(buyerPubkey, orderIdNumber);
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
              buyer: buyerPubkey,
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
          console.error('Solana Devnet transaction error:', chainErr);
          setTxStage('failed');
          const isUserRejected =
            chainErr.message?.toLowerCase().includes('reject') ||
            chainErr.message?.toLowerCase().includes('cancel') ||
            chainErr.message?.toLowerCase().includes('declined') ||
            chainErr.message?.toLowerCase().includes('user rejected');
          setErrorMsg(
            isUserRejected
              ? 'Transaction cancelled'
              : `On-chain order creation failed: ${chainErr.message || 'Transaction rejected by Devnet runtime'}`
          );
          setCreating(false);
          return;
        }
      } else {
        setErrorMsg('Please connect your Solana wallet to create an on-chain order on Devnet.');
        setTxStage('failed');
        setCreating(false);
        return;
      }

      // Sync with backend order registry
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id,
          quantity,
          buyerWallet: buyerPubkey.toBase58(),
          buyerName: user?.businessName || user?.fullName || 'Wholesale Buyer',
          shippingAddress,
          orderPda: orderPdaString,
          signature: realSignature,
          blockchainOrderId: orderIdNumber,
          isSimulated,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to create order record');
      }

      // Short delay for user to see confirmed status before navigating
      setTimeout(() => {
        router.push(`/orders/${data.order.id}`);
      }, 1200);
    } catch (err: any) {
      console.error('Order creation error:', err);
      setTxStage('failed');
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
          <div className="bg-white rounded-2xl p-6 border border-slate-200 space-y-4 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Building className="w-4 h-4 text-slate-500" />
                Wholesale Supplier Details
              </h3>
              <span className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
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
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 space-y-6 shadow-sm sticky top-24">
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
              ≈ Rs. {product.priceNpr.toLocaleString()} NPR
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
                  onChange={(e) =>
                    setQuantity(
                      Math.max(product.minOrder, parseInt(e.target.value) || product.minOrder)
                    )
                  }
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs sm:text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1">
                <span>MOQ: {product.minOrder} {product.unit}s</span>
                <span>Available Stock: {product.availableStock} units</span>
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
              <span>Order Quantity</span>
              <span>{quantity} {product.unit}s</span>
            </div>
            <div className="flex justify-between text-slate-500">
              <span>Settlement Protocol Fee</span>
              <span className="text-emerald-700 font-semibold">0.00 USDC (Promo)</span>
            </div>
            <div className="pt-2 border-t border-slate-200 flex justify-between font-bold text-sm text-slate-900">
              <span>Total Settlement Value</span>
              <span className="text-emerald-700 font-black">${totalAmountUsdc} USDC</span>
            </div>
            <div className="text-right text-[11px] text-slate-400 font-mono">
              ≈ Rs. {totalAmountNpr.toLocaleString()} NPR
            </div>
          </div>

          {/* Transaction Stage Component */}
          {txStage !== 'ready' && (
            <TransactionStatus
              stage={txStage}
              actionTitle="Create Order"
              signature={txSig}
              errorMessage={errorMsg}
              onRetry={() => setTxStage('ready')}
              onDismiss={() => setTxStage('ready')}
            />
          )}

          {/* Clean Disconnected Wallet Prompt Modal / Banner */}
          {showWalletPrompt && !connected && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-950 text-xs space-y-3 animate-in fade-in duration-150">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <h4 className="font-bold text-xs">Wallet Connection Required</h4>
                  <p className="text-[11px] text-amber-800 mt-0.5 leading-relaxed">
                    Placing a wholesale order creates an on-chain Order PDA derived from your buyer wallet public key. Please connect your wallet to proceed.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowWalletPrompt(false);
                  openWalletModal(true);
                }}
                className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                <Wallet className="w-4 h-4 text-emerald-400" />
                Connect Solana Wallet
              </button>
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

          {/* Connected Buyer Indicator */}
          {connected && publicKey && (
            <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
              <span className="flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" /> Buyer Signer:
              </span>
              <span className="font-mono font-bold text-slate-800">
                {shortenAddress(publicKey.toBase58(), 5)}
              </span>
            </div>
          )}

          {/* Action CTA: Create Order */}
          <button
            onClick={handleCreateOrder}
            disabled={creating}
            className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {creating ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Signing create_order on Devnet...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Create Order (${totalAmountUsdc} USDC)</span>
              </>
            )}
          </button>

          <p className="text-[11px] text-center text-slate-400">
            Signs <code>create_order</code> on the Solana program • Zero custodial intermediary
          </p>
        </div>
      </div>
    </div>
  );
}
