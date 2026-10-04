'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  ShieldCheck,
  Store,
  LayoutDashboard,
  Cpu,
  Menu,
  X,
  User,
  LogOut,
  ShoppingBag,
  HelpCircle,
  Package,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { WalletButton } from './WalletButton';
import { NetworkStatus } from './NetworkStatus';

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close mobile menu on route change
  useEffect(() => {
    setMobileMenuOpen(false);
  }, [pathname]);

  const handleLogout = async () => {
    await logout();
    router.push('/login');
  };

  // Logged-out links
  const publicLinks = [
    { name: 'Marketplace', href: '/marketplace', icon: Store },
    { name: 'How It Works', href: '/how-it-works', icon: HelpCircle },
  ];

  // Logged-in links
  const authenticatedLinks = [
    { name: 'Marketplace', href: '/marketplace', icon: Store },
    { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Orders', href: '/dashboard#orders', icon: Package },
    ...(user?.roles?.includes('ADMIN')
      ? [{ name: 'Admin', href: '/admin', icon: Cpu }]
      : []),
  ];

  const currentLinks = user ? authenticatedLinks : publicLinks;

  return (
    <>
      {/* Network Warning Banner if needed */}
      <NetworkStatus variant="banner" />

      <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-[0_1px_3px_rgba(0,0,0,0.02)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo & Tag */}
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-2 group">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-lg shadow-sm group-hover:scale-105 transition-transform">
                  B<span className="text-white">X</span>
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-slate-900 text-base tracking-tight">
                    BazaarX
                    <span className="text-[9px] font-bold tracking-wider uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                      Nepal B2B
                    </span>
                    <span className="text-[9px] font-mono font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 hidden sm:inline-block">
                      DEVNET
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium hidden md:block">
                    Non-Custodial Wholesale Settlement
                  </p>
                </div>
              </Link>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1">
              {currentLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  pathname === link.href ||
                  (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-950 font-bold'
                        : 'text-slate-600 hover:text-slate-950 hover:bg-slate-50'
                    }`}
                  >
                    <Icon
                      className={`w-3.5 h-3.5 ${
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    {link.name}
                  </Link>
                );
              })}
            </nav>

            {/* Right Actions */}
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="hidden lg:block">
                <NetworkStatus variant="badge" />
              </div>

              {mounted && !loading && (
                <>
                  {!user ? (
                    // LOGGED OUT: Show Login & Register (no wallet-as-login button)
                    <div className="flex items-center gap-2">
                      <Link
                        href="/login"
                        className="px-3.5 py-1.5 rounded-xl text-xs font-semibold text-slate-700 hover:text-slate-950 hover:bg-slate-100 transition-colors"
                      >
                        Login
                      </Link>
                      <Link
                        href="/register"
                        className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 shadow-sm transition-all"
                      >
                        Register
                      </Link>
                    </div>
                  ) : (
                    // LOGGED IN: Show Settlement Wallet, Profile, Logout
                    <div className="flex items-center gap-2 sm:gap-2.5">
                      {/* Settlement Wallet Button */}
                      <WalletButton />

                      {/* Profile Link */}
                      <Link
                        href="/profile"
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          pathname === '/profile'
                            ? 'bg-slate-100 border-slate-300 text-slate-950 font-bold'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-700'
                        }`}
                        title={`Logged in as ${user.businessName}`}
                      >
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        <span className="hidden sm:inline-block max-w-[120px] truncate">
                          {user.businessName}
                        </span>
                      </Link>

                      {/* Logout Button */}
                      <button
                        onClick={handleLogout}
                        className="p-1.5 sm:px-2.5 sm:py-1.5 rounded-xl text-xs font-medium text-slate-500 hover:text-rose-700 hover:bg-rose-50 transition-colors flex items-center gap-1"
                        title="Sign Out of BazaarX"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline-block">Logout</span>
                      </button>
                    </div>
                  )}
                </>
              )}

              {/* Mobile Hamburger Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                aria-label="Toggle Navigation Menu"
              >
                {mobileMenuOpen ? (
                  <X className="w-5 h-5" />
                ) : (
                  <Menu className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Mobile Navigation Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-5 space-y-3 animate-in slide-in-from-top-2 duration-150">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold text-slate-500">Navigation</span>
              <NetworkStatus variant="badge" />
            </div>

            <nav className="space-y-1">
              {currentLinks.map((link) => {
                const Icon = link.icon;
                const isActive =
                  pathname === link.href ||
                  (link.href !== '/' && pathname.startsWith(link.href));
                return (
                  <Link
                    key={link.name}
                    href={link.href}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors ${
                      isActive
                        ? 'bg-slate-100 text-slate-950 font-bold'
                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 ${
                        isActive ? 'text-emerald-600' : 'text-slate-400'
                      }`}
                    />
                    <span>{link.name}</span>
                  </Link>
                );
              })}

              {!user ? (
                <div className="pt-3 border-t border-slate-100 grid grid-cols-2 gap-2">
                  <Link
                    href="/login"
                    className="flex items-center justify-center py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-center"
                  >
                    Login
                  </Link>
                  <Link
                    href="/register"
                    className="flex items-center justify-center py-2 px-3 rounded-xl bg-slate-900 text-white text-xs font-bold text-center"
                  >
                    Register
                  </Link>
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-100 space-y-2">
                  <Link
                    href="/profile"
                    className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    <User className="w-4 h-4 text-slate-500" />
                    <span>Business Profile ({user.businessName})</span>
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-rose-700 hover:bg-rose-50"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Logout</span>
                  </button>
                </div>
              )}
            </nav>

            <div className="pt-2 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
              <span>BazaarX Smart Contract v1</span>
              <span className="font-mono">Solana Devnet</span>
            </div>
          </div>
        )}
      </header>
    </>
  );
};
