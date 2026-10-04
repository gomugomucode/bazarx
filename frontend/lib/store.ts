import { Product, Order, OrderState, TransactionRecord } from './types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from './mockData';

// Global in-memory storage singleton for demo persistence
declare global {
  // eslint-disable-next-line no-var
  var __bazaarx_products: Product[] | undefined;
  // eslint-disable-next-line no-var
  var __bazaarx_orders: Order[] | undefined;
}

if (!global.__bazaarx_products) {
  global.__bazaarx_products = [...INITIAL_PRODUCTS];
}

if (!global.__bazaarx_orders) {
  global.__bazaarx_orders = [...INITIAL_ORDERS];
}

export const getProducts = (): Product[] => {
  return global.__bazaarx_products || [];
};

export const getProductById = (id: string): Product | undefined => {
  return (global.__bazaarx_products || []).find((p) => p.id === id);
};

export const getOrders = (): Order[] => {
  return global.__bazaarx_orders || [];
};

export const getOrderById = (id: string): Order | undefined => {
  return (global.__bazaarx_orders || []).find((o) => o.id === id || String(o.blockchainOrderId) === id);
};

export const addOrder = (order: Order): Order => {
  if (!global.__bazaarx_orders) global.__bazaarx_orders = [];
  global.__bazaarx_orders.unshift(order);
  return order;
};

export const updateOrderState = (
  orderId: string,
  newState: OrderState,
  txRecord?: TransactionRecord
): Order | null => {
  const orders = global.__bazaarx_orders || [];
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
    order.transactions.push(txRecord);
  }

  orders[orderIndex] = { ...order };
  return orders[orderIndex];
};
