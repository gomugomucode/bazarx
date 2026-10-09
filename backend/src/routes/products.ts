import { Router, Request, Response } from 'express';
import { store } from '../store';
import { ProductStatus } from '../types';
import { getAuthUser } from './auth';

const router = Router();

// GET /api/products
// Supports:
// - category filter (or 'All')
// - search filter
// - sortBy: 'newest' | 'price-asc' | 'price-desc' | 'stock-desc' | 'name-asc'
// - supplierOnly=true: requires authenticated supplier, returns all owned listings (including Draft and Archived)
// - default: returns only active, published, in-stock products
router.get('/', (req: Request, res: Response) => {
  try {
    const category = req.query.category as string | undefined;
    const search = req.query.search as string | undefined;
    const sortBy = (req.query.sortBy || req.query.sort) as string | undefined;
    const supplierOnly = req.query.supplierOnly === 'true';
    const statusParam = req.query.status as ProductStatus | undefined;

    if (supplierOnly) {
      const user = getAuthUser(req);
      if (!user) {
        return res.status(401).json({
          success: false,
          error: 'Authentication required to view supplier listings.',
          products: [],
        });
      }

      const isSupplier =
        user.role === 'SUPPLIER' ||
        user.roles?.includes('SUPPLIER') ||
        user.role === 'ADMIN' ||
        user.roles?.includes('ADMIN');

      if (!isSupplier) {
        return res.status(403).json({
          success: false,
          error: 'Only wholesale suppliers can access inventory management.',
          products: [],
        });
      }

      const isAdmin = user.role === 'ADMIN' || user.roles?.includes('ADMIN');
      const supplierId = isAdmin && req.query.supplierId ? (req.query.supplierId as string) : user.id;

      const products = store.getProducts({
        category,
        search,
        status: statusParam,
        supplierId,
        sortBy,
      });

      return res.json({ success: true, products });
    }

    // Public / Buyer marketplace: only published, in-stock listings
    const products = store.getProducts({
      category,
      search,
      status: 'Published',
      inStockOnly: true,
      sortBy,
    });

    res.json({ success: true, products });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// GET /api/products/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const product = store.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }
    res.json({ success: true, product });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// POST /api/products (Supplier creates wholesale listing)
router.post('/', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required. Please log in as a supplier.',
      });
    }

    const isSupplier =
      user.role === 'SUPPLIER' ||
      user.roles?.includes('SUPPLIER') ||
      user.role === 'ADMIN' ||
      user.roles?.includes('ADMIN');

    if (!isSupplier) {
      return res.status(403).json({
        success: false,
        error: 'Only registered wholesale suppliers can list products on BazaarX.',
      });
    }

    // Verification check: pending or rejected suppliers cannot publish
    if (user.verificationStatus === 'PENDING') {
      return res.status(403).json({
        success: false,
        error:
          'Supplier business verification is pending approval. You will be able to publish products once compliance review is complete.',
      });
    }
    if (user.verificationStatus === 'REJECTED') {
      return res.status(403).json({
        success: false,
        error: 'Supplier verification was rejected. Listing products is not permitted.',
      });
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
    } = req.body;

    // Field validations
    if (!name || typeof name !== 'string' || name.trim().length < 3) {
      return res.status(400).json({
        success: false,
        error: 'Product name is required (minimum 3 characters).',
      });
    }

    if (!category || typeof category !== 'string' || category.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Product category is required.',
      });
    }

    if (!description || typeof description !== 'string' || description.trim().length < 5) {
      return res.status(400).json({
        success: false,
        error: 'Product description is required (minimum 5 characters).',
      });
    }

    const rawPrice = priceUsdc ?? price;
    const parsedPriceUsdc = Number(rawPrice);
    if (isNaN(parsedPriceUsdc) || parsedPriceUsdc <= 0) {
      return res.status(400).json({
        success: false,
        error: 'Wholesale price per unit in USDC must be a positive number.',
      });
    }

    const rawNpr = priceNpr ?? nprPrice;
    const parsedPriceNpr = Number(rawNpr) || Math.round(parsedPriceUsdc * 133);

    if (!unit || typeof unit !== 'string' || unit.trim().length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Unit type is required (e.g., piece, carton, kilogram, liter, bag).',
      });
    }

    const rawMinOrder = minOrder ?? minOrderQuantity;
    const parsedMinOrder = parseInt(rawMinOrder, 10);
    if (isNaN(parsedMinOrder) || parsedMinOrder < 1) {
      return res.status(400).json({
        success: false,
        error: 'Minimum order quantity (MOQ) must be at least 1.',
      });
    }

    const parsedStock = parseInt(availableStock, 10);
    if (isNaN(parsedStock) || parsedStock < 0) {
      return res.status(400).json({
        success: false,
        error: 'Available stock quantity must be 0 or greater.',
      });
    }

    const publicationStatus: ProductStatus =
      status === 'Draft' ? 'Draft' : 'Published';

    // High quality default image fallback if not provided
    const defaultImage =
      imageUrl && typeof imageUrl === 'string' && (imageUrl.trim().startsWith('http') || imageUrl.trim().startsWith('data:image/'))
        ? imageUrl.trim()
        : 'https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&q=80&w=800';

    const newProduct = store.addProduct({
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
      status: publicationStatus,
    });

    res.status(201).json({ success: true, product: newProduct });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// PUT /api/products/:id (Supplier updates product)
