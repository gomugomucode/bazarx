'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { useWallet, useAnchorWallet } from '@solana/wallet-adapter-react';
import { useWalletModal } from '@solana/wallet-adapter-react-ui';
import { Order, OrderState } from '@/lib/types';
import { Timeline } from '@/components/Timeline';
import { OrderStatusBadge } from '@/components/OrderStatusBadge';
import { ConfirmModal } from '@/components/ConfirmModal';
import { TransactionStatus, TxLifecycleStage } from '@/components/TransactionStatus';
import {
  shortenAddress,
  getExplorerTxUrl,
  getExplorerAccountUrl,
  DEVNET_USDC_MINT,
  getConnection,
  getAnchorProgram,
  deriveVaultPda,
  getAssociatedTokenAccount,
  fetchOnChainOrder,
  fetchTokenBalance,
} from '@/lib/solana';
import { PublicKey, SystemProgram } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import {
  ShieldCheck,
  Lock,
  ExternalLink,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Truck,
  PackageCheck,
  CheckCheck,
  Copy,
  Check,
  Wallet,
  AlertTriangle,
  Info,
} from 'lucide-react';
import Link from 'next/link';

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { publicKey, connected } = useWallet();
  const anchorWallet = useAnchorWallet();
  const { setVisible: openWalletModal } = useWalletModal();

  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [copiedPda, setCopiedPda] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 6-State Transaction Lifecycle
  const [txStage, setTxStage] = useState<TxLifecycleStage>('ready');
  const [txActionTitle, setTxActionTitle] = useState<string>('Transaction');
  const [activeSignature, setActiveSignature] = useState<string | null>(null);

  // Confirmation Modal State for dangerous/irreversible operations
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    title: string;
    actionName: string;
    description: string;
    details: { label: string; value: string; isMono?: boolean }[];
    impactNotice?: string;
    nextState: OrderState;
    role: string;
    buttonText: string;
    buttonClass: string;
  } | null>(null);

  const [vaultUsdcBalance, setVaultUsdcBalance] = useState<number | null>(null);
  const [buyerUsdcBalance, setBuyerUsdcBalance] = useState<number | null>(null);
  const [onChainStateVerified, setOnChainStateVerified] = useState<boolean>(false);

  const fetchOrder = async () => {
    try {
      const res = await fetch(`/api/orders/${id}`);
      const data = await res.json();
      if (data.success) {
        setOrder(data.order);
      }
    } catch (err) {
      console.error('Failed to load order', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  // Real Solana Devnet RPC synchronization for settlement state & balances
  useEffect(() => {
    async function syncOnChain() {
      if (!order?.orderPda || order.orderPda.startsWith('PDA_')) return;
      try {
        const conn = getConnection();
        const orderPda = new PublicKey(order.orderPda);
        const [vaultPda] = deriveVaultPda(orderPda);

        // 1. Fetch on-chain order state
        const onChainOrder = await fetchOnChainOrder(orderPda, conn);
        if (onChainOrder) {
          const rawState = Object.keys(onChainOrder.state)[0];
          const capitalState = (rawState.charAt(0).toUpperCase() + rawState.slice(1)) as OrderState;
          if (capitalState !== order.state) {
            setOrder((prev) => (prev ? { ...prev, state: capitalState } : null));
          }
          setOnChainStateVerified(true);
        }

        // 2. Fetch vault token balance
        const vBal = await fetchTokenBalance(conn, vaultPda);
        setVaultUsdcBalance(vBal);

        // 3. Fetch buyer token balance
        if (publicKey) {
          const bAta = getAssociatedTokenAccount(publicKey, DEVNET_USDC_MINT);
          const bBal = await fetchTokenBalance(conn, bAta);
          setBuyerUsdcBalance(bBal);
        }
      } catch (e) {
        console.warn('Failed to sync on-chain data:', e);
      }
    }
    syncOnChain();
  }, [order?.orderPda, publicKey, order?.state]);

  if (loading) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-3">
        <div className="animate-spin rounded-full h-9 w-9 border-2 border-emerald-600 border-t-transparent mx-auto" />
        <p className="text-slate-500 text-xs font-medium">Querying Solana Devnet order state...</p>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-5xl mx-auto px-4 py-20 text-center space-y-4">
        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <p className="text-slate-800 font-bold text-base">Wholesale Order Not Found</p>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          The requested order ID does not exist in the registry or could not be loaded.
        </p>
        <Link
          href="/dashboard/buyer"
          className="inline-flex items-center gap-2 text-xs text-emerald-700 font-bold hover:underline pt-2"
        >
          <ArrowLeft className="w-4 h-4" /> Go to Buyer Orders
        </Link>
      </div>
    );
  }

  const handleCopyPda = () => {
    navigator.clipboard.writeText(order.orderPda);
    setCopiedPda(true);
    setTimeout(() => setCopiedPda(false), 2000);
  };

  // Trigger Confirmation Modal for high impact actions
  const triggerStepWithConfirmation = (
    nextState: OrderState,
    actionName: string,
    role: string,
    title: string,
    description: string,
    details: { label: string; value: string; isMono?: boolean }[],
    impactNotice: string,
    buttonText: string,
    buttonClass: string
  ) => {
    setConfirmModalData({
      isOpen: true,
      title,
      actionName,
      description,
      details,
      impactNotice,
      nextState,
      role,
      buttonText,
      buttonClass,
    });
  };

  // State Transition Actions
  const executeStep = async (nextState: OrderState, actionName: string, role: string) => {
    setErrorMsg(null);
    setActionInProgress(true);
    setTxActionTitle(actionName.replace('_', ' ').toUpperCase());
    setTxStage('waiting_approval');
    setActiveSignature(null);

    try {
      let realSignature = '';
      let isSimulated = true;

      if (anchorWallet && order.orderPda && !order.orderPda.startsWith('PDA_')) {
        try {
          const connection = getConnection();
          const program = getAnchorProgram(connection, anchorWallet);
          const orderPda = new PublicKey(order.orderPda);
          const mintPubkey = DEVNET_USDC_MINT;
          const [vaultPda] = deriveVaultPda(orderPda);

          let txSig = '';
          if (nextState === 'Accepted') {
            txSig = await program.methods
              .acceptOrder()
              .accounts({
                supplier: anchorWallet.publicKey,
                order: orderPda,
              })
              .rpc();
          } else if (nextState === 'Funded') {
            const buyerTokenAccount = getAssociatedTokenAccount(anchorWallet.publicKey, mintPubkey);
            txSig = await program.methods
              .fundEscrow()
              .accounts({
                buyer: anchorWallet.publicKey,
                order: orderPda,
                mint: mintPubkey,
                buyerTokenAccount,
                vault: vaultPda,
                tokenProgram: TOKEN_PROGRAM_ID,
                systemProgram: SystemProgram.programId,
              })
              .rpc();
          } else if (nextState === 'Shipped') {
            txSig = await program.methods
              .markShipped()
              .accounts({
                supplier: anchorWallet.publicKey,
                order: orderPda,
              })
              .rpc();
          } else if (nextState === 'Delivered') {
            txSig = await program.methods
              .confirmDelivery()
              .accounts({
                buyer: anchorWallet.publicKey,
                order: orderPda,
              })
              .rpc();
          } else if (nextState === 'Completed') {
            const supplierTokenAccount = getAssociatedTokenAccount(new PublicKey(order.supplierWallet), mintPubkey);
            txSig = await program.methods
              .releasePayment()
              .accounts({
                caller: anchorWallet.publicKey,
                order: orderPda,
                mint: mintPubkey,
                vault: vaultPda,
                supplierTokenAccount,
                tokenProgram: TOKEN_PROGRAM_ID,
              })
              .rpc();
          }

          realSignature = txSig;
          isSimulated = false;
          setActiveSignature(realSignature);

          // Transition to sending & confirming stage
          setTxStage('confirming');
          await connection.confirmTransaction(realSignature, 'confirmed');
          setTxStage('confirmed');
        } catch (chainErr: any) {
          console.error('Devnet transaction error:', chainErr);
          setTxStage('failed');
          const isUserRejected =
            chainErr.message?.toLowerCase().includes('reject') ||
            chainErr.message?.toLowerCase().includes('cancel') ||
            chainErr.message?.toLowerCase().includes('declined');
          setErrorMsg(
            isUserRejected
              ? 'Transaction was cancelled in the wallet.'
              : `On-chain transaction failed: ${chainErr.message || 'Transaction rejected by Solana runtime'}`
          );
          setActionInProgress(false);
          return;
        }
      } else {
        // Fallback for demonstration when no wallet is attached
        realSignature = `demo_preview_${nextState.toLowerCase()}_${Date.now()}`;
        isSimulated = true;
        setActiveSignature(realSignature);
        setTxStage('confirmed');
      }

      const res = await fetch(`/api/orders/${order.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nextState,
          signature: realSignature,
          signer: anchorWallet
            ? anchorWallet.publicKey.toBase58()
            : role === 'supplier'
            ? order.supplierWallet
            : order.buyerWallet,
          action: actionName,
          isSimulated,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Failed to update order state');
      }

      setOrder(data.order);
    } catch (err: any) {
      console.error('Error executing step:', err);
      setTxStage('failed');
      setErrorMsg(err.message || 'Failed to execute transaction');
    } finally {
      setActionInProgress(false);
    }
  };

  // Connected wallet authority detection
  const connectedAddress = publicKey ? publicKey.toBase58() : null;
  const isBuyerConnected = connectedAddress === order.buyerWallet;
  const isSupplierConnected = connectedAddress === order.supplierWallet;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Top Breadcrumb Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <Link
          href="/dashboard/buyer"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Orders Dashboard
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-400 font-mono">
            Blockchain Order #{order.blockchainOrderId}
          </span>
          <OrderStatusBadge state={order.state} size="md" />
        </div>
      </div>

      {/* Live Devnet Protocol Banner */}
      <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-2xl p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-emerald-950 text-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800 shrink-0 font-bold text-[10px] tracking-wider uppercase border border-emerald-200">
            Devnet
          </div>
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900">Solana Anchor Program:</span>
              <a
                href={getExplorerAccountUrl('BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN', 'devnet')}
                target="_blank"
                rel="noreferrer"
                className="font-mono font-semibold text-emerald-800 underline hover:text-emerald-950 inline-flex items-center gap-1"
              >
                BHHaiHFR...vQoN <ExternalLink className="w-2.5 h-2.5" />
              </a>
              <span className="text-slate-300">•</span>
              <span className="text-slate-600">
                Config PDA: <span className="font-mono font-semibold text-slate-900">DscHbC...VDDX</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 text-[11px] pt-0.5">
              <span className="bg-white/80 border border-emerald-200/60 px-2 py-0.5 rounded font-mono font-semibold text-slate-800">
                Vault Balance: {vaultUsdcBalance !== null ? `${vaultUsdcBalance} USDC` : '0 USDC'}
              </span>
              {buyerUsdcBalance !== null && (
                <span className="bg-white/80 border border-emerald-200/60 px-2 py-0.5 rounded font-mono font-semibold text-slate-800">
                  Buyer Balance: {buyerUsdcBalance} USDC
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 text-[11px] text-emerald-800 font-medium self-end md:self-auto">
          <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>{onChainStateVerified ? 'Verified via Solana RPC' : 'Syncing Devnet state...'}</span>
        </div>
      </div>

      {/* Main Order Header Card */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div>
            <span className="text-xs font-bold text-emerald-800 uppercase tracking-wider block mb-1">
              Wholesale Escrow Contract
            </span>
            <h1 className="text-2xl sm:text-3xl font-black text-slate-900">
              {order.productName}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Consignment: <strong>{order.quantity} {order.unit}s</strong> • Destination: <strong>{order.shippingAddress}</strong>
            </p>
          </div>

          <div className="text-left md:text-right">
            <span className="text-xs text-slate-400 font-medium block">Total Escrow Value</span>
            <div className="text-3xl font-black text-slate-900">
              ${order.amountUsdc}{' '}
              <span className="text-sm font-semibold text-emerald-600">USDC</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              On-Chain Settlement
            </span>
          </div>
        </div>

        {/* Cryptographic Key Details Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs font-mono">
          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px] font-sans">Buyer Authority</span>
            <a
              href={getExplorerAccountUrl(order.buyerWallet, 'devnet')}
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-semibold hover:text-emerald-700 flex items-center gap-1 truncate"
            >
              {shortenAddress(order.buyerWallet, 5)}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <span className="text-[10px] text-slate-400 block font-sans truncate">{order.buyerName}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px] font-sans">Supplier Authority</span>
            <a
              href={getExplorerAccountUrl(order.supplierWallet, 'devnet')}
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-semibold hover:text-emerald-700 flex items-center gap-1 truncate"
            >
              {shortenAddress(order.supplierWallet, 5)}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <span className="text-[10px] text-slate-400 block font-sans truncate">{order.supplierName}</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <div className="flex items-center justify-between font-sans">
              <span className="text-slate-400 text-[11px]">Order PDA Address</span>
              <button
                onClick={handleCopyPda}
                className="text-slate-400 hover:text-slate-700 transition-colors"
                title="Copy PDA Address"
              >
                {copiedPda ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </button>
            </div>
            <a
              href={getExplorerAccountUrl(order.orderPda, 'devnet')}
              target="_blank"
              rel="noreferrer"
              className="text-emerald-700 font-semibold hover:text-emerald-800 flex items-center gap-1 truncate"
            >
              {shortenAddress(order.orderPda, 5)}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <span className="text-[10px] text-slate-400 block font-sans">Derived on Solana</span>
          </div>

          <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
            <span className="text-slate-400 block text-[11px] font-sans">Settlement Token</span>
            <a
              href={getExplorerAccountUrl(DEVNET_USDC_MINT.toBase58(), 'devnet')}
              target="_blank"
              rel="noreferrer"
              className="text-slate-800 font-semibold hover:text-emerald-700 flex items-center gap-1 truncate"
            >
              {shortenAddress(DEVNET_USDC_MINT.toBase58(), 5)}
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
            <span className="text-[10px] text-emerald-800 block font-sans font-semibold">Devnet USDC (Circle)</span>
          </div>
        </div>
      </div>

      {/* Grid: Left = Action Operator Box, Right = Interactive Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Interactive Action Card for Current State */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-2xl border-2 border-slate-200 p-6 shadow-sm space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-bold text-sm text-slate-900">Next Action Required</h3>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                Stage: {order.state}
              </span>
            </div>

            {/* Reusable Transaction Lifecycle Status Banner */}
            {txStage !== 'ready' && (
              <TransactionStatus
                stage={txStage}
                actionTitle={txActionTitle}
                signature={activeSignature}
                errorMessage={errorMsg}
                onRetry={() => setTxStage('ready')}
                onDismiss={() => setTxStage('ready')}
              />
            )}

            {/* Error Message if not in transaction modal */}
            {errorMsg && txStage === 'ready' && (
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Wallet Disconnected Guard */}
            {!connected && order.state !== 'Completed' && (
              <div className="p-5 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center mx-auto">
                  <Wallet className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-xs text-slate-800">
                    Wallet Connection Required
                  </h4>
                  <p className="text-[11px] text-slate-500 max-w-xs mx-auto">
                    To sign on-chain actions for this wholesale order, please connect your Solana wallet.
                  </p>
                </div>
                <button
                  onClick={() => openWalletModal(true)}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-sm transition-all flex items-center justify-center gap-2"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  Connect Wallet to Continue
                </button>
              </div>
            )}

            {/* Connected Role Advice (if connected wallet doesn't match current actor) */}
            {connected && (
              <>
                {order.state === 'Created' && !isSupplierConnected && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Supplier signature required. Connected as{' '}
                      <code className="font-mono font-bold text-slate-800">
                        {shortenAddress(connectedAddress || '', 4)}
                      </code>
                      .
                    </span>
                  </div>
                )}
                {order.state === 'Accepted' && !isBuyerConnected && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 flex items-start gap-2">
                    <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                    <span>
                      Buyer escrow funding required. Connected as{' '}
                      <code className="font-mono font-bold text-slate-800">
                        {shortenAddress(connectedAddress || '', 4)}
                      </code>
                      .
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Stage 1: Created -> Next Action: Supplier Accepts */}
            {order.state === 'Created' && (
              <div className="space-y-4">
                <div className="p-4 bg-blue-50/60 border border-blue-200/80 rounded-xl text-xs text-blue-950 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span>Step 2: Supplier Acceptance</span>
                    <span className="text-[10px] bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                      Supplier Action
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-blue-900">
                    The buyer has created the order on Solana. The designated supplier must review
                    terms and sign the <code>accept_order</code> instruction on-chain.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => executeStep('Accepted', 'accept_order', 'supplier')}
                    disabled={actionInProgress || !connected}
                    className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionInProgress ? (
                      'Signing accept_order on Solana...'
                    ) : (
                      <>
                        <CheckCircle2 className="w-4 h-4" />
                        Sign: Accept Wholesale Order
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    Requires wallet signature • Commits stock &amp; dispatch SLA
                  </p>
                </div>
              </div>
            )}

            {/* Stage 2: Accepted -> Next Action: Buyer Funds Escrow */}
            {order.state === 'Accepted' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span>Step 3: Fund Escrow Vault</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Buyer Action
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-900">
                    Lock <strong>${order.amountUsdc}.00 USDC</strong> into the Solana escrow program vault.
                    Funds are program-governed and cannot be withdrawn by the supplier until delivery is confirmed.
                  </p>
                </div>

                {/* Devnet balance alert if insufficient */}
                {buyerUsdcBalance !== null && buyerUsdcBalance < order.amountUsdc && (
                  <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 space-y-2">
                    <div className="flex items-center gap-1.5 font-bold text-amber-950">
                      <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Test Devnet USDC Required to Fund Escrow</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Connected wallet balance: <strong>{buyerUsdcBalance} USDC</strong> (Required:{' '}
                      <strong>${order.amountUsdc} USDC</strong>).
                    </p>
                    <a
                      href="https://faucet.circle.com"
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-semibold text-xs transition-colors"
                    >
                      Request Circle Devnet USDC <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                )}

                <div className="space-y-2">
                  <button
                    onClick={() =>
                      triggerStepWithConfirmation(
                        'Funded',
                        'fund_escrow',
                        'buyer',
                        'Confirm Escrow Funding',
                        `You are locking $${order.amountUsdc} USDC into the non-custodial Solana smart contract vault for ${order.productName}.`,
                        [
                          { label: 'Commodity', value: order.productName },
                          { label: 'Quantity', value: `${order.quantity} ${order.unit}s` },
                          { label: 'Wholesale Amount', value: `$${order.amountUsdc}.00 USDC` },
                          { label: 'Order PDA', value: shortenAddress(order.orderPda, 6), isMono: true },
                        ],
                        'Funds remain secured in the program vault until you cryptographically confirm physical receipt.',
                        `Lock $${order.amountUsdc} USDC in Escrow`,
                        'bg-emerald-600 hover:bg-emerald-500'
                      )
                    }
                    disabled={actionInProgress || !connected}
                    className="w-full py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionInProgress ? (
                      'Transferring USDC to Escrow Vault...'
                    ) : (
                      <>
                        <Lock className="w-4 h-4" />
                        Fund Escrow (${order.amountUsdc} USDC)
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    Requires wallet signature • Transferred directly to program vault
                  </p>
                </div>
              </div>
            )}

            {/* Stage 3: Funded -> Next Action: Supplier Ships */}
            {order.state === 'Funded' && (
              <div className="space-y-4">
                <div className="p-4 bg-indigo-50/60 border border-indigo-200/80 rounded-xl text-xs text-indigo-950 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span>Step 4: Dispatch Freight</span>
                    <span className="text-[10px] bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded">
                      Supplier Action
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-indigo-900">
                    Escrow funds are verified and locked in the smart contract. Record that the supplier has dispatched this order via highway logistics.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => executeStep('Shipped', 'mark_shipped', 'supplier')}
                    disabled={actionInProgress || !connected}
                    className="w-full py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionInProgress ? (
                      'Recording Dispatch on Solana...'
                    ) : (
                      <>
                        <Truck className="w-4 h-4" />
                        Mark Shipped
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    Requires wallet signature • Records dispatch along trade corridor
                  </p>
                </div>
              </div>
            )}

            {/* Stage 4: Shipped -> Next Action: Buyer Confirms Delivery */}
            {order.state === 'Shipped' && (
              <div className="space-y-4">
                <div className="p-4 bg-teal-50/60 border border-teal-200/80 rounded-xl text-xs text-teal-950 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span>Step 5: Confirm Delivery</span>
                    <span className="text-[10px] bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                      Buyer Action
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-teal-900">
                    Confirm that the goods were received at the receiving depot. This allows settlement to proceed.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() => executeStep('Delivered', 'confirm_delivery', 'buyer')}
                    disabled={actionInProgress || !connected}
                    className="w-full py-3.5 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionInProgress ? (
                      'Confirming Delivery on Solana...'
                    ) : (
                      <>
                        <PackageCheck className="w-4 h-4" />
                        Confirm Delivery
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    Requires wallet signature • Buyer confirms physical condition
                  </p>
                </div>
              </div>
            )}

            {/* Stage 5: Delivered -> Next Action: Release Payment */}
            {order.state === 'Delivered' && (
              <div className="space-y-4">
                <div className="p-4 bg-emerald-50/60 border border-emerald-200/80 rounded-xl text-xs text-emerald-950 space-y-1.5">
                  <div className="flex items-center justify-between font-bold">
                    <span>Step 6: Release Escrow Payment</span>
                    <span className="text-[10px] bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                      Settlement Finalization
                    </span>
                  </div>
                  <p className="text-[11px] leading-relaxed text-emerald-900">
                    Release the escrowed ${order.amountUsdc} USDC to the supplier. This finalizes on-chain settlement.
                  </p>
                </div>

                <div className="space-y-2">
                  <button
                    onClick={() =>
                      triggerStepWithConfirmation(
                        'Completed',
                        'release_payment',
                        'supplier',
                        'Confirm Settlement Payout',
                        `This action invokes the release_payment instruction on Solana to transfer $${order.amountUsdc} USDC directly from the vault to the supplier.`,
                        [
                          { label: 'Amount to Release', value: `$${order.amountUsdc}.00 USDC` },
                          { label: 'Recipient Supplier', value: shortenAddress(order.supplierWallet, 6), isMono: true },
                          { label: 'Settlement Token', value: 'Circle Devnet USDC' },
                        ],
                        'This action is irreversible. The smart contract will transfer token authority to the supplier.',
                        `Release $${order.amountUsdc} USDC Payment`,
                        'bg-slate-900 hover:bg-slate-800'
                      )
                    }
                    disabled={actionInProgress || !connected}
                    className="w-full py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-sm hover:shadow transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {actionInProgress ? (
                      'Transferring USDC from Vault...'
                    ) : (
                      <>
                        <Lock className="w-4 h-4 text-emerald-400" />
                        Release Payment
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400">
                    Requires wallet signature • Automated transfer to supplier
                  </p>
                </div>
              </div>
            )}

            {/* Stage 6: Completed -> Settlement Done */}
            {order.state === 'Completed' && (
              <div className="p-5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2 text-center">
                <CheckCheck className="w-8 h-8 text-emerald-600 mx-auto" />
                <p className="font-bold text-sm text-emerald-950">Settlement Complete</p>
                <p className="text-[11px] text-emerald-800 leading-relaxed">
                  The smart contract has released ${order.amountUsdc} USDC to the supplier. All terms and delivery requirements satisfied on Solana Devnet.
                </p>
              </div>
            )}
          </div>

          {/* Non-Custodial Trust & Transparency Box */}
          <div className="p-4 rounded-xl bg-slate-900 text-slate-300 text-xs leading-relaxed space-y-2 border border-slate-800">
            <div className="flex items-center gap-2 text-emerald-400 font-bold">
              <ShieldCheck className="w-4 h-4" />
              Trustless Escrow Guarantee
            </div>
            <p className="text-[11px] text-slate-400">
              Funds are controlled by the Solana escrow program. Supplier payment is released only after delivery confirmation. Your wallet signs blockchain transactions directly — your funds are never held by BazaarX.
            </p>
          </div>
        </div>

        {/* Right Column: Visual Timeline */}
        <div className="lg:col-span-7">
          <Timeline order={order} />
        </div>
      </div>

      {/* Transaction Signatures Audit Trail */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <span>Transaction Ledger &amp; Cryptographic Audit Trail</span>
            <span className="text-[11px] font-mono text-slate-400 font-normal">
              ({order.transactions?.length || 0} records)
            </span>
          </h3>
          <span className="text-[10px] text-slate-400 font-mono">
            Solana Devnet Commitment: Confirmed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
              <tr>
                <th className="px-4 py-3">Lifecycle Step</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Signer Wallet</th>
                <th className="px-4 py-3">Explorer Verification</th>
                <th className="px-4 py-3 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {order.transactions && order.transactions.length > 0 ? (
                order.transactions.map((tx, i) => (
                  <tr key={i} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-semibold text-slate-800">
                      <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-[11px]">
                        {tx.step}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-slate-600">{tx.action}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">
                      {shortenAddress(tx.signer, 4)}
                    </td>
                    <td className="px-4 py-3">
                      {tx.isSimulated || !tx.explorerUrl ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200 font-mono text-[11px]">
                          Off-chain ({tx.signature})
                        </span>
                      ) : (
                        <a
                          href={tx.explorerUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-700 hover:text-emerald-800 font-bold hover:underline flex items-center gap-1 font-mono text-[11px]"
                        >
                          {shortenAddress(tx.signature, 6)}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-400">
                      {new Date(tx.timestamp).toLocaleString([], {
                        dateStyle: 'short',
                        timeStyle: 'medium',
                      })}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                    No transactions recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Confirmation Dialog Modal */}
      {confirmModalData && (
        <ConfirmModal
          isOpen={confirmModalData.isOpen}
          onClose={() => setConfirmModalData(null)}
          onConfirm={() => {
            const data = confirmModalData;
            setConfirmModalData(null);
            executeStep(data.nextState, data.actionName, data.role);
          }}
          title={confirmModalData.title}
          actionName={confirmModalData.actionName}
          description={confirmModalData.description}
          details={confirmModalData.details}
          impactNotice={confirmModalData.impactNotice}
          connectedWalletAddress={connectedAddress || undefined}
          confirmButtonText={confirmModalData.buttonText}
          confirmButtonClass={confirmModalData.buttonClass}
        />
      )}
    </div>
  );
}
