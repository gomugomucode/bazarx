import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  Truck,
  CheckCircle2,
  FileCheck,
  Building2,
  ShoppingBag,
  Coins,
  Cpu,
} from 'lucide-react';

export default function HowItWorksPage() {
  const steps = [
    {
      num: '01',
      title: 'Business Registration & Profile Verification',
      role: 'Buyer & Supplier',
      icon: Building2,
      desc: 'Register as a wholesale Buyer or verified Supplier. Provide required Nepal business credentials (Citizenship, PAN, business details). Profiles undergo compliance review.',
    },
    {
      num: '02',
      title: 'Wholesale Purchase & Order Commitment',
      role: 'Buyer & Supplier',
      icon: ShoppingBag,
      desc: 'Buyers browse the marketplace and generate formal purchase orders with specified quantity, unit pricing, and delivery terms. The supplier reviews and accepts.',
    },
    {
      num: '03',
      title: 'Settlement Wallet Escrow Funding',
      role: 'Buyer & Solana Devnet Escrow',
      icon: Lock,
      desc: 'The buyer connects their Solana settlement wallet and locks USDC into a program-derived vault account (PDA). BazaarX retains zero custody—the smart contract holds the escrow.',
    },
    {
      num: '04',
      title: 'Nepal Trade Corridor Freight Dispatch',
      role: 'Supplier',
      icon: Truck,
      desc: 'With payment cryptographically guaranteed in escrow, the supplier dispatches cargo along highway freight routes (e.g. Birgunj-Kathmandu, Biratnagar, Butwal-Pokhara).',
    },
    {
      num: '05',
      title: 'Warehouse Inspection & Fulfillment Receipt',
      role: 'Buyer',
      icon: FileCheck,
      desc: 'Upon warehouse arrival, the buyer inspects goods for quality and quantity. Once verified, the buyer confirms fulfillment on-chain.',
    },
    {
      num: '06',
      title: 'Automated Non-Custodial Settlement',
      role: 'Anchor Program State Machine',
      icon: Coins,
      desc: 'The Solana escrow program verifies the delivery signature and automatically transfers the locked USDC funds directly to the supplier’s settlement wallet.',
    },
  ];

  return (
    <div className="py-12 sm:py-16 space-y-16 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="text-center space-y-4 max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
          Zero-Custody Wholesale Protocol
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          How BazaarX Protects B2B Wholesale Trade
        </h1>
        <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
          Traditional wholesale trade in Nepal relies on risky cash advances, post-dated cheques, or informal trust.
          BazaarX combines verified B2B profiles with non-custodial Solana escrow so neither party takes credit risk.
        </p>
      </div>

      {/* Steps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {steps.map((step) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs relative overflow-hidden flex flex-col justify-between hover:border-slate-300 transition-all"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-2xl font-black text-slate-200">
                    {step.num}
                  </span>
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {step.role}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center shrink-0">
                    <Icon className="w-5 h-5" />
                  </div>
                  <h3 className="text-base sm:text-lg font-bold text-slate-900">
                    {step.title}
                  </h3>
                </div>

                <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                  {step.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Architecture Comparison: Application vs Blockchain */}
      <div className="bg-white rounded-3xl p-8 sm:p-10 space-y-6 border border-slate-200 shadow-2xs">
        <div className="max-w-2xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <Cpu className="w-4 h-4 text-emerald-600" /> Architectural Boundary
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Application Identity vs Settlement Signer
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
            BazaarX separates business identity from cryptographic signing. Application authentication lets you manage your enterprise workflows without needing your hardware wallet connected at all times.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
            <div className="text-emerald-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Application Layer
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Handles email authentication, business profile verification, product cataloging, and dashboard views. No blockchain private keys or seed phrases are ever held or accessed.
            </p>
          </div>
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
            <div className="text-emerald-800 font-bold text-xs uppercase tracking-wider flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-emerald-600" /> Solana Settlement Layer
            </div>
            <p className="text-xs text-slate-600 leading-relaxed">
              Your Solana settlement wallet signs high-value financial actions directly on-chain: funding escrow, accepting orders, and releasing funds via Anchor program PDAs.
            </p>
          </div>
        </div>

        <div className="pt-4 flex flex-col sm:flex-row items-center gap-3">
          <Link
            href="/register"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-2xs"
          >
            <span>Create Business Account</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link
            href="/marketplace"
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-all"
          >
            Browse Marketplace
          </Link>
        </div>
      </div>
    </div>
  );
}
