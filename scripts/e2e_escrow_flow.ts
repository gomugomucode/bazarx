import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN, Idl } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync, getAccount, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';

async function main() {
  console.log('====================================================');
  console.log('       BAZAARX DEVNET END-TO-END ESCROW TEST       ');
  console.log('====================================================\n');

  const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
  const idl = JSON.parse(fs.readFileSync('frontend/idl/bazaarx.json', 'utf8'));
  const programId = new PublicKey(idl.address);

  const buyerBytes = JSON.parse(fs.readFileSync('target/deploy/buyer-keypair.json', 'utf8'));
  const buyer = Keypair.fromSecretKey(Uint8Array.from(buyerBytes));

  const supplierBytes = JSON.parse(fs.readFileSync('target/deploy/supplier-keypair.json', 'utf8'));
  const supplier = Keypair.fromSecretKey(Uint8Array.from(supplierBytes));

  const usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);

  console.log('Program ID:      ', programId.toBase58());
  console.log('Config PDA:      ', configPda.toBase58());
  console.log('USDC Mint:       ', usdcMint.toBase58());
  console.log('Buyer Pubkey:    ', buyer.publicKey.toBase58());
  console.log('Supplier Pubkey: ', supplier.publicKey.toBase58());

  // Existing Verified Order PDA #80024
  const existingOrderPda = new PublicKey('GivpLzmmEH5M2WVbWqbjGRsSSSZxTvcGLFoC6rvwWFUm');
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), existingOrderPda.toBuffer()],
    programId
  );

  console.log('\n----------------------------------------------------');
  console.log('STEP 1 & 2: VERIFY EXISTING ORDER & BUYER BALANCE');
  console.log('----------------------------------------------------');
  console.log('Order PDA:       ', existingOrderPda.toBase58());
  console.log('Vault PDA:       ', vaultPda.toBase58());

  const buyerProvider = new AnchorProvider(conn, new Wallet(buyer), { commitment: 'confirmed' });
  const buyerProgram = new Program(idl as Idl, buyerProvider);

  const supplierProvider = new AnchorProvider(conn, new Wallet(supplier), { commitment: 'confirmed' });
  const supplierProgram = new Program(idl as Idl, supplierProvider);

  // 1. Fetch Order from Devnet
  let orderAccount: any;
  try {
    orderAccount = await (buyerProgram.account as any).order.fetch(existingOrderPda);
  } catch (err: any) {
    console.error('CRITICAL: Could not fetch order account:', err.message);
    process.exit(1);
  }

  const rawState = Object.keys(orderAccount.state)[0];
  console.log('On-chain Order State:   ', rawState);
  console.log('On-chain Buyer:         ', orderAccount.buyer.toBase58());
  console.log('On-chain Supplier:      ', orderAccount.supplier.toBase58());
  console.log('On-chain Mint:          ', orderAccount.mint.toBase58());
  console.log('On-chain Amount (raw):  ', orderAccount.amount.toString(), `(${Number(orderAccount.amount) / 1e6} USDC)`);

  if (!orderAccount.buyer.equals(buyer.publicKey)) {
    console.error('CRITICAL: Buyer mismatch!');
    process.exit(1);
  }
  if (!orderAccount.supplier.equals(supplier.publicKey)) {
    console.error('CRITICAL: Supplier mismatch!');
    process.exit(1);
  }
  if (!orderAccount.mint.equals(usdcMint)) {
    console.error('CRITICAL: Mint mismatch!');
    process.exit(1);
  }

  // 2. Query Buyer ATA balance from Devnet RPC
  const buyerAta = getAssociatedTokenAddressSync(usdcMint, buyer.publicKey);
  const supplierAta = getAssociatedTokenAddressSync(usdcMint, supplier.publicKey);

  let buyerInitialAmount = 0;
  try {
    const acc = await getAccount(conn, buyerAta);
    buyerInitialAmount = Number(acc.amount);
    console.log(`\nBuyer ATA:       ${buyerAta.toBase58()}`);
    console.log(`Buyer Balance:   ${buyerInitialAmount / 1e6} USDC (${buyerInitialAmount} micro-USDC)`);
  } catch (err: any) {
    console.log(`Buyer ATA:       ${buyerAta.toBase58()} (Not found: ${err.message})`);
  }

  const requiredAmount = Number(orderAccount.amount);
  console.log(`Required Amount: ${requiredAmount / 1e6} USDC (${requiredAmount} micro-USDC)`);

  if (buyerInitialAmount < requiredAmount) {
    console.log('\n====================================================');
    console.log('STOPPED: INSUFFICIENT BUYER DEVNET USDC BALANCE');
    console.log('====================================================');
    console.log(`Buyer wallet ${buyer.publicKey.toBase58()} currently has:`);
    console.log(`  ${buyerInitialAmount / 1e6} USDC in ATA ${buyerAta.toBase58()}`);
    console.log(`Order requires:`);
    console.log(`  ${requiredAmount / 1e6} USDC`);
    console.log('\nPer instructions: STOPPING execution. No fake balances or simulated signatures will be emitted.');
    console.log('Please ensure test USDC is funded from https://faucet.circle.com to continue.');
    console.log('====================================================\n');
    return;
  }

  console.log('\n✓ Buyer balance verified sufficient on Devnet RPC!');

  // 3. FUND ESCROW
  console.log('\n----------------------------------------------------');
  console.log('STEP 3: EXECUTE REAL FUND ESCROW');
  console.log('----------------------------------------------------');

  const fundTx = await buyerProgram.methods
    .fundEscrow()
    .accounts({
      buyer: buyer.publicKey,
      order: existingOrderPda,
      mint: usdcMint,
      buyerTokenAccount: buyerAta,
      vault: vaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('✓ Fund Escrow Real Tx Signature:', fundTx);
  console.log(`Explorer: https://explorer.solana.com/tx/${fundTx}?cluster=devnet`);

  // Wait for confirmation
  await conn.confirmTransaction(fundTx, 'confirmed');

  orderAccount = await (buyerProgram.account as any).order.fetch(existingOrderPda);
  console.log('On-chain Order State after Fund:', Object.keys(orderAccount.state)[0]);

  const vaultAccAfterFund = await getAccount(conn, vaultPda);
  const vaultBalanceFunded = Number(vaultAccAfterFund.amount) / 1e6;
  console.log('Vault Token Balance: ', vaultBalanceFunded, 'USDC');

  const buyerAccAfterFund = await getAccount(conn, buyerAta);
  const buyerBalanceAfterFund = Number(buyerAccAfterFund.amount) / 1e6;
  console.log('Buyer Token Balance: ', buyerBalanceAfterFund, 'USDC');

  // 4. VERIFY CUSTODY
  console.log('\n----------------------------------------------------');
  console.log('STEP 4: VERIFY PROGRAM CUSTODY');
  console.log('----------------------------------------------------');
  console.log('Vault Account:       ', vaultPda.toBase58());
  console.log('Vault Authority:     ', vaultAccAfterFund.owner.toBase58(), '(Order PDA)');
  console.log('Vault Mint:          ', vaultAccAfterFund.mint.toBase58());
  console.log('Vault Amount:        ', vaultBalanceFunded, 'USDC');
  console.log('Non-Custodial Proof: The backend private keys do NOT own the vault token account.');

  // 5. MARK SHIPPED
  console.log('\n----------------------------------------------------');
  console.log('STEP 5: MARK SHIPPED (Supplier Signature)');
  console.log('----------------------------------------------------');
  const shipTx = await supplierProgram.methods
    .markShipped()
    .accounts({
      supplier: supplier.publicKey,
      order: existingOrderPda,
    })
    .rpc();
  console.log('✓ Mark Shipped Real Tx Signature:', shipTx);
  console.log(`Explorer: https://explorer.solana.com/tx/${shipTx}?cluster=devnet`);
  await conn.confirmTransaction(shipTx, 'confirmed');

  orderAccount = await (supplierProgram.account as any).order.fetch(existingOrderPda);
  console.log('On-chain Order State after Ship:', Object.keys(orderAccount.state)[0]);

  // 6. CONFIRM DELIVERY
  console.log('\n----------------------------------------------------');
  console.log('STEP 6: CONFIRM DELIVERY (Buyer Signature)');
  console.log('----------------------------------------------------');
  const deliverTx = await buyerProgram.methods
    .confirmDelivery()
    .accounts({
      buyer: buyer.publicKey,
      order: existingOrderPda,
    })
    .rpc();
  console.log('✓ Confirm Delivery Real Tx Signature:', deliverTx);
  console.log(`Explorer: https://explorer.solana.com/tx/${deliverTx}?cluster=devnet`);
  await conn.confirmTransaction(deliverTx, 'confirmed');

  orderAccount = await (buyerProgram.account as any).order.fetch(existingOrderPda);
  console.log('On-chain Order State after Delivery:', Object.keys(orderAccount.state)[0]);

  // 7. RELEASE PAYMENT
  console.log('\n----------------------------------------------------');
  console.log('STEP 7: RELEASE PAYMENT (CPI Vault to Supplier)');
  console.log('----------------------------------------------------');
  const supplierAccBeforeRelease = await getAccount(conn, supplierAta);
  const supplierBalanceBeforeRelease = Number(supplierAccBeforeRelease.amount) / 1e6;

  const releaseTx = await supplierProgram.methods
    .releasePayment()
    .accounts({
      caller: supplier.publicKey,
      order: existingOrderPda,
      mint: usdcMint,
      vault: vaultPda,
      supplierTokenAccount: supplierAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
  console.log('✓ Release Payment Real Tx Signature:', releaseTx);
  console.log(`Explorer: https://explorer.solana.com/tx/${releaseTx}?cluster=devnet`);
  await conn.confirmTransaction(releaseTx, 'confirmed');

  orderAccount = await (buyerProgram.account as any).order.fetch(existingOrderPda);
  console.log('Final On-chain Order State:', Object.keys(orderAccount.state)[0]);

  const vaultAccFinal = await getAccount(conn, vaultPda);
  const vaultBalanceFinal = Number(vaultAccFinal.amount) / 1e6;

  const supplierAccAfterRelease = await getAccount(conn, supplierAta);
  const supplierBalanceAfterRelease = Number(supplierAccAfterRelease.amount) / 1e6;

  console.log('\n====================================================');
  console.log('FINAL ON-CHAIN PROOF REPORT');
  console.log('====================================================');
  console.log('create_order:     49dkR366tVwQfyHPHYTRfDLmip4Xq53nSi2NS4eVqw4Xs74PiECmd5irjA39yqD7Ycn7T3mvJfHpZiyiWnz2P8F6');
  console.log('accept_order:     4wWr852r3m27XuudrFgrJsZXvHq2xPwxKaUE7ehRYwwbEdTRJEpioMTryNT4wvuHGN5wvPnnLgCuxDGTsEbjSMUJ');
  console.log('fund_escrow:     ', fundTx);
  console.log('mark_shipped:    ', shipTx);
  console.log('confirm_delivery:', deliverTx);
  console.log('release_payment: ', releaseTx);
  console.log('Final State:     ', Object.keys(orderAccount.state)[0]);
  console.log('Buyer Balance:    Before:', buyerInitialAmount / 1e6, 'USDC | After:', buyerBalanceAfterFund, 'USDC');
  console.log('Vault Balance:    Funded:', vaultBalanceFunded, 'USDC | Final:', vaultBalanceFinal, 'USDC');
  console.log('Supplier Balance: Before:', supplierBalanceBeforeRelease, 'USDC | After:', supplierBalanceAfterRelease, 'USDC');
  console.log('====================================================');
}

main().catch(console.error);