router.put('/:id', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const product = store.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const isAdmin = user.role === 'ADMIN' || user.roles?.includes('ADMIN');
    const isOwner =
      product.supplierId === user.id ||
      (user.wallet && product.supplierWallet.toLowerCase() === user.wallet.toLowerCase()) ||
      product.supplierName === (user.businessName || user.fullName);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to modify listings owned by another supplier.',
      });
    }

    const updates: Partial<any> = {};
    const {
      name,
      category,
      description,
      priceUsdc,
      priceNpr,
      unit,
      minOrder,
      availableStock,
      imageUrl,
      sku,
      status,
    } = req.body;

    if (name !== undefined) {
      if (typeof name !== 'string' || name.trim().length < 3) {
        return res.status(400).json({ success: false, error: 'Product name must have at least 3 characters' });
      }
      updates.name = name.trim();
    }

    if (category !== undefined) updates.category = String(category).trim();
    if (description !== undefined) updates.description = String(description).trim();

    const rawPrice = req.body.priceUsdc ?? req.body.price;
    if (rawPrice !== undefined) {
      const p = Number(rawPrice);
      if (isNaN(p) || p <= 0) {
        return res.status(400).json({ success: false, error: 'Wholesale price must be positive' });
      }
      updates.priceUsdc = p;
      const rawNpr = req.body.priceNpr ?? req.body.nprPrice;
      updates.priceNpr = Number(rawNpr) || Math.round(p * 133);
    }

    if (unit !== undefined) updates.unit = String(unit).trim();

    const rawMinOrder = req.body.minOrder ?? req.body.minOrderQuantity;
    if (rawMinOrder !== undefined) {
      const moq = parseInt(rawMinOrder, 10);
      if (isNaN(moq) || moq < 1) {
        return res.status(400).json({ success: false, error: 'MOQ must be at least 1' });
      }
      updates.minOrder = moq;
    }

    if (availableStock !== undefined) {
      const stock = parseInt(availableStock, 10);
      if (isNaN(stock) || stock < 0) {
        return res.status(400).json({ success: false, error: 'Stock must be 0 or greater' });
      }
      updates.availableStock = stock;
    }

    if (imageUrl !== undefined) updates.imageUrl = String(imageUrl).trim();
    if (sku !== undefined) updates.sku = String(sku).trim();

    if (status !== undefined) {
      if (!['Draft', 'Published', 'Archived'].includes(status)) {
        return res.status(400).json({ success: false, error: 'Invalid publication status' });
      }
      updates.status = status;
    }

    const updated = store.updateProduct(product.id, updates);
    res.json({ success: true, product: updated });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

// DELETE /api/products/:id (Archive listing)
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const user = getAuthUser(req);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const product = store.getProductById(req.params.id);
    if (!product) {
      return res.status(404).json({ success: false, error: 'Product not found' });
    }

    const isAdmin = user.role === 'ADMIN' || user.roles?.includes('ADMIN');
    const isOwner =
      product.supplierId === user.id ||
      (user.wallet && product.supplierWallet.toLowerCase() === user.wallet.toLowerCase()) ||
      product.supplierName === (user.businessName || user.fullName);

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        error: 'You do not have permission to archive listings owned by another supplier.',
      });
    }

    const archived = store.archiveProduct(product.id);
    res.json({ success: true, message: 'Product archived successfully', product: archived });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message || 'Server error' });
  }
});

export default router;
