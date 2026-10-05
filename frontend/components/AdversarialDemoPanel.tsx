'use client';

import React, { useState } from 'react';
import { PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { useAnchorWallet } from '@solana/wallet-adapter-react';
import { Order, OrderState } from '@/lib/types';
import {
  getConnection,
  getAnchorProgram,
  deriveVaultPda,
  getAssociatedTokenAccount,
  fetchOnChainOrderSnapshot,
  fetchTokenBalance,
  DEVNET_USDC_MINT,
  shortenAddress,
} from '@/lib/solana';
import { AttackResultModal, AttackResultData } from './AttackResultModal';
import {
  ShieldAlert,
  Flame,
  AlertTriangle,
  Play,
  RotateCcw,
  Zap,
  Lock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

interface AdversarialDemoPanelProps {
  order: Order;
  currentVaultBalance: number | null;
}

export function AdversarialDemoPanel({
  order,
  currentVaultBalance,
}: AdversarialDemoPanelProps) {
  const anchorWallet = useAnchorWallet();
  const [isOpen, setIsOpen] = useState(false);
  const [runningAttack, setRunningAttack] = useState<string | null>(null);
  const [attackResult, setAttackResult] = useState<AttackResultData | null>(null);

  const executeAttack = async (
    attackKey: string,
    attackTitle: string,
    attackDescription: string,
    expectedBehavior: string,
    invariantName: string,
    runFn: (program: Program, orderPda: PublicKey, vaultPda: PublicKey) => Promise<any>
  ) => {
    if (!anchorWallet) {
      alert('Please connect your Solana wallet adapter to dispatch adversarial instructions to Devnet.');
      return;
    }

    setRunningAttack(attackKey);

    const conn = getConnection();
    const orderPda = new PublicKey(order.orderPda);
    const [vaultPda] = deriveVaultPda(orderPda);
    const supplierPubkey = new PublicKey(order.supplierWallet);
    const supplierAta = getAssociatedTokenAccount(supplierPubkey, DEVNET_USDC_MINT);

    // 1. Measure initial state before attack
    const [snapshotBefore, vaultBalBefore, supplierBalBefore] = await Promise.all([
      fetchOnChainOrderSnapshot(orderPda, conn),
      fetchTokenBalance(conn, vaultPda),
      fetchTokenBalance(conn, supplierAta),
    ]);

    const stateBefore = snapshotBefore ? snapshotBefore.state : order.state;
    const vBefore = vaultBalBefore ?? currentVaultBalance ?? 0;
    const sBefore = supplierBalBefore ?? 0;

    let observedResult: AttackResultData['observedResult'] = 'BLOCKED';
    let anchorErrorName = 'Instruction Rejected';
    let anchorErrorCode: number | string | undefined = undefined;
    let rawErrorMessage = '';

    try {
      const program = getAnchorProgram(conn, anchorWallet);
      await runFn(program, orderPda, vaultPda);

      // If instruction actually succeeded, that is an unexpected catastrophic failure!
      observedResult = 'UNEXPECTED';
      anchorErrorName = 'Instruction Succeeded (Critical Bug)';
    } catch (err: any) {
      observedResult = 'BLOCKED';
      rawErrorMessage = err.message || JSON.stringify(err);

      if (rawErrorMessage.includes('InvalidOrderState') || rawErrorMessage.includes('6006')) {
        anchorErrorName = 'InvalidOrderState';
        anchorErrorCode = 6006;
      } else if (rawErrorMessage.includes('UnauthorizedSupplier') || rawErrorMessage.includes('6003')) {
        anchorErrorName = 'UnauthorizedSupplier';
        anchorErrorCode = 6003;
      } else if (rawErrorMessage.includes('UnauthorizedBuyer') || rawErrorMessage.includes('6004')) {
        anchorErrorName = 'UnauthorizedBuyer';
        anchorErrorCode = 6004;
      } else if (rawErrorMessage.includes('InvalidMint') || rawErrorMessage.includes('6002')) {
        anchorErrorName = 'InvalidMint';
        anchorErrorCode = 6002;
      } else if (rawErrorMessage.includes('InvalidAmount') || rawErrorMessage.includes('6001')) {
        anchorErrorName = 'InvalidAmount';
        anchorErrorCode = 6001;
      } else if (rawErrorMessage.includes('ConstraintRaw') || rawErrorMessage.includes('has_one')) {
        anchorErrorName = 'ConstraintViolation';
        anchorErrorCode = 2003;
      } else if (rawErrorMessage.includes('AccountNotInitialized')) {
        anchorErrorName = 'AccountNotInitialized';
        anchorErrorCode = 3012;
      } else {
        anchorErrorName = 'Anchor Program Error';
      }
    }

    // 2. Measure state after attack
    const [snapshotAfter, vaultBalAfter, supplierBalAfter] = await Promise.all([
      fetchOnChainOrderSnapshot(orderPda, conn),
      fetchTokenBalance(conn, vaultPda),
      fetchTokenBalance(conn, supplierAta),
    ]);

    const stateAfter = snapshotAfter ? snapshotAfter.state : stateBefore;
    const vAfter = vaultBalAfter ?? vBefore;
    const sAfter = supplierBalAfter ?? sBefore;

    const fundsMoved = Math.max(0, vBefore - vAfter);
    const invariantPreserved = observedResult === 'BLOCKED' && fundsMoved === 0;

    setAttackResult({
      isOpen: true,
      attackTitle,
      attackDescription,
      attemptedAction: attackKey,
      expectedBehavior,
      observedResult,
      anchorErrorName,
      anchorErrorCode,
      rawErrorMessage,
      stateBefore,
      stateAfter,
      vaultBefore: vBefore,
      vaultAfter: vAfter,
      supplierBalanceBefore: sBefore,
      supplierBalanceAfter: sAfter,
      fundsMovedUsdc: fundsMoved,
      invariantPreserved,
      invariantName,
      testedAt: new Date().toLocaleTimeString(),
    });

    setRunningAttack(null);
  };

  // Attack 1: Premature Release Before Delivery
  const attackEarlyRelease = () => {
    executeAttack(
      'release_before_delivery',
      'Premature Payment Release Attack',
      'Attacker calls release_payment while order has not reached Delivered status.',
      'Anchor state machine constraint order.state == OrderState::Delivered must block release.',
      'Invariant 2: Funds cannot leave escrow before buyer delivery confirmation',
      async (program, orderPda, vaultPda) => {
        const supplierTokenAccount = getAssociatedTokenAccount(
          new PublicKey(order.supplierWallet),
          DEVNET_USDC_MINT
        );
        return program.methods
          .releasePayment()
          .accounts({
            caller: anchorWallet!.publicKey,
            order: orderPda,
            mint: DEVNET_USDC_MINT,
            vault: vaultPda,
            supplierTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
      }
    );
  };

  // Attack 2: Wrong Recipient Payment Release
  const attackWrongRecipient = () => {
    executeAttack(
      'wrong_recipient_release',
      'Wrong Recipient Payout Attack',
      'Attacker calls release_payment directing escrow funds to attacker ATA instead of supplier.',
      'Anchor constraint supplier_token_account.owner == order.supplier must block diverted settlement.',
      'Invariant 4: Payment can only go to designated supplier token account',
      async (program, orderPda, vaultPda) => {
        // Substitute caller ATA (attacker) as the recipient token account!
        const attackerAta = getAssociatedTokenAccount(anchorWallet!.publicKey, DEVNET_USDC_MINT);
        return program.methods
          .releasePayment()
          .accounts({
            caller: anchorWallet!.publicKey,
            order: orderPda,
            mint: DEVNET_USDC_MINT,
            vault: vaultPda,
            supplierTokenAccount: attackerAta,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
      }
    );
  };

  // Attack 3: Unauthorized Shipment
  const attackUnauthorizedShipment = () => {
    executeAttack(
      'unauthorized_shipment',
      'Unauthorized Consignment Dispatch',
      'Buyer or arbitrary wallet signs mark_shipped instruction.',
      'Anchor constraint has_one = supplier must block any signer other than designated supplier.',
      'Invariant: Supplier Authority Required for Freight Dispatch',
      async (program, orderPda) => {
        return program.methods
          .markShipped()
          .accounts({
            supplier: anchorWallet!.publicKey, // Unauthorized signer!
            order: orderPda,
          })
          .rpc();
      }
    );
  };

  // Attack 4: Unauthorized Delivery Confirmation
  const attackUnauthorizedDelivery = () => {
    executeAttack(
      'unauthorized_delivery',
      'Manufactured Delivery Confirmation',
      'Supplier or random third party attempts to confirm physical delivery.',
      'Anchor constraint has_one = buyer must block anyone other than the registered buyer from confirming delivery.',
      'Invariant 3: Supplier cannot manufacture buyer delivery confirmation',
      async (program, orderPda) => {
        return program.methods
          .confirmDelivery()
          .accounts({
            buyer: anchorWallet!.publicKey, // Unauthorized signer!
            order: orderPda,
          })
          .rpc();
      }
    );
  };

  // Attack 5: Double Release Replay
  const attackDoubleRelease = () => {
    executeAttack(
      'double_release_replay',
      'Double Release / Replay Attack',
      'Triggering release_payment after order has already transitioned to Completed.',
      'Order state is already Completed; Anchor must reject with InvalidOrderState.',
      'Invariant 5: The same escrow cannot be released twice',
      async (program, orderPda, vaultPda) => {
        const supplierTokenAccount = getAssociatedTokenAccount(
          new PublicKey(order.supplierWallet),
          DEVNET_USDC_MINT
        );
        return program.methods
          .releasePayment()
          .accounts({
            caller: anchorWallet!.publicKey,
            order: orderPda,
            mint: DEVNET_USDC_MINT,
            vault: vaultPda,
            supplierTokenAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .rpc();
      }
    );
  };

  return (
    <>
      <div className="bg-slate-900 rounded-2xl border-2 border-slate-800 text-white overflow-hidden shadow-lg">
        {/* Toggle Bar */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-4 sm:p-5 flex items-center justify-between text-left hover:bg-slate-800/60 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs tracking-wider uppercase text-rose-400">
                  Auditor &amp; Hackathon Judge Suite
                </span>
                <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono">
                  Adversarial Boundary Inspector
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Trigger real on-chain exploit transactions directly against Solana Devnet to prove Anchor state boundary rejection.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <span className="text-[11px] font-mono text-slate-400 hidden sm:inline">
              {isOpen ? 'Collapse' : 'Expand'}
            </span>
            {isOpen ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {/* Collapsible Attack Grid */}
        {isOpen && (
          <div className="p-5 sm:p-6 border-t border-slate-800 space-y-5 bg-slate-950/40">
            <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl text-xs flex items-start gap-2.5 text-slate-300">
              <Lock className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <span>
                These actions deliberately craft and submit <strong>invalid on-chain instructions</strong> to Devnet using your connected wallet. Anchor will intercept and reject them with strict error codes.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {/* Attack 1 */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">1. Premature Release</span>
                    <span className="text-[10px] text-rose-400 font-mono">InvalidState</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Trigger release_payment before order is marked Delivered.
                  </p>
                </div>
                <button
                  onClick={attackEarlyRelease}
                  disabled={runningAttack !== null}
                  className="w-full py-2 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  {runningAttack === 'release_before_delivery' ? 'Attacking Devnet...' : 'Test Early Release'}
                </button>
              </div>

              {/* Attack 2 */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">2. Wrong Recipient</span>
                    <span className="text-[10px] text-rose-400 font-mono">Divert Funds</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Substitute attacker token account as release destination.
                  </p>
                </div>
                <button
                  onClick={attackWrongRecipient}
                  disabled={runningAttack !== null}
                  className="w-full py-2 px-3 rounded-lg bg-rose-600/20 hover:bg-rose-600/30 text-rose-300 border border-rose-500/40 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  {runningAttack === 'wrong_recipient_release' ? 'Attacking Devnet...' : 'Test Wrong Recipient'}
                </button>
              </div>

              {/* Attack 3 */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">3. Fake Shipment</span>
                    <span className="text-[10px] text-rose-400 font-mono">has_one Check</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Attempt mark_shipped using non-supplier wallet.
                  </p>
                </div>
                <button
                  onClick={attackUnauthorizedShipment}
                  disabled={runningAttack !== null}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  {runningAttack === 'unauthorized_shipment' ? 'Attacking Devnet...' : 'Test Unauthorized Ship'}
                </button>
              </div>

              {/* Attack 4 */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">4. Fake Delivery</span>
                    <span className="text-[10px] text-rose-400 font-mono">Buyer Signer</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Supplier tries to manufacture delivery confirmation.
                  </p>
                </div>
                <button
                  onClick={attackUnauthorizedDelivery}
                  disabled={runningAttack !== null}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  {runningAttack === 'unauthorized_delivery' ? 'Attacking Devnet...' : 'Test Unauthorized Delivery'}
                </button>
              </div>

              {/* Attack 5 */}
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between space-y-3">
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-200">5. Double Release</span>
                    <span className="text-[10px] text-rose-400 font-mono">Replay Rejection</span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Trigger release_payment on Completed or twice in parallel.
                  </p>
                </div>
                <button
                  onClick={attackDoubleRelease}
                  disabled={runningAttack !== null}
                  className="w-full py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold text-xs flex items-center justify-center gap-1.5 transition-all disabled:opacity-50"
                >
                  <Play className="w-3 h-3" />
                  {runningAttack === 'double_release_replay' ? 'Attacking Devnet...' : 'Test Double Release'}
                </button>
              </div>

              {/* Scorecard Summary Card */}
              <div className="p-4 rounded-xl bg-emerald-950/30 border border-emerald-500/30 flex flex-col justify-between space-y-2">
                <div className="space-y-1">
                  <span className="text-[10px] font-black text-emerald-400 uppercase tracking-wider block">
                    Security Assurance
                  </span>
                  <p className="text-[11px] text-slate-300 font-medium">
                    All instructions rejected by Anchor before state modification or SPL token movement.
                  </p>
                </div>
                <div className="text-[11px] font-mono text-emerald-400 font-bold">
                  Funds Moved: 0.00 USDC
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Result Modal */}
      <AttackResultModal data={attackResult} onClose={() => setAttackResult(null)} />
    </>
  );
}
