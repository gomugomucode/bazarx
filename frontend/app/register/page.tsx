'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ShoppingBag,
  Truck,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Lock,
  User,
  Building,
  Mail,
  Phone,
  FileText,
  CreditCard,
  Info,
} from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';

export default function RegisterPage() {
  const router = useRouter();
  const { register } = useAuth();

  const [selectedRole, setSelectedRole] = useState<'BUYER' | 'SUPPLIER'>('BUYER');
  const [fullName, setFullName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [citizenshipNumber, setCitizenshipNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    // Validation
    if (fullName.trim().length < 2) {
      setErrorMsg('Full Name must be at least 2 characters');
      return;
    }
    if (businessName.trim().length < 2) {
      setErrorMsg('Business Name must be at least 2 characters');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim().toLowerCase())) {
      setErrorMsg('Please enter a valid business email address');
      return;
    }
    if (phone.trim().length < 7) {
      setErrorMsg('Please enter a valid telephone/mobile number');
      return;
    }
    if (citizenshipNumber.trim().length < 5) {
      setErrorMsg('Please enter a valid Citizenship Certificate Number');
      return;
    }
    if (selectedRole === 'SUPPLIER' && (!panNumber || panNumber.trim().length < 5)) {
      setErrorMsg('Permanent Account Number (PAN) is required for wholesale suppliers');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('Password must be at least 6 characters long');
      return;
    }
    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      const newUser = await register({
        role: selectedRole,
        fullName: fullName.trim(),
        businessName: businessName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(),
        citizenshipNumber: citizenshipNumber.trim(),
        panNumber: panNumber ? panNumber.trim() : undefined,
        password,
      });

      // Role-resolved redirect
      if (newUser.roles?.includes('SUPPLIER') && !newUser.roles?.includes('BUYER')) {
        router.push('/dashboard?role=SUPPLIER');
      } else {
        router.push('/dashboard?role=BUYER');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Registration failed. Please review your details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[85vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-2xl text-center space-y-3">
        <div className="w-12 h-12 rounded-2xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-xl shadow-md mx-auto">
          B<span className="text-white">X</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Create Your BazaarX Account
        </h1>
        <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
          Join Nepal&apos;s B2B wholesale marketplace with programmable Solana escrow settlement.
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-2xl">
        <div className="bg-white py-8 px-6 sm:px-10 border border-slate-200 shadow-sm rounded-3xl space-y-8">
          {errorMsg && (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Question 1: Role Selection */}
          <div className="space-y-3">
            <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
              1. What are you registering as?
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setSelectedRole('BUYER')}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                  selectedRole === 'BUYER'
                    ? 'border-emerald-600 bg-emerald-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      selectedRole === 'BUYER'
                        ? 'bg-slate-900 text-emerald-400'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  {selectedRole === 'BUYER' && (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Wholesale Buyer</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Purchase wholesale goods from verified suppliers with on-chain escrow protection.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('SUPPLIER')}
                className={`p-4 rounded-2xl border-2 text-left transition-all flex flex-col justify-between ${
                  selectedRole === 'SUPPLIER'
                    ? 'border-sky-600 bg-sky-50/40 shadow-sm'
                    : 'border-slate-200 hover:border-slate-300 bg-white'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className={`w-9 h-9 rounded-xl flex items-center justify-center ${
                      selectedRole === 'SUPPLIER'
                        ? 'bg-slate-900 text-sky-400'
                        : 'bg-slate-100 text-slate-600'
                    }`}
                  >
                    <Truck className="w-4 h-4" />
                  </div>
                  {selectedRole === 'SUPPLIER' && (
                    <CheckCircle2 className="w-4 h-4 text-sky-600" />
                  )}
                </div>
                <div>
                  <h3 className="font-bold text-sm text-slate-900">Wholesale Supplier</h3>
                  <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                    Sell wholesale goods to verified business buyers with guaranteed escrow payouts.
                  </p>
                </div>
              </button>
            </div>

            {selectedRole === 'SUPPLIER' && (
              <div className="p-3.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-950 text-xs flex items-start gap-2.5">
                <Info className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">
                  <strong>Supplier Verification Required:</strong> New wholesale suppliers are submitted under{' '}
                  <span className="font-semibold text-sky-900">Pending Verification</span> until administrative compliance review is completed. Verified status is not granted automatically upon registration.
                </div>
              </div>
            )}
          </div>

          {/* Form Fields */}
          <form onSubmit={handleSubmit} className="space-y-5 pt-2 border-t border-slate-100">
            <div>
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-3">
                2. Business Profile &amp; Contact Information
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Full Legal Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Ram Bahadur Shrestha"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Registered Business Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Building className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Kathmandu Valley Traders Pvt. Ltd."
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Business Email Address <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@company.com.np"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Phone / Mobile Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="+977-98XXXXXXXX"
                    className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Private Identification Credentials */}
            <div className="pt-3 border-t border-slate-100 space-y-4">
              <div>
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
                  3. Identity &amp; Verification Details (Private)
                </span>
                <p className="text-[11px] text-slate-400">
                  Government credentials are strictly private compliance records. They are never broadcast to the Solana blockchain, public order records, or counterparty traders.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Citizenship Certificate Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <FileText className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required
                      value={citizenshipNumber}
                      onChange={(e) => setCitizenshipNumber(e.target.value)}
                      placeholder="e.g. 27-01-72-12345"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    Private identification • Stored encrypted off-chain
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    PAN Number {selectedRole === 'SUPPLIER' ? <span className="text-rose-500">*</span> : <span className="text-slate-400 font-normal">(Optional for Buyers)</span>}
                  </label>
                  <div className="relative">
                    <CreditCard className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      required={selectedRole === 'SUPPLIER'}
                      value={panNumber}
                      onChange={(e) => setPanNumber(e.target.value)}
                      placeholder="e.g. 601234567"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all font-mono"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">
                    {selectedRole === 'SUPPLIER' ? 'Mandatory for wholesale tax compliance' : 'Optional for wholesale retail purchasers'}
                  </span>
                </div>
              </div>
            </div>

            {/* Account Credentials */}
            <div className="pt-3 border-t border-slate-100 space-y-4">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-wider block mb-1">
                4. Account Security Password
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                  <span className="text-[10px] text-slate-400 mt-1 block">Minimum 6 characters</span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-3.5 py-2.5 text-xs sm:text-sm rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3.5 px-4 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs sm:text-sm shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Creating Account...</span>
                </>
              ) : (
                <>
                  <span>Create {selectedRole === 'BUYER' ? 'Buyer' : 'Supplier'} Account</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </>
              )}
            </button>
          </form>

          {/* Already have an account prompt */}
          <div className="pt-4 border-t border-slate-100 text-center text-xs text-slate-500">
            Already have a BazaarX business account?{' '}
            <Link
              href="/login"
              className="font-bold text-emerald-700 hover:text-emerald-800 hover:underline"
            >
              Sign In
            </Link>
          </div>
        </div>

        {/* Security Notice */}
        <div className="mt-6 text-center flex items-center justify-center gap-2 text-xs text-slate-400">
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          <span>Non-custodial architecture • Connect settlement wallet inside dashboard</span>
        </div>
      </div>
    </div>
  );
}
