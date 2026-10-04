'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SupplierDashboardRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/dashboard?role=supplier');
  }, [router]);

  return (
    <div className="min-h-[50vh] flex items-center justify-center">
      <div className="text-center space-y-2 text-slate-500 text-xs">
        <div className="w-6 h-6 border-2 border-sky-600 border-t-transparent rounded-full animate-spin mx-auto" />
        <p>Redirecting to unified BazaarX Dashboard...</p>
      </div>
    </div>
  );
}
