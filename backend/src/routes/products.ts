import { Router, Request, Response } from 'express';
import { store } from '../store';

const router = Router();

// GET /api/products
router.get('/', (req: Request, res: Response) => {
  const category = req.query.category as string | undefined;
  const products = store.getProducts(category);
  res.json({ success: true, products });
});

// GET /api/products/:id
router.get('/:id', (req: Request, res: Response) => {
  const product = store.getProductById(req.params.id);
  if (!product) {
    return res.status(404).json({ success: false, error: 'Product not found' });
  }
  res.json({ success: true, product });
});

export default router;
