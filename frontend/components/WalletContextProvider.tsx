'use client';

import React, { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { RPC_ENDPOINT } from '@/lib/solana';

// Solana Wallet Standard (SIP-002) auto-discovers Phantom, Solflare, Backpack, etc.
export const WalletContextProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const endpoint = useMemo(() => RPC_ENDPOINT, []);

  // Standard wallets are auto-detected by WalletProvider without legacy wrappers
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
