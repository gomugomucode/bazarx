import { PublicKey, Connection, clusterApiUrl, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, BN, Idl } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddressSync } from '@solana/spl-token';
import bazaarxIdl from '@/idl/bazaarx.json';

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
 * Creates an Anchor Program instance using a connected wallet adapter.
 */
export function getAnchorProgram(connection: Connection, wallet: any): Program {
  const provider = new AnchorProvider(connection, wallet, {
    preflightCommitment: 'confirmed',
    commitment: 'confirmed',
  });
  return new Program(bazaarxIdl as Idl, provider);
}

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
 * Derives the Escrow Token Vault PDA
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
 * Derives the Associated Token Account (ATA) for a given owner and mint.
 */
export function getAssociatedTokenAccount(owner: PublicKey, mint: PublicKey = DEVNET_USDC_MINT): PublicKey {
  return getAssociatedTokenAddressSync(mint, owner);
}

/**
 * Queries an on-chain Order account directly from Solana Devnet.
 */
export async function fetchOnChainOrder(orderPda: PublicKey, connection: Connection = getConnection()) {
  try {
    const provider = new AnchorProvider(connection, {} as any, { commitment: 'confirmed' });
    const program = new Program(bazaarxIdl as Idl, provider);
    const orderData = await (program.account as any).order.fetch(orderPda);
    return orderData;
  } catch (err) {
    console.warn('Could not fetch on-chain order account:', err);
    return null;
  }
}

/**
 * Queries the global on-chain Config account from Solana Devnet.
 */
export async function fetchOnChainConfig(connection: Connection = getConnection()) {
  try {
    const provider = new AnchorProvider(connection, {} as any, { commitment: 'confirmed' });
    const program = new Program(bazaarxIdl as Idl, provider);
    const [configPda] = deriveConfigPda();
    const configData = await (program.account as any).config.fetch(configPda);
    return configData;
  } catch (err) {
    console.warn('Could not fetch on-chain config account:', err);
    return null;
  }
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
