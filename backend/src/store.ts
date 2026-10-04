import fs from 'fs';
import path from 'path';
import { Product, Order, OrderState, TransactionRecord, UserProfile } from './types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from './mockData';

const ORDERS_FILE = path.join(process.cwd(), '.bazaarx_orders.json');
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

class Store {
  private products: Product[] = [...INITIAL_PRODUCTS];

  private getOrdersFromDisk(): Order[] {
    return readJsonFile<Order[]>(ORDERS_FILE, INITIAL_ORDERS);
  }

  private saveOrdersToDisk(orders: Order[]): void {
    writeJsonFile(ORDERS_FILE, orders);
  }

  private getUsersFromDisk(): UserProfile[] {
    return readJsonFile<UserProfile[]>(USERS_FILE, INITIAL_PROFILES);
  }

  private saveUsersToDisk(users: UserProfile[]): void {
    writeJsonFile(USERS_FILE, users);
  }

  getUserProfile(wallet: string): UserProfile | undefined {
    const users = this.getUsersFromDisk();
    return users.find((u) => u.wallet.toLowerCase() === wallet.toLowerCase());
  }

  saveUserProfile(profile: UserProfile): UserProfile {
    const users = this.getUsersFromDisk();
    const existingIndex = users.findIndex(
      (u) => u.wallet.toLowerCase() === profile.wallet.toLowerCase()
    );
    if (existingIndex !== -1) {
      users[existingIndex] = { ...users[existingIndex], ...profile };
    } else {
      users.push(profile);
    }
    this.saveUsersToDisk(users);
    return profile;
  }

  getProducts(category?: string | null): Product[] {
    if (category && category !== 'All') {
      return this.products.filter((p) => p.category === category);
    }
    return this.products;
  }

  getProductById(id: string): Product | undefined {
    return this.products.find((p) => p.id === id);
  }

  getOrders(wallet?: string | null, role?: string | null): Order[] {
    const orders = this.getOrdersFromDisk();
    if (wallet) {
      const target = wallet.trim().toLowerCase();
      if (role === 'buyer') {
        return orders.filter((o) => o.buyerWallet.toLowerCase() === target);
      } else if (role === 'supplier') {
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

  getOrderById(id: string): Order | undefined {
    const orders = this.getOrdersFromDisk();
    return orders.find((o) => o.id === id || String(o.blockchainOrderId) === id);
  }

  addOrder(order: Order): Order {
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
}

export const store = new Store();
