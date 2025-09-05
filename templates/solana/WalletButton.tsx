import React, { FC, useCallback, useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { WalletMultiButton, WalletDisconnectButton } from '@solana/wallet-adapter-react-ui';

interface WalletButtonProps {
  className?: string;
}

export const WalletButton: FC<WalletButtonProps> = ({ className }) => {
  const { connection } = useConnection();
  const { publicKey, connected, connecting, disconnecting } = useWallet();

  // Format wallet address for display
  const walletAddress = useMemo(() => {
    if (!publicKey) return '';
    const address = publicKey.toBase58();
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  }, [publicKey]);

  // Connection status indicator
  const connectionStatus = useMemo(() => {
    if (connecting) return 'Connecting...';
    if (disconnecting) return 'Disconnecting...';
    if (connected) return 'Connected';
    return 'Not Connected';
  }, [connecting, disconnecting, connected]);

  return (
    <div className={`wallet-button-container ${className || ''}`}>
      <div className="wallet-status">
        <div className="connection-indicator">
          <span 
            className={`status-dot ${connected ? 'connected' : 'disconnected'}`}
            title={connectionStatus}
          />
          <span className="status-text">{connectionStatus}</span>
        </div>
        
        {connected && publicKey && (
          <div className="wallet-info">
            <span className="wallet-address" title={publicKey.toBase58()}>
              {walletAddress}
            </span>
          </div>
        )}
      </div>

      <div className="wallet-buttons">
        <WalletMultiButton className="wallet-connect-button" />
        {connected && (
          <WalletDisconnectButton className="wallet-disconnect-button" />
        )}
      </div>

      <style jsx>{`
        .wallet-button-container {
          display: flex;
          flex-direction: column;
          gap: 12px;
          padding: 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: #ffffff;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }

        .wallet-status {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .connection-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background-color: #ef4444;
          transition: background-color 0.2s;
        }

        .status-dot.connected {
          background-color: #10b981;
        }

        .status-text {
          font-size: 14px;
          font-weight: 500;
          color: #374151;
        }

        .wallet-info {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .wallet-address {
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          font-size: 12px;
          color: #6b7280;
          background: #f3f4f6;
          padding: 4px 8px;
          border-radius: 4px;
          cursor: pointer;
        }

        .wallet-address:hover {
          background: #e5e7eb;
        }

        .wallet-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }

        .wallet-buttons :global(.wallet-adapter-button) {
          background: #3b82f6;
          border: none;
          border-radius: 6px;
          color: white;
          cursor: pointer;
          font-size: 14px;
          font-weight: 600;
          padding: 8px 16px;
          transition: all 0.2s;
        }

        .wallet-buttons :global(.wallet-adapter-button:hover) {
          background: #2563eb;
          transform: translateY(-1px);
        }

        .wallet-buttons :global(.wallet-adapter-button:disabled) {
          background: #9ca3af;
          cursor: not-allowed;
          transform: none;
        }

        .wallet-buttons :global(.wallet-disconnect-button) {
          background: #ef4444;
        }

        .wallet-buttons :global(.wallet-disconnect-button:hover) {
          background: #dc2626;
        }

        @media (max-width: 640px) {
          .wallet-button-container {
            padding: 12px;
          }
          
          .wallet-buttons {
            flex-direction: column;
          }
          
          .wallet-buttons :global(.wallet-adapter-button) {
            width: 100%;
            justify-content: center;
          }
        }
      `}</style>
    </div>
  );
};

export default WalletButton; 