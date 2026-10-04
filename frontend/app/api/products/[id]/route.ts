import { NextResponse } from 'next/server';
import { getProductById } from '@/lib/store';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const product = getProductById(params.id);

  if (!product) {
    return NextResponse.json(
      { success: false, error: 'Product not found' },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true, product });
}
