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

  // Check Buyer ATA and balance
  const buyerAta = getAssociatedTokenAddressSync(usdcMint, buyer.publicKey);
  console.log('Buyer ATA:       ', buyerAta.toBase58());
  let buyerUsdcBalance = 0;
  try {
    const acc = await getAccount(conn, buyerAta);
    buyerUsdcBalance = Number(acc.amount);
    console.log(`Buyer USDC Bal:   ${buyerUsdcBalance / 1e6} USDC (${buyerUsdcBalance} micro-USDC)`);
  } catch (err: any) {
    console.log('Buyer ATA not found / empty:', err.message);
  }

  // 1 Fresh Order Creation: 1 USDC (1,000,000 micro-USDC)
  const orderIdNumber = Math.floor(50000 + Math.random() * 40000);
  const orderIdBn = new BN(orderIdNumber);
  const amountMicroUsdc = new BN(1_000_000); // 1 USDC

  const [orderPda, orderBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('order'), buyer.publicKey.toBuffer(), orderIdBn.toArrayLike(Buffer, 'le', 8)],
    programId
  );
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from('vault'), orderPda.toBuffer()],
    programId
  );

  console.log(`\n----------------------------------------------------`);
  console.log(`STEP 1: CREATE ORDER on Devnet (Order ID: ${orderIdNumber})`);
  console.log(`----------------------------------------------------`);
  console.log('Derived Order PDA:', orderPda.toBase58());
  console.log('Derived Vault PDA:', vaultPda.toBase58());

  const buyerProvider = new AnchorProvider(conn, new Wallet(buyer), { commitment: 'confirmed' });
  const buyerProgram = new Program(idl as Idl, buyerProvider);

  const createTx = await buyerProgram.methods
    .createOrder(orderIdBn, supplier.publicKey, usdcMint, amountMicroUsdc)
    .accounts({
      buyer: buyer.publicKey,
      config: configPda,
      order: orderPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('✓ Create Order Real Tx Signature:', createTx);
  console.log(`Explorer: https://explorer.solana.com/tx/${createTx}?cluster=devnet`);

  let orderAccount = await (buyerProgram.account as any).order.fetch(orderPda);
  console.log('On-chain Order State:   ', Object.keys(orderAccount.state)[0]);
  console.log('On-chain Order Buyer:   ', orderAccount.buyer.toBase58());
  console.log('On-chain Order Supplier:', orderAccount.supplier.toBase58());
  console.log('On-chain Order Amount:  ', orderAccount.amount.toString(), 'micro-USDC (1 USDC)');

  console.log(`\n----------------------------------------------------`);
  console.log(`STEP 2: ACCEPT ORDER on Devnet`);
  console.log(`----------------------------------------------------`);
  const supplierProvider = new AnchorProvider(conn, new Wallet(supplier), { commitment: 'confirmed' });
  const supplierProgram = new Program(idl as Idl, supplierProvider);

  const acceptTx = await supplierProgram.methods
    .acceptOrder()
    .accounts({
      supplier: supplier.publicKey,
      order: orderPda,
    })
    .rpc();

  console.log('✓ Accept Order Real Tx Signature:', acceptTx);
  console.log(`Explorer: https://explorer.solana.com/tx/${acceptTx}?cluster=devnet`);

  orderAccount = await (supplierProgram.account as any).order.fetch(orderPda);
  console.log('On-chain Order State after Accept:', Object.keys(orderAccount.state)[0]);
  console.log('Accepted Timestamp:              ', new Date(orderAccount.acceptedAt.toNumber() * 1000).toISOString());

  console.log(`\n----------------------------------------------------`);
  console.log(`STEP 3: FUND ESCROW ELIGIBILITY CHECK`);
  console.log(`----------------------------------------------------`);
  console.log(`Order Amount Required: ${amountMicroUsdc.toNumber() / 1e6} USDC`);
  console.log(`Buyer Current USDC:    ${buyerUsdcBalance / 1e6} USDC`);

  if (buyerUsdcBalance < amountMicroUsdc.toNumber()) {
    console.log('\n⚠️  ESCROW FUNDING AWAITING DEVNET USDC');
    console.log('----------------------------------------------------');
    console.log('Order created and accepted successfully on Devnet!');
    console.log('To execute the real SPL token escrow deposit:');
    console.log(`1. Visit https://faucet.circle.com`);
    console.log(`2. Select Solana Devnet`);
    console.log(`3. Target Buyer Wallet: ${buyer.publicKey.toBase58()}`);
    console.log(`4. Target Buyer ATA:    ${buyerAta.toBase58()}`);
    console.log('----------------------------------------------------\n');
    return;
  }

  console.log(`\n----------------------------------------------------`);
  console.log(`STEP 4: EXECUTE REAL FUND ESCROW`);
  console.log(`----------------------------------------------------`);
  const fundTx = await buyerProgram.methods
    .fundEscrow()
    .accounts({
      buyer: buyer.publicKey,
      order: orderPda,
      mint: usdcMint,
      buyerTokenAccount: buyerAta,
      vault: vaultPda,
      tokenProgram: TOKEN_PROGRAM_ID,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('✓ Fund Escrow Real Tx Signature:', fundTx);
  console.log(`Explorer: https://explorer.solana.com/tx/${fundTx}?cluster=devnet`);

  orderAccount = await (buyerProgram.account as any).order.fetch(orderPda);
  console.log('On-chain Order State after Fund:', Object.keys(orderAccount.state)[0]);

  const vaultAcc = await getAccount(conn, vaultPda);
  console.log('Vault Token Balance:', Number(vaultAcc.amount) / 1e6, 'USDC');

  console.log(`\n----------------------------------------------------`);
  console.log(`STEP 5: MARK SHIPPED`);
  console.log(`----------------------------------------------------`);
  const shipTx = await supplierProgram.methods
    .markShipped()
    .accounts({
      supplier: supplier.publicKey,
      order: orderPda,
    })
    .rpc();
  console.log('✓ Mark Shipped Real Tx Signature:', shipTx);
  console.log(`Explorer: https://explorer.solana.com/tx/${shipTx}?cluster=devnet`);

  console.log(`\n----------------------------------------------------`);
  console.log(`STEP 6: CONFIRM DELIVERY`);
  console.log(`----------------------------------------------------`);
  const deliverTx = await buyerProgram.methods
    .confirmDelivery()
    .accounts({
      buyer: buyer.publicKey,
      order: orderPda,
    })
    .rpc();
  console.log('✓ Confirm Delivery Real Tx Signature:', deliverTx);
  console.log(`Explorer: https://explorer.solana.com/tx/${deliverTx}?cluster=devnet`);

  console.log(`\n----------------------------------------------------`);
  console.log(`STEP 7: RELEASE PAYMENT`);
  console.log(`----------------------------------------------------`);
  const supplierAta = getAssociatedTokenAddressSync(usdcMint, supplier.publicKey);
  const releaseTx = await supplierProgram.methods
    .releasePayment()
    .accounts({
      caller: supplier.publicKey,
      order: orderPda,
      mint: usdcMint,
      vault: vaultPda,
      supplierTokenAccount: supplierAta,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
  console.log('✓ Release Payment Real Tx Signature:', releaseTx);
  console.log(`Explorer: https://explorer.solana.com/tx/${releaseTx}?cluster=devnet`);

  orderAccount = await (buyerProgram.account as any).order.fetch(orderPda);
  console.log('Final On-chain Order State:', Object.keys(orderAccount.state)[0]);
}

main().catch(console.error);
