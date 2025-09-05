import React, { FC, ReactNode, useEffect, useState, useMemo } from 'react';
import { createNetworkConfig, SuiClientProvider, WalletProvider } from '@mysten/dapp-kit';
import { getFullnodeUrl } from '@mysten/sui/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Import dApp Kit CSS
import '@mysten/dapp-kit/dist/index.css';

const queryClient = new QueryClient();

interface SuiProviderProps {
  children: ReactNode;
}

const SuiProvider: FC<SuiProviderProps> = ({ children }) => {
  const [mounted, setMounted] = useState(false);

  // Get network from environment variables
  const network = process.env.NEXT_PUBLIC_SUI_NETWORK || 'devnet';
  
  // Get RPC endpoint from environment variables or use default
  const getRpcUrl = () => {
    if (process.env.NEXT_PUBLIC_SUI_RPC_URL) {
      return process.env.NEXT_PUBLIC_SUI_RPC_URL;
    }
    
    // Use official RPC endpoints
    switch (network) {
      case 'mainnet':
        return getFullnodeUrl('mainnet');
      case 'testnet':
        return getFullnodeUrl('testnet');
      case 'devnet':
      default:
        return getFullnodeUrl('devnet');
    }
  };

  // Configure network - memoize to prevent recreation
  const { networkConfig } = useMemo(() => 
    createNetworkConfig({
      [network]: { url: getRpcUrl() }
    }), [network]
  );

  // Only run on client side
  useEffect(() => {
    setMounted(true);
  }, []);

  // Render children without providers on server side
  if (!mounted) {
    return <>{children}</>;
  }

  return (
    <QueryClientProvider client={queryClient}>
      <SuiClientProvider networks={networkConfig} defaultNetwork={network}>
        <WalletProvider autoConnect>
          {children}
        </WalletProvider>
      </SuiClientProvider>
    </QueryClientProvider>
  );
};

export { SuiProvider };