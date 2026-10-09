'use client';

import React, { FC, ReactNode, useMemo } from 'react';
import {
  ConnectionProvider,
  WalletProvider,
} from '@solana/wallet-adapter-react';
import { WalletModalProvider } from '@solana/wallet-adapter-react-ui';
import { PhantomWalletAdapter } from '@solana/wallet-adapter-phantom';
import { SolflareWalletAdapter } from '@solana/wallet-adapter-solflare';
import { RPC_ENDPOINT } from '@/lib/solana';

export const WalletContextProvider: FC<{ children: ReactNode }> = ({
  children,
}) => {
  const endpoint = useMemo(() => RPC_ENDPOINT, []);

  // Explicitly configure supported wallets (Phantom & Solflare) for reliable detection and UI display,
  // while allowing Wallet Standard (SIP-002) to also auto-discover any installed standard wallets
  const wallets = useMemo(
    () => [
      new PhantomWalletAdapter(),
      new SolflareWalletAdapter(),
    ],
    []
  );

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>{children}</WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
};
