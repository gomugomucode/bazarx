import fs from 'fs';
import path from 'path';
import { Product, Order, OrderState, TransactionRecord, UserProfile } from './types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from './mockData';

const ORDERS_FILE = path.join(process.cwd(), '.bazaarx_orders.json');
const PRODUCTS_FILE = path.join(process.cwd(), '.bazaarx_products.json');
const USERS_FILE = path.join(process.cwd(), '.bazaarx_users.json');

export const INITIAL_PROFILES: UserProfile[] = [
  {
    wallet: '6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K',
    businessName: 'Kathmandu Valley Wholesale Buyer',
    roles: ['BUYER'],
    createdAt: '2026-10-04T08:00:00.000Z',
  },
  {
    wallet: '8bhuiuQKXQrkofbqzqv3v9TiTJKNHBkq6VR72wnKsBDP',
    businessName: 'Terai Edible Oils & Food Industries',
    roles: ['SUPPLIER'],
    createdAt: '2026-10-04T08:00:00.000Z',
  },
  {
    wallet: 'HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV',
    businessName: 'BazaarX Protocol Administrator',
    roles: ['ADMIN', 'BUYER', 'SUPPLIER'],
    createdAt: '2026-10-04T08:00:00.000Z',
  },
];

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

export const getOrders = (wallet?: string | null, role?: string | null): Order[] => {
  const fromDisk = readJsonFile<Order[]>(ORDERS_FILE, INITIAL_ORDERS);
  global.__bazaarx_orders = fromDisk;
  if (wallet) {
    if (role === 'buyer') {
      return fromDisk.filter((o) => o.buyerWallet === wallet);
    } else if (role === 'supplier') {
      return fromDisk.filter((o) => o.supplierWallet === wallet);
    }
    return fromDisk.filter(
      (o) => o.buyerWallet === wallet || o.supplierWallet === wallet
    );
  }
  return fromDisk;
};

export const getOrderById = (id: string): Order | undefined => {
  const orders = getOrders();
  return orders.find((o) => o.id === id || String(o.blockchainOrderId) === id);
};

export const getUserProfile = (wallet: string): UserProfile | undefined => {
  const users = readJsonFile<UserProfile[]>(USERS_FILE, INITIAL_PROFILES);
  return users.find((u) => u.wallet.toLowerCase() === wallet.toLowerCase());
};

export const saveUserProfile = (profile: UserProfile): UserProfile => {
  const users = readJsonFile<UserProfile[]>(USERS_FILE, INITIAL_PROFILES);
  const existingIndex = users.findIndex(
    (u) => u.wallet.toLowerCase() === profile.wallet.toLowerCase()
  );
  if (existingIndex !== -1) {
    users[existingIndex] = { ...users[existingIndex], ...profile };
  } else {
    users.push(profile);
  }
  writeJsonFile(USERS_FILE, users);
  return profile;
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
