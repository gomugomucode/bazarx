'use client';

import React, { useState, useEffect, useRef } from 'react';
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
  Wallet,
  ChevronDown,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { WalletButton } from './WalletButton';
import { SettlementWalletCard } from './SettlementWalletCard';

export const Navbar = () => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading, logout } = useAuth();
  const [mounted, setMounted] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);
  const userDropdownRef = useRef<HTMLDivElement>(null);
  const dropdownTimerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close menus on route change
  useEffect(() => {
    setMobileMenuOpen(false);
    setUserDropdownOpen(false);
  }, [pathname]);

  // Handle outside click & escape key for user dropdown
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        userDropdownRef.current &&
        !userDropdownRef.current.contains(e.target as Node)
      ) {
        setUserDropdownOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setUserDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
      if (dropdownTimerRef.current) {
        clearTimeout(dropdownTimerRef.current);
      }
    };
  }, []);

  const handleMouseEnter = () => {
    if (dropdownTimerRef.current) {
      clearTimeout(dropdownTimerRef.current);
      dropdownTimerRef.current = null;
    }
    setUserDropdownOpen(true);
  };

  const handleMouseLeave = () => {
    dropdownTimerRef.current = setTimeout(() => {
      setUserDropdownOpen(false);
    }, 200);
  };

  const handleToggleClick = () => {
    if (dropdownTimerRef.current) {
      clearTimeout(dropdownTimerRef.current);
      dropdownTimerRef.current = null;
    }
    setUserDropdownOpen((prev) => !prev);
  };

  const handleLogout = async () => {
    setUserDropdownOpen(false);
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
    { name: 'Orders', href: '/orders', icon: Package },
    ...(user?.roles?.includes('ADMIN')
      ? [{ name: 'Admin', href: '/admin', icon: Cpu }]
      : []),
  ];

  const currentLinks = user ? authenticatedLinks : publicLinks;

  return (
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
            {!mounted ? (
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
            ) : !loading && (
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
                  // LOGGED IN: Show Settlement Wallet & User Account Dropdown
                  <div className="flex items-center gap-2 sm:gap-2.5">
                    {/* Settlement Wallet Button */}
                    <WalletButton />

                    {/* User Icon & Username Dropdown Trigger (hover & click) */}
                    <div
                      className="relative"
                      ref={userDropdownRef}
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <button
                        type="button"
                        onClick={handleToggleClick}
                        className={`flex items-center gap-2 pl-2 pr-2.5 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                          userDropdownOpen || pathname === '/profile'
                            ? 'bg-slate-100 border-slate-300 text-slate-950 font-bold shadow-xs'
                            : 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                        }`}
                        id="user-profile-menu-button"
                        aria-haspopup="true"
                        aria-expanded={userDropdownOpen}
                        title={`Logged in as ${user.businessName || user.fullName}`}
                      >
                        <div className="w-6 h-6 rounded-lg bg-slate-100 text-slate-700 border border-slate-200/90 flex items-center justify-center shrink-0">
                          <User className="w-3.5 h-3.5" />
                        </div>
                        <span className="font-semibold text-slate-900 max-w-[120px] sm:max-w-[140px] truncate">
                          {user.businessName || user.fullName}
                        </span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 text-slate-400 shrink-0 transition-transform duration-200 ${
                            userDropdownOpen ? 'rotate-180 text-slate-700' : ''
                          }`}
                        />
                      </button>

                      {/* Dropdown Menu */}
                      {userDropdownOpen && (
                        <div
                          className="absolute right-0 top-full mt-1.5 w-60 sm:w-64 bg-white rounded-2xl border border-slate-200 shadow-xl py-2 px-2 z-50 animate-in fade-in-0 zoom-in-95 duration-150"
                          role="menu"
                          aria-orientation="vertical"
                          aria-labelledby="user-profile-menu-button"
                        >
                          {/* User Identity Header */}
                          <div className="px-2.5 py-2 border-b border-slate-100">
                            <p className="font-bold text-slate-900 text-xs truncate">
                              {user.businessName || user.fullName}
                            </p>
                            <p className="text-[11px] text-slate-500 font-mono truncate mt-0.5">
                              {user.email}
                            </p>
                            {user.roles && user.roles.length > 0 && (
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <span className="text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
                                  {user.roles[0]}
                                </span>
                              </div>
                            )}
                          </div>

                          {/* Dropdown Options */}
                          <div className="py-1 space-y-0.5">
                            <Link
                              href="/profile"
                              onClick={() => setUserDropdownOpen(false)}
                              className={`flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-colors ${
                                pathname === '/profile'
                                  ? 'bg-slate-100 text-slate-950 font-bold'
                                  : 'text-slate-700 hover:text-slate-950 hover:bg-slate-50'
                              }`}
                              role="menuitem"
                              id="dropdown-profile-link"
                            >
                              <div className="w-6 h-6 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-semibold text-slate-900">Profile</div>
                                <div className="text-[10px] text-slate-500 font-normal">Business & settlement settings</div>
                              </div>
                            </Link>
                          </div>

                          {/* Logout Button */}
                          <div className="pt-1 border-t border-slate-100">
                            <button
                              type="button"
                              onClick={handleLogout}
                              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 transition-colors text-left"
                              role="menuitem"
                              id="dropdown-logout-button"
                            >
                              <div className="w-6 h-6 rounded-lg bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
                                <LogOut className="w-3.5 h-3.5" />
                              </div>
                              <div className="flex-1 text-left">
                                <div className="font-semibold text-rose-700">Logout</div>
                                <div className="text-[10px] text-rose-400 font-normal">End your session</div>
                              </div>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
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
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block px-1">
                    Settlement Wallet
                  </span>
                  <SettlementWalletCard compact />
                </div>

                <Link
                  href="/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  <User className="w-4 h-4 text-slate-500" />
                  <span>Profile ({user.businessName})</span>
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
            <span>BazaarX Smart Contract</span>
            <span className="font-mono">v1.0</span>
          </div>
        </div>
      )}
    </header>
  );
};
