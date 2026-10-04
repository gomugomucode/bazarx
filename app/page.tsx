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
} from 'lucide-react';

export default function HomePage() {
  const steps = [
    {
      num: '01',
      title: 'Wholesale Order Creation',
      desc: 'Buyer specifies quantity, price, and designated supplier. The Anchor program mints an immutable Order PDA.',
    },
    {
      num: '02',
      title: 'Supplier Commitment',
      desc: 'Supplier cryptographically accepts the order, confirming stock availability and dispatch delivery SLA.',
    },
    {
      num: '03',
      title: 'USDC Program Escrow',
      desc: 'Buyer locks wholesale funds into a program-owned vault. The backend has zero custody or ability to touch funds.',
    },
    {
      num: '04',
      title: 'Highway Freight Dispatch',
      desc: 'Supplier dispatches consignment along Nepal trade corridors (e.g. Birgunj-Kathmandu, Butwal-Pokhara).',
    },
    {
      num: '05',
      title: 'Delivery Verification',
      desc: 'Buyer inspects delivered wholesale goods at receiving warehouse and cryptographically approves fulfillment.',
    },
    {
      num: '06',
      title: 'Instant Settlement',
      desc: 'Solana smart contract automatically releases the escrowed USDC directly to the supplier wallet.',
    },
  ];

  return (
    <div className="space-y-16 pb-20">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-slate-900 text-white pt-20 pb-24 px-4 sm:px-6 lg:px-8">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:16px_16px]"></div>
        
        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-950/80 border border-emerald-700/60 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Nepal&apos;s Programmable B2B Settlement Protocol
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            Trustless B2B <span className="text-emerald-400">Trade Settlement</span>
          </h1>

          <p className="text-lg sm:text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed font-normal">
            Buy wholesale with programmable escrow. Funds move only when the trade conditions
            are satisfied. The Solana smart contract, not an intermediary backend, controls
            custody and release.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
            <Link
              href="/marketplace"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-lg shadow-emerald-500/20 transition-all hover:scale-[1.02]"
            >
              <ShoppingBag className="w-4 h-4" />
              Browse Wholesale Marketplace
            </Link>
            <Link
              href="/orders/ord-1001"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white font-semibold text-sm transition-all"
            >
              View Live Escrow Lifecycle Demo
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {/* Value Badges */}
          <div className="pt-10 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-4xl mx-auto border-t border-slate-800/80">
            <div className="text-left bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold text-white block">0%</span>
              <span className="text-xs text-slate-400 font-medium">Intermediary Custody</span>
            </div>
            <div className="text-left bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold text-emerald-400 block">~400ms</span>
              <span className="text-xs text-slate-400 font-medium">Solana Settlement Time</span>
            </div>
            <div className="text-left bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold text-white block">100%</span>
              <span className="text-xs text-slate-400 font-medium">On-Chain State Machine</span>
            </div>
            <div className="text-left bg-slate-800/40 p-3.5 rounded-xl border border-slate-800">
              <span className="text-2xl font-bold text-emerald-400 block">USDC</span>
              <span className="text-xs text-slate-400 font-medium">Stable Value Currency</span>
            </div>
          </div>
        </div>
      </section>

      {/* The Problem & Trust Boundary */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <div className="space-y-5">
            <div className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              <ShieldCheck className="w-3.5 h-3.5" />
              The B2B Wholesale Trust Dilemma
            </div>
            <h2 className="text-3xl font-bold text-slate-900 tracking-tight">
              Solving the Wholesale Deadlock in Nepal
            </h2>
            <p className="text-slate-600 text-sm leading-relaxed">
              When a grocery retailer in Butwal buys 100 tins of cooking oil from a refinery in Birgunj,
              neither side wants to take counterparty risk:
            </p>
            <div className="space-y-3">
              <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                <strong>Buyer Risk:</strong> Paying 100% upfront risks supplier default, substandard grain/oil quality, or transit damage along the Narayanghat highway.
              </div>
              <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-900 text-xs leading-relaxed">
                <strong>Supplier Risk:</strong> Shipping on credit (30–60 day dhukuti/khata) leads to chronic payment defaults, working capital squeeze, and collections friction.
              </div>
            </div>
            <div className="p-4 rounded-xl bg-emerald-900 text-white text-xs leading-relaxed flex items-start gap-3">
              <Lock className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="block text-emerald-300 font-semibold mb-0.5">
                  BazaarX Smart Contract Solution:
                </strong>
                The buyer locks USDC into a program-owned vault. The supplier sees cryptographic proof
                of funds and ships. Payment releases instantly when the buyer confirms delivery.
              </div>
            </div>
          </div>

          {/* Architecture Card */}
          <div className="bg-slate-900 rounded-2xl p-6 text-white border border-slate-800 shadow-xl space-y-6">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div className="flex items-center gap-2">
                <Cpu className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-sm">Critical Trust Boundary</h3>
              </div>
              <span className="text-[11px] font-mono text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-800">
                Solana Anchor 0.30.1
              </span>
            </div>

            <div className="space-y-4 text-xs font-mono">
              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">On-Chain Solana Authority (Authoritative):</span>
                <ul className="text-emerald-400 space-y-1 list-disc list-inside">
                  <li>Order PDA State &amp; Lifecycle</li>
                  <li>Escrow Vault Token Custody</li>
                  <li>Buyer &amp; Supplier Wallet Keys</li>
                  <li>Agreed Price &amp; Approved Mint</li>
                  <li>Release &amp; Settlement Validation</li>
                </ul>
              </div>

              <div className="bg-slate-950 p-3.5 rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Off-Chain Database &amp; API (Metadata Only):</span>
                <ul className="text-slate-300 space-y-1 list-disc list-inside">
                  <li>Product Descriptions, SKUs &amp; Images</li>
                  <li>Supplier Location &amp; Catalog</li>
                  <li>Transaction Signatures Cache</li>
                  <li>Order Historical Logs</li>
                </ul>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 leading-relaxed italic">
              * The backend database never has authority to move escrow funds. Even if the backend server
              is breached, user funds cannot be stolen or redirected.
            </p>
          </div>
        </div>
      </section>

      {/* 6-Stage Settlement Walkthrough */}
      <section className="bg-white py-16 border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto space-y-3 mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
              The 6-Step Programmable Settlement Lifecycle
            </h2>
            <p className="text-slate-600 text-sm">
              How funds move from wholesale buyer commitment to automated supplier payout.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {steps.map((st) => (
              <div
                key={st.num}
                className="bg-slate-50 rounded-2xl p-6 border border-slate-200 hover:border-slate-300 hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <span className="text-2xl font-black text-emerald-600">{st.num}</span>
                  <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-xs">
                    BX
                  </div>
                </div>
                <h3 className="text-base font-bold text-slate-900">{st.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{st.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="bg-gradient-to-br from-slate-900 to-slate-950 text-white rounded-3xl p-8 sm:p-12 text-center space-y-6 shadow-xl border border-slate-800">
          <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
            Ready to Experience Programmable Wholesale Settlement?
          </h2>
          <p className="text-slate-300 text-sm max-w-2xl mx-auto leading-relaxed">
            Connect your Solana wallet, browse Nepal wholesale commodities, create a wholesale order,
            and inspect the verified on-chain state machine.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <Link
              href="/marketplace"
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-md transition-all"
            >
              Enter Wholesale Marketplace
            </Link>
            <Link
              href="/dashboard/buyer"
              className="px-6 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm border border-slate-700 transition-all"
            >
              Open Buyer Dashboard
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
