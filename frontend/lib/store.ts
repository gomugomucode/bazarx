import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Product,
  Order,
  OrderState,
  TransactionRecord,
  UserAccount,
  UserProfile,
  SessionRecord,
  UserRole,
} from './types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from './mockData';

const ORDERS_FILE = path.join(process.cwd(), '.bazaarx_orders.json');
const PRODUCTS_FILE = path.join(process.cwd(), '.bazaarx_products.json');
const USERS_FILE = path.join(process.cwd(), '.bazaarx_users.json');
const SESSIONS_FILE = path.join(process.cwd(), '.bazaarx_sessions.json');

// Password hashing utility using Node.js crypto
export function hashPassword(password: string): string {
  const salt = 'bazarx_salt_devnet_2026';
  return crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
}

export function verifyPassword(password: string, hash: string): boolean {
  return hashPassword(password) === hash;
}

// Convert private UserAccount to safe UserProfile (masking sensitive credentials)
export function sanitizeUser(user: UserAccount): UserProfile {
  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    businessName: user.businessName,
    phone: user.phone,
    role: user.role,
    roles: user.roles,
    verificationStatus: user.verificationStatus,
    verificationNotes: user.verificationNotes,
    wallet: user.wallet,
    maskedCitizenship: user.citizenshipNumber
      ? `•••••••${user.citizenshipNumber.slice(-4)}`
      : undefined,
    maskedPan: user.panNumber
      ? `•••••••${user.panNumber.slice(-4)}`
      : undefined,
    createdAt: user.createdAt,
  };
}

export const INITIAL_ACCOUNTS: UserAccount[] = [
  {
    id: 'usr_buyer_01',
    email: 'buyer@bazarx.com',
    passwordHash: hashPassword('password123'),
    fullName: 'Ram Shrestha',
    businessName: 'Kathmandu Valley Wholesale Buyer',
    phone: '+977-9841234567',
    citizenshipNumber: '27-01-72-12345',
    panNumber: '601234567',
    role: 'BUYER',
    roles: ['BUYER'],
    verificationStatus: 'VERIFIED',
    wallet: '6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K',
    createdAt: '2026-10-04T08:00:00.000Z',
    updatedAt: '2026-10-04T08:00:00.000Z',
  },
  {
    id: 'usr_supplier_01',
    email: 'supplier@bazarx.com',
    passwordHash: hashPassword('password123'),
    fullName: 'Binod Chaudhary',
    businessName: 'Terai Edible Oils & Food Industries',
    phone: '+977-9851234567',
    citizenshipNumber: '14-01-68-98765',
    panNumber: '300987654',
    role: 'SUPPLIER',
    roles: ['SUPPLIER'],
    verificationStatus: 'VERIFIED',
    wallet: '8bhuiuQKXQrkofbqzqv3v9TiTJKNHBkq6VR72wnKsBDP',
    createdAt: '2026-10-04T08:00:00.000Z',
    updatedAt: '2026-10-04T08:00:00.000Z',
  },
  {
    id: 'usr_admin_01',
    email: 'admin@bazarx.com',
    passwordHash: hashPassword('password123'),
    fullName: 'BazaarX Compliance Officer',
    businessName: 'BazaarX Protocol Administrator',
    phone: '+977-9801234567',
    citizenshipNumber: '01-01-55-00001',
    panNumber: '100000001',
    role: 'ADMIN',
    roles: ['ADMIN', 'BUYER', 'SUPPLIER'],
    verificationStatus: 'VERIFIED',
    wallet: 'HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV',
    createdAt: '2026-10-04T08:00:00.000Z',
    updatedAt: '2026-10-04T08:00:00.000Z',
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
  // eslint-disable-next-line no-var
  var __bazaarx_users: UserAccount[] | undefined;
  // eslint-disable-next-line no-var
  var __bazaarx_sessions: SessionRecord[] | undefined;
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
    const target = wallet.trim().toLowerCase();
    if (role === 'buyer') {
      return fromDisk.filter((o) => o.buyerWallet.toLowerCase() === target);
    } else if (role === 'supplier') {
      return fromDisk.filter((o) => o.supplierWallet.toLowerCase() === target);
    }
    return fromDisk.filter(
      (o) =>
        o.buyerWallet.toLowerCase() === target ||
        o.supplierWallet.toLowerCase() === target
    );
  }
  return fromDisk;
};

