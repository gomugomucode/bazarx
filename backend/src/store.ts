import { Product, Order, OrderState, TransactionRecord } from './types';
import { INITIAL_PRODUCTS, INITIAL_ORDERS } from './mockData';

class Store {
  private products: Product[] = [...INITIAL_PRODUCTS];
  private orders: Order[] = [...INITIAL_ORDERS];

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
    if (wallet) {
      if (role === 'buyer') {
        return this.orders.filter((o) => o.buyerWallet === wallet);
      } else if (role === 'supplier') {
        return this.orders.filter((o) => o.supplierWallet === wallet);
      }
      return this.orders.filter(
        (o) => o.buyerWallet === wallet || o.supplierWallet === wallet
      );
    }
    return this.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find((o) => o.id === id || String(o.blockchainOrderId) === id);
  }

  addOrder(order: Order): Order {
    this.orders.unshift(order);
    return order;
  }

  updateOrderState(
    orderId: string,
    newState: OrderState,
    txRecord?: TransactionRecord
  ): Order | null {
    const orderIndex = this.orders.findIndex(
      (o) => o.id === orderId || String(o.blockchainOrderId) === orderId
    );

    if (orderIndex === -1) return null;

    const order = this.orders[orderIndex];
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

    this.orders[orderIndex] = { ...order };
    return this.orders[orderIndex];
  }
}

export const store = new Store();
