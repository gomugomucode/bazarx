'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import dynamic from 'next/dynamic';
import { ShieldCheck, Store, ShoppingBag, Truck, Cpu } from 'lucide-react';

// Dynamic import for Wallet button to avoid SSR hydration mismatch
const WalletMultiButtonDynamic = dynamic(
  async () =>
    (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { ssr: false }
);

export const Navbar = () => {
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const navLinks = [
    { name: 'Marketplace', href: '/marketplace', icon: Store },
    { name: 'Buyer Orders', href: '/dashboard/buyer', icon: ShoppingBag },
    { name: 'Supplier Hub', href: '/dashboard/supplier', icon: Truck },
    { name: 'On-Chain Protocol', href: '/admin', icon: Cpu },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo & Tag */}
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-xl shadow-sm group-hover:scale-105 transition-transform">
                B<span className="text-white">X</span>
              </div>
              <div>
                <div className="flex items-center gap-1.5 font-bold text-slate-900 text-lg tracking-tight">
                  BazaarX
                  <span className="text-[10px] font-semibold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">
                    Nepal B2B
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-medium hidden sm:block">
                  Trustless Wholesale Settlement
                </p>
              </div>
            </Link>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-slate-950 font-semibold'
                      : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                  {link.name}
                </Link>
              );
            })}
          </nav>

          {/* Right Actions: Network + Wallet */}
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-xs font-medium text-slate-700">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Solana Devnet
            </div>

            {mounted && <WalletMultiButtonDynamic />}
          </div>
        </div>
      </div>
    </header>
  );
};
