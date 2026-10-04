import { Connection, PublicKey } from '@solana/web3.js';
import { getAccount, getAssociatedTokenAddress } from '@solana/spl-token';
import fs from 'fs';

async function main() {
  console.log('====================================================');
  console.log('       BAZAARX DEVNET CONFIG & MINT VERIFICATION     ');
  console.log('====================================================\n');

  const connection = new Connection('https://api.devnet.solana.com', 'confirmed');
  const programId = new PublicKey('BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN');
  const expectedUsdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');

  // 1. Verify Program Existence
  const programInfo = await connection.getAccountInfo(programId);
  if (!programInfo) {
    throw new Error('Program account not found on Devnet!');
  }
  console.log('Program ID:       ', programId.toBase58());
  console.log('  Executable:     ', programInfo.executable);
  console.log('  Owner:          ', programInfo.owner.toBase58());

  // 2. Verify Config PDA
  const [configPda, configBump] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
  console.log('\nConfig PDA:       ', configPda.toBase58(), `(Bump: ${configBump})`);

  const configInfo = await connection.getAccountInfo(configPda);
  if (!configInfo) {
    throw new Error('Config PDA not found on Devnet! Program not initialized.');
  }

  // Anchor account structure:
  // 8 bytes discriminator
  // 32 bytes admin Pubkey
  // 32 bytes usdc_mint Pubkey
  // 1 byte bump
  const data = configInfo.data;
  const adminPubkey = new PublicKey(data.subarray(8, 40));
  const onChainUsdcMint = new PublicKey(data.subarray(40, 72));
  const bump = data[72];

  console.log('Config PDA On-Chain Data:');
  console.log('  Admin:          ', adminPubkey.toBase58());
  console.log('  On-chain Mint:  ', onChainUsdcMint.toBase58());
  console.log('  Stored Bump:    ', bump);
  console.log('  Expected Mint:  ', expectedUsdcMint.toBase58());

  const mintMatches = onChainUsdcMint.equals(expectedUsdcMint);
  console.log('  Mint Verified?  ', mintMatches ? 'MATCH (Circle Devnet USDC)' : 'MISMATCH!');
  if (!mintMatches) {
    console.error('CRITICAL: On-chain config mint does NOT match expected mint!');
    process.exit(1);
  }

  // 3. Verify Buyer Wallet & Token Account
  const buyer = new PublicKey('6VBKbKRZJ9Vq3ui92JwnuddegkCrGPPmPmKEE2uCEM1K');
  const buyerSolLamports = await connection.getBalance(buyer);
  const buyerAta = await getAssociatedTokenAddress(onChainUsdcMint, buyer);
  console.log('\nBuyer Wallet:     ', buyer.toBase58());
  console.log('  SOL Balance:    ', buyerSolLamports / 1e9, 'SOL');
  console.log('  USDC ATA:       ', buyerAta.toBase58());

  let buyerUsdcBalance = 0;
  try {
    const buyerTokenAcc = await getAccount(connection, buyerAta);
    buyerUsdcBalance = Number(buyerTokenAcc.amount) / 1e6;
    console.log('  USDC Balance:   ', buyerUsdcBalance, 'USDC');
    console.log('  ATA Mint:       ', buyerTokenAcc.mint.toBase58());
  } catch (err: any) {
    console.log('  USDC Balance:    0 (ATA not funded or not yet created on-chain)');
  }

  // 4. Verify Supplier Wallet & Token Account
  const supplierBytes = JSON.parse(fs.readFileSync('target/deploy/supplier-keypair.json', 'utf8'));
  const supplierKeypair = { publicKey: new PublicKey('8bhuiuQKXQrkofbqzqv3v9TiTJKNHBkq6VR72wnKsBDP') };
  const supplierSolLamports = await connection.getBalance(supplierKeypair.publicKey);
  const supplierAta = await getAssociatedTokenAddress(onChainUsdcMint, supplierKeypair.publicKey);
  console.log('\nSupplier Wallet:  ', supplierKeypair.publicKey.toBase58());
  console.log('  SOL Balance:    ', supplierSolLamports / 1e9, 'SOL');
  console.log('  USDC ATA:       ', supplierAta.toBase58());

  let supplierUsdcBalance = 0;
  try {
    const supplierTokenAcc = await getAccount(connection, supplierAta);
    supplierUsdcBalance = Number(supplierTokenAcc.amount) / 1e6;
    console.log('  USDC Balance:   ', supplierUsdcBalance, 'USDC');
  } catch (err: any) {
    console.log('  USDC Balance:    0 (ATA not funded or not yet created on-chain)');
  }

  console.log('\n====================================================');
  console.log('SUMMARY:');
  console.log('  Mint verification: SUCCESSFUL & MATCHED');
  console.log('  Buyer USDC:        ', buyerUsdcBalance, 'USDC');
  console.log('  Supplier USDC:     ', supplierUsdcBalance, 'USDC');
  console.log('====================================================');
}

main().catch(console.error);
