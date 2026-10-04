'use client';

import { useState, useEffect, useCallback } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { LAMPORTS_PER_SOL } from '@solana/web3.js';
import { DEVNET_USDC_MINT, getAssociatedTokenAccount } from './solana';

export interface WalletBalances {
  sol: number | null;
  usdc: number | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useWalletBalance(): WalletBalances {
  const { connection } = useConnection();
  const { publicKey } = useWallet();

  const [sol, setSol] = useState<number | null>(null);
  const [usdc, setUsdc] = useState<number | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fetchBalances = useCallback(async () => {
    if (!publicKey) {
      setSol(null);
      setUsdc(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Fetch native SOL balance
      const lamports = await connection.getBalance(publicKey, 'confirmed');
      const solBalance = lamports / LAMPORTS_PER_SOL;
      setSol(solBalance);

      // 2. Fetch Devnet USDC balance (Circle Mint)
      try {
        const ata = getAssociatedTokenAccount(publicKey, DEVNET_USDC_MINT);
        const tokenBalanceResp = await connection.getTokenAccountBalance(ata, 'confirmed');
        const tokenUi = tokenBalanceResp.value.uiAmount ?? 0;
        setUsdc(tokenUi);
      } catch (tokenErr: any) {
        // ATA may not exist yet if wallet has never received Devnet USDC
        // This is a normal on-chain state meaning 0 balance
        setUsdc(0);
      }
    } catch (err: any) {
      console.warn('Failed to fetch wallet balances from Devnet RPC:', err);
      setError('Unable to load Devnet balance');
    } finally {
      setLoading(false);
    }
  }, [connection, publicKey]);

  useEffect(() => {
    fetchBalances();
  }, [fetchBalances]);

  return {
    sol,
    usdc,
    loading,
    error,
    refresh: fetchBalances,
  };
}
