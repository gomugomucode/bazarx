'use client';

import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, UserCheck, ShoppingBag, Truck } from 'lucide-react';
import { UserRole } from '@/lib/types';

interface RoleSwitcherProps {
  activeRole: 'BUYER' | 'SUPPLIER';
  roles: UserRole[];
  onRoleChange: (role: 'BUYER' | 'SUPPLIER') => void;
}

export const RoleSwitcher: React.FC<RoleSwitcherProps> = ({
  activeRole,
  roles,
  onRoleChange,
}) => {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const availableRoles = roles.filter(
    (r): r is 'BUYER' | 'SUPPLIER' => r === 'BUYER' || r === 'SUPPLIER'
  );

  // If user only has one role, do not render a pointless switcher
  if (availableRoles.length <= 1) {
    return null;
  }

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSelect = (role: 'BUYER' | 'SUPPLIER') => {
    onRoleChange(role);
    setOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={dropdownRef}>
      <button
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-800 text-xs font-semibold shadow-xs transition-colors"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <span className="text-slate-400 font-normal">Viewing as:</span>
        <span className="flex items-center gap-1.5 font-bold text-slate-900">
          {activeRole === 'BUYER' ? (
            <>
              <ShoppingBag className="w-3.5 h-3.5 text-emerald-600" />
              Buyer
            </>
          ) : (
            <>
              <Truck className="w-3.5 h-3.5 text-sky-600" />
              Supplier
            </>
          )}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-1.5 w-48 rounded-xl bg-white border border-slate-200 shadow-lg py-1.5 z-50 animate-in fade-in slide-in-from-top-1 duration-100">
          <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100">
            Switch Business Role
          </div>

          <button
            onClick={() => handleSelect('BUYER')}
            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
              activeRole === 'BUYER'
                ? 'bg-emerald-50 text-emerald-950 font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-emerald-600" />
              <div>
                <div className="font-semibold">Buyer Portal</div>
                <div className="text-[10px] text-slate-400 font-normal">Procurement & Escrow</div>
              </div>
            </div>
            {activeRole === 'BUYER' && <Check className="w-3.5 h-3.5 text-emerald-600" />}
          </button>

          <button
            onClick={() => handleSelect('SUPPLIER')}
            className={`w-full text-left px-3 py-2 text-xs flex items-center justify-between transition-colors ${
              activeRole === 'SUPPLIER'
                ? 'bg-sky-50 text-sky-950 font-bold'
                : 'text-slate-700 hover:bg-slate-50'
            }`}
          >
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-sky-600" />
              <div>
                <div className="font-semibold">Supplier Hub</div>
                <div className="text-[10px] text-slate-400 font-normal">Sales & Fulfillment</div>
              </div>
            </div>
            {activeRole === 'SUPPLIER' && <Check className="w-3.5 h-3.5 text-sky-600" />}
          </button>
        </div>
      )}
    </div>
  );
};
