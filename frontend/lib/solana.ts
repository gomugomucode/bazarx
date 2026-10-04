import { PublicKey, Connection, clusterApiUrl } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

// BazaarX Program ID (matching target/deploy/bazaarx-keypair.json)
export const PROGRAM_ID_STRING = 'BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN';
export const PROGRAM_ID = new PublicKey(PROGRAM_ID_STRING);

// Solana Devnet canonical USDC mint (Circle Devnet USDC)
export const DEVNET_USDC_MINT = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

export const SOLANA_NETWORK = 'devnet';
export const RPC_ENDPOINT = process.env.NEXT_PUBLIC_RPC_ENDPOINT || clusterApiUrl('devnet');

export const getConnection = () => {
  return new Connection(RPC_ENDPOINT, 'confirmed');
};

/**
 * Derives the global Config PDA
 * Seeds: ["config"]
 */
export function deriveConfigPda(programId: PublicKey = PROGRAM_ID): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('config')],
    programId
  );
}

/**
 * Derives an Order PDA for a buyer and order ID
 * Seeds: ["order", buyer.publicKey, order_id (le_bytes)]
 */
export function deriveOrderPda(
  buyerPubkey: PublicKey,
  orderId: number,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  const orderIdBn = new BN(orderId);
  const orderIdBuffer = orderIdBn.toArrayLike(Buffer, 'le', 8);
  return PublicKey.findProgramAddressSync(
    [Buffer.from('order'), buyerPubkey.toBuffer(), orderIdBuffer],
    programId
  );
}

/**
 * Derives the Escrow Token Vault PDA (for Day-2 onwards)
 * Seeds: ["vault", orderPda]
 */
export function deriveVaultPda(
  orderPda: PublicKey,
  programId: PublicKey = PROGRAM_ID
): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), orderPda.toBuffer()],
    programId
  );
}

/**
 * Generates Solana Explorer links
 */
export function getExplorerTxUrl(txSignature: string, cluster: string = 'devnet'): string {
  return `https://explorer.solana.com/tx/${txSignature}?cluster=${cluster}`;
}

export function getExplorerAccountUrl(address: string, cluster: string = 'devnet'): string {
  return `https://explorer.solana.com/address/${address}?cluster=${cluster}`;
}

/**
 * Shortens public keys for clean UI display
 */
export function shortenAddress(address: string, chars: number = 4): string {
  if (!address) return '';
  if (address.length <= chars * 2 + 2) return address;
  return `${address.slice(0, chars + 2)}...${address.slice(-chars)}`;
}
