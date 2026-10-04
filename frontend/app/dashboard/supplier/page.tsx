import { redirect } from 'next/navigation';

export default function SupplierDashboardPage() {
  redirect('/dashboard?role=supplier');
}
