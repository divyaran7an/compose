import React, { FC, useMemo, useEffect, useState } from 'react';
import { ConnectButton, useCurrentWallet } from '@mysten/dapp-kit';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';

interface SuiWalletButtonProps {
  className?: string;
}

// Separate component that uses hooks - only rendered on client
const WalletButtonContent: FC<{ className?: string }> = ({ className }) => {
  const { isConnected, currentWallet, connectionStatus } = useCurrentWallet();

  const walletAddress = useMemo(() => {
    if (!currentWallet?.accounts?.[0]?.address) return '';
    const address = currentWallet.accounts[0].address;
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  }, [currentWallet]);

  const statusText = useMemo(() => {
    if (connectionStatus === 'connecting') return 'Connecting...';
    if (connectionStatus === 'disconnecting') return 'Disconnecting...';
    if (isConnected) return 'Connected';
    return 'Not Connected';
  }, [connectionStatus, isConnected]);

  return (
    <div className={`space-y-3 ${className || ''}`}>
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <div 
            className={`h-2 w-2 rounded-full transition-colors ${
              isConnected ? 'bg-emerald-500' : 'bg-zinc-500'
            }`}
            title={statusText}
          />
          <span className="text-sm font-medium text-zinc-300">{statusText}</span>
        </div>
        
        {isConnected && currentWallet && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="bg-zinc-800 text-zinc-300 border-zinc-700">
              {currentWallet.name}
            </Badge>
            {walletAddress && (
              <code 
                className="text-xs text-zinc-400 bg-zinc-900 px-2 py-1 rounded cursor-pointer hover:bg-zinc-800 transition-colors"
                title={currentWallet.accounts[0].address}
              >
                {walletAddress}
              </code>
            )}
          </div>
        )}
      </div>

      <div className="flex gap-2 flex-wrap">
        <ConnectButton 
          className="sui-wallet-connect-button" 
          connectText="Connect Wallet"
          connectedText="Disconnect"
        />
      </div>
    </div>
  );
};

export const SuiWalletButton: FC<SuiWalletButtonProps> = ({ className }) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Show loading state on server and initial client render
  if (!mounted) {
    return (
      <div className={className}>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-zinc-500 animate-pulse" />
          <span className="text-sm text-zinc-400">Loading...</span>
        </div>
      </div>
    );
  }

  // Only render the component with hooks after mounting on client
  return (
    <>
      <WalletButtonContent className={className} />

      <style jsx global>{`
        .sui-wallet-connect-button {
          background: rgb(139 92 246);
          border: none;
          border-radius: 0.375rem;
          color: white;
          cursor: pointer;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 0.5rem 1rem;
          transition: all 0.2s;
          min-width: 140px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }

        .sui-wallet-connect-button:hover {
          background: rgb(124 58 237);
          transform: translateY(-1px);
        }

        .sui-wallet-connect-button:disabled {
          background: rgb(113 113 122);
          cursor: not-allowed;
          transform: none;
        }

        /* Override dApp Kit default styles for dark theme */
        .wkit-select__container {
          background: rgb(24 24 27) !important;
          border: 1px solid rgb(63 63 70) !important;
        }

        .wkit-select__option {
          background: rgb(24 24 27) !important;
          color: rgb(228 228 231) !important;
        }

        .wkit-select__option:hover {
          background: rgb(39 39 42) !important;
        }

        .wkit-dialog {
          background: rgb(24 24 27) !important;
          color: rgb(228 228 231) !important;
        }

        .wkit-dialog__backdrop {
          background: rgba(0, 0, 0, 0.8) !important;
        }

        @media (max-width: 640px) {
          .sui-wallet-connect-button {
            width: 100%;
          }
        }
      `}</style>
    </>
  );
};