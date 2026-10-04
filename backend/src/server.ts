import express, { Request, Response } from 'express';
import cors from 'cors';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Health check
const healthHandler = (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    service: 'BazaarX Settlement Backend',
    version: '1.0.0',
    network: 'Solana Devnet',
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount API routes
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 BazaarX Backend Service listening on http://localhost:${PORT}`);
  });
}

export default app;
