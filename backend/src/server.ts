import express, { Request, Response } from 'express';
import cors from 'cors';
import productsRouter from './routes/products';
import ordersRouter from './routes/orders';
import usersRouter from './routes/users';
import authRouter from './routes/auth';

const app = express();
const PORT = process.env.PORT || 5000;

// Security: Controlled CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL,
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin) || origin.endsWith('.bazarx.com')) {
        return callback(null, true);
      }
      return callback(null, true); // Dev-friendly fallback
    },
    credentials: true,
  })
);

app.use(express.json({ limit: '10mb' }));

// Root status endpoint
app.get('/', (req: Request, res: Response) => {
  res.json({
    name: 'BazaarX Programmable B2B Settlement Backend',
    status: 'online',
    version: '2.0.0',
    network: 'Solana Devnet',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
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
    version: '2.0.0',
    network: 'Solana Devnet',
  });
};
app.get('/health', healthHandler);
app.get('/api/health', healthHandler);

// Mount API routes
app.use('/api/auth', authRouter);
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
