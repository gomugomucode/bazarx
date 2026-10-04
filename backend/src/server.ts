import express, { Request, Response } from 'express';
import cors from 'cors';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import usersRouter from './routes/users';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: '*' }));
app.use(express.json());

// Root status endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'BazaarX Programmable B2B Settlement Backend',
    status: 'online',
    version: '1.0.0',
    network: 'Solana Devnet',
    endpoints: {
      health: '/health',
      products: '/api/products',
      orders: '/api/orders',
      users: '/api/users',
    },
    frontendUrl: 'http://localhost:3000',
    documentation: 'https://github.com/gomugomucode/bazarx/tree/main/docs',
  });
});

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
app.use('/api/users', usersRouter);

// Start server
if (process.env.NODE_ENV !== 'test') {
  app.listen(PORT, () => {
    console.log(`🚀 BazaarX Backend Service listening on http://localhost:${PORT}`);
  });
}

export default app;
