import { Connection, Keypair, PublicKey, SystemProgram, Transaction } from '@solana/web3.js';
import { AnchorProvider, Program, Wallet, BN, Idl } from '@coral-xyz/anchor';
import fs from 'fs';

async function run() {
  const conn = new Connection('https://api.devnet.solana.com', 'confirmed');
  const deployerBytes = JSON.parse(fs.readFileSync('target/deploy/deployer-keypair.json', 'utf8'));
  const deployer = Keypair.fromSecretKey(Uint8Array.from(deployerBytes));

  console.log('--- BAZAARX REAL DEVNET TEST RUN ---');
  console.log('Deployer / Admin:', deployer.publicKey.toBase58());

  // Check deployer balance
  const deployerBal = await conn.getBalance(deployer.publicKey);
  console.log('Deployer balance:', deployerBal / 1e9, 'SOL');

  // Load IDL
  const idl = JSON.parse(fs.readFileSync('frontend/idl/bazaarx.json', 'utf8'));
  const programId = new PublicKey(idl.address);
  console.log('Program ID:', programId.toBase58());

  // 1. Generate Buyer and Supplier Keypairs
  let buyer: Keypair;
  let supplier: Keypair;

  if (fs.existsSync('target/deploy/buyer-keypair.json')) {
    buyer = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync('target/deploy/buyer-keypair.json', 'utf8'))));
  } else {
    buyer = Keypair.generate();
    fs.writeFileSync('target/deploy/buyer-keypair.json', JSON.stringify(Array.from(buyer.secretKey)));
  }

  if (fs.existsSync('target/deploy/supplier-keypair.json')) {
    supplier = Keypair.fromSecretKey(Uint8Array.from(JSON.parse(fs.readFileSync('target/deploy/supplier-keypair.json', 'utf8'))));
  } else {
    supplier = Keypair.generate();
    fs.writeFileSync('target/deploy/supplier-keypair.json', JSON.stringify(Array.from(supplier.secretKey)));
  }

  console.log('Buyer Pubkey:   ', buyer.publicKey.toBase58());
  console.log('Supplier Pubkey:', supplier.publicKey.toBase58());

  // Fund buyer and supplier with 0.15 SOL each for gas and rent
  const buyerBal = await conn.getBalance(buyer.publicKey);
  if (buyerBal < 0.05 * 1e9) {
    console.log('Funding buyer with 0.15 SOL from deployer...');
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: deployer.publicKey,
        toPubkey: buyer.publicKey,
        lamports: 0.15 * 1e9,
      })
    );
    const sig = await conn.sendTransaction(tx, [deployer]);
    await conn.confirmTransaction(sig);
    console.log('Buyer funded, tx:', sig);
  }

  const supplierBal = await conn.getBalance(supplier.publicKey);
  if (supplierBal < 0.05 * 1e9) {
    console.log('Funding supplier with 0.15 SOL from deployer...');
    const tx = new Transaction().add(
      SystemProgram.transfer({
        fromPubkey: deployer.publicKey,
        toPubkey: supplier.publicKey,
        lamports: 0.15 * 1e9,
      })
    );
    const sig = await conn.sendTransaction(tx, [deployer]);
    await conn.confirmTransaction(sig);
    console.log('Supplier funded, tx:', sig);
  }

  // Derive PDAs
  const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
  console.log('Config PDA:', configPda.toBase58());

  // Setup Anchor Provider for Buyer
  const buyerProvider = new AnchorProvider(conn, new Wallet(buyer), { commitment: 'confirmed' });
  const buyerProgram = new Program(idl as Idl, buyerProvider);

  // Setup Anchor Provider for Supplier
  const supplierProvider = new AnchorProvider(conn, new Wallet(supplier), { commitment: 'confirmed' });
  const supplierProgram = new Program(idl as Idl, supplierProvider);

  // Define unique order ID
  const orderIdNumber = Math.floor(1000 + Math.random() * 9000);
  const orderIdBn = new BN(orderIdNumber);
  const orderIdBuffer = orderIdBn.toArrayLike(Buffer, 'le', 8);

  const [orderPda, orderBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('order'), buyer.publicKey.toBuffer(), orderIdBuffer],
    programId
  );
  console.log(`\n=== STEP 1: CREATE ORDER (Order ID: ${orderIdNumber}) ===`);
  console.log('Derived Order PDA:', orderPda.toBase58());

  const usdcMint = new PublicKey('4zMMC9srt5Ri5X14GAgXhaHii3GnPAEERYPJgZJDncDU');
  const amountMicroUsdc = new BN(500 * 1_000_000); // 500 USDC

  const createTxSig = await buyerProgram.methods
    .createOrder(
      orderIdBn,
      supplier.publicKey,
      usdcMint,
      amountMicroUsdc
    )
    .accounts({
      buyer: buyer.publicKey,
      config: configPda,
      order: orderPda,
      systemProgram: SystemProgram.programId,
    })
    .rpc();

  console.log('✓ Create Order Real Tx Signature:', createTxSig);
  console.log('Explorer:', `https://explorer.solana.com/tx/${createTxSig}?cluster=devnet`);

  let onChainOrder = await (buyerProgram.account as any).order.fetch(orderPda);
  console.log('On-chain Order State:', Object.keys(onChainOrder.state)[0]);
  console.log('On-chain Buyer:', onChainOrder.buyer.toBase58());
  console.log('On-chain Supplier:', onChainOrder.supplier.toBase58());
  console.log('On-chain Amount:', onChainOrder.amount.toString(), 'micro-USDC');

  console.log(`\n=== STEP 2: ACCEPT ORDER ===`);
  const acceptTxSig = await supplierProgram.methods
    .acceptOrder()
    .accounts({
      supplier: supplier.publicKey,
      order: orderPda,
    })
    .rpc();

  console.log('✓ Accept Order Real Tx Signature:', acceptTxSig);
  console.log('Explorer:', `https://explorer.solana.com/tx/${acceptTxSig}?cluster=devnet`);

  onChainOrder = await (supplierProgram.account as any).order.fetch(orderPda);
  console.log('On-chain Order State after Accept:', Object.keys(onChainOrder.state)[0]);
  console.log('Accepted At Timestamp:', new Date(onChainOrder.acceptedAt.toNumber() * 1000).toISOString());

  console.log('\n--- SUCCESS: REAL ON-CHAIN ORDER CREATION & ACCEPTANCE CONFIRMED ON DEVNET ---');
}

run().catch(console.error);
