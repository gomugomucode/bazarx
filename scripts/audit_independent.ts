import { Connection, PublicKey } from '@solana/web3.js';
import { BorshInstructionCoder, BorshAccountsCoder, Idl } from '@coral-xyz/anchor';
import fs from 'fs';
import path from 'path';

async function audit() {
  const rpcUrl = process.env.SOLANA_RPC_ENDPOINT || 'https://api.devnet.solana.com';
  console.log(`Connecting to Devnet RPC: ${rpcUrl}...`);
  const conn = new Connection(rpcUrl, 'confirmed');

  const idlPath = path.resolve('frontend/idl/bazaarx.json');
  const idl: Idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
  const programId = new PublicKey(idl.address);
  const coder = new BorshInstructionCoder(idl);
  const accountsCoder = new BorshAccountsCoder(idl);

  console.log(`BazaarX Program ID: ${programId.toBase58()}`);

  const signatures = [
    { name: '1. create_order', sig: '5r8i123XozUBywAogXXHsDLVGwcTMCjHZYHn8zYt3HhuRT4f7xDwv9qrhduHRYXNYuF7ERLNed4fQePnP8XtTRbm' },
    { name: '2. accept_order', sig: '5X24pxwaDai2MZjgPqF32SVWPgmBxB26D3kN37BkZjrnZG2pMjGAZBupm4R7vg1CkNctCm7yigLScNBCsXpN63He' },
    { name: '3. fund_escrow',  sig: '3x2zt9e1nGQTSmyHbz93RHXsa8A7yKRH5SmE7nLJgj1sfiJPQHtXiu1z8V8gjn5yAW8wig6aTvMZ9fd6jJ1ytHcf' },
    { name: '4. mark_shipped', sig: '4Zg4wnMu7yf4SpwrozBfQyuBbmKEn3qkQGZzd7r3dLAffacBuiK5ft5Qy6uoS7v1dvZkbE9DvVuXWr8fL4UdLTER' },
    { name: '5. confirm_delivery', sig: '2yfWnpGbtTtaFy34efEE3A35GK6AXZZA2cMHPD3kHai6gXFGzCkJS9Uh7t7ChimQgg5sxpv6o3q9s7NXvrkwoSL3' },
    { name: '6. release_payment',  sig: 'mWdsWPDwJ119u63Ehf3cWxkByCUWPhR23voptVNQaArBEZgsaYeoTWMwWpdp3CtMB2pvqoHhWFerea8EWkyXTaW' },
  ];

  const results: any[] = [];

  for (const item of signatures) {
    console.log(`\n========================================================`);
    console.log(`Fetching TX: ${item.name}`);
    console.log(`Signature: ${item.sig}`);
    console.log(`========================================================`);

    const tx = await conn.getTransaction(item.sig, {
      maxSupportedTransactionVersion: 0,
      commitment: 'confirmed',
    });

    if (!tx) {
      console.log(`[ERROR] Transaction NOT FOUND on RPC: ${item.sig}`);
      results.push({ name: item.name, sig: item.sig, found: false });
      continue;
    }

    const slot = tx.slot;
    const blockTime = tx.blockTime ? new Date(tx.blockTime * 1000).toISOString() : 'Unknown';
    const err = tx.meta?.err;
    const computeUnits = tx.meta?.computeUnitsConsumed;
    const fee = tx.meta?.fee;

    console.log(`Slot: ${slot}`);
    console.log(`BlockTime: ${blockTime}`);
    console.log(`Status: ${err ? 'FAILED (' + JSON.stringify(err) + ')' : 'SUCCESS'}`);
    console.log(`Fee: ${fee} lamports, Compute Units: ${computeUnits}`);

    // Account keys
    const accountKeys = tx.transaction.message.getAccountKeys({
      accountKeysFromLookups: tx.meta?.loadedAddresses,
    });
    const allKeys: string[] = [];
    for (let i = 0; i < accountKeys.length; i++) {
      allKeys.push(accountKeys.get(i)!.toBase58());
    }

    // Check signers
    const header = tx.transaction.message.header;
    const numRequiredSignatures = header.numRequiredSignatures;
    const signers = allKeys.slice(0, numRequiredSignatures);
    console.log(`Signers:`, signers);

    // Outer instructions
    const outerIxList: any[] = [];
    for (let idx = 0; idx < tx.transaction.message.compiledInstructions.length; idx++) {
      const ix = tx.transaction.message.compiledInstructions[idx];
      const progKey = allKeys[ix.programIdIndex];
      const ixAccounts = ix.accountKeyIndexes.map(i => allKeys[i]);
      const dataBuffer = Buffer.from(ix.data);

      let decodedIx: any = null;
      if (progKey === programId.toBase58()) {
        try {
          decodedIx = coder.decode(dataBuffer);
        } catch (e: any) {
          decodedIx = { decodeError: e.message };
        }
      }

      outerIxList.push({
        index: idx,
        programId: progKey,
        isBazaarX: progKey === programId.toBase58(),
        accounts: ixAccounts,
        dataHex: dataBuffer.toString('hex'),
        decoded: decodedIx,
      });

      console.log(`Outer Ix [${idx}]: Program ${progKey}`);
      if (progKey === programId.toBase58()) {
        console.log(`  BazaarX Instruction:`, decodedIx?.name || 'COULD NOT DECODE');
        console.log(`  Decoded Data:`, JSON.stringify(decodedIx?.data, null, 2));
        console.log(`  Accounts Passed:`, ixAccounts);
      }
    }

    // Inner instructions
    const innerIxList: any[] = [];
    if (tx.meta?.innerInstructions) {
      for (const inner of tx.meta.innerInstructions) {
        for (const ix of inner.instructions) {
          const progKey = allKeys[ix.programIdIndex];
          const ixAccounts = ix.accounts.map(i => allKeys[i]);
          innerIxList.push({
            parentIndex: inner.index,
            programId: progKey,
            accounts: ixAccounts,
            dataHex: Buffer.from(ix.data).toString('hex'),
          });
          console.log(`Inner Ix (parent ${inner.index}): Program ${progKey}`);
          console.log(`  Accounts:`, ixAccounts);
        }
      }
    }

    // Token balances
    const preTokenBalances = tx.meta?.preTokenBalances || [];
    const postTokenBalances = tx.meta?.postTokenBalances || [];
    console.log(`Pre Token Balances:`, JSON.stringify(preTokenBalances, null, 2));
    console.log(`Post Token Balances:`, JSON.stringify(postTokenBalances, null, 2));

    results.push({
      name: item.name,
      sig: item.sig,
      found: true,
      slot,
      blockTime,
      err,
      signers,
      outerIxList,
      innerIxList,
      preTokenBalances,
      postTokenBalances,
    });
  }

  // Check Current Account State for Order PDA and Vault PDA
  const orderPda = new PublicKey('59FW4U91GqR4pJENsuZKbaiB3358x31Xd9vL7oxEy3aa');
  const vaultPda = new PublicKey('3E7esaRvyMyAchbaEUhqJMPzpMmJqiCR7aqRkHcckNMP');
  const buyerAta = new PublicKey('iaasMsfxp2sfTzWMYLWobQ8CS1d9zRqJuKnX81BVArv');
  const supplierAta = new PublicKey('5ByjqyhVfWwPk3BX3vxSDG9StMsFenjXEYHYP7V57vqj');

  console.log(`\n========================================================`);
  console.log(`CURRENT ON-CHAIN STATE INSPECTION`);
  console.log(`========================================================`);

  const orderInfo = await conn.getAccountInfo(orderPda);
  let decodedOrder: any = null;
  if (orderInfo) {
    console.log(`Order PDA Owner: ${orderInfo.owner.toBase58()}`);
    console.log(`Order PDA Lamports: ${orderInfo.lamports}`);
    console.log(`Order PDA Data Length: ${orderInfo.data.length}`);
    try {
      decodedOrder = accountsCoder.decode('Order', orderInfo.data);
      console.log(`Decoded Order Account:`, JSON.stringify(decodedOrder, null, 2));
    } catch (e: any) {
      console.log(`Error decoding Order account: ${e.message}`);
    }
  } else {
    console.log(`Order PDA DOES NOT EXIST!`);
  }

  const vaultInfo = await conn.getAccountInfo(vaultPda);
  console.log(`Vault PDA exists: ${!!vaultInfo}, lamports: ${vaultInfo?.lamports || 0}, dataLen: ${vaultInfo?.data.length || 0}`);

  // Fetch token balances
  try {
    const buyerToken = await conn.getTokenAccountBalance(buyerAta);
    console.log(`Buyer ATA Balance: ${buyerToken.value.uiAmountString} USDC (${buyerToken.value.amount} base units)`);
  } catch (e: any) {
    console.log(`Buyer ATA Balance error: ${e.message}`);
  }

  try {
    const vaultToken = await conn.getTokenAccountBalance(vaultPda);
    console.log(`Vault PDA Balance: ${vaultToken.value.uiAmountString} USDC (${vaultToken.value.amount} base units)`);
  } catch (e: any) {
    console.log(`Vault PDA Balance error: ${e.message}`);
  }

  try {
    const supplierToken = await conn.getTokenAccountBalance(supplierAta);
    console.log(`Supplier ATA Balance: ${supplierToken.value.uiAmountString} USDC (${supplierToken.value.amount} base units)`);
  } catch (e: any) {
    console.log(`Supplier ATA Balance error: ${e.message}`);
  }

  // Check all signatures for order PDA
  console.log(`\n========================================================`);
  console.log(`SIGNATURE HISTORY FOR ORDER PDA (${orderPda.toBase58()})`);
  console.log(`========================================================`);
  const orderSigs = await conn.getSignaturesForAddress(orderPda);
  console.log(`Total signatures touching Order PDA: ${orderSigs.length}`);
  for (const s of orderSigs) {
    console.log(`  Signature: ${s.signature}`);
    console.log(`    Slot: ${s.slot}, BlockTime: ${s.blockTime ? new Date(s.blockTime * 1000).toISOString() : 'Unknown'}`);
    console.log(`    Err: ${s.err ? JSON.stringify(s.err) : 'null (SUCCESS)'}`);
    console.log(`    Memo: ${s.memo}`);
  }

  // Save audit data to JSON in scratch dir for easy access
  const outPath = path.resolve('scratch_audit_raw.json');
  fs.writeFileSync(outPath, JSON.stringify({ results, decodedOrder, orderSigs }, null, 2));
  console.log(`\nRaw audit data saved to ${outPath}`);
}

audit().catch(err => {
  console.error('Audit failed with error:', err);
});
