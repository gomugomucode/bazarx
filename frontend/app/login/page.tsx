'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Building2,
  AlertCircle,
  CheckCircle2,
  UserCheck,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

function LoginFormContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);

    try {
      const user = await login(email, password);
      
      // If a safe return redirect path was provided, use it
      const redirectTarget = searchParams.get('redirect');
      if (redirectTarget && redirectTarget.startsWith('/') && !redirectTarget.startsWith('//')) {
        router.push(redirectTarget);
        return;
      }

      // Role-aware redirection
      if (user.roles?.includes('SUPPLIER') && !user.roles?.includes('BUYER')) {
        router.push('/dashboard?role=SUPPLIER');
      } else if (user.roles?.includes('BUYER') && !user.roles?.includes('SUPPLIER')) {
        router.push('/dashboard?role=BUYER');
      } else {
        router.push('/dashboard');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Invalid email or password.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickFill = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('password123');
    setErrorMsg(null);
  };

  return (
    <div className="min-h-[80vh] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-xl shadow-md mx-auto">
          B<span className="text-white">X</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Sign In to BazaarX
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-sm mx-auto">
          Access your B2B wholesale dashboard, track orders, and manage trade settlements.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200 shadow-sm rounded-3xl space-y-6">
          {errorMsg && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Business Email Address
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="owner@company.com"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 py-3 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Accounts for Fast Testing */}
          <div className="pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block text-center">
              Quick Fill Demo Accounts (Testing)
            </span>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('buyer@bazarx.com')}
                className="py-1.5 px-2 rounded-lg border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 text-[11px] font-semibold text-slate-700 transition-colors text-center"
              >
                Buyer
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('supplier@bazarx.com')}
                className="py-1.5 px-2 rounded-lg border border-slate-200 hover:border-sky-300 hover:bg-sky-50/50 text-[11px] font-semibold text-slate-700 transition-colors text-center"
              >
                Supplier
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('admin@bazarx.com')}
                className="py-1.5 px-2 rounded-lg border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 text-[11px] font-semibold text-slate-700 transition-colors text-center"
              >
                Admin
              </button>
            </div>
          </div>

          {/* Register Prompt */}
          <div className="pt-2 text-center text-xs text-slate-500">
            Don&apos;t have an account yet?{' '}
            <Link
              href="/register"
              className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Create Business Account
            </Link>
          </div>
        </div>

        {/* Security Badge */}
        <div className="mt-6 text-center flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Non-custodial architecture • Settlement wallet connects inside</span>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[80vh] flex flex-col justify-center items-center py-12">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin" />
        </div>
      }
    >
      <LoginFormContent />
    </Suspense>
  );
}
