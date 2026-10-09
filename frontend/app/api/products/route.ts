import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BACKEND_URL = process.env.BACKEND_URL || 'http://127.0.0.1:5000';

export async function GET(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const { searchParams } = new URL(request.url);
  const qs = searchParams.toString() ? `?${searchParams.toString()}` : '';

  // 1. Try Express backend first
  try {
    const res = await fetch(`${BACKEND_URL}/api/products${qs}`, {
      headers: {
        'Cookie': cookieHeader,
        'Authorization': authHeader,
      },
      cache: 'no-store',
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch (err: any) {
    // 2. Fallback to local store
    try {
      const { getProducts, getSession, getUserById } = await import('@/lib/store');
      const supplierOnly = searchParams.get('supplierOnly') === 'true';

      if (supplierOnly) {
        const match = cookieHeader.match(/bazarx_session=([^;]+)/);
        const token =
          (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) ||
          (match ? decodeURIComponent(match[1]) : undefined);

        if (!token) {
          return NextResponse.json(
            { success: false, error: 'Authentication required to view supplier listings.', products: [] },
            { status: 401 }
          );
        }

        const session = getSession(token);
        if (!session) {
          return NextResponse.json(
            { success: false, error: 'Session expired. Please log in again.', products: [] },
            { status: 401 }
          );
        }

        const user = getUserById(session.userId);
        if (!user) {
          return NextResponse.json(
            { success: false, error: 'User not found', products: [] },
            { status: 401 }
          );
        }

        const isSupplier =
          user.role === 'SUPPLIER' ||
          user.roles?.includes('SUPPLIER') ||
          user.role === 'ADMIN' ||
          user.roles?.includes('ADMIN');

        if (!isSupplier) {
          return NextResponse.json(
            { success: false, error: 'Only wholesale suppliers can access inventory management.', products: [] },
            { status: 403 }
          );
        }

        const isAdmin = user.role === 'ADMIN' || user.roles?.includes('ADMIN');
        const supplierId = isAdmin && searchParams.get('supplierId') ? searchParams.get('supplierId')! : user.id;

        const products = getProducts({
          category: searchParams.get('category'),
          search: searchParams.get('search'),
          status: searchParams.get('status') as any,
          supplierId,
          sortBy: searchParams.get('sortBy') || searchParams.get('sort'),
        });

        return NextResponse.json({ success: true, products });
      }

      // Public / buyer marketplace
      const products = getProducts({
        category: searchParams.get('category'),
        search: searchParams.get('search'),
        status: 'Published',
        inStockOnly: true,
        sortBy: searchParams.get('sortBy') || searchParams.get('sort'),
      });

      return NextResponse.json({ success: true, products });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }
}

export async function POST(request: Request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const authHeader = request.headers.get('authorization') || '';
  const match = cookieHeader.match(/bazarx_session=([^;]+)/);
  const token =
    (authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : undefined) ||
    (match ? decodeURIComponent(match[1]) : undefined);

  if (!token) {
    return NextResponse.json(
      { success: false, error: 'Authentication required. Please log in as a supplier.' },
      { status: 401 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ success: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  // 1. Try Express backend first
  try {
    const res = await fetch(`${BACKEND_URL}/api/products`, {
      method: 'POST',
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
      const { getSession, getUserById, addProduct } = await import('@/lib/store');
      const session = getSession(token);
      if (!session) {
        return NextResponse.json(
          { success: false, error: 'Session expired. Please log in again.' },
          { status: 401 }
        );
      }

      const user = getUserById(session.userId);
      if (!user) {
        return NextResponse.json({ success: false, error: 'User account not found' }, { status: 401 });
      }

      const isSupplier =
        user.role === 'SUPPLIER' ||
        user.roles?.includes('SUPPLIER') ||
        user.role === 'ADMIN' ||
        user.roles?.includes('ADMIN');

      if (!isSupplier) {
        return NextResponse.json(
          { success: false, error: 'Only registered wholesale suppliers can list products on BazaarX.' },
          { status: 403 }
        );
      }

      if (user.verificationStatus === 'PENDING') {
        return NextResponse.json(
          {
            success: false,
            error:
              'Supplier business verification is pending approval. You will be able to publish products once compliance review is complete.',
          },
          { status: 403 }
        );
      }

      if (user.verificationStatus === 'REJECTED') {
        return NextResponse.json(
          { success: false, error: 'Supplier verification was rejected. Listing products is not permitted.' },
          { status: 403 }
        );
      }

      const {
        name,
        category,
        description,
        priceUsdc,
        price,
        priceNpr,
        nprPrice,
        unit,
        minOrder,
        minOrderQuantity,
        availableStock,
        imageUrl,
        sku,
        status,
      } = body;

      if (!name || typeof name !== 'string' || name.trim().length < 3) {
        return NextResponse.json(
          { success: false, error: 'Product name is required (minimum 3 characters).' },
          { status: 400 }
        );
      }

      if (!category || typeof category !== 'string' || category.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'Product category is required.' }, { status: 400 });
      }

      if (!description || typeof description !== 'string' || description.trim().length < 5) {
        return NextResponse.json(
          { success: false, error: 'Product description is required (minimum 5 characters).' },
          { status: 400 }
        );
      }

      const rawPrice = priceUsdc ?? price;
      const parsedPriceUsdc = Number(rawPrice);
      if (isNaN(parsedPriceUsdc) || parsedPriceUsdc <= 0) {
        return NextResponse.json(
          { success: false, error: 'Wholesale price per unit in USDC must be a positive number.' },
          { status: 400 }
        );
      }

      const rawNpr = priceNpr ?? nprPrice;
      const parsedPriceNpr = Number(rawNpr) || Math.round(parsedPriceUsdc * 133);

      if (!unit || typeof unit !== 'string' || unit.trim().length === 0) {
        return NextResponse.json({ success: false, error: 'Unit type is required.' }, { status: 400 });
      }

      const rawMinOrder = minOrder ?? minOrderQuantity;
      const parsedMinOrder = parseInt(rawMinOrder, 10);
      if (isNaN(parsedMinOrder) || parsedMinOrder < 1) {
        return NextResponse.json(
          { success: false, error: 'Minimum order quantity (MOQ) must be at least 1.' },
          { status: 400 }
        );
      }

      const parsedStock = parseInt(availableStock, 10);
      if (isNaN(parsedStock) || parsedStock < 0) {
        return NextResponse.json(
          { success: false, error: 'Available stock quantity must be 0 or greater.' },
          { status: 400 }
        );
      }

      const defaultImage =
        imageUrl && typeof imageUrl === 'string' && (imageUrl.trim().startsWith('http') || imageUrl.trim().startsWith('data:image/'))
          ? imageUrl.trim()
          : 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800';

      const newProduct = addProduct({
        name: name.trim(),
        category: category.trim(),
        description: description.trim(),
        priceUsdc: parsedPriceUsdc,
        priceNpr: parsedPriceNpr,
        unit: unit.trim(),
        minOrder: parsedMinOrder,
        availableStock: parsedStock,
        supplierId: user.id,
        supplierName: user.businessName || user.fullName,
        supplierLocation: 'Nepal',
        supplierWallet: user.wallet || '',
        imageUrl: defaultImage,
        sku: sku ? String(sku).trim() : undefined,
        status: status === 'Draft' ? 'Draft' : 'Published',
      });

      return NextResponse.json({ success: true, product: newProduct }, { status: 201 });
    } catch (e: any) {
      return NextResponse.json({ success: false, error: e.message }, { status: 500 });
    }
  }
}
