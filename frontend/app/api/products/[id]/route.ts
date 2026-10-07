import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  // 1. Try Express backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/products/${params.id}`, { cache: 'no-store' });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    // 2. Fallback to local store
    const { getProductById } = await import('@/lib/store');
    const product = getProductById(params.id);

    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, product });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const match = cookieHeader.match(/bazarx_session=([^;]+)/);
  const token =
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) ||
    (match ? decodeURIComponent(match[1]) : undefined);

  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // 1. Try Express backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/products/${params.id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': cookieHeader,
        'Authorization': authHeader || `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    // 2. Fallback to local store
    try {
      const { getSession, getUserById, getProductById, updateProduct } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
      }

      const user = getUserById(session.userId);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });
      }

      const product = getProductById(params.id);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }

      const isAdmin = user.role === 'ADMIN' || user.roles?.includes('ADMIN');
      const isOwner =
        product.supplierId === user.id ||
        (user.wallet && product.supplierWallet.toLowerCase() === user.wallet.toLowerCase()) ||
        product.supplierName === (user.businessName || user.fullName);

      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to modify listings owned by another supplier.' },
          { status: 403 }
        );
      }

      const updated = updateProduct(product.id, body);
      return NextResponse.json({ success: true, product: updated });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const match = cookieHeader.match(/bazarx_session=([^;]+)/);
  const token =
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) ||
    (match ? decodeURIComponent(match[1]) : undefined);

  if (!token) {
    return NextResponse.json({ success: false, error: 'Authentication required' }, { status: 401 });
  }

  // 1. Try Express backend
  try {
    const res = await fetch(`${BACKEND_URL}/api/products/${params.id}`, {
      method: 'DELETE',
      headers: {
        'Cookie': cookieHeader,
        'Authorization': authHeader || `Bearer ${token}`,
      },
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    // 2. Fallback to local store
    try {
      const { getSession, getUserById, getProductById, archiveProduct } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) {
        return NextResponse.json({ success: false, error: 'Session expired' }, { status: 401 });
      }

      const user = getUserById(session.userId);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 401 });
      }

      const product = getProductById(params.id);
      if (!product) {
        return NextResponse.json({ success: false, error: 'Product not found' }, { status: 404 });
      }

      const isAdmin = user.role === 'ADMIN' || user.roles?.includes('ADMIN');
      const isOwner =
        product.supplierId === user.id ||
        (user.wallet && product.supplierWallet.toLowerCase() === user.wallet.toLowerCase()) ||
        product.supplierName === (user.businessName || user.fullName);

      if (!isOwner && !isAdmin) {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to archive listings owned by another supplier.' },
          { status: 403 }
        );
      }

      const archived = archiveProduct(product.id);
      return NextResponse.json({ success: true, message: 'Product archived successfully', product: archived });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }
}
