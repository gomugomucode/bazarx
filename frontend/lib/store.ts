import fs from 'fs';
import path from 'path';
import { Product, Order, OrderState, TransactionRecord } from './types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from './mockData';

const ORDERS_FILE = path.join(process.cwd(), '.bazaarx_orders.json');
const PRODUCTS_FILE = path.join(process.cwd(), '.bazaarx_products.json');

function readJsonFile<T>(filePath: string, fallback: T): T {
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data) as T;
    }
  } catch (err) {
    console.warn(`Could not read store file ${filePath}, using fallback:`, err);
  }
  return fallback;
}

function writeJsonFile<T>(filePath: string, data: T): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.warn(`Could not write store file ${filePath}:`, err);
  }
}

// Global in-memory storage fallback and cache
declare global {
  // eslint-disable-next-line no-var
  var __bazaarx_products: Product[] | undefined;
  // eslint-disable-next-line no-var
  var __bazaarx_orders: Order[] | undefined;
}

export const getProducts = (): Product[] => {
  const fromDisk = readJsonFile<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
  global.__bazaarx_products = fromDisk;
  return fromDisk;
};

export const getProductById = (id: string): Product | undefined => {
  const products = getProducts();
  return products.find((p) => p.id === id);
};

export const getOrders = (): Order[] => {
  const fromDisk = readJsonFile<Order[]>(ORDERS_FILE, INITIAL_ORDERS);
  global.__bazaarx_orders = fromDisk;
  return fromDisk;
};

export const getOrderById = (id: string): Order | undefined => {
  const orders = getOrders();
  return orders.find((o) => o.id === id || String(o.blockchainOrderId) === id);
};

export const addOrder = (order: Order): Order => {
  const orders = getOrders();
  orders.unshift(order);
  global.__bazaarx_orders = orders;
  writeJsonFile(ORDERS_FILE, orders);
  return order;
};

export const updateOrderState = (
  orderId: string,
  newState: OrderState,
  txRecord?: TransactionRecord
): Order | null => {
  const orders = getOrders();
  const orderIndex = orders.findIndex(
    (o) => o.id === orderId || String(o.blockchainOrderId) === orderId
  );

  if (orderIndex === -1) return null;

  const order = orders[orderIndex];
  order.state = newState;
  const now = new Date().toISOString();

  if (newState === 'Accepted') order.acceptedAt = now;
  if (newState === 'Funded') order.fundedAt = now;
  if (newState === 'Shipped') order.shippedAt = now;
  if (newState === 'Delivered') order.deliveredAt = now;
  if (newState === 'Completed') order.completedAt = now;

  if (txRecord) {
    if (!order.transactions) order.transactions = [];
    order.transactions.push(txRecord);
  }

  orders[orderIndex] = { ...order };
  global.__bazaarx_orders = orders;
  writeJsonFile(ORDERS_FILE, orders);
  return orders[orderIndex];
};
