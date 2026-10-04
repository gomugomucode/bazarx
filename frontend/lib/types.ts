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
  signature?: string;
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
  buyerEmail?: string;
  supplierWallet: string;
  supplierName: string;
  supplierEmail?: string;
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
export type VerificationStatus = 'PENDING' | 'VERIFIED' | 'REJECTED';

export interface UserAccount {
  id: string;
  email: string;
  passwordHash?: string;
  fullName: string;
  businessName: string;
  phone: string;
  citizenshipNumber: string; // Private
  panNumber?: string; // Private
  role: UserRole;
  roles: UserRole[];
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  wallet?: string; // Linked settlement wallet
  createdAt: string;
  updatedAt: string;
}

export interface UserProfile {
  id: string;
  email: string;
  fullName: string;
  businessName: string;
  phone: string;
  role: UserRole;
  roles: UserRole[];
  verificationStatus: VerificationStatus;
  verificationNotes?: string;
  wallet?: string;
  maskedCitizenship?: string;
  maskedPan?: string;
  createdAt: string;
}

export interface SessionRecord {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
}
