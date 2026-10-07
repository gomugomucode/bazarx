export type OrderState =
  | 'Created'
  | 'Accepted'
  | 'Funded'
  | 'Shipped'
  | 'Delivered'
  | 'Completed'
  | 'Disputed'
  | 'Refunded';

export type ProductStatus = 'Draft' | 'Published' | 'Archived';

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
  supplierId?: string;
  supplierName: string;
  supplierLocation?: string;
  supplierWallet: string;
  imageUrl: string;
  sku?: string;
  status: ProductStatus;
  createdAt?: string;
  updatedAt?: string;
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

export interface OnChainOrderSnapshot {
  orderPda: string;
  orderId: number;
  state: OrderState;
  buyer: string;
  supplier: string;
  amount: number; // Raw micro-USDC (6 decimals)
  amountUsdc: number; // Human-readable USDC
  mint: string;
  vault: string;
  vaultBalance: number | null; // Human-readable USDC
  createdAt: number;
  acceptedAt: number;
  exists: boolean;
  fetchedAt: string;
  slot?: number;
}

export interface ReconciliationResult {
  orderId: string;
  blockchainOrderId: number;
  backendState: OrderState;
  onChainState: OrderState | 'NonExistent';
  stateMatch: boolean;
  backendAmount: number;
  onChainAmount: number | null;
  amountMatch: boolean;
  vaultAddress: string;
  vaultBalance: number | null;
  expectedVaultBalance: number;
  vaultMatch: boolean;
  discrepancies: string[];
  onChainVerified: boolean;
  actionTaken: 'MATCH_VERIFIED' | 'CHAIN_ADVANCED_UPDATED' | 'CHAIN_CONFLICT_RECORDED' | 'NOT_FOUND_ON_CHAIN';
  reconciledAt: string;
  order?: Order;
}
