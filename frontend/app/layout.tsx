import type { Metadata } from 'next';
import '@solana/wallet-adapter-react-ui/styles.css';
import './globals.css';
import { WalletContextProvider } from '@/components/WalletContextProvider';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export const metadata: Metadata = {
  title: 'BazaarX — Programmable B2B Wholesale Settlement for Nepal',
  description:
    'Non-custodial B2B trade settlement powered by Solana smart contracts. Trade wholesale goods with cryptographic escrow security.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="flex flex-col min-h-screen bg-slate-50 antialiased text-slate-900">
        <WalletContextProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </WalletContextProvider>
      </body>
    </html>
  );
}
