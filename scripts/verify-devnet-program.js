const { Connection, PublicKey } = require('@solana/web3.js');

const EXPECTED_PROGRAM_ID = 'BHHaiHFRMyVRqQYp2rdC41DECeNBE544ASYvsx2fvQoN';
const DEVNET_RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const BPF_LOADER_UPGRADEABLE = 'BPFLoaderUpgradeab1e11111111111111111111111';

async function verifyProgram() {
  console.log('====================================================');
  console.log('       BAZAARX DEVNET PROGRAM VERIFICATION          ');
  console.log('====================================================');
  console.log(`Connecting to Solana Devnet RPC: ${DEVNET_RPC_URL}`);

  const connection = new Connection(DEVNET_RPC_URL, 'confirmed');
  const programId = new PublicKey(EXPECTED_PROGRAM_ID);

  console.log(`Target Program ID: ${programId.toBase58()}`);

  try {
    const accountInfo = await connection.getAccountInfo(programId);

    if (!accountInfo) {
      console.error(`\n❌ VERIFICATION FAILED: Program account ${programId.toBase58()} does not exist on Devnet!`);
      process.exit(1);
    }

    console.log('\n--- ON-CHAIN ACCOUNT METADATA ---');
    console.log(`Account Exists:       true`);
    console.log(`Executable:           ${accountInfo.executable}`);
    console.log(`Owner:                ${accountInfo.owner.toBase58()}`);
    console.log(`Lamports Balance:     ${accountInfo.lamports} lamports (${accountInfo.lamports / 1e9} SOL)`);
    console.log(`Data Length:          ${accountInfo.data.length} bytes`);

    // Verify ownership by BPF Upgradeable Loader
    if (accountInfo.owner.toBase58() !== BPF_LOADER_UPGRADEABLE) {
      console.error(`❌ VERIFICATION FAILED: Owner is ${accountInfo.owner.toBase58()}, expected ${BPF_LOADER_UPGRADEABLE}`);
      process.exit(1);
    }

    // Verify executable status
    if (!accountInfo.executable) {
      console.error(`❌ VERIFICATION FAILED: Program account is marked non-executable!`);
      process.exit(1);
    }

    // Query ProgramData account to inspect upgrade authority and deployment status
    const [programDataAddress] = PublicKey.findProgramAddressSync(
      [programId.toBuffer()],
      new PublicKey(BPF_LOADER_UPGRADEABLE)
    );
    console.log(`\n--- PROGRAM DATA ACCOUNT METADATA ---`);
    console.log(`ProgramData Address:  ${programDataAddress.toBase58()}`);

    const programDataInfo = await connection.getAccountInfo(programDataAddress);
    if (programDataInfo) {
      console.log(`ProgramData Exists:   true`);
      console.log(`ProgramData Owner:    ${programDataInfo.owner.toBase58()}`);
      console.log(`ProgramData Lamports: ${programDataInfo.lamports} lamports (${programDataInfo.lamports / 1e9} SOL)`);
      console.log(`ProgramData Length:   ${programDataInfo.data.length} bytes`);

      // Extract upgrade authority from ProgramData header (offset 12 hasOption flag, offset 13-45 pubkey)
      if (programDataInfo.data.length >= 45) {
        const hasUpgradeAuth = programDataInfo.data[12];
        if (hasUpgradeAuth === 1) {
          const upgradeAuth = new PublicKey(programDataInfo.data.slice(13, 45));
          console.log(`Upgrade Authority:    ${upgradeAuth.toBase58()}`);
        } else {
          console.log(`Upgrade Authority:    None (Immutable)`);
        }
      }
    } else {
      console.warn(`⚠️ Warning: ProgramData account not found at ${programDataAddress.toBase58()}`);
    }

    // Check Config PDA as well
    const [configPda] = PublicKey.findProgramAddressSync([Buffer.from('config')], programId);
    console.log(`\n--- PROTOCOL CONFIG PDA ---`);
    console.log(`Config PDA Address:   ${configPda.toBase58()}`);
    const configInfo = await connection.getAccountInfo(configPda);
    if (configInfo) {
      console.log(`Config PDA Exists:    true`);
      console.log(`Config Owner:         ${configInfo.owner.toBase58()}`);
      console.log(`Config Lamports:      ${configInfo.lamports} lamports`);
      const admin = new PublicKey(configInfo.data.slice(8, 40));
      const mint = new PublicKey(configInfo.data.slice(40, 72));
      console.log(`Config Admin:         ${admin.toBase58()}`);
      console.log(`Approved Mint:        ${mint.toBase58()}`);
    } else {
      console.log(`Config PDA Exists:    false (Not initialized yet)`);
    }

    console.log('\n====================================================');
    console.log('✓ VERIFICATION SUCCESSFUL: Program is LIVE on Devnet!');
    console.log('====================================================\n');
    process.exit(0);
  } catch (err) {
    console.error('\n❌ VERIFICATION ERROR:', err);
    process.exit(1);
  }
}

verifyProgram();
