import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  Product,
  ProductStatus,
  Order,
  OrderState,
  TransactionRecord,
  UserAccount,
  UserProfile,
  SessionRecord,
  UserRole,
  VerificationStatus,
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

// Convert private UserAccount to safe UserProfile (masking sensitive government credentials)
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
    createdAt: '2026-10-04T08:00:00.000Z',
    updatedAt: '2026-10-04T08:00:00.000Z',
  },
  {
    id: 'usr_1791606838972_4e19329d',
    email: 'admin@anupambaral.com.np',
    passwordHash: hashPassword('Admin@123'),
    fullName: 'Anupam',
    businessName: 'yarsabyte',
    phone: '+977-9808200850',
    citizenshipNumber: '235456',
    panNumber: '243423424',
    role: 'ADMIN',
    roles: ['ADMIN', 'BUYER', 'SUPPLIER'],
    verificationStatus: 'VERIFIED',
    verificationNotes: 'Verified Protocol Administrator',
    wallet: 'HZT8UtjPz3vHPLpgjmWSYYb3APyM67j2YYEqyy8iPepV',
    createdAt: '2026-10-10T04:33:58.972Z',
    updatedAt: '2026-10-10T04:33:58.972Z',
  },
  {
    id: 'usr_supplier_02',
    email: 'supplier2@bazarx.com',
    passwordHash: hashPassword('password123'),
    fullName: 'Purna Bahadur Gurung',
    businessName: 'Annapurna Grains & Flour Mills',
    phone: '+977-9846123456',
    citizenshipNumber: '44-01-71-99887',
    panNumber: '302998877',
    role: 'SUPPLIER',
    roles: ['SUPPLIER'],
    verificationStatus: 'VERIFIED',
    createdAt: '2026-10-04T08:00:00.000Z',
    updatedAt: '2026-10-04T08:00:00.000Z',
  },
  {
    id: 'usr_supplier_pending',
    email: 'pending_supplier@bazarx.com',
    passwordHash: hashPassword('password123'),
    fullName: 'Santosh Neupane',
    businessName: 'Pokhara Agro Ventures (Pending)',
    phone: '+977-9856012345',
    citizenshipNumber: '45-01-70-11223',
    panNumber: '301122334',
    role: 'SUPPLIER',
    roles: ['SUPPLIER'],
    verificationStatus: 'PENDING',
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

class Store {
  private getProductsFromDisk(): Product[] {
    return readJsonFile<Product[]>(PRODUCTS_FILE, INITIAL_PRODUCTS);
  }

  private saveProductsToDisk(products: Product[]): void {
    writeJsonFile(PRODUCTS_FILE, products);
  }

  private getOrdersFromDisk(): Order[] {
    return readJsonFile<Order[]>(ORDERS_FILE, INITIAL_ORDERS);
  }

  private saveOrdersToDisk(orders: Order[]): void {
    writeJsonFile(ORDERS_FILE, orders);
  }

  private getUsersFromDisk(): UserAccount[] {
    const raw = readJsonFile<any[]>(USERS_FILE, INITIAL_ACCOUNTS);
    // Migrate legacy profile objects if necessary
    const users = raw.map((u, idx) => {
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

    const existingEmails = new Set(users.map((u) => u.email.toLowerCase()));
    let changed = false;
    for (const initAcc of INITIAL_ACCOUNTS) {
      if (!existingEmails.has(initAcc.email.toLowerCase())) {
        users.push(initAcc);
        changed = true;
      }
    }
    if (changed) {
      this.saveUsersToDisk(users);
    }

    return users;
  }

  private saveUsersToDisk(users: UserAccount[]): void {
    writeJsonFile(USERS_FILE, users);
  }

  private getSessionsFromDisk(): SessionRecord[] {
    return readJsonFile<SessionRecord[]>(SESSIONS_FILE, []);
  }

  private saveSessionsToDisk(sessions: SessionRecord[]): void {
    writeJsonFile(SESSIONS_FILE, sessions);
  }

  // --- Auth & Sessions ---
  createSession(userId: string): SessionRecord {
    const sessions = this.getSessionsFromDisk();
    const token = crypto.randomBytes(32).toString('hex');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

    const session: SessionRecord = {
      token,
      userId,
      createdAt: now.toISOString(),
      expiresAt,
    };

    sessions.push(session);
    this.saveSessionsToDisk(sessions);
    return session;
  }

  getSession(token: string): SessionRecord | undefined {
    const sessions = this.getSessionsFromDisk();
    const session = sessions.find((s) => s.token === token);
    if (!session) return undefined;

    // Check expiration
    if (new Date(session.expiresAt).getTime() < Date.now()) {
      this.deleteSession(token);
      return undefined;
    }
    return session;
  }

  deleteSession(token: string): void {
    let sessions = this.getSessionsFromDisk();
    sessions = sessions.filter((s) => s.token !== token);
    this.saveSessionsToDisk(sessions);
  }

  // --- User Account Management ---
  getUserById(id: string): UserAccount | undefined {
    const users = this.getUsersFromDisk();
    return users.find((u) => u.id === id);
  }

  getUserByEmail(email: string): UserAccount | undefined {
    const users = this.getUsersFromDisk();
    return users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase());
  }

  getUserByWallet(wallet: string): UserAccount | undefined {
    const users = this.getUsersFromDisk();
    const target = wallet.trim().toLowerCase();
    return users.find((u) => u.wallet && u.wallet.toLowerCase() === target);
  }

  // Backward compatibility lookup
  getUserProfile(wallet: string): UserProfile | undefined {
    const user = this.getUserByWallet(wallet);
    return user ? sanitizeUser(user) : undefined;
  }

  createUser(account: UserAccount): UserProfile {
    const users = this.getUsersFromDisk();
    users.push(account);
    this.saveUsersToDisk(users);
    return sanitizeUser(account);
  }

  updateUser(id: string, updates: Partial<UserAccount>): UserProfile | null {
    const users = this.getUsersFromDisk();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    users[idx] = {
      ...users[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveUsersToDisk(users);

    // If wallet was updated or cleared, sync all listings owned by this supplier
    if (updates.wallet !== undefined) {
      const products = this.getProductsFromDisk();
      let changed = false;
      const targetUser = users[idx];
      for (const p of products) {
        if (
          p.supplierId === id ||
          p.supplierName === targetUser.businessName ||
          p.supplierName === targetUser.fullName
        ) {
          p.supplierWallet = updates.wallet || '';
          p.updatedAt = new Date().toISOString();
          changed = true;
        }
      }
      if (changed) {
        this.saveProductsToDisk(products);
      }
    }

    return sanitizeUser(users[idx]);
  }

  getAllUsers(): (UserProfile & { citizenshipNumber?: string; panNumber?: string })[] {
    const users = this.getUsersFromDisk();
    return users.map((u) => ({
      ...sanitizeUser(u),
      citizenshipNumber: u.citizenshipNumber,
      panNumber: u.panNumber,
    }));
  }

  updateVerificationStatus(
    id: string,
    status: VerificationStatus,
    notes?: string
  ): UserProfile | null {
    const users = this.getUsersFromDisk();
    const idx = users.findIndex((u) => u.id === id);
    if (idx === -1) return null;

    users[idx].verificationStatus = status;
    if (notes !== undefined) {
      users[idx].verificationNotes = notes;
    }
    users[idx].updatedAt = new Date().toISOString();
    this.saveUsersToDisk(users);
    return sanitizeUser(users[idx]);
  }

  // --- Products ---
  getProducts(filters?: {
    category?: string | null;
    search?: string | null;
    status?: ProductStatus | null;
    supplierId?: string | null;
    inStockOnly?: boolean;
    sortBy?: string | null;
  }): Product[] {
    let products = this.getProductsFromDisk();
    const users = this.getUsersFromDisk();
    const userWalletMap = new Map<string, string>();
    for (const u of users) {
      if (u.wallet) userWalletMap.set(u.id, u.wallet);
    }

    // Auto-enrich product supplierWallet if empty on disk but linked on supplier profile
    for (const p of products) {
      if ((!p.supplierWallet || p.supplierWallet.trim() === '') && p.supplierId) {
        const w = userWalletMap.get(p.supplierId);
        if (w) p.supplierWallet = w;
      }
    }

    if (filters?.supplierId) {
      products = products.filter((p) => p.supplierId === filters.supplierId);
    }

    if (filters?.status) {
      products = products.filter((p) => (p.status || 'Published') === filters.status);
    } else if (!filters?.supplierId) {
      // Default public buyer marketplace: only Published products
      products = products.filter((p) => (p.status || 'Published') === 'Published');
    }

    if (filters?.inStockOnly) {
      products = products.filter((p) => p.availableStock > 0);
    }

    if (filters?.category && filters.category !== 'All') {
      products = products.filter(
        (p) => p.category.toLowerCase() === filters.category!.toLowerCase()
      );
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      products = products.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q) ||
          p.category.toLowerCase().includes(q) ||
          p.supplierName.toLowerCase().includes(q) ||
          (p.sku && p.sku.toLowerCase().includes(q))
      );
    }

    if (filters?.sortBy) {
      switch (filters.sortBy) {
        case 'price-asc':
          products.sort((a, b) => a.priceUsdc - b.priceUsdc);
          break;
        case 'price-desc':
          products.sort((a, b) => b.priceUsdc - a.priceUsdc);
          break;
        case 'stock-desc':
          products.sort((a, b) => b.availableStock - a.availableStock);
          break;
        case 'name-asc':
          products.sort((a, b) => a.name.localeCompare(b.name));
          break;
        case 'newest':
          products.sort((a, b) => (b.createdAt || '').localeCompare(a.createdAt || ''));
          break;
        default:
          break;
      }
    }

    return products;
  }

  getProductById(id: string): Product | undefined {
    const products = this.getProductsFromDisk();
    const product = products.find((p) => p.id === id);
    if (!product) return undefined;

    if ((!product.supplierWallet || product.supplierWallet.trim() === '') && product.supplierId) {
      const users = this.getUsersFromDisk();
      const supplier = users.find((u) => u.id === product.supplierId);
      if (supplier?.wallet) {
        product.supplierWallet = supplier.wallet;
      }
    }
    return product;
  }

  addProduct(productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Product {
    const products = this.getProductsFromDisk();
    const id = productData.id || `prod-${Date.now()}-${Math.floor(100 + Math.random() * 900)}`;
    const now = new Date().toISOString();
    const newProduct: Product = {
      ...productData,
      id,
      status: productData.status || 'Published',
      createdAt: now,
      updatedAt: now,
    };
    products.push(newProduct);
    this.saveProductsToDisk(products);
    return newProduct;
  }

  updateProduct(id: string, updates: Partial<Product>): Product | undefined {
    const products = this.getProductsFromDisk();
    const idx = products.findIndex((p) => p.id === id);
    if (idx === -1) return undefined;

    products[idx] = {
      ...products[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveProductsToDisk(products);
    return products[idx];
  }

  archiveProduct(id: string): Product | undefined {
    return this.updateProduct(id, { status: 'Archived' });
  }

  deductStock(productId: string, quantity: number): boolean {
    const products = this.getProductsFromDisk();
    const idx = products.findIndex((p) => p.id === productId);
    if (idx === -1) return false;
    if (products[idx].availableStock < quantity) return false;

    products[idx].availableStock -= quantity;
    products[idx].updatedAt = new Date().toISOString();
    this.saveProductsToDisk(products);
    return true;
  }

  // --- Orders ---
  getOrders(wallet?: string | null, role?: string | null): Order[] {
    const orders = this.getOrdersFromDisk();
    if (wallet) {
      const target = wallet.trim().toLowerCase();
      if (role?.toLowerCase() === 'buyer') {
        return orders.filter((o) => o.buyerWallet.toLowerCase() === target);
      } else if (role?.toLowerCase() === 'supplier') {
        return orders.filter((o) => o.supplierWallet.toLowerCase() === target);
      }
      return orders.filter(
        (o) =>
          o.buyerWallet.toLowerCase() === target ||
          o.supplierWallet.toLowerCase() === target
      );
    }
    return orders;
  }

  getOrdersForUser(user: UserAccount, roleFilter?: string | null): Order[] {
    const orders = this.getOrdersFromDisk();
    const userWallet = user.wallet ? user.wallet.trim().toLowerCase() : null;
    const userEmail = user.email ? user.email.trim().toLowerCase() : null;
    const businessName = user.businessName ? user.businessName.trim() : null;
    const fullName = user.fullName ? user.fullName.trim() : null;

    const isBuyer = (o: Order): boolean => {
      if (userWallet && o.buyerWallet && o.buyerWallet.trim().toLowerCase() === userWallet) return true;
      if (userEmail && o.buyerEmail && o.buyerEmail.trim().toLowerCase() === userEmail) return true;
      if (businessName && o.buyerName === businessName) return true;
      if (fullName && o.buyerName === fullName) return true;
      return false;
    };

    const isSupplier = (o: Order): boolean => {
      if (userWallet && o.supplierWallet && o.supplierWallet.trim().toLowerCase() === userWallet) return true;
      if (userEmail && o.supplierEmail && o.supplierEmail.trim().toLowerCase() === userEmail) return true;
      if (businessName && o.supplierName === businessName) return true;
      return false;
    };

    const userRoles = (user.roles || [user.role]).map((r) => r.toUpperCase());
    const normFilter = roleFilter ? roleFilter.toUpperCase() : null;

    if (normFilter === 'BUYER') {
      if (!userRoles.includes('BUYER') && !userRoles.includes('ADMIN')) return [];
      return orders.filter(isBuyer);
    }
    if (normFilter === 'SUPPLIER') {
      if (!userRoles.includes('SUPPLIER') && !userRoles.includes('ADMIN')) return [];
      return orders.filter(isSupplier);
    }

    // If no role filter was requested:
    if (userRoles.includes('BUYER') && !userRoles.includes('SUPPLIER')) {
      return orders.filter(isBuyer);
    }
    if (userRoles.includes('SUPPLIER') && !userRoles.includes('BUYER')) {
      return orders.filter(isSupplier);
    }
    return orders.filter((o) => isBuyer(o) || isSupplier(o));
  }

  getAllOrders(filters?: {
    wallet?: string;
    role?: string;
    state?: string;
    productId?: string;
    search?: string;
  }): Order[] {
    let orders = this.getOrdersFromDisk();
    if (!filters) return orders;

    if (filters.wallet) {
      const w = filters.wallet.trim().toLowerCase();
      if (filters.role?.toUpperCase() === 'BUYER') {
        orders = orders.filter((o) => o.buyerWallet.toLowerCase() === w);
      } else if (filters.role?.toUpperCase() === 'SUPPLIER') {
        orders = orders.filter((o) => o.supplierWallet.toLowerCase() === w);
      } else {
        orders = orders.filter(
          (o) => o.buyerWallet.toLowerCase() === w || o.supplierWallet.toLowerCase() === w
        );
      }
    }
    if (filters.state && filters.state !== 'All') {
      orders = orders.filter((o) => o.state.toLowerCase() === filters.state!.toLowerCase());
    }
    if (filters.productId) {
      orders = orders.filter((o) => o.productId === filters.productId);
    }
    if (filters.search) {
      const q = filters.search.trim().toLowerCase();
      orders = orders.filter(
        (o) =>
          o.productName.toLowerCase().includes(q) ||
          String(o.blockchainOrderId).includes(q) ||
          o.id.toLowerCase().includes(q) ||
          o.buyerName.toLowerCase().includes(q) ||
          o.supplierName.toLowerCase().includes(q) ||
          o.buyerWallet.toLowerCase().includes(q) ||
          o.supplierWallet.toLowerCase().includes(q)
      );
    }
    return orders;
  }

  getOrderById(id: string): Order | undefined {
    const orders = this.getOrdersFromDisk();
    return orders.find((o) => o.id === id || String(o.blockchainOrderId) === id);
  }

  addOrder(order: Order): Order {
    // Atomically deduct product stock
    this.deductStock(order.productId, order.quantity);

    const orders = this.getOrdersFromDisk();
    orders.unshift(order);
    this.saveOrdersToDisk(orders);
    return order;
  }

  updateOrderState(
    orderId: string,
    newState: OrderState,
    txRecord?: TransactionRecord
  ): Order | null {
    const orders = this.getOrdersFromDisk();
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
    this.saveOrdersToDisk(orders);
    return orders[orderIndex];
  }

  updateOrderFromReconciliation(
    orderId: string,
    updates: Partial<Order>,
    txRecord?: TransactionRecord
  ): Order | null {
    const orders = this.getOrdersFromDisk();
    const orderIndex = orders.findIndex(
      (o) => o.id === orderId || String(o.blockchainOrderId) === orderId
    );

    if (orderIndex === -1) return null;

    const order = orders[orderIndex];
    const merged: Order = {
      ...order,
      ...updates,
    };

    if (txRecord) {
      if (!merged.transactions) merged.transactions = [];
      const alreadyExists = merged.transactions.some(
        (t) => (txRecord.signature && t.signature === txRecord.signature) ||
               (t.step === txRecord.step && !txRecord.signature)
      );
      if (!alreadyExists) {
        merged.transactions.push(txRecord);
      }
    }

    orders[orderIndex] = merged;
    this.saveOrdersToDisk(orders);
    return orders[orderIndex];
  }
}

export const store = new Store();
