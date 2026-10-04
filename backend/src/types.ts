export type OrderState =
  | 'Created'
  | 'Accepted'
  | 'Funded'
  | 'Shipped'
  | 'Delivered'
  | 'Completed'
  | 'Disputed'
  | 'Refunded';

export interface Product {
  id: string;
  name: string;
  category: string;
  description: string;
  priceUsdc: number;
  priceNpr: number;
  unit: string;
  minOrder: number;
  availableStock: number;
  supplierName: string;
  supplierLocation: string;
  supplierWallet: string;
  imageUrl: string;
}

export interface TransactionRecord {
  step: OrderState;
  signature: string;
  timestamp: string;
  signer: string;
  explorerUrl?: string;
  action: string;
  isSimulated?: boolean;
}

export interface Order {
  id: string;
  blockchainOrderId: number;
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  amountUsdc: number;
  buyerWallet: string;
  buyerName: string;
  supplierWallet: string;
  supplierName: string;
  shippingAddress: string;
  state: OrderState;
  orderPda: string;
  mint: string;
  createdAt: string;
  acceptedAt?: string;
  fundedAt?: string;
  shippedAt?: string;
  deliveredAt?: string;
  completedAt?: string;
  transactions: TransactionRecord[];
}

export type UserRole = 'BUYER' | 'SUPPLIER' | 'ADMIN';

export interface UserProfile {
  wallet: string;
  businessName: string;
  roles: UserRole[];
  createdAt: string;
}
