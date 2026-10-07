import React from 'react';
import Link from 'next/link';
import {
  ShieldCheck,
  Lock,
  ArrowRight,
  TrendingUp,
  Truck,
  CheckCircle2,
  Cpu,
  Layers,
  ShoppingBag,
  HelpCircle,
  Building2,
  FileCheck2,
  Boxes,
  ArrowUpRight,
  Coins,
} from 'lucide-react';
import { INITIAL_PRODUCTS } from '@/lib/mockData';

export default function HomePage() {
  const featuredProducts = INITIAL_PRODUCTS.slice(0, 3);

  const categories = [
    { name: 'Edible Oils', count: '12 Suppliers', icon: Boxes },
    { name: 'Grains & Pulses', count: '24 Suppliers', icon: Boxes },
    { name: 'Packaged Foods', count: '18 Suppliers', icon: Boxes },
    { name: 'Beverages', count: '9 Suppliers', icon: Boxes },
    { name: 'Packaging Materials', count: '15 Suppliers', icon: Boxes },
  ];

  const steps = [
    {
      num: '01',
      title: 'Wholesale Purchase Order',
      desc: 'Buyer specifies quantity, pricing, and supplier. The Anchor program records the order parameters on Solana.',
      icon: FileCheck2,
    },
    {
      num: '02',
      title: 'Escrow Vault Funding',
      desc: 'Buyer locks USDC into a program-owned vault PDA. Neither party nor BazaarX has custody of the funds.',
      icon: Lock,
    },
    {
      num: '03',
      title: 'Highway Freight Dispatch',
      desc: 'Supplier confirms funded escrow and dispatches cargo across Nepal trade corridors (e.g. Birgunj-Kathmandu).',
      icon: Truck,
    },
    {
      num: '04',
      title: 'Inspection & Instant Release',
      desc: 'Buyer inspects delivery at warehouse and confirms receipt. Smart contract automatically transfers funds to supplier.',
      icon: Coins,
    },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section - Clean Light Theme */}
      <section className="relative overflow-hidden bg-white border-b border-slate-200/80 pt-16 pb-20 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 bg-gradient-to-b from-slate-50/50 via-white to-slate-50/20 pointer-events-none" />
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold uppercase tracking-wider shadow-2xs">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Nepal&apos;s B2B Wholesale Settlement Protocol</span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]">
            Modern Wholesale Procurement with{' '}
            <span className="text-emerald-700">Protected Settlement</span>
          </h1>

          <p className="text-base sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
            Source commercial commodities directly from verified millers and distributors.
            Settle transactions with non-custodial Solana smart contract escrow — no middleman
            custody and zero credit default risk.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-3">
            <Link
              href="/marketplace"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-sm transition-all"
            >
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>Explore Marketplace</span>
            </Link>
            <Link
              href="/how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-semibold text-sm transition-all shadow-2xs"
            >
              <HelpCircle className="w-4 h-4 text-slate-500" />
              <span>How It Works</span>
            </Link>
          </div>

          {/* Key Metrics Strip */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-4xl mx-auto">
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-left">
              <span className="text-xl sm:text-2xl font-black text-slate-900 block">0%</span>
              <span className="text-xs text-slate-500 font-medium">Intermediary Custody</span>
            </div>
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-left">
              <span className="text-xl sm:text-2xl font-black text-emerald-700 block">~400ms</span>
              <span className="text-xs text-slate-500 font-medium">Solana Settlement Time</span>
            </div>
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-left">
              <span className="text-xl sm:text-2xl font-black text-slate-900 block">USDC</span>
              <span className="text-xs text-slate-500 font-medium">Stable Currency Unit</span>
            </div>
            <div className="bg-slate-50/80 p-3.5 rounded-xl border border-slate-200 text-left">
              <span className="text-xl sm:text-2xl font-black text-slate-900 block">Devnet</span>
              <span className="text-xs text-slate-500 font-medium">Verified Smart Contract</span>
            </div>
          </div>
        </div>
      </section>

      {/* Wholesale Category Shortcuts */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Wholesale Commodity Categories</h2>
            <p className="text-xs text-slate-500">Commercial bulk lots ready for enterprise dispatch</p>
          </div>
          <Link
            href="/marketplace"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            All Categories <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
          {categories.map((cat) => (
            <Link
              key={cat.name}
              href={`/marketplace?category=${encodeURIComponent(cat.name)}`}
              className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all flex flex-col justify-between"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center mb-3 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                <cat.icon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-slate-900 group-hover:text-emerald-800 transition-colors">
                  {cat.name}
                </h3>
                <span className="text-[11px] text-slate-500">{cat.count}</span>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* Featured Wholesale Products */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Featured Wholesale Commodities</h2>
            <p className="text-xs text-slate-500">Available from certified regional distributors</p>
          </div>
          <Link
            href="/marketplace"
            className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 inline-flex items-center gap-1"
          >
            View All ({INITIAL_PRODUCTS.length}) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredProducts.map((p) => (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs hover:shadow-sm hover:border-slate-300 transition-all flex flex-col justify-between"
            >
              <div>
                <div className="h-44 w-full bg-slate-100 relative overflow-hidden">
                  <img
                    src={p.imageUrl}
                    alt={p.name}
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute top-3 left-3 bg-white/95 backdrop-blur-xs px-2.5 py-0.5 rounded-md text-[10px] font-bold text-slate-700 border border-slate-200">
                    {p.category}
                  </div>
                </div>

                <div className="p-5 space-y-3">
                  <h3 className="text-sm font-bold text-slate-900 leading-snug line-clamp-1">
                    {p.name}
                  </h3>
                  <div className="text-xs text-slate-500 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{p.supplierName}</span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 flex items-baseline justify-between">
                    <div>
                      <span className="text-lg font-extrabold text-slate-900">
                        {p.priceUsdc} USDC
                      </span>
                      <span className="text-xs text-slate-400 ml-1">/ {p.unit}</span>
                    </div>
                    <span className="text-[11px] text-slate-500">
                      NPR {p.priceNpr.toLocaleString()}
                    </span>
                  </div>

                  <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                    <span>Min Order: <strong>{p.minOrder} {p.unit}</strong></span>
                    <span>Stock: <strong>{p.availableStock}</strong></span>
                  </div>
                </div>
              </div>

              <div className="p-5 pt-0">
                <Link
                  href={`/marketplace/${p.id}`}
                  className="w-full py-2.5 px-4 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-800 font-bold text-xs border border-slate-200 flex items-center justify-center gap-1.5 transition-colors"
                >
                  <span>View Wholesale Terms</span>
                  <ArrowUpRight className="w-3.5 h-3.5 text-slate-500" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 4-Step Trade Lifecycle */}
      <section className="bg-slate-50/70 py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto space-y-2 mb-12">
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              4-Step Protected Wholesale Trade Lifecycle
            </h2>
            <p className="text-xs sm:text-sm text-slate-600">
              Deterministic escrow guarantees delivery before funds are released to supplier accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {steps.map((st) => (
              <div
                key={st.num}
                className="bg-white rounded-xl p-5 border border-slate-200 space-y-3 relative shadow-2xs"
              >
                <div className="flex items-center justify-between">
                  <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center font-bold text-xs border border-emerald-100">
                    <st.icon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-mono font-bold text-slate-400">{st.num}</span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{st.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust & Risk Resolution Architecture */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-start">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              Counterparty Risk Resolution
            </div>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              Eliminating the B2B Wholesale Deadlock in Nepal
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
              When a retail buyer in Kathmandu procures 100 tins of cooking oil from a refinery in Birgunj,
              traditional options force one party to bear 100% of the financial risk:
            </p>
            <div className="space-y-2.5">
              <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <strong className="block text-amber-950 mb-0.5">Buyer Credit Risk:</strong>
                Paying 100% upfront risks supplier default, delayed consignments, or damaged goods along highway freight corridors.
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50/70 border border-rose-200 text-rose-900 text-xs leading-relaxed">
                <strong className="block text-rose-950 mb-0.5">Supplier Payment Default:</strong>
                Shipping on 30-to-60 day khata credit leads to working capital crunches, bounced cheques, and costly debt collections.
              </div>
            </div>
          </div>

          {/* Clean Light Architecture Card */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-2xs space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-700" />
                <h3 className="font-bold text-sm text-slate-900">Security Architecture &amp; Trust Boundaries</h3>
              </div>
              <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-semibold">
                Solana Anchor 0.30.1
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  On-Chain Solana Authority (Non-Custodial):
                </span>
                <ul className="text-slate-700 space-y-1 list-disc list-inside">
                  <li>Escrow token vault custody held exclusively by Anchor Program PDA</li>
                  <li>Funds cannot release without authentic buyer delivery receipt signature</li>
                  <li>Supplier payout routes deterministically to registered supplier wallet</li>
                </ul>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">
                  Off-Chain Database &amp; APIs (Metadata Only):
                </span>
                <ul className="text-slate-600 space-y-1 list-disc list-inside">
                  <li>Commodity catalogs, descriptions, and supplier company profiles</li>
                  <li>Transaction signature logs and delivery address metadata</li>
                  <li>Zero authority to initiate, redirect, or withdraw escrow funds</li>
                </ul>
              </div>
            </div>

            <p className="text-[11px] text-slate-500 leading-relaxed italic border-t border-slate-100 pt-3">
              * The backend database never has custody or transfer authority over funds. Even in the event of an API service interruption, escrowed funds remain safe inside the Solana program vault.
            </p>
          </div>
        </div>
      </section>

      {/* Clean Call to Action */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl p-8 sm:p-10 text-center border border-slate-200 shadow-2xs space-y-4">
          <h2 className="text-xl sm:text-2xl font-bold text-slate-900">
            Start Trading on BazaarX Wholesale
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto">
            Create an enterprise buyer or supplier account and begin executing non-custodial
            wholesale settlements with Solana smart contract security.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <Link
              href="/register"
              className="px-6 py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs shadow-xs transition-all"
            >
              Create Business Account
            </Link>
            <Link
              href="/marketplace"
              className="px-6 py-3 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-xs border border-slate-200 transition-all"
            >
              Browse Wholesale Marketplace
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
