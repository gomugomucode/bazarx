import { NextResponse } from 'next/server';
import { getProducts } from '@/lib/store';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const category = searchParams.get('category');

  let products = getProducts();
  if (category && category !== 'All') {
    products = products.filter((p) => p.category === category);
  }

  return NextResponse.json({ success: true, products });
}