export const getOrderById = (id: string): Order | undefined => {
  const orders = getOrders();
  return orders.find((o) => o.id === id || String(o.blockchainOrderId) === id);
};

// Users & Sessions
export const getUsers = (): UserAccount[] => {
  const users = readJsonFile<any[]>(USERS_FILE, INITIAL_ACCOUNTS);
  return users.map((u, idx) => {
    if (!u.id) {
      return {
        id: `usr_legacy_${idx}`,
        email: u.email || `${u.businessName?.toLowerCase().replace(/\s+/g, '')}@bazarx.com`,
        passwordHash: u.passwordHash || hashPassword('password123'),
        fullName: u.fullName || u.businessName || 'Business Owner',
        businessName: u.businessName || 'Enterprise Trader',
        phone: u.phone || '+977-9800000000',
        citizenshipNumber: u.citizenshipNumber || '00-00-00-00000',
        panNumber: u.panNumber,
        role: u.role || (u.roles && u.roles[0]) || 'BUYER',
        roles: u.roles || ['BUYER'],
        verificationStatus: u.verificationStatus || 'VERIFIED',
        wallet: u.wallet,
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || new Date().toISOString(),
      };
    }
    return u as UserAccount;
  });
};

export const getUserById = (id: string): UserAccount | undefined => {
  const users = getUsers();
  return users.find((u) => u.id === id);
};

export const getUserByEmail = (email: string): UserAccount | undefined => {
  const users = getUsers();
  return users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
};

export const getUserByWallet = (wallet: string): UserAccount | undefined => {
  const users = getUsers();
  const target = wallet.trim().toLowerCase();
  return users.find((u) => u.wallet && u.wallet.toLowerCase() === target);
};

export const getUserProfile = (wallet: string): UserProfile | undefined => {
  const user = getUserByWallet(wallet);
  return user ? sanitizeUser(user) : undefined;
};

export const saveUserAccount = (account: UserAccount): UserProfile => {
  const users = getUsers();
  const existingIdx = users.findIndex((u) => u.id === account.id || u.email.toLowerCase() === account.email.toLowerCase());
  if (existingIdx !== -1) {
    users[existingIdx] = { ...users[existingIdx], ...account, updatedAt: new Date().toISOString() };
  } else {
    users.push(account);
  }
  writeJsonFile(USERS_FILE, users);
  return sanitizeUser(account);
};

export const updateUserAccount = (id: string, updates: Partial<UserAccount>): UserProfile | null => {
  const users = getUsers();
  const idx = users.findIndex((u) => u.id === id);
  if (idx === -1) return null;
  users[idx] = { ...users[idx], ...updates, updatedAt: new Date().toISOString() };
  writeJsonFile(USERS_FILE, users);
  return sanitizeUser(users[idx]);
};

// Sessions
export const getSessions = (): SessionRecord[] => {
  return readJsonFile<SessionRecord[]>(SESSIONS_FILE, []);
};

export const createSession = (userId: string): SessionRecord => {
  const sessions = getSessions();
  const token = crypto.randomBytes(32).toString('hex');
  const now = new Date();
  const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const session: SessionRecord = {
    token,
    userId,
    createdAt: now.toISOString(),
    expiresAt,
  };
  sessions.push(session);
  writeJsonFile(SESSIONS_FILE, sessions);
  return session;
};

export const getSession = (token: string): SessionRecord | undefined => {
  const sessions = getSessions();
  const session = sessions.find((s) => s.token === token);
  if (!session) return undefined;
  if (new Date(session.expiresAt).getTime() < Date.now()) {
    deleteSession(token);
    return undefined;
  }
  return session;
};

export const deleteSession = (token: string): void => {
  const sessions = getSessions().filter((s) => s.token !== token);
  writeJsonFile(SESSIONS_FILE, sessions);
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
